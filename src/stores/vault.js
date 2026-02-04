import { writable, derived } from 'svelte/store';

// Root directory handle
export const rootHandle = writable(null);

// Current view mode: 'editor' or 'graph'
export const viewMode = writable('editor');

// Editor mode: 'edit' or 'preview'
export const editorMode = writable('edit');

// File tree structure
export const fileTree = writable([]);

// Vault name (folder name)
export const vaultName = writable('');

// Currently selected file
export const currentFile = writable(null);

// File content cache
export const fileContents = writable(new Map());

// Loading state
export const isLoading = writable(false);

// Error state
export const error = writable(null);

// Derived: flat list of all markdown files
export const markdownFiles = derived(fileTree, ($fileTree) => {
  const files = [];

  function traverse(nodes, path = '') {
    for (const node of nodes) {
      if (node.type === 'file' && node.isMarkdown) {
        files.push(node);
      } else if (node.type === 'folder' && node.children) {
        traverse(node.children, node.path);
      }
    }
  }

  traverse($fileTree);
  return files;
});

// Derived: vault structure as text for AI context
export const vaultStructureText = derived(fileTree, ($fileTree) => {
  const lines = [];

  function traverse(nodes, indent = 0) {
    for (const node of nodes) {
      const prefix = '  '.repeat(indent);
      if (node.type === 'folder') {
        lines.push(`${prefix}${node.name}/`);
        if (node.children) {
          traverse(node.children, indent + 1);
        }
      } else if (node.isMarkdown) {
        lines.push(`${prefix}${node.name}`);
      }
    }
  }

  traverse($fileTree);
  return lines.join('\n');
});

// Actions
export function clearVault() {
  rootHandle.set(null);
  fileTree.set([]);
  vaultName.set('');
  currentFile.set(null);
  fileContents.set(new Map());
  error.set(null);
}
