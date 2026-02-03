/**
 * Markdown parsing utilities for vault operations.
 * Handles frontmatter, wiki-links, and content extraction.
 */

/**
 * Extract frontmatter from markdown content
 * @param {string} content
 * @returns {{ frontmatter: Object|null, body: string }}
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return { frontmatter: null, body: content };
  }

  const [, yamlContent, body] = match;

  // Simple YAML parsing (key: value pairs)
  const frontmatter = {};
  for (const line of yamlContent.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Handle arrays [a, b, c]
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(s => s.trim());
      }
      // Handle quoted strings
      else if ((value.startsWith('"') && value.endsWith('"')) ||
               (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * Extract all wiki-links from content
 * @param {string} content
 * @returns {string[]} Array of linked note names
 */
export function extractWikiLinks(content) {
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }

  return [...new Set(links)]; // Remove duplicates
}

/**
 * Extract all tags from content
 * @param {string} content
 * @returns {string[]}
 */
export function extractTags(content) {
  const regex = /#([a-zA-Z][a-zA-Z0-9_/-]*)/g;
  const tags = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    tags.push(match[1]);
  }

  return [...new Set(tags)];
}

/**
 * Extract headings from content
 * @param {string} content
 * @returns {Array<{level: number, text: string}>}
 */
export function extractHeadings(content) {
  const regex = /^(#{1,6})\s+(.+)$/gm;
  const headings = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim()
    });
  }

  return headings;
}

/**
 * Generate a summary of markdown content
 * @param {string} content
 * @param {number} maxLength
 * @returns {string}
 */
export function generateSummary(content, maxLength = 200) {
  const { body } = parseFrontmatter(content);

  // Remove headings, links, and formatting
  const plain = body
    .replace(/^#{1,6}\s+.+$/gm, '') // Headings
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$2$1') // Wiki-links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Markdown links
    .replace(/[*_~`]/g, '') // Formatting
    .replace(/\n+/g, ' ') // Newlines
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }

  return plain.slice(0, maxLength).trim() + '...';
}

/**
 * Create new note content with frontmatter
 * @param {Object} options
 * @returns {string}
 */
export function createNoteContent({
  type = 'note',
  title = '',
  body = '',
  extraFrontmatter = {}
}) {
  const date = new Date().toISOString().split('T')[0];

  const frontmatter = {
    type,
    created: date,
    status: 'active',
    ...extraFrontmatter
  };

  const yamlLines = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.join(', ')}]`;
      }
      return `${key}: ${value}`;
    });

  return `---
${yamlLines.join('\n')}
---

# ${title}

${body}
`;
}

/**
 * Build a graph structure from vault files
 * @param {Array<{path: string, content: string}>} files
 * @returns {{ nodes: Array, edges: Array }}
 */
export function buildGraph(files) {
  const nodes = [];
  const edges = [];
  const nodeMap = new Map();

  // First pass: create nodes
  for (const file of files) {
    const name = file.path.replace(/\.md$/, '').split('/').pop();
    const { frontmatter } = parseFrontmatter(file.content);

    const node = {
      id: file.path,
      name,
      type: frontmatter?.type || 'note',
      path: file.path
    };

    nodes.push(node);
    nodeMap.set(name.toLowerCase(), file.path);
  }

  // Second pass: create edges from links
  for (const file of files) {
    const links = extractWikiLinks(file.content);

    for (const link of links) {
      const targetPath = nodeMap.get(link.toLowerCase());
      if (targetPath && targetPath !== file.path) {
        edges.push({
          source: file.path,
          target: targetPath
        });
      }
    }
  }

  return { nodes, edges };
}
