/**
 * Graph utilities for building and managing the knowledge graph.
 * Uses Cytoscape.js for visualization.
 */

import { extractWikiLinks } from './markdown.js';

/**
 * Build graph data from vault files
 * @param {Array<{path: string, content: string}>} files
 * @returns {{ nodes: Array, edges: Array }}
 */
export function buildGraphData(files) {
  const nodes = [];
  const edges = [];
  const pathToId = new Map();
  const nameToPath = new Map();
  const connectionCount = new Map();

  // First pass: create nodes and build lookup maps
  for (const file of files) {
    const name = file.path.replace(/\.md$/, '').split('/').pop();
    const id = file.path;

    pathToId.set(file.path, id);
    nameToPath.set(name.toLowerCase(), file.path);
    connectionCount.set(id, 0);
  }

  // Second pass: create edges from wiki-links and count connections
  for (const file of files) {
    const links = extractWikiLinks(file.content);
    const sourceId = file.path;

    for (const linkName of links) {
      const targetPath = nameToPath.get(linkName.toLowerCase());
      if (targetPath && targetPath !== file.path) {
        edges.push({
          data: {
            id: `${sourceId}->${targetPath}`,
            source: sourceId,
            target: targetPath
          }
        });
        // Count connections for both source and target
        connectionCount.set(sourceId, (connectionCount.get(sourceId) || 0) + 1);
        connectionCount.set(targetPath, (connectionCount.get(targetPath) || 0) + 1);
      }
    }
  }

  // Third pass: create nodes with connection data
  for (const file of files) {
    const name = file.path.replace(/\.md$/, '').split('/').pop();
    const id = file.path;
    const connections = connectionCount.get(id) || 0;

    nodes.push({
      data: {
        id,
        label: name,
        path: file.path,
        connections,
        isOrphan: connections === 0
      }
    });
  }

  return { nodes, edges };
}

/**
 * Create Cytoscape configuration with dynamic node sizing
 * @param {HTMLElement} container
 * @param {{ nodes: Array, edges: Array }} graphData
 * @param {Object} options - Additional options
 * @returns {Object} Cytoscape configuration
 */
export function createCytoscapeConfig(container, graphData, options = {}) {
  const { hideOrphans = false } = options;

  // Filter orphans if requested
  let elements = [...graphData.nodes, ...graphData.edges];
  if (hideOrphans) {
    const nonOrphanNodes = graphData.nodes.filter(n => !n.data.isOrphan);
    elements = [...nonOrphanNodes, ...graphData.edges];
  }

  // Calculate max connections for scaling
  const maxConnections = Math.max(1, ...graphData.nodes.map(n => n.data.connections || 0));

  return {
    container,
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#6366f1',
          'label': 'data(label)',
          'color': '#e4e4e7',
          'font-size': '10px',
          'text-valign': 'bottom',
          'text-margin-y': '5px',
          // Dynamic size based on connections (min 15px, max 50px)
          'width': `mapData(connections, 0, ${maxConnections}, 15, 50)`,
          'height': `mapData(connections, 0, ${maxConnections}, 15, 50)`
        }
      },
      {
        selector: 'node[isOrphan]',
        style: {
          'background-color': '#71717a',
          'opacity': 0.7
        }
      },
      {
        selector: 'node:selected',
        style: {
          'background-color': '#a855f7',
          'border-width': '3px',
          'border-color': '#e4e4e7'
        }
      },
      {
        selector: 'node.highlighted',
        style: {
          'background-color': '#22c55e',
          'border-width': '3px',
          'border-color': '#e4e4e7'
        }
      },
      {
        selector: 'node.dragging',
        style: {
          'background-color': '#f59e0b'
        }
      },
      {
        selector: 'node.neighbor',
        style: {
          'background-color': '#818cf8',
          'opacity': 1
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 1.5,
          'line-color': '#4b5563',
          'target-arrow-color': '#4b5563',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'opacity': 0.5
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color': '#6366f1',
          'target-arrow-color': '#6366f1',
          'opacity': 1,
          'width': 2
        }
      },
      {
        selector: 'edge.highlighted',
        style: {
          'line-color': '#818cf8',
          'target-arrow-color': '#818cf8',
          'opacity': 1,
          'width': 2
        }
      }
    ],
    layout: {
      name: 'cose',
      idealEdgeLength: 120,
      nodeOverlap: 20,
      refresh: 20,
      fit: true,
      padding: 40,
      randomize: false,
      componentSpacing: 120,
      nodeRepulsion: 500000,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 50,
      numIter: 1500,
      initialTemp: 250,
      coolingFactor: 0.95,
      minTemp: 1.0
    },
    minZoom: 0.05,
    maxZoom: 6,
    wheelSensitivity: 0.8,
    boxSelectionEnabled: false,
    autounselectify: false
  };
}

/**
 * Get node statistics
 * @param {{ nodes: Array, edges: Array }} graphData
 * @returns {Object}
 */
export function getGraphStats(graphData) {
  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.edges.length;

  // Calculate in-degree and out-degree for each node
  const inDegree = new Map();
  const outDegree = new Map();

  for (const node of graphData.nodes) {
    inDegree.set(node.data.id, 0);
    outDegree.set(node.data.id, 0);
  }

  for (const edge of graphData.edges) {
    outDegree.set(edge.data.source, (outDegree.get(edge.data.source) || 0) + 1);
    inDegree.set(edge.data.target, (inDegree.get(edge.data.target) || 0) + 1);
  }

  // Find orphans (no connections)
  const orphans = graphData.nodes.filter(node => {
    const id = node.data.id;
    return (inDegree.get(id) || 0) === 0 && (outDegree.get(id) || 0) === 0;
  });

  // Find most connected nodes
  const connections = graphData.nodes.map(node => ({
    ...node.data,
    connections: (inDegree.get(node.data.id) || 0) + (outDegree.get(node.data.id) || 0)
  })).sort((a, b) => b.connections - a.connections);

  return {
    nodeCount,
    edgeCount,
    orphanCount: orphans.length,
    orphans: orphans.map(n => n.data.label),
    mostConnected: connections.slice(0, 5),
    avgConnections: edgeCount > 0 ? (edgeCount * 2 / nodeCount).toFixed(1) : 0
  };
}
