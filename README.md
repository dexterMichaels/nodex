# Nodex App

Browser-based knowledge management with AI assistance.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in Chrome or Edge.

## Requirements

- **Browser**: Chrome or Edge (requires File System Access API)
- **API Key**: Anthropic or OpenAI API key for AI features

## Usage

1. Click "Open Vault Folder" and select a folder containing markdown files
2. Click the gear icon to configure your AI API key
3. Browse files in the left panel, edit in the center
4. Use the AI panel on the right to ask questions or create notes

## Features

### Current (v0.1)

- [x] Open local folder as vault
- [x] File tree navigation
- [x] Markdown editing with syntax highlighting
- [x] Auto-save to disk
- [x] AI chat with vault context
- [x] Streaming responses
- [x] API key stored locally (never sent to our servers)

### Planned

- [ ] Wiki-link syntax highlighting and click-to-open
- [ ] Graph view of note connections
- [ ] AI file creation/editing with confirmation
- [ ] Search across vault
- [ ] Dark/light theme toggle

## Architecture

```
src/
├── main.js              # Entry point
├── App.svelte           # Root component
├── lib/
│   ├── filesystem.js    # File System Access API wrapper
│   ├── ai.js            # AI provider integration
│   ├── markdown.js      # Markdown parsing utilities
│   └── graph.js         # Knowledge graph utilities
├── components/
│   ├── FileTree.svelte  # Left sidebar
│   ├── Editor.svelte    # CodeMirror editor
│   ├── AIPanel.svelte   # AI chat interface
│   └── Toolbar.svelte   # Top bar
└── stores/
    ├── vault.js         # Vault state
    └── ai.js            # AI conversation state
```

## Tech Stack

- **Svelte** - UI framework
- **Vite** - Build tool
- **CodeMirror 6** - Text editor
- **Cytoscape.js** - Graph visualization (coming soon)
- **File System Access API** - Local file access

## Privacy

- Your files never leave your computer
- API keys are stored in your browser's localStorage
- AI requests go directly to the provider (Anthropic/OpenAI)
- No analytics, no tracking, no servers

## Browser Support

| Browser | Supported |
|---------|-----------|
| Chrome 86+ | Yes |
| Edge 86+ | Yes |
| Firefox | No (File System Access API not supported) |
| Safari | No (File System Access API not supported) |

## License

MIT
