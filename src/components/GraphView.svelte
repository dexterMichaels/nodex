<script>
  import { onMount, onDestroy } from 'svelte';
  import cytoscape from 'cytoscape';
  import { markdownFiles, currentFile } from '../stores/vault.js';
  import { buildGraphData, createCytoscapeConfig, getGraphStats } from '../lib/graph.js';
  import { readFile } from '../lib/filesystem.js';
  import {
    graphViews,
    selectedViewId,
    activeViewId,
    createView,
    deleteView,
    getView,
    applyView,
    clearActiveView
  } from '../stores/graphViews.js';

  let container;
  let cy = null;
  let stats = null;
  let loading = true;
  let graphData = null;

  // Filters
  let hideOrphans = false;

  // View management
  let newViewName = '';
  let showViewModal = false;

  // Build graph when files or filter changes
  $: if (container && $markdownFiles.length > 0) {
    buildGraph();
  }

  // Rebuild when orphan filter changes
  $: if (cy && graphData) {
    applyOrphanFilter();
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
        content = file.content || '';
      }
      filesWithContent.push({ path: file.path, content });
    }

    graphData = buildGraphData(filesWithContent);
    stats = getGraphStats(graphData);

    initCytoscape();
    loading = false;
  }

  function initCytoscape() {
    if (cy) {
      cy.destroy();
    }

    const config = createCytoscapeConfig(container, graphData, { hideOrphans });
    cy = cytoscape(config);

    // Add event handlers
    setupEventHandlers();

    // Apply active view if any
    if ($activeViewId) {
      const view = getView($activeViewId);
      if (view) {
        restoreViewState(view.state);
      }
    }

    // Highlight current file
    if ($currentFile) {
      highlightNode($currentFile.path);
    }
  }

  function setupEventHandlers() {
    // Node click handler
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      handleNodeClick(node.data());
    });

    // Drag start - highlight connected nodes
    cy.on('grab', 'node', (evt) => {
      const node = evt.target;
      node.addClass('dragging');

      // Highlight neighbors
      const neighbors = node.neighborhood('node');
      neighbors.addClass('neighbor');

      // Highlight connected edges
      node.connectedEdges().addClass('highlighted');
    });

    // Drag - move connected nodes with force effect
    cy.on('drag', 'node', (evt) => {
      const node = evt.target;
      const neighbors = node.neighborhood('node');

      // Apply subtle force to neighbors (they follow partially)
      neighbors.forEach(neighbor => {
        if (!neighbor.grabbed()) {
          const nodePos = node.position();
          const neighborPos = neighbor.position();
          const dx = nodePos.x - neighborPos.x;
          const dy = nodePos.y - neighborPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 50) {
            // Move neighbor slightly toward dragged node
            const factor = 0.05;
            neighbor.position({
              x: neighborPos.x + dx * factor,
              y: neighborPos.y + dy * factor
            });
          }
        }
      });
    });

    // Drag end - remove highlights
    cy.on('free', 'node', (evt) => {
      const node = evt.target;
      node.removeClass('dragging');
      cy.nodes().removeClass('neighbor');
      cy.edges().removeClass('highlighted');
    });
  }

  function applyOrphanFilter() {
    if (!cy || !graphData) return;

    if (hideOrphans) {
      cy.nodes('[isOrphan]').hide();
    } else {
      cy.nodes('[isOrphan]').show();
    }
  }

  function handleNodeClick(nodeData) {
    const file = $markdownFiles.find(f => f.path === nodeData.path);
    if (file) {
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
    if (node && node.length) {
      node.addClass('highlighted');
      cy.animate({
        center: { eles: node },
        duration: 300
      });
    }
  }

  $: if (cy && $currentFile) {
    highlightNode($currentFile.path);
  }

  // Graph actions
  function handleFit() {
    if (cy) {
      cy.fit(undefined, 40);
    }
  }

  function handleRelayout() {
    if (cy) {
      cy.layout({
        name: 'cose',
        animate: true,
        animationDuration: 800,
        nodeRepulsion: 500000,
        gravity: 50
      }).run();
    }
  }

  // View management
  function captureCurrentState() {
    if (!cy) return null;

    const positions = {};
    cy.nodes().forEach(node => {
      positions[node.id()] = node.position();
    });

    return {
      positions,
      zoom: cy.zoom(),
      pan: cy.pan(),
      hideOrphans
    };
  }

  function handleCaptureView() {
    showViewModal = true;
    newViewName = `View ${$graphViews.length + 1}`;
  }

  function confirmCreateView() {
    if (!newViewName.trim()) return;

    const state = captureCurrentState();
    if (state) {
      const id = createView(newViewName.trim(), state);
      selectedViewId.set(id);
      activeViewId.set(id);
    }

    showViewModal = false;
    newViewName = '';
  }

  function cancelCreateView() {
    showViewModal = false;
    newViewName = '';
  }

  function handleApplyView() {
    if (!$selectedViewId) return;

    applyView($selectedViewId);

    const view = getView($selectedViewId);
    if (view) {
      restoreViewState(view.state);
    }
  }

  function restoreViewState(state) {
    if (!cy || !state) return;

    // Restore orphan filter
    if (state.hideOrphans !== undefined) {
      hideOrphans = state.hideOrphans;
    }

    // Restore positions
    if (state.positions) {
      cy.nodes().forEach(node => {
        const pos = state.positions[node.id()];
        if (pos) {
          node.position(pos);
        }
      });
    }

    // Restore zoom and pan
    if (state.zoom) {
      cy.zoom(state.zoom);
    }
    if (state.pan) {
      cy.pan(state.pan);
    }
  }

  function handleDeleteView(id) {
    if (confirm('Delete this view? This cannot be undone.')) {
      deleteView(id);
    }
  }

  function handleResetView() {
    clearActiveView();
    hideOrphans = false;
    if (cy) {
      handleRelayout();
    }
  }

  onDestroy(() => {
    if (cy) {
      cy.destroy();
    }
  });
</script>

<div class="graph-view" data-testid="graph-view">
  <!-- Toolbar -->
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
      <button class="icon-button" on:click={handleFit} title="Fit to view">Fit</button>
      <button class="icon-button" on:click={handleRelayout} title="Re-layout">Relayout</button>
    </div>
  </div>

  <!-- Filters -->
  <div class="graph-filters">
    <label class="filter-toggle">
      <input type="checkbox" bind:checked={hideOrphans} />
      <span>Hide orphans</span>
    </label>
  </div>

  <!-- Views Section -->
  <div class="graph-views">
    <div class="views-header">
      <span class="views-label">Views</span>
      <button class="capture-btn" on:click={handleCaptureView} title="Capture current view">
        Capture
      </button>
    </div>

    {#if $graphViews.length > 0}
      <div class="views-list">
        <select bind:value={$selectedViewId} class="view-select">
          <option value={null}>-- Select View --</option>
          {#each $graphViews as view}
            <option value={view.id}>{view.name}</option>
          {/each}
        </select>

        <button
          class="apply-btn"
          on:click={handleApplyView}
          disabled={!$selectedViewId || $selectedViewId === $activeViewId}
          title="Apply selected view"
        >
          Change View
        </button>

        {#if $selectedViewId}
          <button
            class="delete-btn"
            on:click={() => handleDeleteView($selectedViewId)}
            title="Delete selected view"
          >
            Delete
          </button>
        {/if}
      </div>

      {#if $activeViewId}
        <div class="active-view-info">
          Active: <strong>{getView($activeViewId)?.name}</strong>
          <button class="reset-btn" on:click={handleResetView}>Reset</button>
        </div>
      {/if}
    {:else}
      <p class="no-views">No saved views. Capture to save current layout.</p>
    {/if}
  </div>

  <!-- Graph Container -->
  <div class="graph-container" bind:this={container} data-testid="graph-container">
    {#if loading}
      <div class="loading">Building graph...</div>
    {/if}
  </div>

  <!-- Info Panel -->
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
      {#if stats.orphans.length > 0 && !hideOrphans}
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

  <!-- View Creation Modal -->
  {#if showViewModal}
    <div class="modal-overlay" on:click={cancelCreateView}>
      <div class="modal" on:click|stopPropagation>
        <h3>Save View</h3>
        <p>Enter a name for this view:</p>
        <input
          type="text"
          bind:value={newViewName}
          placeholder="View name"
          on:keydown={(e) => e.key === 'Enter' && confirmCreateView()}
          autofocus
        />
        <div class="modal-actions">
          <button class="cancel-btn" on:click={cancelCreateView}>Cancel</button>
          <button class="confirm-btn" on:click={confirmCreateView}>Save</button>
        </div>
      </div>
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
    gap: 0.75rem;
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

  /* Filters */
  .graph-filters {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .filter-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .filter-toggle input {
    cursor: pointer;
  }

  /* Views Section */
  .graph-views {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .views-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .views-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .capture-btn {
    background: var(--accent);
    border: none;
    color: white;
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.7rem;
  }

  .capture-btn:hover {
    background: var(--accent-hover);
  }

  .views-list {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .view-select {
    flex: 1;
    padding: 0.3rem 0.5rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.75rem;
  }

  .apply-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--accent);
    color: var(--accent);
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.7rem;
  }

  .apply-btn:hover:not(:disabled) {
    background: var(--accent);
    color: white;
  }

  .apply-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .delete-btn {
    background: transparent;
    border: 1px solid var(--error);
    color: var(--error);
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.7rem;
  }

  .delete-btn:hover {
    background: var(--error);
    color: white;
  }

  .active-view-info {
    margin-top: 0.5rem;
    font-size: 0.7rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .active-view-info strong {
    color: var(--accent);
  }

  .reset-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 0.15rem 0.4rem;
    cursor: pointer;
    font-size: 0.65rem;
    text-decoration: underline;
  }

  .reset-btn:hover {
    color: var(--text-primary);
  }

  .no-views {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-style: italic;
    margin: 0;
  }

  /* Graph Container */
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

  /* Info Panel */
  .graph-info {
    padding: 0.5rem 1rem;
    border-top: 1px solid var(--border);
    font-size: 0.75rem;
    max-height: 120px;
    overflow-y: auto;
    flex-shrink: 0;
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

  /* Modal */
  .modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: var(--bg-secondary);
    padding: 1.5rem;
    border-radius: 8px;
    min-width: 280px;
    border: 1px solid var(--border);
  }

  .modal h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .modal p {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .modal input {
    width: 100%;
    padding: 0.5rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .modal input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .cancel-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    padding: 0.4rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .cancel-btn:hover {
    background: var(--bg-primary);
  }

  .confirm-btn {
    background: var(--accent);
    border: none;
    color: white;
    padding: 0.4rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .confirm-btn:hover {
    background: var(--accent-hover);
  }
</style>
