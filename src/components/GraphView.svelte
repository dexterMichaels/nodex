<script>
  import { onMount, onDestroy } from 'svelte';
  import cytoscape from 'cytoscape';
  import { markdownFiles, currentFile, fileContents } from '../stores/vault.js';
  import { buildGraphData, createCytoscapeConfig, getGraphStats } from '../lib/graph.js';
  import { readFile } from '../lib/filesystem.js';

  let container;
  let cy = null;
  let stats = null;
  let loading = true;

  // Build graph when files change
  $: if (container && $markdownFiles.length > 0) {
    buildGraph();
  }

  async function buildGraph() {
    loading = true;

    // Load content for all markdown files
    const filesWithContent = [];
    for (const file of $markdownFiles) {
      let content = '';
      if (file.handle) {
        try {
          content = await readFile(file.handle);
        } catch (e) {
          console.warn(`Could not read ${file.path}:`, e);
        }
      } else if (file.content) {
        // Test mode - content is already available
        content = file.content || '';
      }
      filesWithContent.push({ path: file.path, content });
    }

    const graphData = buildGraphData(filesWithContent);
    stats = getGraphStats(graphData);

    // Destroy previous instance
    if (cy) {
      cy.destroy();
    }

    // Create new Cytoscape instance
    const config = createCytoscapeConfig(container, graphData, handleNodeClick);
    cy = cytoscape(config);

    // Add click handler
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      handleNodeClick(node.data());
    });

    // Highlight current file
    if ($currentFile) {
      highlightNode($currentFile.path);
    }

    loading = false;
  }

  function handleNodeClick(nodeData) {
    // Find the file in markdownFiles and select it
    const file = $markdownFiles.find(f => f.path === nodeData.path);
    if (file) {
      // Dispatch custom event for parent to handle
      container.dispatchEvent(new CustomEvent('nodeselect', {
        detail: { file },
        bubbles: true
      }));
    }
  }

  function highlightNode(path) {
    if (!cy) return;
    cy.nodes().removeClass('highlighted');
    const node = cy.getElementById(path);
    if (node) {
      node.addClass('highlighted');
      cy.animate({
        center: { eles: node },
        duration: 300
      });
    }
  }

  // Highlight when current file changes
  $: if (cy && $currentFile) {
    highlightNode($currentFile.path);
  }

  function handleFit() {
    if (cy) {
      cy.fit(undefined, 30);
    }
  }

  function handleRelayout() {
    if (cy) {
      cy.layout({
        name: 'cose',
        animate: true,
        animationDuration: 500
      }).run();
    }
  }

  onDestroy(() => {
    if (cy) {
      cy.destroy();
    }
  });
</script>

<div class="graph-view" data-testid="graph-view">
  <div class="graph-toolbar">
    <div class="graph-stats" data-testid="graph-stats">
      {#if stats}
        <span class="stat">{stats.nodeCount} notes</span>
        <span class="stat">{stats.edgeCount} links</span>
        <span class="stat" class:warning={stats.orphanCount > 0}>
          {stats.orphanCount} orphans
        </span>
      {/if}
    </div>
    <div class="graph-actions">
      <button class="icon-button" on:click={handleFit} title="Fit to view">
        <span>Fit</span>
      </button>
      <button class="icon-button" on:click={handleRelayout} title="Re-layout">
        <span>Relayout</span>
      </button>
    </div>
  </div>

  <div class="graph-container" bind:this={container} data-testid="graph-container">
    {#if loading}
      <div class="loading">Building graph...</div>
    {/if}
  </div>

  {#if stats && stats.mostConnected.length > 0}
    <div class="graph-info">
      <details>
        <summary>Most Connected</summary>
        <ul>
          {#each stats.mostConnected.slice(0, 5) as node}
            <li>{node.label} ({node.connections})</li>
          {/each}
        </ul>
      </details>
      {#if stats.orphans.length > 0}
        <details>
          <summary>Orphans ({stats.orphanCount})</summary>
          <ul>
            {#each stats.orphans as orphan}
              <li>{orphan}</li>
            {/each}
          </ul>
        </details>
      {/if}
    </div>
  {/if}
</div>

<style>
  .graph-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .graph-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .graph-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .stat {
    padding: 0.25rem 0.5rem;
    background: var(--bg-tertiary);
    border-radius: 4px;
  }

  .stat.warning {
    color: var(--warning);
  }

  .graph-actions {
    display: flex;
    gap: 0.5rem;
  }

  .icon-button {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
  }

  .icon-button:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .graph-container {
    flex: 1;
    min-height: 0;
    position: relative;
  }

  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--text-muted);
  }

  .graph-info {
    padding: 0.5rem 1rem;
    border-top: 1px solid var(--border);
    font-size: 0.75rem;
    max-height: 150px;
    overflow-y: auto;
  }

  .graph-info details {
    margin-bottom: 0.5rem;
  }

  .graph-info summary {
    cursor: pointer;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .graph-info ul {
    margin: 0.25rem 0 0 1rem;
    padding: 0;
    list-style: none;
  }

  .graph-info li {
    color: var(--text-muted);
    padding: 0.1rem 0;
  }

  /* Cytoscape node highlighting */
  :global(.graph-container .highlighted) {
    background-color: #22c55e !important;
  }
</style>
