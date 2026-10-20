<script lang="ts">
  import { siteUrl } from '$lib/site';
  import SiteChrome from '$lib/ui/SiteChrome.svelte';
  import { locale } from '$lib/i18n/locale';
  import { legalCopy } from '$lib/i18n/legal';

  $: page = legalCopy[$locale].privacy;
  $: contactIdx = page.sections.length - 1;
</script>

<svelte:head>
  <title>{page.metaTitle}</title>
  <meta name="description" content={page.metaDescription} />
  <link rel="canonical" href={siteUrl('/privacy')} />
  <meta property="og:title" content={page.ogTitle} />
  <meta property="og:url" content={siteUrl('/privacy')} />
</svelte:head>

<SiteChrome scrollable>
  <div class="content legal-sheet">
    <h1>{page.title}</h1>
    {#if page.updated}
      <p class="updated">{page.updated}</p>
    {/if}

    {#each page.sections as section, i}
      <h2>{section.heading}</h2>
      {#if i === contactIdx}
        <p>
          {section.body}
          {' '}
          <a href="https://github.com/vanabel/texbrain" target="_blank" rel="noopener">GitHub</a
          >{$locale === 'zh' ? ' 联系我们。' : '.'}
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
