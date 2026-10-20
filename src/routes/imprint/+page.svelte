<script lang="ts">
  import { siteUrl } from '$lib/site';
  import SiteChrome from '$lib/ui/SiteChrome.svelte';
  import { locale } from '$lib/i18n/locale';
  import { legalCopy } from '$lib/i18n/legal';

  $: page = legalCopy[$locale].imprint;
</script>

<svelte:head>
  <title>{page.metaTitle}</title>
  <meta name="description" content={page.metaDescription} />
  <link rel="canonical" href={siteUrl('/imprint')} />
  <meta property="og:title" content={page.ogTitle} />
  <meta property="og:url" content={siteUrl('/imprint')} />
</svelte:head>

<SiteChrome scrollable>
  <div class="content legal-sheet">
    <h1>{page.title}</h1>
    {#if page.updated}
      <p class="updated">{page.updated}</p>
    {/if}

    {#each page.sections as section}
      <h2>{section.heading}</h2>
      {#if section.heading === 'Maintainer' || section.heading === '本站维护者'}
        <p>
          <a href="https://github.com/vanabel" target="_blank" rel="noopener">{section.body}</a>
          （<a href="https://tex.vanabel.cn" target="_blank" rel="noopener">tex.vanabel.cn</a>）
        </p>
      {:else if section.heading === 'Original author' || section.heading === '原作者'}
        <p>
          <a href="https://swimmingbrain.dev" target="_blank" rel="noopener">{section.body}</a>
          （<a href="https://tex.swimmingbrain.dev" target="_blank" rel="noopener">tex.swimmingbrain.dev</a>）
        </p>
      {:else if section.heading === 'Contact' || section.heading === '联系方式'}
        <p>
          {section.body}<a href="https://github.com/vanabel/texbrain" target="_blank" rel="noopener"
            >vanabel/texbrain</a
          >{$locale === 'zh' ? '。' : ''}
        </p>
      {:else}
        <p>{section.body}</p>
      {/if}
    {/each}
  </div>
</SiteChrome>

<style>
  :global(html),
  :global(body) {
    overflow: auto;
  }
</style>
