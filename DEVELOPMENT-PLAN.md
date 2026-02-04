# Nodex Development Plan: Self-Building Knowledge Base

## Overview

This document outlines the plan to evolve Nodex from a basic browser-based editor into a self-documenting agentic knowledge system. The first knowledge base will be about **how to build agentic knowledge systems** — a meta-knowledge graph that teaches itself.

---

## Part 1: Testing Framework

### 1.1 What We Need to Test

| Capability | Description | Current Status |
|------------|-------------|----------------|
| **Run** | App launches, renders three panes, handles file system | Playwright tests exist |
| **Create Knowledge** | Create new notes with proper structure/frontmatter | AI can suggest, no automated creation |
| **Integrate Knowledge** | Link notes together, extract relationships | `lib/graph.js` exists, no UI |
| **Answer Questions** | AI responds with vault context | Works via API, needs testing |

### 1.2 Test Architecture

```
tests/
├── e2e/
│   ├── app-launch.spec.js        # Basic app functionality
│   ├── file-operations.spec.js   # Create, read, edit files
│   ├── ai-integration.spec.js    # AI chat with mock responses
│   └── graph-visualization.spec.js # Graph view interactions
├── integration/
│   ├── knowledge-creation.spec.js  # Full note creation flow
│   ├── knowledge-linking.spec.js   # Link extraction and graph building
│   └── knowledge-query.spec.js     # Question answering with context
└── fixtures/
    ├── mock-vault/               # Test vault with known structure
    └── mock-api-responses/       # Recorded AI responses for testing
```

### 1.3 Test Mode Enhancements Needed

Current `?testMode=true` provides mock data. Extend it to support:

1. **Mock API Responses**: Intercept AI calls and return predictable responses
2. **File System Simulation**: Virtual file system for write operations
3. **Graph State Verification**: Assert on graph structure after operations
4. **Action Recording**: Log all operations for verification

---

## Part 2: Frameworks for Controlling Agent Behavior

### 2.1 What is a "Framework"?

A **Framework** is a structured instruction set that controls how the AI librarian behaves for specific tasks. It's more than a skill (single action) — it's a **cognitive mode** with:

- **Purpose**: What this framework is for
- **Constraints**: What the agent should/shouldn't do
- **Entity Types**: What kinds of notes to create
- **Linking Rules**: How to connect new knowledge
- **Quality Criteria**: When knowledge is "good enough"

### 2.2 Framework vs Skill

| Aspect | Skill | Framework |
|--------|-------|-----------|
| Scope | Single action | Sustained mode of operation |
| Duration | One invocation | Until switched |
| Example | `/create-note` | "Knowledge Curation Mode" |
| Implementation | Function call | System prompt modification |
| User trigger | Explicit command | Mode selection |

### 2.3 Proposed Framework Architecture

```javascript
// src/lib/frameworks.js

export const frameworks = {
  'knowledge-curator': {
    name: 'Knowledge Curator',
    description: 'Organize and structure incoming information',
    systemPromptAddition: `
You are in KNOWLEDGE CURATION mode. Your role is to:
1. Classify incoming information by entity type (Pattern, Guide, Technology, etc.)
2. Extract structured frontmatter from unstructured content
3. Identify links to existing notes in the vault
4. Suggest where in the folder structure this belongs
5. Flag quality issues (missing sources, unclear definitions)

Entity types available: ${entityTypes.join(', ')}
Current vault structure: {vaultStructure}
    `,
    entityTypes: ['pattern', 'guide', 'technology-profile', 'case-study'],
    actions: ['classify', 'extract-frontmatter', 'suggest-links', 'suggest-location']
  },

  'knowledge-linker': {
    name: 'Knowledge Linker',
    description: 'Find and create connections between notes',
    systemPromptAddition: `
You are in KNOWLEDGE LINKING mode. Your role is to:
1. Analyze the current note for potential connections
2. Search the vault for related concepts
3. Suggest bidirectional wiki-links
4. Identify gaps (concepts mentioned but no note exists)
5. Never create orphan links - verify targets exist

Linking rules:
- Every note should have 3-8 links
- Prefer specific links over generic ones
- Cross-link between entity types (Pattern -> Technology, Guide -> Pattern)
    `,
    actions: ['find-related', 'suggest-links', 'identify-gaps', 'verify-links']
  },

  'knowledge-query': {
    name: 'Knowledge Query',
    description: 'Answer questions using vault knowledge',
    systemPromptAddition: `
You are in KNOWLEDGE QUERY mode. Your role is to:
1. Parse the user's question for intent
2. Identify relevant notes in the vault
3. Synthesize an answer from vault content
4. Always cite sources with [[note-name]] links
5. Acknowledge when information is not in the vault

Response format:
- Direct answer first
- Supporting details from vault
- Source citations
- Suggestions for related reading
    `,
    actions: ['search-vault', 'synthesize-answer', 'cite-sources']
  },

  'knowledge-creator': {
    name: 'Knowledge Creator',
    description: 'Create new well-structured notes',
    systemPromptAddition: `
