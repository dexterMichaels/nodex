import { writable, derived, get } from 'svelte/store';

// API configuration
export const provider = writable('anthropic'); // 'anthropic' or 'openai'
export const apiKey = writable('');

// Current framework/mode
export const currentFramework = writable('default');

// Conversation history
export const messages = writable([]);

// Current streaming response
export const streamingResponse = writable('');
export const isStreaming = writable(false);

// Settings panel visibility
export const showSettings = writable(false);

// Derived: is API configured
export const isConfigured = derived(apiKey, ($apiKey) => {
  return $apiKey && $apiKey.length > 10;
});

// Actions
export function addMessage(role, content) {
  messages.update(msgs => [...msgs, { role, content, timestamp: Date.now() }]);
}

export function clearMessages() {
  messages.set([]);
}

export function startStreaming() {
  streamingResponse.set('');
  isStreaming.set(true);
}

export function appendToStream(text) {
  streamingResponse.update(s => s + text);
}

export function finishStreaming() {
  isStreaming.set(false);
  const response = get(streamingResponse);
  if (response) {
    addMessage('assistant', response);
  }
  streamingResponse.set('');
}

// Persist API key to localStorage
if (typeof window !== 'undefined') {
  // Load from storage on init
  const stored = localStorage.getItem('nodex-api-config');
  if (stored) {
    try {
      const config = JSON.parse(stored);
      provider.set(config.provider || 'anthropic');
      apiKey.set(config.apiKey || '');
    } catch (e) {
      // Invalid stored config
    }
  }

  // Save on change
  function saveConfig() {
    const config = {
      provider: get(provider),
      apiKey: get(apiKey)
    };
    localStorage.setItem('nodex-api-config', JSON.stringify(config));
  }

  provider.subscribe(saveConfig);
  apiKey.subscribe(saveConfig);
}
