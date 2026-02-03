/**
 * File System Access API wrapper for vault operations.
 * Provides sandboxed read/write access to a user-selected folder.
 */

/**
 * Check if File System Access API is supported
 */
export function isSupported() {
  return 'showDirectoryPicker' in window;
}

/**
 * Prompt user to select a vault folder
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
export async function openVault() {
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite'
    });
    return handle;
  } catch (err) {
    if (err.name === 'AbortError') {
      return null; // User cancelled
    }
    throw err;
  }
}

/**
 * Build a tree structure from a directory handle
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {string} path
 * @returns {Promise<Object>}
 */
export async function buildFileTree(dirHandle, path = '') {
  const entries = [];

  for await (const [name, handle] of dirHandle.entries()) {
    // Skip hidden files and .obsidian folder
    if (name.startsWith('.')) continue;

    const entryPath = path ? `${path}/${name}` : name;

    if (handle.kind === 'directory') {
      const children = await buildFileTree(handle, entryPath);
      entries.push({
        name,
        path: entryPath,
        type: 'folder',
        handle,
        children,
        expanded: false
      });
    } else {
      entries.push({
        name,
        path: entryPath,
        type: 'file',
        handle,
        isMarkdown: name.endsWith('.md')
      });
    }
  }

  // Sort: folders first, then alphabetically
  return entries.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Read file contents
 * @param {FileSystemFileHandle} fileHandle
 * @returns {Promise<string>}
 */
export async function readFile(fileHandle) {
  const file = await fileHandle.getFile();
  return await file.text();
}

/**
 * Write content to file
 * @param {FileSystemFileHandle} fileHandle
 * @param {string} content
 */
export async function writeFile(fileHandle, content) {
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Create a new file in a directory
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {string} filename
 * @param {string} content
 * @returns {Promise<FileSystemFileHandle>}
 */
export async function createFile(dirHandle, filename, content = '') {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  if (content) {
    await writeFile(fileHandle, content);
  }
  return fileHandle;
}

/**
 * Create a new directory
 * @param {FileSystemDirectoryHandle} parentHandle
 * @param {string} name
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
export async function createDirectory(parentHandle, name) {
  return await parentHandle.getDirectoryHandle(name, { create: true });
}

/**
 * Get file handle from path
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {string} path
 * @returns {Promise<FileSystemFileHandle>}
 */
export async function getFileByPath(rootHandle, path) {
  const parts = path.split('/');
  const filename = parts.pop();

  let current = rootHandle;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part);
  }

  return await current.getFileHandle(filename);
}

/**
 * Get directory handle from path
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {string} path
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
export async function getDirectoryByPath(rootHandle, path) {
  if (!path) return rootHandle;

  const parts = path.split('/');
  let current = rootHandle;

  for (const part of parts) {
    current = await current.getDirectoryHandle(part);
  }

  return current;
}

/**
 * List all markdown files in vault
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {string} path
 * @returns {Promise<Array<{name: string, path: string}>>}
 */
export async function listMarkdownFiles(dirHandle, path = '') {
  const files = [];

  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.')) continue;

    const entryPath = path ? `${path}/${name}` : name;

    if (handle.kind === 'directory') {
      const subFiles = await listMarkdownFiles(handle, entryPath);
      files.push(...subFiles);
    } else if (name.endsWith('.md')) {
      files.push({ name, path: entryPath });
    }
  }

  return files;
}
