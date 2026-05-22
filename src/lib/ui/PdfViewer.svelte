<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { locale } from '$lib/i18n/locale';
  import { editorUi } from '$lib/i18n/editor-ui';
  import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
  import 'pdfjs-dist/web/pdf_viewer.css';
  import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
  import cMapProbeUrl from 'pdfjs-dist/cmaps/Adobe-GB1-UCS2.bcmap?url';
  import standardFontProbeUrl from 'pdfjs-dist/standard_fonts/FoxitSerif.pfb?url';

  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  /** pdf.js expects a trailing slash on cmap / standard_fonts base URLs. */
  function withTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
  }

  /**
   * Resolve a directory URL against the current page so subdirectory deploys
   * (SvelteKit `paths.base`) and odd static hosts still fetch the right assets.
   */
  function resolvePdfAssetDir(probeFileUrl: string): string {
    const dir = probeFileUrl.replace(/[^/]+$/, '');
    if (typeof window === 'undefined') return withTrailingSlash(dir);
    try {
      return withTrailingSlash(new URL(dir, window.location.href).href);
    } catch {
      return withTrailingSlash(dir);
    }
  }

  function optionalBuildTimeBase(envKey: string): string | null {
    const v = (import.meta.env[envKey] as string | undefined)?.trim();
    return v || null;
  }

  /** Same version as `pdf.worker` (from `package.json` of `pdfjs-dist`). */
  function pdfjsBundledVersion(): string {
    const v = (pdfjsLib as { version?: string }).version?.trim();
    return v || '4.10.38';
  }

  /**
   * Dev: always use Vite-resolved cmap / standard_fonts (fast, offline).
   * Prod: default to jsDelivr so `vite preview`, NAS, and empty MIME on `.bcmap`
   * cannot break CJK (translateFont / ToUnicode). Air-gapped: set
   * `VITE_PDFJS_LOCAL_PDF_ASSETS=1` at build time to keep hashed `_app/immutable` assets.
   */
  function preferBundledPdfjsAssets(): boolean {
    if (import.meta.env.DEV) return true;
    const v = (import.meta.env.VITE_PDFJS_LOCAL_PDF_ASSETS as string | undefined)?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }

  function defaultCdnCmapBaseUrl(): string {
    return withTrailingSlash(`https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsBundledVersion()}/cmaps`);
  }

  function defaultCdnStandardFontBaseUrl(): string {
    return withTrailingSlash(`https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsBundledVersion()}/standard_fonts`);
  }

  function effectiveCMapBaseUrl(): string {
    const override = optionalBuildTimeBase('VITE_PDFJS_CMAP_URL');
    if (override) {
      if (typeof window === 'undefined') return withTrailingSlash(override);
      try {
        return withTrailingSlash(new URL(override, window.location.href).href);
      } catch {
        return withTrailingSlash(override);
      }
    }
    if (preferBundledPdfjsAssets()) {
      return resolvePdfAssetDir(cMapProbeUrl);
    }
    return defaultCdnCmapBaseUrl();
  }

  function effectiveStandardFontBaseUrl(): string {
    const override = optionalBuildTimeBase('VITE_PDFJS_STANDARD_FONT_URL');
    if (override) {
      if (typeof window === 'undefined') return withTrailingSlash(override);
      try {
        return withTrailingSlash(new URL(override, window.location.href).href);
      } catch {
        return withTrailingSlash(override);
      }
    }
    if (preferBundledPdfjsAssets()) {
      return resolvePdfAssetDir(standardFontProbeUrl);
    }
    return defaultCdnStandardFontBaseUrl();
  }

  $: E = editorUi[$locale];

  /** CSS pixels per PDF point at “100%” (72 pt → 96 px). */
  const ACTUAL_SCALE = 96 / 72;
  const PDF_PAD = 24;

  type PdfZoomMode = 'page-fit' | 'width-fit' | 'actual' | 'custom';

  export let pdfData: Uint8Array | undefined = undefined;
  /** Ctrl/Cmd+click on the rendered page: PDF coordinates in points (origin bottom-left). */
  export let synctexPdfNavigate:
    | ((e: {
        page: number;
        xPt: number;
        yFromBottomPt: number;
        pageWidthPt: number;
        pageHeightPt: number;
        pdfTextBefore?: string;
        pdfTextAfter?: string;
      }) => void)
    | undefined = undefined;

  // Production defaults to the native PDF viewer (iframe): reliable on some NAS/browser combos
  // where pdf.js can hit font parsing bugs. That mode cannot implement SyncTeX (no access to
  // click coordinates or page geometry inside the embedded viewer). Set VITE_PDF_VIEWER=pdfjs
  // at build time to force pdf.js in production and enable SyncTeX in the preview pane.
  const rawPdfViewer = (import.meta.env.VITE_PDF_VIEWER as string | undefined)?.trim().toLowerCase();
  const useNativeViewer =
    rawPdfViewer === 'pdfjs'
      ? false
      : rawPdfViewer === 'native'
        ? true
        : import.meta.env.PROD;
  let nativePdfUrl = '';

  let container: HTMLDivElement;
  let pageCount = 1;
  let pendingFraction = -1;
  let pendingSourceText = '';
  let pendingSynctex: {
    page: number;
    left: number;
    bottom: number;
    width: number;
    height: number;
  } | null = null;
  let scale = 1;
  let zoomMode: PdfZoomMode = 'width-fit';
  let pdfDoc: any = null;
  let rendering = false;
  let resizeObserver: ResizeObserver | null = null;
  let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
  /** Native iframe zoom % when mode is custom. */
  let customZoomPct = 100;

  $: zoomPercentLabel =
    useNativeViewer && zoomMode === 'custom'
      ? `${customZoomPct}%`
      : `${Math.round((scale / ACTUAL_SCALE) * 100)}%`;

  $: nativeViewerSrc =
    nativePdfUrl && useNativeViewer
      ? `${nativePdfUrl}${nativeViewHash(zoomMode)}`
      : '';

  let pageTextCache: Array<{
    text: string;
    items: Array<{ str: string; transform: number[]; width?: number; height?: number }>;
    viewportHeight: number;
  }> = [];

  /** Unscaled PDF page size in points (per page index 0..n-1). */
  let pageSizePts: Array<{ w: number; h: number }> = [];

  function makeLinkService(doc: any) {
    return {
      externalLinkEnabled: true,
      get pagesCount() { return doc.numPages; },
      get page() { return 1; },
      set page(_: number) {},
      get rotation() { return 0; },
      set rotation(_: number) {},
      get isInPresentationMode() { return false; },
      async goToDestination(dest: any) {
        const resolved = typeof dest === 'string' ? await doc.getDestination(dest) : dest;
        if (!resolved) return;
        const ref = resolved[0];
        const idx = await doc.getPageIndex(ref);
        scrollToPage(idx + 1);
      },
      goToPage(val: number) { scrollToPage(val); },
      addLinkAttributes(link: HTMLAnchorElement, url: string, newWindow?: boolean) {
        link.href = url;
        link.rel = 'noopener noreferrer';
        link.target = newWindow ? '_blank' : '_blank';
      },
      getDestinationHash(dest: any) { return '#'; },
      getAnchorUrl(hash: string) { return '#'; },
      setHash(_: string) {},
      executeNamedAction(_: string) {},
      executeSetOCGState(_: any) {}
    };
  }

  $: if (pdfData && !useNativeViewer) {
    handleNewPdf(pdfData);
  }

  $: if (pdfData && useNativeViewer) {
    if (nativePdfUrl) URL.revokeObjectURL(nativePdfUrl);
    nativePdfUrl = URL.createObjectURL(new Blob([new Uint8Array(pdfData)], { type: 'application/pdf' }));
    zoomMode = 'width-fit';
    customZoomPct = 100;
  }

  function nativeViewHash(mode: PdfZoomMode): string {
    switch (mode) {
      case 'width-fit':
        return '#view=FitH';
      case 'page-fit':
        return '#view=Fit';
      case 'actual':
        return '#zoom=100';
      case 'custom':
        return `#zoom=${customZoomPct}`;
      default:
        return '#view=FitH';
    }
  }

  function computeAutoScale(
    mode: 'page-fit' | 'width-fit' | 'actual',
    pageW: number,
    pageH: number,
    el: HTMLElement
  ): number {
    if (mode === 'actual') return ACTUAL_SCALE;
    const cw = Math.max(1, el.clientWidth - PDF_PAD);
    const ch = Math.max(1, el.clientHeight - PDF_PAD);
    const wScale = cw / pageW;
    const scaleForMode =
      mode === 'width-fit' ? wScale : Math.min(wScale, ch / pageH);
    return Math.max(0.25, Math.min(4, scaleForMode));
  }

  function setZoomMode(mode: PdfZoomMode) {
    if (zoomMode === mode && mode !== 'custom') return;
    zoomMode = mode;
    if (useNativeViewer) return;
    if (pdfDoc && !rendering) void rerender();
  }

  function zoomBy(factor: number) {
    zoomMode = 'custom';
    if (useNativeViewer) {
      const next = Math.round(Math.max(25, Math.min(400, customZoomPct * factor)));
      if (next === customZoomPct) return;
      customZoomPct = next;
      scale = ACTUAL_SCALE * (customZoomPct / 100);
      return;
    }
    const next = Math.max(0.25, Math.min(4, scale * factor));
    if (next === scale) return;
    scale = next;
    if (pdfDoc && !rendering) void rerender();
  }

  function bindContainer(el: HTMLDivElement) {
    container = el;
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(() => {
      if (!pdfDoc || useNativeViewer || zoomMode === 'custom') return;
      if (resizeDebounce) clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        resizeDebounce = null;
        if (!rendering) void rerender();
      }, 120);
    });
    resizeObserver.observe(el);
    return {
      destroy() {
        resizeObserver?.disconnect();
        resizeObserver = null;
        if (resizeDebounce) clearTimeout(resizeDebounce);
        resizeDebounce = null;
      }
    };
  }

  $: if (!pdfData && nativePdfUrl) {
    URL.revokeObjectURL(nativePdfUrl);
    nativePdfUrl = '';
  }

  onDestroy(() => {
    resizeObserver?.disconnect();
    if (resizeDebounce) clearTimeout(resizeDebounce);
    if (nativePdfUrl) URL.revokeObjectURL(nativePdfUrl);
  });

  async function handleNewPdf(data: Uint8Array) {
    if (rendering) return;
    rendering = true;
    zoomMode = 'width-fit';
    customZoomPct = 100;

    try {
      const synTarget = pendingSynctex;
      pendingSynctex = null;
      const targetFraction = pendingFraction >= 0 ? pendingFraction : -1;
      const targetSourceText = pendingSourceText;
      pendingFraction = -1;
      pendingSourceText = '';

      const bundled = preferBundledPdfjsAssets();
      const strictNoFontFace =
        (import.meta.env.VITE_PDF_DISABLE_FONT_FACE as string | undefined)?.trim().toLowerCase() === 'true';

      const doc = await pdfjsLib.getDocument({
        data: data.slice(),
        cMapUrl: effectiveCMapBaseUrl(),
        cMapPacked: true,
        standardFontDataUrl: effectiveStandardFontBaseUrl(),
        // Bundled `_app/immutable` assets: fetch from the document (some NAS / static hosts
        // break worker subrequests). Public CDN: worker fetch matches dev and is reliable.
        useWorkerFetch: bundled ? false : true,
        ...(strictNoFontFace
          ? { useSystemFonts: false as const, disableFontFace: true as const }
          : { disableFontFace: false as const })
      }).promise;
      pdfDoc = doc;
      pageCount = doc.numPages;

      await tick();
      if (!container) { rendering = false; return; }

      await renderAllPages(doc);

      if (synTarget) {
        scrollToSynctexPdfBox(synTarget);
      } else if (targetSourceText) {
        scrollToSourceText(targetSourceText, targetFraction >= 0 ? targetFraction : 0);
      } else if (targetFraction >= 0) {
        scrollToFractionImpl(targetFraction);
      }
    } catch (err) {
      console.error('[PDF] error:', err);
    } finally {
      rendering = false;
    }
  }

  async function renderAllPages(doc: any) {
    container.innerHTML = '';
    pageTextCache = [];
    pageSizePts = [];
    const dpr = window.devicePixelRatio || 1;

    const page1 = await doc.getPage(1);
    const baseVp = page1.getViewport({ scale: 1 });
    if (zoomMode !== 'custom') {
      scale = computeAutoScale(zoomMode, baseVp.width, baseVp.height, container);
    }

    for (let i = 1; i <= doc.numPages; i++) {
      const page = i === 1 ? page1 : await doc.getPage(i);
      const viewport = page.getViewport({ scale });
      const unscaled = page.getViewport({ scale: 1 });
      pageSizePts.push({ w: unscaled.width, h: unscaled.height });

      const pageDiv = document.createElement('div');
      pageDiv.dataset.page = String(i);
      pageDiv.style.cssText = `width:${viewport.width}px;height:${viewport.height}px;position:relative;background:white;margin-bottom:8px;box-shadow:0 2px 8px rgba(0,0,0,0.3);flex-shrink:0;--scale-factor:${scale};`;

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.cssText = `width:${viewport.width}px;height:${viewport.height}px;display:block;`;
      pageDiv.appendChild(canvas);

      const textDiv = document.createElement('div');
      textDiv.className = 'textLayer';
      pageDiv.appendChild(textDiv);

      container.appendChild(pageDiv);

      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      await page.render({ canvasContext: ctx, viewport }).promise;

      const textContent = await page.getTextContent();
      const tl = new pdfjsLib.TextLayer({
        textContentSource: textContent,
        container: textDiv,
        viewport
      });
      await tl.render();

      const annotations = await page.getAnnotations();
      if (annotations.length > 0) {
        const annotDiv = document.createElement('div');
        annotDiv.className = 'annotationLayer';
        pageDiv.appendChild(annotDiv);
        const al = new pdfjsLib.AnnotationLayer({
          div: annotDiv,
          page,
          viewport
        });
        await al.render({ annotations, linkService: makeLinkService(doc) });
      }

      pageTextCache.push({
        text: textContent.items.map((it: any) => it.str || '').join(' '),
        items: textContent.items
          .filter((it: any) => it.str && it.transform)
          .map((it: any) => ({
            str: it.str as string,
            transform: it.transform as number[],
            width: it.width as number | undefined,
            height: it.height as number | undefined
          })),
        viewportHeight: viewport.height
      });
    }
  }

  // scroll to a fraction (0-1) of the document with sub-page precision
  function scrollToFractionImpl(fraction: number) {
    if (!container || pageCount === 0) return;
    const exactPage = 1 + fraction * (pageCount - 1);
    const pageNum = Math.max(1, Math.min(Math.floor(exactPage), pageCount));
    const withinPage = exactPage - pageNum;

    const pageEl = container.querySelector(`[data-page="${pageNum}"]`) as HTMLElement;
    if (!pageEl) return;
    container.scrollTop = Math.max(0, pageEl.offsetTop + withinPage * pageEl.offsetHeight - 40);
  }

  // search for source text in the pdf and scroll to match position
  export function scrollToSourceText(sourceText: string, hintFraction: number) {
    if (!container || pageTextCache.length === 0) {
      scrollToFractionImpl(hintFraction);
      return;
    }

    // strip latex commands and extract plain words
    const plain = sourceText
      .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])*(\{[^}]*\})?/g, (m) => {
        const inner = m.match(/\{([^}]*)\}$/);
        return inner ? inner[1] : '';
      })
      .replace(/[{}\\$%&~^_#]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const words = plain.split(' ').filter(w => w.length >= 2);
    if (words.length < 2) {
      scrollToFractionImpl(hintFraction);
      return;
    }

    // try progressively shorter phrases until we find a match
    const hintPage = Math.max(1, Math.round(hintFraction * pageCount));

    for (let len = Math.min(words.length, 6); len >= 2; len--) {
      for (let start = 0; start <= words.length - len; start++) {
        const phrase = words.slice(start, start + len).join(' ').toLowerCase();
        if (phrase.length < 5) continue;

        const result = findPhraseInPages(phrase, hintPage);
        if (result) {
          scrollToPagePosition(result.page, result.yFromTop);
          return;
        }
      }
    }

    scrollToFractionImpl(hintFraction);
  }

  // find a phrase in the cached page texts, returns page (1-based) and y position
  function findPhraseInPages(phrase: string, hintPage: number): { page: number; yFromTop: number } | null {
    const order = Array.from({ length: pageCount }, (_, i) => i + 1)
      .sort((a, b) => Math.abs(a - hintPage) - Math.abs(b - hintPage));

    for (const pageNum of order) {
      const cached = pageTextCache[pageNum - 1];
      if (!cached) continue;

      const pageTextLower = cached.text.toLowerCase();
      const idx = pageTextLower.indexOf(phrase);
      if (idx < 0) continue;

      let cumLen = 0;
      for (const item of cached.items) {
        const itemLen = (item.str || '').length;
        if (cumLen + itemLen >= idx && item.transform) {
          const pdfY = item.transform[5];
          const yFromTop = cached.viewportHeight - pdfY * scale;
          return { page: pageNum, yFromTop: Math.max(0, yFromTop) };
        }
        cumLen += itemLen + 1;
      }

      return { page: pageNum, yFromTop: 0 };
    }
    return null;
  }

  function scrollToPagePosition(pageNum: number, yFromTop: number) {
    if (!container) return;
    const pageEl = container.querySelector(`[data-page="${pageNum}"]`) as HTMLElement;
    if (!pageEl) return;
    container.scrollTop = Math.max(0, pageEl.offsetTop + yFromTop - 50);
  }

  /** Scroll to a SyncTeX box (PDF points, origin bottom-left). */
  export function scrollToSynctexPdfBox(box: {
    page: number;
    left: number;
    bottom: number;
    width: number;
    height: number;
  }) {
    if (!container || useNativeViewer) return;
    const pageNum = Math.max(1, Math.min(box.page, pageCount));
    const pageEl = container.querySelector(`[data-page="${pageNum}"]`) as HTMLElement;
    if (!pageEl) return;
    const canvas = pageEl.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const sz = pageSizePts[pageNum - 1];
    if (!sz?.h) {
      scrollToPagePosition(pageNum, 0);
      return;
    }
    const centerFromBottom = box.bottom + box.height / 2;
    const yPtFromTop = sz.h - centerFromBottom;
    const frac = Math.max(0, Math.min(1, yPtFromTop / sz.h));
    const yWithin = frac * pageEl.offsetHeight;
    scrollToPagePosition(pageNum, yWithin);
  }

  /** Plain text around a PDF click (for inverse SyncTeX line refinement). */
  function getPdfTextAroundPoint(
    pageNum: number,
    xPt: number,
    yFromBottomPt: number
  ): { before: string; after: string } | null {
    const cached = pageTextCache[pageNum - 1];
    if (!cached?.items.length) return null;

    let hit = 0;
    let bestDist = Infinity;
    for (let i = 0; i < cached.items.length; i++) {
      const it = cached.items[i];
      const t = it.transform;
      const w = it.width ?? Math.max(4, (it.str?.length ?? 1) * Math.abs(t[0] ?? 10) * 0.55);
      const h = Math.abs(it.height ?? t[3] ?? t[0] ?? 12);
      const left = t[4];
      const right = t[4] + w;
      const bottom = t[5] - h * 0.25;
      const top = t[5] + h * 0.15;
      const cx = (left + right) / 2;
      const cy = (bottom + top) / 2;
      const d = Math.hypot(xPt - cx, yFromBottomPt - cy);
      if (d < bestDist) {
        bestDist = d;
        hit = i;
      }
    }

    let pos = 0;
    const parts: string[] = [];
    for (let i = 0; i < cached.items.length; i++) {
      if (i === hit) pos = parts.join(' ').length + (parts.length ? 1 : 0);
      parts.push(cached.items[i].str || '');
    }
    const full = parts.join(' ');
    if (!full) return null;
    return {
      before: full.slice(Math.max(0, pos - 100), pos),
      after: full.slice(pos, pos + 100)
    };
  }

  function handlePdfPointerDown(e: PointerEvent) {
    if (useNativeViewer || !synctexPdfNavigate || !container) return;
    if (!(e.ctrlKey || e.metaKey) || e.button !== 0) return;
    const t = e.target as HTMLElement | null;
    const pageEl = t?.closest?.('[data-page]') as HTMLElement | null;
    if (!pageEl?.dataset.page) return;
    const pageNum = parseInt(pageEl.dataset.page, 10);
    const sz = pageSizePts[pageNum - 1];
    if (!sz?.w || !sz?.h) return;
    const pr = pageEl.getBoundingClientRect();
    const x = e.clientX - pr.left;
    const y = e.clientY - pr.top;
    if (x < -4 || y < -4 || x > pr.width + 4 || y > pr.height + 4) return;
    e.preventDefault();
    e.stopPropagation();
    const xPt = (x / pr.width) * sz.w;
    const yFromTopPt = (y / pr.height) * sz.h;
    const yFromBottomPt = sz.h - yFromTopPt;
    const pdfText = getPdfTextAroundPoint(pageNum, xPt, yFromBottomPt);
    synctexPdfNavigate({
      page: pageNum,
      xPt,
      yFromBottomPt,
      pageWidthPt: sz.w,
      pageHeightPt: sz.h,
      pdfTextBefore: pdfText?.before,
      pdfTextAfter: pdfText?.after
    });
  }

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      const newScale = Math.max(0.25, Math.min(4, scale + delta));
      if (newScale !== scale) {
        scale = newScale;
        zoomMode = 'custom';
        if (pdfDoc && !rendering) rerender();
      }
    }
  }

  async function rerender() {
    if (!pdfDoc || rendering) return;
    rendering = true;
    try {
      const savedScroll = container ? container.scrollTop / container.scrollHeight : 0;
      await renderAllPages(pdfDoc);
      if (container) container.scrollTop = savedScroll * container.scrollHeight;
    } finally {
      rendering = false;
    }
  }

  export function setPageCount(n: number) { if (n > 0) pageCount = n; }
  export function clearPendingScrollTargets() {
    pendingFraction = -1;
    pendingSourceText = '';
    pendingSynctex = null;
  }
  export function setSynctexScrollTarget(box: {
    page: number;
    left: number;
    bottom: number;
    width: number;
    height: number;
  }) {
    pendingSynctex = box;
  }
  export function setScrollTarget(fraction: number, sourceText?: string) {
    pendingFraction = Math.max(0, Math.min(1, fraction));
    pendingSourceText = sourceText || '';
  }
  export function scrollToPage(pageNum: number) {
    const p = Math.max(1, Math.min(pageNum, pageCount));
    scrollToPagePosition(p, 0);
  }
  export function scrollToFraction(fraction: number) {
    scrollToFractionImpl(Math.max(0, Math.min(1, fraction)));
  }
  export function getPageCount(): number { return pageCount; }
