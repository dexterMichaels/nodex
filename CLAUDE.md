# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
# Install dependencies
npm install

# Start dev server (opens http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

Browser-based knowledge management app with three-pane layout:
- **Left**: File tree (FileTree.svelte + TreeNode.svelte)
- **Center**: Markdown editor with CodeMirror 6 (Editor.svelte)
- **Right**: AI chat panel (AIPanel.svelte)

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/filesystem.js` | File System Access API wrapper for local file operations |
| `src/lib/ai.js` | Direct API integration with Anthropic/OpenAI, streaming |
| `src/lib/markdown.js` | Frontmatter parsing, wiki-link extraction |
| `src/lib/graph.js` | Build graph from vault links (Cytoscape.js) |
| `src/stores/vault.js` | Svelte stores for vault state |
| `src/stores/ai.js` | Svelte stores for AI conversation state, localStorage persistence |

### Components

| Component | Purpose |
|-----------|---------|
| `App.svelte` | Root component, welcome screen, workspace layout |
| `Toolbar.svelte` | Top bar with vault name, settings, close vault |
| `FileTree.svelte` | Left sidebar container |
| `TreeNode.svelte` | Recursive file/folder node (used by FileTree) |
| `Editor.svelte` | CodeMirror 6 markdown editor with auto-save |
| `AIPanel.svelte` | AI chat interface with settings, streaming responses |

### Data Flow

```
User grants folder access
        ↓
filesystem.js builds file tree
        ↓
vault.js stores state
        ↓
FileTree.svelte renders navigation
        ↓
User clicks file → filesystem.js reads content
        ↓
Editor.svelte displays in CodeMirror
        ↓
User types in AI panel → ai.js calls API with vault context
        ↓
Response streams back → AIPanel.svelte renders
```

## Tech Stack

- **Svelte 4** - Component framework
- **Vite 5** - Build tool
- **CodeMirror 6** - Editor
- **Cytoscape.js** - Graph visualization

## Key Patterns

### File System Access

All file operations go through `src/lib/filesystem.js`. The browser sandboxes access to the user-selected folder only.

```javascript
// Open vault
const handle = await openVault();

// Build tree
const tree = await buildFileTree(handle);

// Read/write files
const content = await readFile(fileHandle);
await writeFile(fileHandle, newContent);
```

### AI Integration

Direct fetch to provider APIs with streaming:

```javascript
await sendMessage({
  provider: 'anthropic',
  apiKey: key,
  messages: conversation,
  vaultStructure: fileList,
  currentFile: openFile,
  onChunk: (text) => appendToStream(text)
});
```

### Svelte Stores

Reactive state management:

```javascript
// In component
import { currentFile } from '../stores/vault.js';

// Reactive
$: if ($currentFile) {
  loadEditor($currentFile.content);
}
```

## Browser Requirement

Requires File System Access API (Chrome/Edge only). Check with:

```javascript
if ('showDirectoryPicker' in window) {
  // Supported
}
```

## Adding Features

1. **New component**: Create in `src/components/`, import in App.svelte
2. **New store**: Create in `src/stores/`, import where needed
3. **New utility**: Create in `src/lib/`, keep framework-agnostic
