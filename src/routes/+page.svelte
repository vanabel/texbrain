<script lang="ts">
  import { base } from '$app/paths';
  import { siteUrl } from '$lib/site';
  import Logo from '$lib/ui/Logo.svelte';
  import LanguageSwitch from '$lib/ui/LanguageSwitch.svelte';
  import ThemeToggle from '$lib/ui/ThemeToggle.svelte';
  import { locale } from '$lib/i18n/locale';
  import { texbrainBuildRevision, texbrainGitCommitUrl } from '$lib/build-meta';
  import { landingCopy } from '$lib/i18n/landing';

  $: L = landingCopy[$locale];
  $: commitUrl = texbrainGitCommitUrl();
</script>

<svelte:head>
  <title>{L.metaTitle}</title>
  <meta name="description" content={L.metaDescription} />
  <link rel="canonical" href={siteUrl('/')} />
  <meta property="og:title" content={L.ogTitle} />
  <meta property="og:description" content={L.ogDescription} />
  <meta property="og:url" content={siteUrl('/')} />
  <meta name="twitter:title" content={L.twitterTitle} />
  <meta name="twitter:description" content={L.twitterDescription} />
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "TeXbrain",
    "url": "${siteUrl('/')}",
    "applicationCategory": "Productivity",
    "operatingSystem": "Web",
    "inLanguage": $locale === 'zh' ? 'zh-CN' : 'en',
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "description": L.jsonLdDescription,
    "author": { "@type": "Person", "name": "vanabel", "url": "https://github.com/vanabel" },
    "license": "https://opensource.org/licenses/MIT",
    "featureList": L.jsonLdFeatureList
  })}</script>`}
</svelte:head>

<div class="landing">
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

  <div class="content">
    <div class="split">
      <div class="left">
        <h1 class="hero-title">
          {L.heroLine1}<br />
          <span class="hero-accent">{L.heroAccent}</span>
        </h1>
        <p class="hero-desc">
          {L.heroDesc}
        </p>
        <a href="{base}/editor" class="hero-cta">
          {L.heroCta}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        <div class="feature-pills">
          {#each L.pills as pill}
            <span class="pill">{pill}</span>
          {/each}
        </div>
      </div>

      <div class="right">
        <div class="demo-window">
          <div class="demo-bar">
            <div class="demo-dots">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
            <span class="demo-filename">{L.demoFilename}</span>
            <div style="flex:1"></div>
            <span class="demo-label">{L.demoPreviewLabel}</span>
          </div>
          <div class="demo-content">
            <div class="demo-editor">
              <div class="line-numbers">
                {#each Array(9) as _, i}
                  <span>{i + 1}</span>
                {/each}
              </div>
              <!-- whitespace-sensitive: keep tags flush so pre-wrap does not indent lines -->
              <code
                ><span class="c-cmd">\documentclass</span><span class="c-brace">{'{'}article{'}'}</span
                >{'\n'}<span class="c-cmd">\title</span><span class="c-brace">{'{'}{L.demoTexTitle}{'}'}</span
                >{'\n'}<span class="c-cmd">\author</span><span class="c-brace">{'{'}{L.demoTexAuthor}{'}'}</span
                >{'\n'}<span class="c-cmd">\date</span><span class="c-brace">{'{'}</span
                ><span class="c-cmd">\today</span><span class="c-brace">{'}'}</span
                >{'\n'}<span class="c-env">\begin</span><span class="c-brace">{'{'}document{'}'}</span
                >{'\n'}<span class="c-cmd">\maketitle</span
                >{'\n'}<span class="c-cmd">\section</span><span class="c-brace">{'{'}{L.demoTexSection}{'}'}</span
                >{'\n'}{L.demoTexHello}<span class="c-math">$E = mc^2$</span
                >{$locale === 'zh' ? '。' : '.'}{'\n'}<span class="c-env">\end</span
                ><span class="c-brace">{'{'}document{'}'}</span
              ></code>
            </div>
            <div class="demo-divider"></div>
            <div class="demo-preview">
              <div class="preview-paper">
                <h2 style="text-align:center;margin-bottom:3px;font-size:14px;font-weight:600;">{L.demoTexTitle}</h2>
                <p class="paper-author">{L.demoTexAuthor}</p>
                <p style="font-weight:600;margin-bottom:4px;font-size:12px;">1 {L.demoTexSection}</p>
                <p style="font-size:11px;line-height:1.6;">{L.demoTexHello}<em>E = mc&sup2;</em>{$locale === 'zh' ? '。' : '.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <section class="features">
    <div class="features-inner">
      <h2 class="features-heading">{L.featuresHeading}</h2>
      {#if L.features[0]?.points}
        <article class="feature-lead">
          <div>
            <h3>{L.features[0].title}</h3>
            <p>{L.features[0].body}</p>
          </div>
          <ul class="feature-points">
            {#each L.features[0].points as point}
              <li>
                {#each point.split(/(`[^`]+`)/) as part}
                  {#if part.startsWith('`') && part.endsWith('`')}
                    <code>{part.slice(1, -1)}</code>
                  {:else}
                    {part}
                  {/if}
                {/each}
              </li>
            {/each}
          </ul>
        </article>
      {/if}
      <div class="features-grid">
        {#each L.features.slice(L.features[0]?.points ? 1 : 0) as feat}
          <div class="feature">
            <h3>{feat.title}</h3>
            <p>{feat.body}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

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
  .landing {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-deep);
    overflow: hidden;
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

  .content {
    flex: 0 0 auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 0;
    padding: 12px 28px 6px;
  }

  .split {
    max-width: 1180px;
    width: 100%;
    display: flex;
    align-items: stretch;
    gap: 48px;
  }

  .left {
    flex: 0 0 440px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    animation: rise-in 0.5s ease-out both;
  }

  .hero-title {
    font-size: 38px;
    font-weight: 700;
    line-height: 1.12;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin-bottom: 12px;
  }

  .hero-accent {
    color: var(--accent);
  }

  .hero-desc {
    font-size: 15px;
    line-height: 1.5;
    color: var(--text-secondary);
    margin-bottom: 18px;
  }

  .hero-cta {
    display: inline-flex;
    align-self: flex-start;
    align-items: center;
    gap: 9px;
    padding: 11px 22px;
    font-size: 14px;
    font-weight: 600;
    color: #111;
    background: var(--accent);
    border-radius: 10px;
    text-decoration: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.14), 0 10px 28px var(--accent-dim);
    transition: background 0.15s ease, transform 0.14s ease, box-shadow 0.15s ease;
  }

  .hero-cta:hover {
    background: var(--accent-hover);
    color: #111;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18), 0 14px 36px var(--accent-dim);
  }

  .hero-cta:active {
    transform: translateY(0);
  }

  .feature-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 18px;
    max-width: 100%;
  }

  .pill {
    font-size: 12px;
    font-weight: 500;
    font-family: var(--font-ui);
    color: var(--text-secondary);
    padding: 5px 11px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elevated);
    letter-spacing: -0.01em;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    transition: border-color 0.15s ease, color 0.15s ease, transform 0.12s ease;
    white-space: nowrap;
    flex: 0 1 auto;
  }

  .pill:hover {
    border-color: var(--accent);
    color: var(--text-primary);
    transform: translateY(-1px);
  }

  .right {
    flex: 1;
    min-width: 0;
    max-width: 640px;
  }

  .demo-window {
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    background: var(--bg-surface);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 16px 48px rgba(0, 0, 0, 0.24);
    animation: rise-in 0.55s 0.06s ease-out both;
  }

  .demo-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 32px;
    padding: 0 12px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
  }

  .demo-dots {
    display: flex;
    gap: 5px;
  }

  .demo-dots .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border);
  }

  .demo-filename {
    font-size: 11px;
    font-family: var(--font-editor);
    color: var(--text-primary);
  }

  .demo-label {
    font-size: 10px;
    font-family: var(--font-editor);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .demo-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
    min-height: 0;
    height: clamp(236px, 28vh, 268px);
  }

  .demo-editor {
    min-width: 0;
    padding: 12px 10px 12px 0;
    background: var(--bg-surface);
    font-family: var(--font-editor);
    font-size: 12px;
    line-height: 1.55;
    overflow: hidden;
    display: flex;
  }

  .line-numbers {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding: 0 8px 0 10px;
    color: var(--text-muted);
    font-size: 11.5px;
    line-height: 1.55;
    user-select: none;
    opacity: 0.4;
  }

  .demo-editor code {
    white-space: pre-wrap;
    color: var(--text-primary);
    flex: 1;
  }

  .c-cmd { color: var(--syntax-command); }
  .c-env { color: var(--syntax-environment); }
  .c-brace { color: var(--syntax-brace); }
  .c-math { color: var(--syntax-math); }

  .demo-divider {
    width: 1px;
    background: var(--border);
  }

  .demo-preview {
    min-width: 0;
    padding: 0;
    background: var(--bg-surface);
    display: flex;
    align-items: stretch;
  }

  .preview-paper {
    background: var(--bg-surface);
    color: var(--text-primary);
    padding: 18px 16px;
    width: 100%;
    flex: 1;
    font-family: 'Georgia', serif;
    font-size: 13px;
  }

  .paper-author {
    text-align: center;
    color: #b4b4bc;
    font-size: 10px;
    margin-bottom: 10px;
  }

  :global([data-theme='light']) .demo-preview,
  :global([data-theme='light']) .preview-paper {
    background: #fff;
    color: #1a1a1a;
  }

  :global([data-theme='light']) .paper-author {
    color: #666;
  }

  .features {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 16px 28px 18px;
    overflow: hidden;
    animation: rise-in 0.6s 0.1s ease-out both;
  }

  @keyframes rise-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .left,
    .demo-window,
    .features {
      animation: none;
    }
  }

  .features-inner {
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    flex: 0 0 auto;
    display: grid;
    grid-template-rows: auto auto auto;
    align-content: start;
    gap: 12px;
  }

  .features-heading {
    font-size: 22px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    letter-spacing: -0.02em;
    text-align: center;
  }

  .feature-lead {
    display: grid;
    grid-template-columns: minmax(180px, 240px) 1fr;
    gap: 12px 36px;
    align-items: center;
    margin: 0;
    padding: 12px 18px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--bg-elevated);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 12px 32px rgba(0, 0, 0, 0.14);
    transition: transform 0.15s ease, box-shadow 0.18s ease, border-color 0.15s ease;
  }

  .feature-lead:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12), 0 18px 44px rgba(0, 0, 0, 0.18);
  }

  .feature-lead h3 {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin: 0 0 8px;
  }

  .feature-lead p {
    margin: 0;
    font-size: 15px;
    line-height: 1.45;
    color: var(--text-secondary);
  }

  .feature-points {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 32px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .feature-points li {
    position: relative;
    padding-left: 14px;
    font-size: 14.5px;
    line-height: 1.5;
    color: var(--text-primary);
  }

  .feature-points li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55em;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
  }

  .feature-points code {
    font-family: var(--font-editor);
    font-size: 0.95em;
    color: var(--syntax-command);
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: auto auto;
    align-content: start;
    gap: 10px;
  }

  .features-grid .feature {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 10px 28px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    min-width: 0;
    transition: transform 0.15s ease, box-shadow 0.18s ease, border-color 0.15s ease;
  }

  .features-grid .feature:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12), 0 16px 40px rgba(0, 0, 0, 0.16);
  }

  .feature h3 {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 6px;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .feature p {
    font-size: 13px;
    line-height: 1.45;
    color: var(--text-secondary);
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .footer {
    position: relative;
    z-index: 2;
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

  /** 品牌、链接、署名、构建 SHA 全部同一行；极窄屏可横向滑动查看 */
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

  .footer-links {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 12px;
    font-size: inherit;
    font-family: inherit;
  }

  .footer-links a {
    color: var(--text-muted);
    text-decoration: none;
  }

  .footer-links a:hover {
    color: var(--accent);
  }

  .heart {
    color: var(--error);
    font-size: 12px;
  }

  /* mobile: stack and allow scroll — one-screen fit is for desktop */
  @media (max-width: 900px) {
    .landing {
      height: auto;
      min-height: 100%;
      overflow-y: auto;
    }

    .content {
      flex: none;
      padding: 32px 20px;
    }

    .split {
      flex-direction: column;
      gap: 28px;
    }

    .left {
      flex: none;
      text-align: center;
      display: block;
    }

    .hero-cta {
      align-self: center;
    }

    .hero-title { font-size: 34px; }
    .hero-desc { font-size: 15px; }

    .features-heading { font-size: 20px; }
    .feature-lead h3 { font-size: 18px; }
    .feature-lead p { font-size: 14px; }
    .feature-points li { font-size: 14px; }
    .feature h3 { font-size: 15px; }
    .feature p { font-size: 13.5px; }

    .feature-pills {
      justify-content: center;
      flex-wrap: wrap;
    }

    .right {
      width: 100%;
    }

    .demo-content {
      grid-template-columns: 1fr;
      height: auto;
      min-height: 200px;
    }

    .demo-divider {
      width: 100%;
      height: 1px;
    }

    .features {
      flex: none;
      padding: 28px 20px 36px;
    }

    .features-inner {
      flex: none;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .feature-lead,
    .feature-points,
    .features-grid {
      grid-template-columns: 1fr;
    }

    .features-grid {
      grid-template-rows: none;
      gap: 12px;
    }

    .features-grid .feature {
      justify-content: flex-start;
    }

    .line-numbers { display: none; }

    .footer {
      padding: 14px 20px;
    }
  }

  @media (max-width: 480px) {
    .hero-title { font-size: 30px; }
    .content { padding: 24px 16px; }
    .features-heading { font-size: 18px; }
  }
</style>
