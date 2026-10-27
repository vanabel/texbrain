<script lang="ts">
  import { renderSVG } from 'uqr';
  import { base } from '$app/paths';
  import {
    collabActive,
    collabRoom,
    collabPeers,
    collabLinkCount,
    collabConnected,
    collabPanelOpen,
    collabUserName,
    pendingJoin
  } from '$lib/collab/store';
  import { updateUserName, leaveRoom, parseJoinCredentials, buildJoinUrl } from '$lib/collab/provider';
  import { addToast } from '$lib/stores/app';
  import { locale } from '$lib/i18n/locale';
  import { editorUi, expandEditorTemplate } from '$lib/i18n/editor-ui';

  $: E = editorUi[$locale];

  export let onCreateRoom: () => Promise<void> = async () => {};
  export let onJoinRoom: (shareCode: string, accessPin: string) => Promise<void> = async () => {};
  export let onLeaveRoom: () => void = () => {};

  let nameInput = $collabUserName || '';
  let shareCodeInput = '';
  let accessPinInput = '';
  let creating = false;
  let joining = false;
  let showQr = false;

  $: if ($collabUserName && !nameInput) nameInput = $collabUserName;

  $: if ($pendingJoin && !$collabActive) {
    shareCodeInput = $pendingJoin.shareCode;
    accessPinInput = $pendingJoin.accessPin;
  }

  $: if (!$collabActive) showQr = false;

  $: joinUrl =
    $collabRoom?.shareCode && $collabRoom?.accessPin
      ? buildJoinUrl($collabRoom.shareCode, $collabRoom.accessPin, { base })
      : '';

  $: shareQrSvg =
    showQr && joinUrl
      ? renderSVG(joinUrl, {
          border: 1,
          pixelSize: 3,
          whiteColor: '#ffffff',
          blackColor: '#111111'
        })
      : '';

  function formatDigits(value: string, group = 0): string {
    if (!group || value.length <= group) return value;
    const parts: string[] = [];
    for (let i = 0; i < value.length; i += group) parts.push(value.slice(i, i + group));
    return parts.join(' ');
  }

  async function handleCreate() {
    if (!nameInput.trim()) {
      addToast(E.toastNameFirst, 'warning');
      return;
    }
    updateUserName(nameInput.trim());
    creating = true;
    try {
      await onCreateRoom();
    } catch (err: any) {
      console.error('Create room failed:', err);
      addToast(
        expandEditorTemplate(E.toastCreateFailed, { msg: err?.message || E.unknownError }),
        'error'
      );
    } finally {
      creating = false;
    }
  }

  async function handleJoin() {
    const code = shareCodeInput.trim();
    const pin = accessPinInput.trim();
    if (!code || !pin) {
      addToast(E.toastPasteCode, 'warning');
      return;
    }
    if (!parseJoinCredentials(code, pin)) {
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
      await onJoinRoom(code, pin);
      pendingJoin.set(null);
    } catch (err: any) {
      console.error('Join room failed:', err);
      addToast(
        expandEditorTemplate(E.toastJoinFailed, { msg: err?.message || E.unknownError }),
        'error'
      );
    } finally {
      joining = false;
      shareCodeInput = '';
      accessPinInput = '';
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

  function copyAccessPin() {
    if ($collabRoom) {
      navigator.clipboard.writeText($collabRoom.accessPin);
      addToast(E.toastPinCopied, 'success');
    }
  }

  function copyJoinLink() {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    addToast(E.toastJoinLinkCopied, 'success');
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
    <aside class="collab-panel">
      <header class="panel-header">
        <div class="header-left">
          <h3>{E.collabPanelTitle}</h3>
          {#if $collabActive}
            <span class="status-chip" class:on={$collabConnected}>
              <span class="status-dot" class:connected={$collabConnected}></span>
              {$collabConnected ? E.connected : E.connecting}
            </span>
          {/if}
        </div>
        <button type="button" class="icon-btn" on:click={close} title={E.collabClose} aria-label={E.collabClose}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </header>

      <div class="panel-body">
        <div class="flow-hint">
          <p class="flow-hint-title">{E.collabFlowTitle}</p>
          <ol class="flow-hint-list">
            {#each E.collabFlowSteps as step}
              <li>{step}</li>
            {/each}
          </ol>
        </div>

        <div class="field">
          <label for="collab-name">{E.yourName}</label>
          <input
            id="collab-name"
            type="text"
            bind:value={nameInput}
            on:blur={handleNameBlur}
            placeholder={E.namePlaceholder}
            maxlength="30"
          />
        </div>

        {#if $collabActive}
          <div class="cred-card">
            <div class="cred-cell">
              <span class="cred-label">{E.shareCode}</span>
              <button type="button" class="cred-value" on:click={copyShareCode} title={E.copyShareCode}>
                {formatDigits($collabRoom?.shareCode ?? '')}
              </button>
              <button type="button" class="text-btn" on:click={copyShareCode}>{E.copyShareCode}</button>
            </div>
            <div class="cred-divider" aria-hidden="true"></div>
            <div class="cred-cell">
              <span class="cred-label">{E.accessPin}</span>
              <button type="button" class="cred-value pin" on:click={copyAccessPin} title={E.copyAccessPin}>
                {formatDigits($collabRoom?.accessPin ?? '', 3)}
              </button>
              <button type="button" class="text-btn" on:click={copyAccessPin}>{E.copyAccessPin}</button>
            </div>
          </div>

          <div class="action-row">
            <button type="button" class="btn ghost" on:click={copyJoinLink} disabled={!joinUrl}>
              {E.copyJoinLink}
            </button>
            <button type="button" class="btn ghost" on:click={() => (showQr = !showQr)} disabled={!joinUrl}>
              {showQr ? E.shareQrHide : E.shareQrShow}
            </button>
          </div>

          {#if shareQrSvg}
            <div class="share-qr" aria-label={E.shareQrLabel}>
              {@html shareQrSvg}
            </div>
          {/if}

          <p class="hint quiet">{E.shareHintEncrypt}</p>

          {#if $collabPeers.length > 0}
            <div class="peers">
              <span class="section-kicker">{E.collaborators} · {$collabPeers.length}</span>
              <ul class="peer-list">
                {#each $collabPeers as peer}
                  <li class="peer-item">
                    <span class="peer-dot" style="background:{peer.user.color}"></span>
                    <span class="peer-name">{peer.user.name}</span>
                    {#if peer.currentFile}
                      <span class="peer-file">{peer.currentFile.split('/').pop()}</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {:else if $collabLinkCount > 0}
            <p class="hint">
              {expandEditorTemplate(E.peersLinkedSyncing, { n: $collabLinkCount })}
            </p>
          {:else}
            <p class="hint">{E.waitingPeers}</p>
          {/if}

          <div class="panel-footer">
            <button type="button" class="btn danger" on:click={handleLeave}>{E.leaveSession}</button>
          </div>
        {:else}
          <section class="block">
            <h4 class="block-title">{E.startSession}</h4>
            <button type="button" class="btn primary" on:click={handleCreate} disabled={creating}>
              {creating ? E.starting : E.startCollab}
            </button>
            <p class="hint quiet">{E.startHintEncrypt}</p>
          </section>

          <div class="divider"><span>{E.or}</span></div>

          <section class="block">
            <h4 class="block-title">{E.joinSession}</h4>
            <div class="join-grid">
              <div class="field">
                <label for="join-code">{E.labelShareCode}</label>
              <input
                id="join-code"
                class="code-input"
                type="text"
                spellcheck="false"
                autocomplete="off"
                maxlength="5"
                bind:value={shareCodeInput}
                on:input={() => {
                  shareCodeInput = shareCodeInput.replace(/[^A-Za-z0-9]/g, '').slice(0, 5);
                }}
                placeholder={E.pasteCodePlaceholder}
              />
            </div>
            <div class="field">
              <label for="join-pin">{E.joinPinLabel}</label>
              <input
                id="join-pin"
                class="code-input"
                type="text"
                spellcheck="false"
                autocomplete="off"
                maxlength="6"
                bind:value={accessPinInput}
                on:input={() => {
                  accessPinInput = accessPinInput.replace(/[^A-Za-z0-9]/g, '').slice(0, 6);
                }}
                placeholder={E.joinPinPlaceholder}
              />
            </div>
            </div>
            <button
              type="button"
              class="btn primary"
              on:click={handleJoin}
              disabled={joining || !shareCodeInput.trim() || !accessPinInput.trim()}
            >
              {joining ? E.joining : E.joinBtn}
            </button>
          </section>
        {/if}
      </div>
    </aside>
  </div>
{/if}

<style>
  .collab-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    justify-content: flex-end;
    background: rgba(0, 0, 0, 0.42);
  }
  .collab-panel {
    width: 320px;
    max-width: 92vw;
    height: 100%;
    background: var(--bg-surface);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 28px rgba(0, 0, 0, 0.28);
    animation: slideIn 140ms ease;
  }
  @keyframes slideIn {
    from { transform: translateX(12px); opacity: 0.6; }
    to { transform: translateX(0); opacity: 1; }
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .panel-header h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }
  .flow-hint {
    margin: 0 0 12px;
    padding: 8px 10px;
    font-size: 11px;
    line-height: 1.45;
    color: var(--text-secondary, var(--text-muted));
    background: color-mix(in srgb, var(--accent, #4ecdc4) 8%, var(--bg-elevated, var(--bg-surface)));
    border: 1px solid color-mix(in srgb, var(--accent, #4ecdc4) 22%, var(--border));
    border-radius: 6px;
  }
  .flow-hint-title {
    margin: 0 0 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .flow-hint-list {
    margin: 0;
    padding-left: 1.15rem;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .flow-hint-list li {
    padding-left: 2px;
  }
  .status-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 7px;
    border: 1px solid var(--border);
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }
  .status-chip.on {
    color: var(--success, #6bbf7a);
    border-color: color-mix(in srgb, var(--success, #6bbf7a) 35%, var(--border));
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-muted);
  }
  .status-dot.connected { background: var(--success, #6bbf7a); }
  .icon-btn {
    padding: 4px;
    color: var(--text-muted);
    flex-shrink: 0;
  }
  .icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .field label,
  .section-kicker,
  .cred-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .field input {
    padding: 7px 9px;
    font-size: 12px;
    font-family: var(--font-editor);
    background: var(--bg-deep);
    border: 1px solid var(--border);
    color: var(--text-primary);
    outline: none;
  }
  .field input:focus { border-color: var(--accent); }
  .field input::placeholder { color: var(--text-muted); }
  .code-input {
    letter-spacing: 0.08em;
    text-align: center;
    font-size: 15px !important;
    font-weight: 600;
  }

  .cred-card {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: stretch;
    background: var(--bg-deep);
    border: 1px solid var(--border);
    padding: 12px 8px;
  }
  .cred-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 0 4px;
  }
  .cred-divider {
    width: 1px;
    background: var(--border);
    margin: 2px 0;
  }
  .cred-value {
    width: 100%;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-editor);
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0.14em;
    line-height: 1.1;
    text-align: center;
    cursor: pointer;
    padding: 2px 0;
  }
  .cred-value.pin { font-size: 18px; letter-spacing: 0.1em; }
  .cred-value:hover { color: var(--accent); }
  .text-btn {
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 10px;
    padding: 0;
    cursor: pointer;
  }
  .text-btn:hover { color: var(--accent); }

  .action-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .share-qr {
    display: flex;
    justify-content: center;
    padding: 10px;
    background: #fff;
    border: 1px solid var(--border);
  }
  .share-qr :global(svg) {
    width: 132px;
    height: 132px;
    display: block;
  }

  .peers { display: flex; flex-direction: column; gap: 6px; }
  .peer-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .peer-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
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
    margin: 0;
    font-size: 11px;
    color: var(--text-muted);
  }
  .hint.quiet { line-height: 1.45; }

  .block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .block-title {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .join-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
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

  .panel-footer {
    margin-top: auto;
    padding-top: 4px;
  }

  .btn {
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    border: 1px solid transparent;
  }
  .btn.primary {
    background: var(--accent);
    color: #111;
  }
  .btn.primary:hover:not(:disabled) { background: var(--accent-hover); }
  .btn.primary:disabled { opacity: 0.5; cursor: default; }
  .btn.ghost {
    background: transparent;
    border-color: var(--border);
    color: var(--text-secondary);
  }
  .btn.ghost:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--text-primary);
  }
  .btn.ghost:disabled { opacity: 0.45; cursor: default; }
  .btn.danger {
    width: 100%;
    background: transparent;
    color: var(--error);
    border-color: color-mix(in srgb, var(--error) 55%, var(--border));
  }
  .btn.danger:hover { background: rgba(224, 108, 117, 0.1); }
</style>
