<script>
  import { onMount, afterUpdate, tick } from 'svelte';
  import {
    provider, apiKey, messages, streamingResponse, isStreaming,
    showSettings, isConfigured, addMessage, startStreaming,
    appendToStream, currentFramework
  } from '../stores/ai.js';
  import { currentFile, vaultStructureText } from '../stores/vault.js';
  import { sendMessage } from '../lib/ai.js';
  import { getAllFrameworks } from '../lib/frameworks.js';

  let inputValue = '';
  let messagesContainer;
  let inputElement;

  const frameworks = getAllFrameworks();

  async function handleSubmit() {
    if (!inputValue.trim() || !$isConfigured || $isStreaming) return;

    const userMessage = inputValue.trim();
    inputValue = '';

    // Add user message
    addMessage('user', userMessage);

    // Start streaming
    startStreaming();

    try {
      await sendMessage({
        provider: $provider,
        apiKey: $apiKey,
        messages: $messages,
        vaultStructure: $vaultStructureText,
        currentFile: $currentFile,
        framework: $currentFramework,
        onChunk: (text) => {
          appendToStream(text);
        }
      });

      // Add assistant message when done
      addMessage('assistant', $streamingResponse);
    } catch (err) {
      addMessage('assistant', `Error: ${err.message}`);
    } finally {
      $isStreaming = false;
      $streamingResponse = '';
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  // Auto-scroll to bottom on new messages
  afterUpdate(() => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
</script>

<div class="ai-panel">
  {#if $showSettings}
    <div class="settings">
      <h3>AI Settings</h3>

      <label class="field">
        <span>Provider</span>
        <select bind:value={$provider}>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI (GPT-4)</option>
        </select>
      </label>

      <label class="field">
        <span>API Key</span>
        <input
          type="password"
          bind:value={$apiKey}
          placeholder={$provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
        />
      </label>

      <p class="hint">
        Your API key is stored locally in your browser and never sent to any server except the AI provider.
      </p>

      <button class="close-settings" on:click={() => $showSettings = false}>
        Done
      </button>
    </div>
  {:else}
    <div class="header">
      <span class="title">AI Librarian</span>
      {#if !$isConfigured}
        <button class="configure-btn" on:click={() => $showSettings = true} data-testid="configure-api-btn">
          Configure API
        </button>
      {/if}
    </div>

    <div class="framework-selector" data-testid="framework-selector">
      <select bind:value={$currentFramework}>
        {#each frameworks as fw}
          <option value={fw.id}>{fw.name}</option>
        {/each}
      </select>
      <span class="framework-hint">
        {frameworks.find(f => f.id === $currentFramework)?.description || ''}
      </span>
    </div>

    <div class="messages" bind:this={messagesContainer} data-testid="ai-messages">
      {#if $messages.length === 0 && !$isStreaming}
        <div class="welcome-message">
          <p>I'm your vault librarian. I can help you:</p>
          <ul>
            <li>Answer questions from your notes</li>
            <li>Create new notes with proper structure</li>
            <li>Find connections between ideas</li>
            <li>Organize incoming information</li>
          </ul>
          <p class="example">Try: "What topics are in this vault?"</p>
        </div>
      {/if}

      {#each $messages as message}
        <div class="message {message.role}">
          <div class="message-content">
            {message.content}
          </div>
        </div>
      {/each}

      {#if $isStreaming && $streamingResponse}
        <div class="message assistant streaming">
          <div class="message-content">
            {$streamingResponse}<span class="cursor">▋</span>
          </div>
        </div>
      {/if}
    </div>

    <div class="input-area">
      {#if !$isConfigured}
        <div class="not-configured">
          Click "Configure API" to add your API key
        </div>
      {:else}
        <textarea
          bind:this={inputElement}
          bind:value={inputValue}
          on:keydown={handleKeydown}
          placeholder="Ask about your vault..."
          disabled={$isStreaming}
          rows="2"
        ></textarea>
        <button
          class="send-btn"
          on:click={handleSubmit}
          disabled={!inputValue.trim() || $isStreaming}
        >
          {#if $isStreaming}
            ...
          {:else}
            Send
          {/if}
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ai-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
  }

  .title {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .configure-btn {
    background: var(--accent);
    color: white;
    border: none;
    padding: 0.35rem 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .configure-btn:hover {
    background: var(--accent-hover);
  }

  .framework-selector {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .framework-selector select {
    width: 100%;
    padding: 0.4rem 0.5rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.8rem;
    cursor: pointer;
  }

  .framework-selector select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .framework-hint {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-style: italic;
  }

  .settings {
    padding: 1rem;
  }

  .settings h3 {
    margin-bottom: 1rem;
    font-size: 1rem;
  }

  .field {
    display: block;
    margin-bottom: 1rem;
  }

  .field span {
    display: block;
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
  }

  .field select, .field input {
    width: 100%;
    padding: 0.5rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .settings .hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  .close-settings {
    width: 100%;
    padding: 0.5rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    min-height: 0;
  }

  .welcome-message {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .welcome-message ul {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
  }

  .welcome-message li {
    margin: 0.25rem 0;
  }

  .welcome-message .example {
    margin-top: 1rem;
    color: var(--text-muted);
    font-style: italic;
  }

  .message {
    margin-bottom: 1rem;
  }

  .message.user .message-content {
    background: var(--accent);
    color: white;
    padding: 0.75rem;
    border-radius: 12px 12px 4px 12px;
    margin-left: 2rem;
  }

  .message.assistant .message-content {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 0.75rem;
    border-radius: 12px 12px 12px 4px;
    margin-right: 2rem;
    font-size: 0.875rem;
    white-space: pre-wrap;
  }

  .cursor {
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  .input-area {
    padding: 1rem;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 0.5rem;
  }

  .not-configured {
    color: var(--text-muted);
    font-size: 0.875rem;
    text-align: center;
    width: 100%;
    padding: 0.5rem;
  }

  .input-area textarea {
    flex: 1;
    padding: 0.5rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.875rem;
    resize: none;
    font-family: inherit;
  }

  .input-area textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  .send-btn {
    padding: 0.5rem 1rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .send-btn:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
