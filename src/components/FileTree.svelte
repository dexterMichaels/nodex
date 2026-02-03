<script>
  import { fileTree, currentFile } from '../stores/vault.js';
  import { readFile } from '../lib/filesystem.js';
  import TreeNode from './TreeNode.svelte';

  async function handleFileClick(node) {
    if (node.type === 'folder') {
      node.expanded = !node.expanded;
      $fileTree = [...$fileTree]; // Trigger reactivity with new array
    } else if (node.isMarkdown) {
      try {
        const content = await readFile(node.handle);
        $currentFile = {
          ...node,
          content
        };
      } catch (err) {
        console.error('Failed to read file:', err);
      }
    }
  }
</script>

<div class="file-tree">
  <div class="header">
    <span class="title">Files</span>
  </div>

  <div class="tree-content">
    {#each $fileTree as node (node.path)}
      <TreeNode {node} depth={0} onSelect={handleFileClick} />
    {/each}
  </div>
</div>

<style>
  .file-tree {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .tree-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
  }
</style>