</script>

<div class="pdf-wrap">
  {#if pdfData}
    <div class="pdf-toolbar" role="toolbar" aria-label="PDF zoom">
      <button
        type="button"
        class="pdf-zoom-btn"
        class:active={zoomMode === 'page-fit'}
        title={E.ttPdfZoomFitPage}
        on:click={() => setZoomMode('page-fit')}
      >{E.pdfZoomFitPage}</button>
      <button
        type="button"
        class="pdf-zoom-btn"
        class:active={zoomMode === 'width-fit'}
        title={E.ttPdfZoomFitWidth}
        on:click={() => setZoomMode('width-fit')}
      >{E.pdfZoomFitWidth}</button>
      <button
        type="button"
        class="pdf-zoom-btn"
        class:active={zoomMode === 'actual'}
        title={E.ttPdfZoomActual}
        on:click={() => setZoomMode('actual')}
      >{E.pdfZoomActual}</button>
      <span class="pdf-zoom-sep"></span>
      <button type="button" class="pdf-zoom-btn icon" title={E.ttPdfZoomOut} on:click={() => zoomBy(0.9)} aria-label={E.ttPdfZoomOut}>{E.pdfZoomOut}</button>
      <span class="pdf-zoom-pct" title={zoomPercentLabel}>{zoomPercentLabel}</span>
      <button type="button" class="pdf-zoom-btn icon" title={E.ttPdfZoomIn} on:click={() => zoomBy(1.1)} aria-label={E.ttPdfZoomIn}>{E.pdfZoomIn}</button>
    </div>
    {#if useNativeViewer}
      <iframe
        class="pdf-native"
        src={nativeViewerSrc}
        title="PDF Preview"
      ></iframe>
    {:else}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div use:bindContainer class="pdf-container" on:wheel={handleWheel} on:pointerdown|capture={handlePdfPointerDown}></div>
    {/if}
  {:else}
    <div class="pdf-empty">
      <p>Press <kbd>Ctrl+Enter</kbd> or click <strong>Compile</strong> to build your document</p>
    </div>
  {/if}
</div>

<style>
  .pdf-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  .pdf-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-surface);
  }

  .pdf-zoom-btn {
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    border-radius: 3px;
  }

  .pdf-zoom-btn:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .pdf-zoom-btn.active {
    color: var(--accent);
    background: var(--accent-dim);
  }

  .pdf-zoom-btn.icon {
    min-width: 26px;
    font-size: 14px;
    line-height: 1;
    padding: 2px 6px;
  }

  .pdf-zoom-sep {
    width: 1px;
    height: 14px;
    background: var(--border);
    margin: 0 4px;
  }

  .pdf-zoom-pct {
    min-width: 40px;
    text-align: center;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--text-secondary);
    font-family: var(--font-editor);
  }

  .pdf-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    background: #3a3a3e;
    position: relative;
  }

  .pdf-native {
    width: 100%;
    height: 100%;
    border: 0;
    background: #3a3a3e;
  }

  .pdf-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 40px;
    color: var(--text-muted);
    font-size: 12px;
    text-align: center;
    height: 100%;
    width: 100%;
  }

  .pdf-empty kbd {
    background: var(--bg-surface);
    padding: 1px 5px;
    border: 1px solid var(--border);
    font-family: var(--font-editor);
    font-size: 10px;
  }
</style>
