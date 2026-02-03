<script>
  import { currentFile } from '../stores/vault.js';

  export let node;
  export let depth = 0;
  export let onSelect;

  function getIcon(n) {
    if (n.type === 'folder') {
      return n.expanded ? '📂' : '📁';
    }
    if (n.isMarkdown) {
      return '📄';
    }
    return '📎';
  }

  function handleClick() {
    onSelect(node);
  }

  function handleKeypress(e) {
    if (e.key === 'Enter') {
      onSelect(node);
    }
  }
</script>

<div
  class="tree-node"
  class:folder={node.type === 'folder'}
  class:file={node.type === 'file'}
  class:active={$currentFile?.path === node.path}
  style="padding-left: {depth * 16 + 12}px"
  on:click={handleClick}
  on:keypress={handleKeypress}
  role="button"
  tabindex="0"
>
  <span class="icon">{getIcon(node)}</span>
  <span class="name">{node.name}</span>
</div>

{#if node.type === 'folder' && node.expanded && node.children}
  {#each node.children as child (child.path)}
    <svelte:self node={child} depth={depth + 1} {onSelect} />
  {/each}
{/if}

<style>
  .tree-node {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--text-secondary);
    transition: background 0.1s;
  }

  .tree-node:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .tree-node.active {
    background: rgba(99, 102, 241, 0.2);
    color: var(--text-primary);
  }

  .tree-node.folder {
    color: var(--text-primary);
  }

  .icon {
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
