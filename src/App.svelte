<script>
  import { onMount } from 'svelte';
  import { rootHandle, fileTree, vaultName, currentFile, isLoading, error } from './stores/vault.js';
  import { messages } from './stores/ai.js';
  import { isSupported, openVault, buildFileTree } from './lib/filesystem.js';
  import FileTree from './components/FileTree.svelte';
  import Editor from './components/Editor.svelte';
  import AIPanel from './components/AIPanel.svelte';
  import Toolbar from './components/Toolbar.svelte';

  const supported = isSupported();
  let testMode = false;

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
    const mockFolders = ['Concepts', 'Projects', 'Journal', 'Processes', 'Systems'];
    const mockTree = mockFolders.map(folder => ({
      name: folder,
      path: folder,
      type: 'folder',
      expanded: folder === 'Concepts',
      handle: null,
      children: Array.from({ length: 10 }, (_, i) => ({
        name: `${folder.slice(0, -1)} ${i + 1}.md`,
        path: `${folder}/${folder.slice(0, -1)} ${i + 1}.md`,
        type: 'file',
        isMarkdown: true,
        handle: null
      }))
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

    // Add mock AI messages to test scrolling
    const mockMessages = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: i % 2 === 0
        ? `Test question ${Math.floor(i / 2) + 1}: How do I organize my vault?`
        : `This is a test response ${Math.floor(i / 2) + 1}. You should organize your vault using folders like Concepts, Projects, and Processes. Each note should have proper frontmatter and links to related notes.`,
      timestamp: Date.now() - (15 - i) * 60000
    }));

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
    <div class="workspace" data-testid="workspace">
      <aside class="sidebar" data-testid="sidebar">
        <FileTree />
      </aside>
      <section class="editor-pane" data-testid="editor-pane">
        <Editor />
      </section>
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
    grid-template-columns: 250px 1fr 350px;
    overflow: hidden;
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
