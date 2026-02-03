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

  // First pass: create nodes and build lookup maps
  for (const file of files) {
    const name = file.path.replace(/\.md$/, '').split('/').pop();
    const id = file.path;

    nodes.push({
      data: {
        id,
        label: name,
        path: file.path
      }
    });

    pathToId.set(file.path, id);
    nameToPath.set(name.toLowerCase(), file.path);
  }

  // Second pass: create edges from wiki-links
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
      }
    }
  }

  return { nodes, edges };
}

/**
 * Create Cytoscape configuration
 * @param {HTMLElement} container
 * @param {{ nodes: Array, edges: Array }} graphData
 * @param {function} onNodeClick
 * @returns {Object} Cytoscape instance
 */
export function createCytoscapeConfig(container, graphData, onNodeClick) {
  return {
    container,
    elements: [...graphData.nodes, ...graphData.edges],
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
          'width': '20px',
          'height': '20px'
        }
      },
      {
        selector: 'node:selected',
        style: {
          'background-color': '#a855f7',
          'border-width': '2px',
          'border-color': '#e4e4e7'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 1,
          'line-color': '#4b5563',
          'target-arrow-color': '#4b5563',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'opacity': 0.6
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color': '#6366f1',
          'target-arrow-color': '#6366f1',
          'opacity': 1
        }
      }
    ],
    layout: {
      name: 'cose',
      idealEdgeLength: 100,
      nodeOverlap: 20,
      refresh: 20,
      fit: true,
      padding: 30,
      randomize: false,
      componentSpacing: 100,
      nodeRepulsion: 400000,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0
    },
    minZoom: 0.2,
    maxZoom: 3,
    wheelSensitivity: 0.2
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
