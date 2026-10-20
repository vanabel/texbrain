<script lang="ts">
  import { base } from '$app/paths';
  import Logo from '$lib/ui/Logo.svelte';
  import LanguageSwitch from '$lib/ui/LanguageSwitch.svelte';
  import ThemeToggle from '$lib/ui/ThemeToggle.svelte';
  import { locale } from '$lib/i18n/locale';
  import { landingCopy } from '$lib/i18n/landing';
  import { texbrainBuildRevision, texbrainGitCommitUrl } from '$lib/build-meta';

  /** When true, page can scroll (legal pages). Homepage keeps viewport locked. */
  export let scrollable = false;

  $: L = landingCopy[$locale];
  $: commitUrl = texbrainGitCommitUrl();
</script>

<div class="site" class:scrollable>
  <nav class="nav">
    <div class="nav-inner">
      <a href="{base}/" class="logo">
        <span class="logo-mark"><Logo size={24} /></span>
        <span class="logo-name">TeXbrain</span>
      </a>
      <div class="nav-actions">
        <ThemeToggle />
        <LanguageSwitch />
        <a href="https://github.com/vanabel/texbrain" target="_blank" rel="noopener" class="github-link" title="GitHub">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        </a>
        <a href="{base}/editor" class="nav-cta">{L.navOpenEditor}</a>
      </div>
    </div>
  </nav>

  <div class="site-main">
    <slot />
  </div>

  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-one-line">
        <div class="footer-brand">
          <span class="logo-mark"><Logo size={16} /></span>
          <span class="footer-name">TeXbrain</span>
        </div>
        <span class="footer-gap" aria-hidden="true">·</span>
        <div class="footer-links">
          <a href="{base}/privacy">{L.footerPrivacy}</a>
          <a href="{base}/terms">{L.footerTerms}</a>
          <a href="{base}/imprint">{L.footerImprint}</a>
        </div>
        <span class="footer-gap" aria-hidden="true">·</span>
        <span class="footer-credit">
          {#if $locale === 'en'}
            maintained with <span class="heart">&hearts;</span> by
            <a href="https://github.com/vanabel" target="_blank" rel="noopener">vanabel</a>
            · originally
            <a href="https://swimmingbrain.dev" target="_blank" rel="noopener">Braian Plaku</a>
          {:else}
            <a href="https://github.com/vanabel" target="_blank" rel="noopener">vanabel</a>
            用 <span class="heart">&hearts;</span> 维护 · 原作
            <a href="https://swimmingbrain.dev" target="_blank" rel="noopener">Braian Plaku</a>
          {/if}
        </span>
        {#if texbrainBuildRevision && commitUrl}
          <span class="footer-gap" aria-hidden="true">·</span>
          <a
            href={commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="footer-revision-link"
            title={L.footerBuildLinkTitle}
          >
            <span class="footer-revision-label">{L.footerBuildLabel}</span>
            <code class="footer-revision-sha">{texbrainBuildRevision}</code>
          </a>
        {/if}
      </div>
    </div>
  </footer>
</div>

<style>
  .site {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-deep);
    overflow: hidden;
  }

  .site.scrollable {
    height: auto;
    min-height: 100%;
    overflow: visible;
  }

  .site-main {
    flex: 1 1 auto;
    min-height: 0;
  }

  .site.scrollable .site-main {
    min-height: auto;
  }

  .nav {
    flex-shrink: 0;
    background: var(--bg-deep);
    border-bottom: 1px solid var(--border);
    backdrop-filter: saturate(1.15) blur(10px);
  }

  .nav-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 28px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 9px;
    text-decoration: none;
    transition: opacity 0.15s ease;
  }

  .logo:hover {
    opacity: 0.86;
  }

  .logo-mark {
    display: flex;
    align-items: center;
    color: var(--accent);
  }

  .logo-name {
    font-family: var(--font-brand);
    font-style: italic;
    font-size: 19px;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .nav-cta {
    padding: 6px 15px;
    font-size: 12px;
    font-weight: 600;
    color: #111;
    background: var(--accent);
    border-radius: 8px;
    text-decoration: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12), 0 4px 14px var(--accent-dim);
    transition: background 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
  }

  .nav-cta:hover {
    background: var(--accent-hover);
    color: #111;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.16), 0 8px 22px var(--accent-dim);
  }

  .nav-cta:active {
    transform: translateY(0);
  }

  .github-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    transition: color 0.15s;
  }

  .github-link:hover {
    color: var(--text-secondary);
  }

  .footer {
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    background: var(--bg-deep);
    padding: 12px 28px;
  }

  .footer-inner {
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  .footer-one-line {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 0 10px;
    white-space: nowrap;
    font-size: 11px;
    font-family: var(--font-editor);
    color: var(--text-muted);
    min-width: min-content;
  }

  .footer-gap {
    flex: 0 0 auto;
    opacity: 0.45;
    user-select: none;
    padding: 0 2px;
  }

  .footer-revision-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
    text-decoration: none;
    color: inherit;
    border-radius: var(--radius-sm);
    padding: 2px 4px;
    margin: 0;
    white-space: nowrap;
  }

  .footer-revision-link:hover {
    color: var(--accent);
    background: var(--bg-surface);
  }

  .footer-revision-label {
    opacity: 0.85;
  }

  .footer-revision-sha {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid var(--border);
    background: var(--bg-surface);
    color: var(--text-secondary);
  }

  .footer-revision-link:hover .footer-revision-sha {
    border-color: var(--accent);
    color: var(--accent);
  }

  .footer-brand {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 6px;
  }

  .footer-name {
    font-family: var(--font-brand);
    font-style: italic;
    font-size: 13px;
    color: var(--text-primary);
  }

  .footer-credit {
    flex: 0 0 auto;
    margin: 0;
    font-size: inherit;
    color: inherit;
    font-family: inherit;
  }

  .footer-credit a {
    color: var(--accent);
    text-decoration: none;
  }

  .footer-credit a:hover {
    color: var(--accent-hover);
  }

  .footer-links {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 14px;
    font-size: inherit;
    font-family: inherit;
  }

  .footer-links a {
    color: var(--text-muted);
    text-decoration: none;
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    transition: color 0.15s ease, background-color 0.15s ease;
  }

  .footer-links a:hover {
    color: var(--accent);
    background: var(--bg-surface);
  }

  .heart {
    color: var(--error);
    font-size: 12px;
  }
</style>
