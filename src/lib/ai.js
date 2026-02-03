/**
 * AI integration for the vault librarian.
 * Direct API calls to Anthropic/OpenAI with streaming support.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * System prompt for the vault librarian
 */
export function getSystemPrompt(vaultStructure) {
  return `You are a knowledge base librarian and assistant. You help users manage their personal knowledge vault.

## Your Capabilities

1. **Answer questions** using the knowledge in the vault
2. **Triage new information** - when given content, file it appropriately in the vault
3. **Maintain the vault** - suggest organization improvements, find orphan notes, identify gaps
4. **Create notes** - generate well-structured markdown notes with proper frontmatter
5. **Edit notes** - modify existing notes when asked

## Vault Structure

The vault uses a multi-root architecture:
- /Projects - Time-bound initiatives
- /Systems - Tools, platforms, infrastructure
- /Journal - Temporal records (Daily, Decisions, Meetings, Achievements)
- /People - Contacts and expertise
- /Processes - Reusable procedures
- /Concepts - Definitions and mental models
- /Configuration - Settings and setup
- /Assets - Files, specs, templates
- /MOCs - Maps of Content

## Current Vault Files

${vaultStructure}

## Note Format

All notes should have frontmatter:
\`\`\`yaml
---
type: [project|system|procedure|decision|journal_entry|person|concept]
created: YYYY-MM-DD
status: [active|completed|deprecated|planning]
---
\`\`\`

Use [[wiki-links]] to connect related notes.

## Guidelines

- Be concise and direct
- When asked to create/edit files, provide the complete content
- Always include frontmatter in new notes
- Suggest relevant links to existing notes
- When answering questions, cite the source notes
- If you don't have enough information, say so`;
}

/**
 * Call Anthropic API with streaming
 * @param {string} apiKey
 * @param {Array} messages
 * @param {string} systemPrompt
 * @param {function} onChunk
 * @returns {Promise<string>}
 */
export async function callAnthropic(apiKey, messages, systemPrompt, onChunk) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      stream: true
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullResponse += parsed.delta.text;
            onChunk(parsed.delta.text);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  return fullResponse;
}

/**
 * Call OpenAI API with streaming
 * @param {string} apiKey
 * @param {Array} messages
 * @param {string} systemPrompt
 * @param {function} onChunk
 * @returns {Promise<string>}
 */
export async function callOpenAI(apiKey, messages, systemPrompt, onChunk) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      ],
      stream: true
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  return fullResponse;
}

/**
 * Send a message to the AI
 * @param {Object} options
 * @returns {Promise<string>}
 */
export async function sendMessage({
  provider,
  apiKey,
  messages,
  vaultStructure,
  currentFile,
  onChunk
}) {
  // Build context-aware system prompt
  let systemPrompt = getSystemPrompt(vaultStructure);

  if (currentFile) {
    systemPrompt += `\n\n## Currently Open File\n\nPath: ${currentFile.path}\n\nContent:\n\`\`\`markdown\n${currentFile.content}\n\`\`\``;
  }

  if (provider === 'anthropic') {
    return callAnthropic(apiKey, messages, systemPrompt, onChunk);
  } else if (provider === 'openai') {
    return callOpenAI(apiKey, messages, systemPrompt, onChunk);
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Parse AI response for file operations
 * @param {string} response
 * @returns {Array<{action: string, path: string, content?: string}>}
 */
export function parseFileOperations(response) {
  const operations = [];

  // Look for CREATE FILE blocks
  const createRegex = /```create:([^\n]+)\n([\s\S]*?)```/g;
  let match;
  while ((match = createRegex.exec(response)) !== null) {
    operations.push({
      action: 'create',
      path: match[1].trim(),
      content: match[2]
    });
  }

  // Look for EDIT FILE blocks
  const editRegex = /```edit:([^\n]+)\n([\s\S]*?)```/g;
  while ((match = editRegex.exec(response)) !== null) {
    operations.push({
      action: 'edit',
      path: match[1].trim(),
      content: match[2]
    });
  }

  return operations;
}
