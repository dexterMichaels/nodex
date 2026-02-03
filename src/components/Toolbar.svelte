<script>
  import { vaultName, rootHandle, fileTree, currentFile } from '../stores/vault.js';
  import { showSettings } from '../stores/ai.js';
  import { openVault, buildFileTree } from '../lib/filesystem.js';
  import { clearVault } from '../stores/vault.js';

  async function handleOpenVault() {
    const handle = await openVault();
    if (handle) {
      $rootHandle = handle;
      $vaultName = handle.name;
      $fileTree = await buildFileTree(handle);
      $currentFile = null;
    }
  }

  function handleCloseVault() {
    clearVault();
  }
</script>

<header class="toolbar">
  <div class="left">
    <span class="brand">Nodex</span>
    <span class="vault-name">{$vaultName}</span>
  </div>

  <div class="center">
    {#if $currentFile}
      <span class="current-file">{$currentFile.path}</span>
    {/if}
  </div>

  <div class="right">
    <button class="icon-button" on:click={() => $showSettings = !$showSettings} title="AI Settings">
      ⚙️
    </button>
    <button class="icon-button" on:click={handleOpenVault} title="Open Different Vault">
      📂
    </button>
    <button class="icon-button" on:click={handleCloseVault} title="Close Vault">
      ✕
    </button>
  </div>
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border);
    height: 48px;
  }

  .left, .right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .center {
    flex: 1;
    text-align: center;
  }

  .brand {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--accent);
  }

  .vault-name {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .current-file {
    color: var(--text-muted);
    font-size: 0.8rem;
    font-family: monospace;
  }

  .icon-button {
    background: transparent;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    font-size: 1rem;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .icon-button:hover {
    background: var(--bg-secondary);
  }
</style>