You are in KNOWLEDGE CREATION mode. Your role is to:
1. Create notes following entity type schemas
2. Generate proper YAML frontmatter
3. Include required and relevant optional fields
4. Add wiki-links to existing related notes
5. Place notes in the correct folder location

When creating a note, output a CREATE block:
\`\`\`create:path/to/note.md
---
type: entity-type
field: value
---
# Note Title

Content here with [[wiki-links]].
\`\`\`
    `,
    actions: ['create-note', 'validate-schema', 'check-duplicates']
  }
};
```

### 2.4 Framework Selection UI

Add a mode selector to the AI panel:

```svelte
<!-- In AIPanel.svelte -->
<div class="framework-selector">
  <label>Mode:</label>
  <select bind:value={$currentFramework}>
    <option value="default">General Assistant</option>
    <option value="knowledge-curator">Knowledge Curator</option>
    <option value="knowledge-linker">Knowledge Linker</option>
    <option value="knowledge-query">Knowledge Query</option>
    <option value="knowledge-creator">Knowledge Creator</option>
  </select>
</div>
```

---

## Part 3: Building the First Knowledge Base

### 3.1 Subject: Agentic Knowledge Systems

The knowledge base will document how to build systems like Nodex itself — creating a self-referential, self-improving knowledge graph.

**Initial Structure** (based on [[Nodex Agentic Knowledge Graph Framework]]):

```
agentic-km-vault/
├── Concepts/
│   ├── Agentic Knowledge Management.md
│   ├── Knowledge Graph.md
│   ├── Curation.md
│   └── ...
├── Patterns/
│   ├── Structural/
│   ├── Operational/
│   └── Integration/
├── Agents/
│   ├── Ingestion Agent.md
│   ├── Curation Agent.md
│   └── ...
├── Technologies/
│   ├── LLM/
│   ├── Vector-DB/
│   └── ...
├── Guides/
│   └── Getting Started.md
├── Case Studies/
│   └── Nodex Development.md  <-- Our learnings go here
└── MOCs/
    └── Overview.md
