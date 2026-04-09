<script lang="ts">
  import { collabActive, collabRoom, collabPeers, collabConnected, collabPanelOpen, collabUserName } from '$lib/collab/store';
  import { updateUserName, leaveRoom, parseShareCode } from '$lib/collab/provider';
  import { addToast } from '$lib/stores/app';
  import { locale } from '$lib/i18n/locale';
  import { editorUi, expandEditorTemplate } from '$lib/i18n/editor-ui';

  $: E = editorUi[$locale];

  export let onCreateRoom: (password: string | null) => Promise<void> = async () => {};
  export let onJoinRoom: (shareCode: string, password: string | null) => Promise<void> = async () => {};
  export let onLeaveRoom: () => void = () => {};

  let nameInput = $collabUserName || '';
  let shareCodeInput = '';
  let joinPassword = '';
  let createPassword = '';
  let creating = false;
  let joining = false;

  $: if ($collabUserName && !nameInput) nameInput = $collabUserName;

  async function handleCreate() {
    if (!nameInput.trim()) {
      addToast(E.toastNameFirst, 'warning');
      return;
    }
    updateUserName(nameInput.trim());
    creating = true;
    try {
      await onCreateRoom(createPassword || null);
    } catch (err: any) {
      console.error('Create room failed:', err);
      addToast(
        expandEditorTemplate(E.toastCreateFailed, { msg: err?.message || E.unknownError }),
        'error'
      );
    } finally {
      creating = false;
      createPassword = '';
    }
  }

  async function handleJoin() {
    const code = shareCodeInput.trim();
    if (!code) {
      addToast(E.toastPasteCode, 'warning');
      return;
    }
    if (!parseShareCode(code)) {
      addToast(E.toastInvalidCode, 'error');
      return;
    }
    if (!nameInput.trim()) {
      addToast(E.toastNameFirst, 'warning');
      return;
    }
    updateUserName(nameInput.trim());
    joining = true;
    try {
      await onJoinRoom(code, joinPassword || null);
    } catch (err: any) {
      console.error('Join room failed:', err);
      addToast(
        expandEditorTemplate(E.toastJoinFailed, { msg: err?.message || E.unknownError }),
        'error'
      );
    } finally {
      joining = false;
      shareCodeInput = '';
      joinPassword = '';
    }
  }

  function handleLeave() {
    leaveRoom();
    onLeaveRoom();
    addToast(E.toastLeftSession, 'info');
  }

  function copyShareCode() {
    if ($collabRoom) {
      navigator.clipboard.writeText($collabRoom.shareCode);
      addToast(E.toastCodeCopied, 'success');
    }
  }

  function handleNameBlur() {
    if (nameInput.trim() && $collabActive) {
      updateUserName(nameInput.trim());
    }
  }

  function close() {
    collabPanelOpen.set(false);
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

{#if $collabPanelOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="collab-overlay" on:click={handleOverlayClick} on:keydown={handleKeydown}>
    <div class="collab-panel">
      <div class="panel-header">
        <h3>{E.collabPanelTitle}</h3>
        <button type="button" class="close-btn" on:click={close} title={E.collabClose} aria-label={E.collabClose}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>

      <div class="panel-body">
        <div class="field">
          <label for="collab-name">{E.yourName}</label>
          <input id="collab-name" type="text" bind:value={nameInput} on:blur={handleNameBlur} placeholder={E.namePlaceholder} maxlength="30" />
        </div>

        {#if $collabActive}
          <div class="status-row">
            <span class="status-dot" class:connected={$collabConnected}></span>
            <span>{$collabConnected ? E.connected : E.connecting}</span>
          </div>

          <div class="field">
            <label for="share-code-display">{E.shareCode}</label>
            <div class="copy-row">
              <code id="share-code-display" class="room-code">{$collabRoom?.shareCode ?? ''}</code>
              <button type="button" class="copy-btn" on:click={copyShareCode} title={E.copyShareCode} aria-label={E.copyShareCode}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2" stroke="currentColor" stroke-width="1.2"/></svg>
              </button>
            </div>
            <p class="security-hint">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;margin-top:1px"><path d="M8 1a4 4 0 00-4 4v2H3a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1V8a1 1 0 00-1-1h-1V5a4 4 0 00-4-4zm-2 4a2 2 0 114 0v2H6V5z" fill="currentColor"/></svg>
              {E.shareHintEncrypt}
            </p>
          </div>

          {#if $collabRoom?.password}
            <div class="field">
              <label for="room-pw-display">{E.password}</label>
              <code id="room-pw-display" class="room-code">{$collabRoom.password}</code>
              <p class="security-hint">
                {E.passwordShareHint}
              </p>
            </div>
          {/if}

          {#if $collabPeers.length > 0}
            <div class="field">
              <span class="collab-section-label">{E.collaborators} ({$collabPeers.length})</span>
              <div class="peer-list">
                {#each $collabPeers as peer}
                  <div class="peer-item">
                    <span class="peer-dot" style="background:{peer.user.color}"></span>
                    <span class="peer-name">{peer.user.name}</span>
                    {#if peer.currentFile}
                      <span class="peer-file">{peer.currentFile.split('/').pop()}</span>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <p class="hint">{E.waitingPeers}</p>
          {/if}

          <button type="button" class="btn danger" on:click={handleLeave}>{E.leaveSession}</button>
        {:else}
          <div class="section">
            <div class="section-label">{E.startSession}</div>
            <div class="field">
              <label for="create-pw">{E.createPasswordLabel} <span class="opt">{E.createPasswordOpt}</span></label>
              <input id="create-pw" type="text" bind:value={createPassword} placeholder={E.createPwPlaceholder} />
            </div>
            <button type="button" class="btn primary" on:click={handleCreate} disabled={creating}>
              {creating ? E.starting : E.startCollab}
            </button>
            <p class="security-hint">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;margin-top:1px"><path d="M8 1a4 4 0 00-4 4v2H3a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1V8a1 1 0 00-1-1h-1V5a4 4 0 00-4-4zm-2 4a2 2 0 114 0v2H6V5z" fill="currentColor"/></svg>
              {E.startHintEncrypt}
            </p>
          </div>

          <div class="divider"><span>{E.or}</span></div>

          <div class="section">
            <div class="section-label">{E.joinSession}</div>
            <div class="field">
              <label for="join-code">{E.labelShareCode}</label>
              <input id="join-code" type="text" bind:value={shareCodeInput} placeholder={E.pasteCodePlaceholder} />
            </div>
            <div class="field">
              <label for="join-pw">{E.joinPasswordLabel} <span class="opt">{E.joinPasswordOpt}</span></label>
              <input id="join-pw" type="text" bind:value={joinPassword} placeholder={E.roomPwPlaceholder} />
            </div>
            <button type="button" class="btn primary" on:click={handleJoin} disabled={joining || !shareCodeInput.trim()}>
              {joining ? E.joining : E.joinBtn}
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .collab-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    justify-content: flex-end;
    background: rgba(0, 0, 0, 0.4);
  }
  .collab-panel {
    width: 300px;
    max-width: 90vw;
    height: 100%;
    background: var(--bg-surface);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.2);
    animation: slideIn 120ms ease;
  }
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .panel-header h3 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }
  .close-btn {
    padding: 3px;
    color: var(--text-muted);
  }
  .close-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .field label,
  .collab-section-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-family: var(--font-editor);
  }
  .opt { font-weight: 400; text-transform: none; color: var(--text-muted); }
  .field input {
    padding: 6px 8px;
    font-size: 12px;
    font-family: var(--font-editor);
    background: var(--bg-deep);
    border: 1px solid var(--border);
    color: var(--text-primary);
    outline: none;
  }
  .field input:focus { border-color: var(--accent); }
  .field input::placeholder { color: var(--text-muted); }
  .status-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-muted);
  }
  .status-dot.connected { background: var(--success); }
  .copy-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .room-code {
    flex: 1;
    padding: 6px 8px;
    font-size: 10px;
    font-family: var(--font-editor);
    background: var(--bg-deep);
    border: 1px solid var(--border);
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: all;
    word-break: break-all;
  }
  .copy-btn {
    padding: 6px;
    color: var(--text-muted);
    flex-shrink: 0;
  }
  .copy-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .security-hint {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    font-size: 10.5px;
    color: var(--text-muted);
    line-height: 1.4;
    margin-top: 2px;
  }
  .peer-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .peer-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 7px;
    background: var(--bg-deep);
    font-size: 12px;
  }
  .peer-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .peer-name {
    color: var(--text-primary);
    font-weight: 500;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .peer-file {
    font-size: 10px;
    color: var(--text-muted);
    font-family: var(--font-editor);
    flex-shrink: 0;
  }
  .hint {
    font-size: 11px;
    color: var(--text-muted);
    font-style: italic;
  }
  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .divider {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-muted);
    font-size: 10px;
  }
  .divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .btn {
    padding: 7px 14px;
    font-size: 12px;
    font-weight: 500;
    text-align: center;
  }
  .btn.primary {
    background: var(--accent);
    color: #111;
  }
  .btn.primary:hover:not(:disabled) { background: var(--accent-hover); }
  .btn.primary:disabled { opacity: 0.5; cursor: default; }
  .btn.danger {
    background: transparent;
    color: var(--error);
    border: 1px solid var(--error);
  }
  .btn.danger:hover { background: rgba(224, 108, 117, 0.1); }
</style>
