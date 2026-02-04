<script>
  import { marked } from 'marked';
  import { currentFile } from '../stores/vault.js';

  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  $: html = $currentFile?.content ? marked.parse($currentFile.content) : '';
</script>

<div class="markdown-preview" data-testid="markdown-preview">
  {#if $currentFile}
    <div class="preview-header">
      <span class="filename">{$currentFile.name}</span>
    </div>
    <div class="preview-content">
      {@html html}
    </div>
  {:else}
    <div class="no-file">
      <p>Select a file to preview</p>
    </div>
  {/if}
</div>

<style>
  .markdown-preview {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .preview-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    font-size: 0.875rem;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .filename {
    font-weight: 500;
  }

  .preview-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    min-height: 0;
  }

  .no-file {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  /* Markdown content styling */
  .preview-content :global(h1) {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
    color: var(--text-primary);
  }

  .preview-content :global(h2) {
    font-size: 1.4rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: var(--text-primary);
  }

  .preview-content :global(h3) {
    font-size: 1.15rem;
    font-weight: 600;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }

  .preview-content :global(p) {
    margin-bottom: 1rem;
    line-height: 1.7;
    color: var(--text-secondary);
  }

  .preview-content :global(ul),
  .preview-content :global(ol) {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
    color: var(--text-secondary);
  }

  .preview-content :global(li) {
    margin-bottom: 0.35rem;
    line-height: 1.6;
  }

  .preview-content :global(a) {
    color: var(--accent);
    text-decoration: none;
  }

  .preview-content :global(a:hover) {
    text-decoration: underline;
  }

  .preview-content :global(code) {
    background: var(--bg-tertiary);
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.875em;
    color: #f472b6;
  }

  .preview-content :global(pre) {
    background: var(--bg-tertiary);
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    margin-bottom: 1rem;
  }

  .preview-content :global(pre code) {
    background: none;
    padding: 0;
    color: var(--text-primary);
  }

  .preview-content :global(blockquote) {
    border-left: 3px solid var(--accent);
    padding-left: 1rem;
    margin: 1rem 0;
    color: var(--text-muted);
    font-style: italic;
  }

  .preview-content :global(hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 1.5rem 0;
  }

  .preview-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
  }

  .preview-content :global(th),
  .preview-content :global(td) {
    border: 1px solid var(--border);
    padding: 0.5rem 0.75rem;
    text-align: left;
  }

  .preview-content :global(th) {
    background: var(--bg-tertiary);
    font-weight: 600;
  }

  .preview-content :global(img) {
    max-width: 100%;
    border-radius: 4px;
  }

  /* Wiki-link styling (they render as plain text by default) */
  .preview-content :global(a[href^="[["]) {
    color: var(--accent);
    background: var(--bg-tertiary);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
  }
</style>