```

### 3.2 Iteration Plan

#### Sprint 1: Foundation (Graph Visualizer + Framework System)

**Features to Build:**
1. Graph visualization component using Cytoscape.js
2. Framework system for controlling AI behavior
3. Markdown preview toggle

**Tests to Write:**
- Graph renders with correct nodes/edges
- Framework selection changes AI behavior
- Preview toggle works

**Knowledge to Create:**
- Case Study: "Building the Graph Visualizer"
- Guide: "Implementing Framework Selection"
- Pattern: "Incremental Feature Development"

#### Sprint 2: Knowledge Operations

**Features to Build:**
1. Note creation from AI suggestions (parse CREATE blocks)
2. Link extraction and validation
3. Frontmatter parsing and display

**Tests to Write:**
- AI CREATE blocks are parsed correctly
- Links extracted from markdown
- Frontmatter displayed in sidebar

**Knowledge to Create:**
- Guide: "Parsing AI File Operations"
- Technology Profile: "CodeMirror 6"
- Pattern: "AI-Assisted Content Creation"

#### Sprint 3: Knowledge Integration

**Features to Build:**
1. Semantic search (if API key available)
2. Link suggestions based on content similarity
3. Gap detection (mentioned but missing notes)

**Tests to Write:**
- Search returns relevant results
- Link suggestions are valid
- Gap detection finds orphan references

**Knowledge to Create:**
- Architecture: "Browser-Based RAG Pipeline"
- Pattern: "Confidence-Based Linking"
- Case Study: "Implementing Semantic Search"

#### Sprint 4: Self-Documentation

**Features to Build:**
1. Automated learning capture (log decisions as notes)
2. Pattern recognition (detect recurring approaches)
3. Quality metrics dashboard

**Tests to Write:**
- Learnings are captured with proper structure
- Patterns are detected and suggested
- Metrics display correctly

**Knowledge to Create:**
- Pattern: "Self-Documenting Development"
- Guide: "Building a Learning Capture System"
- Meta: "Nodex Knowledge Base Statistics"

### 3.3 Learning Capture Protocol

As I build features, I will create notes documenting:

1. **Decisions Made**: Why we chose approach X over Y
2. **Problems Encountered**: What went wrong and how we fixed it
3. **Patterns Discovered**: Reusable solutions that emerged
4. **Technologies Evaluated**: What we tried and how it worked

Each learning will be a properly structured note in the knowledge base.

---

## Part 4: Autonomous Operation Requirements

### 4.1 API Key Handling

**Problem**: I need to test AI features but shouldn't see your API key.

**Solution Options:**

#### Option A: Environment Variable (Recommended)

Create a `.env.local` file (gitignored) that the app reads:

```bash
# .env.local (in app/ directory, gitignored)
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_OPENAI_API_KEY=sk-...
```

Modify `src/lib/ai.js` to check for env var first:

```javascript
// In ai.js
const getApiKey = (provider) => {
  // Check environment variable first (for testing)
  const envKey = provider === 'anthropic'
    ? import.meta.env.VITE_ANTHROPIC_API_KEY
    : import.meta.env.VITE_OPENAI_API_KEY;

  if (envKey) return envKey;

  // Fall back to localStorage (user-provided)
  return localStorage.getItem(`${provider}_api_key`);
};
```

**Your action required:**
1. Create `app/.env.local` with your API key
2. Add `.env.local` to `.gitignore` (should already be there for Vite)
3. I can then test AI features without seeing the key

#### Option B: Test Mode Mock API

For automated testing, mock the AI responses entirely:

```javascript
// In test mode, intercept fetch calls
if (testMode) {
  window.fetch = async (url, options) => {
    if (url.includes('anthropic') || url.includes('openai')) {
      return mockAIResponse(options.body);
    }
    return originalFetch(url, options);
  };
}
```

This doesn't require real API keys but can't test actual AI behavior.

#### Option C: Proxy Server (Advanced)

Run a local proxy that adds the API key:

```
Browser -> localhost:3002/api/chat -> adds API key -> api.anthropic.com
```

The proxy reads the key from a local file I don't have access to.

### 4.2 What I Need From You

| Requirement | Your Action | Frequency |
|-------------|-------------|-----------|
| API Key Setup | Create `.env.local` with key | Once |
| Dev Server Running | `npm run dev` in app/ | Each session |
| Permission to Create Files | Confirm I can create test files | Once |
| Feedback on Knowledge Quality | Review notes I create | Per sprint |
| Course Corrections | Tell me if approach is wrong | As needed |

### 4.3 Autonomous Operation Protocol

When working autonomously, I will:

1. **Start each session** by reading this plan and checking status
2. **Create a todo list** for the current sprint tasks
3. **Write tests first** before implementing features
4. **Document learnings** as notes in the knowledge base
5. **Commit frequently** with descriptive messages
6. **Stop and ask** if I encounter ambiguity or need decisions

### 4.4 Checkpoints

I will pause and request your review at these points:

- After completing each sprint
- Before making architectural decisions
- When I discover something that changes the plan
- If tests fail in unexpected ways
- Before any destructive operations (delete, force push)

---

## Part 5: Missing Features to Build

### 5.1 Graph Visualizer (Priority 1)

The Cytoscape.js configuration exists in `lib/graph.js` but there's no UI component.

**Implementation Plan:**
1. Create `GraphView.svelte` component
2. Add toggle between Editor and Graph view
3. Wire up graph data from vault state
4. Add click handlers for node navigation
5. Style nodes by entity type

**Files to create/modify:**
- `src/components/GraphView.svelte` (new)
- `src/App.svelte` (add view toggle)
- `src/stores/vault.js` (add graph state)

### 5.2 Markdown Preview (Priority 2)

Currently only raw markdown is shown.

**Implementation Plan:**
1. Add `marked` library for rendering
2. Create `MarkdownPreview.svelte` component
3. Add Edit/Preview toggle in toolbar
4. Style rendered HTML (headers, code, links)

### 5.3 File Creation from AI (Priority 3)

AI can suggest file operations but can't execute them.

**Implementation Plan:**
1. Parse CREATE/EDIT blocks from AI responses
2. Show preview of proposed changes
3. Add "Apply" button with confirmation
4. Execute file operation via filesystem.js

---

## Part 6: Success Criteria

### 6.1 Sprint 1 Complete When:

- [ ] Graph visualizer shows vault structure
- [ ] Can click node to open file in editor
- [ ] Framework selector changes AI system prompt
- [ ] At least 3 notes created documenting learnings
- [ ] All tests pass

### 6.2 Knowledge Base Health Metrics:

| Metric | Target |
|--------|--------|
| Total notes | 30+ |
| Orphan rate | <5% |
| Average links per note | 3-8 |
| Entity type coverage | All 6 types used |

### 6.3 Test Coverage:

| Area | Coverage Target |
|------|-----------------|
| UI Components | 80%+ |
| File Operations | 100% |
| AI Integration | Mock coverage only |
| Graph Operations | 90%+ |

---

## Appendix A: Entity Type Quick Reference

From [[Nodex Agentic Knowledge Graph Framework]]:

| Type | Purpose | Required Fields |
|------|---------|-----------------|
| Pattern | Reusable solution | name, problem, solution, context |
| Agent Blueprint | Agent specification | name, purpose, inputs, outputs, triggers |
| Architecture | System design | name, purpose, components, data_flow |
| Technology Profile | Tool evaluation | name, category, purpose, strengths, limitations |
| Implementation Guide | Step-by-step | name, objective, prerequisites, steps |
| Case Study | Real implementation | name, context, approach, outcomes |

---

## Appendix B: File Locations

| Purpose | Path |
|---------|------|
| App source | `app/src/` |
| Tests | `app/tests/` |
| AI logic | `app/src/lib/ai.js` |
| Graph logic | `app/src/lib/graph.js` |
| Framework definitions | `app/src/lib/frameworks.js` (to create) |
| Knowledge base | (to create, location TBD with user) |

---

*Created: 2026-02-02*
*Status: Planning*
*Next Action: Review with user, then begin Sprint 1*
