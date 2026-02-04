<script>
  import { onMount } from 'svelte';
  import { rootHandle, fileTree, vaultName, currentFile, isLoading, error, viewMode, editorMode } from './stores/vault.js';
  import { messages } from './stores/ai.js';
  import { isSupported, openVault, buildFileTree, readFile } from './lib/filesystem.js';
  import FileTree from './components/FileTree.svelte';
  import Editor from './components/Editor.svelte';
  import MarkdownPreview from './components/MarkdownPreview.svelte';
  import GraphView from './components/GraphView.svelte';
  import AIPanel from './components/AIPanel.svelte';
  import Toolbar from './components/Toolbar.svelte';

  const supported = isSupported();
  let testMode = false;

  // AI Panel resizing
  let aiPanelWidth = 350;
  let isResizing = false;
  let workspaceEl;

  function startResize(e) {
    isResizing = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function handleResize(e) {
    if (!isResizing || !workspaceEl) return;
    const workspaceRect = workspaceEl.getBoundingClientRect();
    const newWidth = workspaceRect.right - e.clientX;
    // Constrain between 250px and 600px
    aiPanelWidth = Math.max(250, Math.min(600, newWidth));
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  // Handle node selection from graph view
  async function handleNodeSelect(event) {
    const { file } = event.detail;
    if (file) {
      try {
        let content = '';
        if (file.handle) {
          content = await readFile(file.handle);
        } else if (file.content) {
          content = file.content;
        }
        $currentFile = { ...file, content };
        $viewMode = 'editor'; // Switch to editor to show the file
      } catch (err) {
        console.error('Failed to read file:', err);
      }
    }
  }

  onMount(() => {
    // Check for test mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('testMode') === 'true') {
      testMode = true;
      loadTestData();
    }
  });

  function loadTestData() {
    // Mock vault name
    $vaultName = 'Test Vault';
    $rootHandle = { name: 'Test Vault' }; // Mock handle to bypass welcome screen

    // Generate mock file tree with many files to test scrolling
    // Include content with wiki-links for graph testing
    const mockFolders = ['Concepts', 'Projects', 'Journal', 'Processes', 'Systems'];
    const mockTree = mockFolders.map((folder, fi) => ({
      name: folder,
      path: folder,
      type: 'folder',
      expanded: folder === 'Concepts',
      handle: null,
      children: Array.from({ length: 10 }, (_, i) => {
        // Create links between files for graph visualization
        const links = [];
        if (i > 0) links.push(`[[${folder.slice(0, -1)} ${i}]]`);
        if (i < 9) links.push(`[[${folder.slice(0, -1)} ${i + 2}]]`);
        // Cross-folder links
        if (i === 0 && fi < mockFolders.length - 1) {
          links.push(`[[${mockFolders[fi + 1].slice(0, -1)} 1]]`);
        }
        links.push('[[README]]');

        return {
          name: `${folder.slice(0, -1)} ${i + 1}.md`,
          path: `${folder}/${folder.slice(0, -1)} ${i + 1}.md`,
          type: 'file',
          isMarkdown: true,
          handle: null,
          content: `# ${folder.slice(0, -1)} ${i + 1}\n\nThis is a test note.\n\n## Links\n\n${links.join('\n')}`
        };
      })
    }));

    // Add some root-level files
    mockTree.push({
      name: 'README.md',
      path: 'README.md',
      type: 'file',
      isMarkdown: true,
      handle: null
    });

    $fileTree = mockTree;

    // Set a mock current file
    $currentFile = {
      name: 'README.md',
      path: 'README.md',
      type: 'file',
      isMarkdown: true,
      handle: null,
      content: `# Test Vault

This is a **test vault** for Playwright testing.

## Features

- File tree scrolling
- AI panel scrolling
- Markdown preview

## Links

Check out [[Concept 1]] and [[Project 1]].

\`\`\`javascript
const test = "code block";
console.log(test);
\`\`\`

> This is a blockquote for testing styles.

### More Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
`
    };

    // Add mock AI messages with markdown formatting to test rendering
    const mockResponses = [
      `## Organizing Your Vault

Here's how to organize your vault effectively:

1. **Use folders** for major categories
2. **Add frontmatter** to every note
3. **Link related notes** with \`[[wiki-links]]\`

> The key is consistency in your naming conventions.

See [[Getting Started]] for more details.`,
      `### Recommended Structure

\`\`\`
vault/
├── Concepts/
├── Projects/
├── Processes/
└── Journal/
\`\`\`

Each folder serves a **specific purpose**:
- *Concepts* - definitions and mental models
- *Projects* - time-bound initiatives
- *Processes* - reusable procedures`,
      `To create a new note:

1. Click the **+** button in the file tree
2. Choose a descriptive name
3. Add frontmatter at the top:

\`\`\`yaml
---
type: concept
created: 2026-02-03
tags: [knowledge-management]
---
\`\`\`

Then start writing your content with **bold**, *italic*, and \`code\` formatting.`
    ];

    const mockMessages = [];
    for (let i = 0; i < 6; i++) {
      mockMessages.push({
        role: 'user',
        content: `Question ${i + 1}: How do I organize my vault?`,
        timestamp: Date.now() - (6 - i) * 120000
      });
      mockMessages.push({
        role: 'assistant',
        content: mockResponses[i % mockResponses.length],
        timestamp: Date.now() - (6 - i) * 120000 + 30000
      });
    }

    $messages = mockMessages;
  }

  async function handleOpenVault() {
    $isLoading = true;
    $error = null;

    try {
      const handle = await openVault();
      if (handle) {
        $rootHandle = handle;
        $vaultName = handle.name;
        $fileTree = await buildFileTree(handle);
      }
    } catch (err) {
      $error = err.message;
    } finally {
      $isLoading = false;
    }
  }
</script>

<main class="app">
  {#if !supported}
    <div class="unsupported">
      <h1>Browser Not Supported</h1>
      <p>
        Nodex requires the File System Access API, which is currently only
        available in Chrome and Edge browsers.
      </p>
      <p>
        Please open this page in <strong>Chrome</strong> or <strong>Edge</strong>
        to use Nodex.
      </p>
    </div>
  {:else if !$rootHandle}
    <div class="welcome">
      <div class="welcome-content">
        <h1>Nodex</h1>
        <p class="tagline">Your AI-powered knowledge base</p>

        <div class="features">
          <div class="feature">
            <span class="icon">📁</span>
            <span>Local files stay on your computer</span>
          </div>
          <div class="feature">
            <span class="icon">🤖</span>
            <span>AI librarian to organize and query</span>
          </div>
          <div class="feature">
            <span class="icon">🔗</span>
            <span>Visual knowledge graph</span>
          </div>
        </div>

        <button class="open-vault" on:click={handleOpenVault} disabled={$isLoading}>
          {#if $isLoading}
            Opening...
          {:else}
            Open Vault Folder
          {/if}
        </button>

        {#if $error}
          <p class="error">{$error}</p>
        {/if}

        <p class="hint">
          Select a folder containing your markdown files.
          Nodex will only have access to that folder.
        </p>
      </div>
    </div>
  {:else}
    <Toolbar />
    <div
      class="workspace"
      data-testid="workspace"
      bind:this={workspaceEl}
      style="grid-template-columns: 250px 1fr 4px {aiPanelWidth}px"
    >
      <aside class="sidebar" data-testid="sidebar">
        <FileTree />
      </aside>
      <section class="editor-pane" data-testid="editor-pane">
        <div class="view-toggle" data-testid="view-toggle">
          <div class="toggle-group">
            <button
              class="toggle-btn"
              class:active={$viewMode === 'editor'}
              on:click={() => $viewMode = 'editor'}
            >
              Editor
            </button>
            <button
              class="toggle-btn"
              class:active={$viewMode === 'graph'}
              on:click={() => $viewMode = 'graph'}
            >
              Graph
            </button>
          </div>
          {#if $viewMode === 'editor'}
            <div class="toggle-group">
              <button
                class="toggle-btn small"
                class:active={$editorMode === 'edit'}
                on:click={() => $editorMode = 'edit'}
              >
                Edit
              </button>
              <button
                class="toggle-btn small"
                class:active={$editorMode === 'preview'}
                on:click={() => $editorMode = 'preview'}
              >
                Preview
              </button>
            </div>
          {/if}
        </div>
        {#if $viewMode === 'editor'}
          {#if $editorMode === 'edit'}
            <Editor />
          {:else}
            <MarkdownPreview />
          {/if}
        {:else}
          <div class="graph-wrapper" on:nodeselect={handleNodeSelect}>
            <GraphView />
          </div>
        {/if}
      </section>
      <div
        class="resize-handle"
        on:mousedown={startResize}
        class:active={isResizing}
        role="separator"
        aria-orientation="vertical"
        tabindex="0"
      ></div>
      <aside class="ai-pane" data-testid="ai-pane">
        <AIPanel />
      </aside>
    </div>
  {/if}
</main>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.5;
  }

  :global(:root) {
    --bg-primary: #1a1a2e;
    --bg-secondary: #16213e;
    --bg-tertiary: #0f0f1a;
    --text-primary: #e4e4e7;
    --text-secondary: #a1a1aa;
    --text-muted: #71717a;
    --accent: #6366f1;
    --accent-hover: #818cf8;
    --border: #27273a;
    --success: #22c55e;
    --warning: #f59e0b;
    --error: #ef4444;
  }

  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
  }

  .unsupported, .welcome {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
  }

  .welcome-content {
    max-width: 480px;
  }

  .welcome h1 {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, var(--accent), #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .tagline {
    color: var(--text-secondary);
    font-size: 1.2rem;
    margin-bottom: 2rem;
  }

  .features {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
    text-align: left;
  }

  .feature {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--text-secondary);
  }

  .feature .icon {
    font-size: 1.5rem;
  }

  .open-vault {
    background: var(--accent);
    color: white;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
    width: 100%;
  }

  .open-vault:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .open-vault:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .hint {
    margin-top: 1rem;
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .error {
    color: var(--error);
    margin-top: 1rem;
  }

  .workspace {
    flex: 1;
    display: grid;
    /* grid-template-columns set via inline style for resize */
    overflow: hidden;
  }

  .resize-handle {
    width: 4px;
    background: var(--border);
    cursor: col-resize;
    transition: background 0.15s;
    position: relative;
  }

  .resize-handle:hover,
  .resize-handle.active {
    background: var(--accent);
  }

  .resize-handle::before {
    content: '';
    position: absolute;
    top: 0;
    left: -4px;
    right: -4px;
    bottom: 0;
  }

  .sidebar {
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    overflow: hidden;
    min-height: 0;
  }

  .editor-pane {
    background: var(--bg-primary);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .view-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .toggle-group {
    display: flex;
    gap: 0.25rem;
  }

  .toggle-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    padding: 0.35rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.15s;
  }

  .toggle-btn.small {
    padding: 0.25rem 0.75rem;
    font-size: 0.7rem;
  }

  .toggle-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .toggle-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }

  .graph-wrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .ai-pane {
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  @media (max-width: 1024px) {
    .workspace {
      grid-template-columns: 200px 1fr 280px;
    }
  }
</style>
