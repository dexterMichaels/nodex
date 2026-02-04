import { writable, get } from 'svelte/store';

/**
 * Graph Views Store
 *
 * Views are immutable snapshots of graph state that can be:
 * - Created (captured)
 * - Deleted
 * - Selected and applied
 *
 * Views CANNOT be updated - create a new view instead.
 */

// Saved views
export const graphViews = writable([]);

// Currently selected view (not yet applied)
export const selectedViewId = writable(null);

// Currently active/applied view
export const activeViewId = writable(null);

/**
 * Create a new view from current graph state
 * @param {string} name - View name
 * @param {Object} state - Graph state (positions, zoom, pan, filters)
 * @returns {string} - New view ID
 */
export function createView(name, state) {
  const id = `view-${Date.now()}`;
  const view = {
    id,
    name,
    createdAt: new Date().toISOString(),
    state: {
      positions: state.positions || {},
      zoom: state.zoom || 1,
      pan: state.pan || { x: 0, y: 0 },
      hideOrphans: state.hideOrphans || false
    }
  };

  graphViews.update(views => [...views, view]);
  return id;
}

/**
 * Delete a view
 * @param {string} id - View ID to delete
 */
export function deleteView(id) {
  graphViews.update(views => views.filter(v => v.id !== id));

  // Clear selection if deleted view was selected
  if (get(selectedViewId) === id) {
    selectedViewId.set(null);
  }
  if (get(activeViewId) === id) {
    activeViewId.set(null);
  }
}

/**
 * Get a view by ID
 * @param {string} id - View ID
 * @returns {Object|null} - View object or null
 */
export function getView(id) {
  const views = get(graphViews);
  return views.find(v => v.id === id) || null;
}

/**
 * Apply a view (set as active)
 * @param {string} id - View ID to apply
 */
export function applyView(id) {
  activeViewId.set(id);
}

/**
 * Clear active view (reset to default)
 */
export function clearActiveView() {
  activeViewId.set(null);
  selectedViewId.set(null);
}

// Persist views to localStorage
if (typeof window !== 'undefined') {
  // Load from storage on init
  const stored = localStorage.getItem('nodex-graph-views');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      graphViews.set(data.views || []);
    } catch (e) {
      // Invalid stored data
    }
  }

  // Save on change
  graphViews.subscribe(views => {
    localStorage.setItem('nodex-graph-views', JSON.stringify({ views }));
  });
}
