<script>
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { markdown } from '@codemirror/lang-markdown';
  import { EditorState } from '@codemirror/state';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { currentFile, rootHandle } from '../stores/vault.js';
  import { writeFile } from '../lib/filesystem.js';

  let editorContainer;
  let editorView;
  let hasUnsavedChanges = false;
  let saveTimeout;

  // Custom theme to match our design
  const nodexTheme = EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '14px'
    },
    '.cm-scroller': {
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      padding: '1rem'
    },
    '.cm-content': {
      caretColor: 'var(--accent)'
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--accent)'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'rgba(99, 102, 241, 0.3)'
    },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-tertiary)',
      color: 'var(--text-muted)',
      border: 'none'
    }
  });

  function createEditor(content = '') {
    if (editorView) {
      editorView.destroy();
    }

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        nodexTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            hasUnsavedChanges = true;
            debouncedSave();
          }
        })
      ]
    });

    editorView = new EditorView({
      state,
      parent: editorContainer
    });
  }

  function debouncedSave() {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(saveFile, 1000);
  }

  async function saveFile() {
    if (!$currentFile || !editorView) return;

    try {
      const content = editorView.state.doc.toString();
      await writeFile($currentFile.handle, content);
      hasUnsavedChanges = false;
      $currentFile.content = content;
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }

  // Keyboard shortcuts
  function handleKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      saveFile();
    }
  }

  // Watch for file changes
  $: if ($currentFile && editorContainer) {
    createEditor($currentFile.content);
  }

  onMount(() => {
    if (editorContainer && !$currentFile) {
      // Show placeholder
    }
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    if (editorView) {
      editorView.destroy();
    }
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="editor-container">
  {#if $currentFile}
    <div class="editor-header">
      <span class="filename">{$currentFile.name}</span>
      {#if hasUnsavedChanges}
        <span class="unsaved">●</span>
      {/if}
    </div>
    <div class="editor" bind:this={editorContainer}></div>
  {:else}
    <div class="placeholder">
      <div class="placeholder-content">
        <span class="placeholder-icon">📝</span>
        <p>Select a file to edit</p>
        <p class="hint">Or use the AI panel to create new notes</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .editor-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border);
    font-size: 0.875rem;
  }

  .filename {
    color: var(--text-primary);
  }

  .unsaved {
    color: var(--warning);
  }

  .editor {
    flex: 1;
    overflow: hidden;
  }

  .editor :global(.cm-editor) {
    height: 100%;
  }

  .placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .placeholder-content {
    color: var(--text-muted);
  }

  .placeholder-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
  }

  .placeholder .hint {
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
</style>
