<script lang="ts">
  import { addToast } from '$lib/stores/app';

  export let content: string = '';
  export let fileName: string = '';
  export let fileId: string = '';
  export let onSave: (xml: string) => void = () => {};
  export let onExported: (data: string, format: string) => void = () => {};

  let drawioWindow: MessageEventSource | null = null;
  let ready = false;
  let loadedFileId = '';

  const DRAWIO_URL = 'https://embed.diagrams.net/?embed=1&ui=kennedy&spin=1&proto=json&libraries=1&noSaveBtn=0&saveAndExit=0&noExitBtn=1';

  function handleMessage(e: MessageEvent) {
    if (!e.data || typeof e.data !== 'string') return;

    let msg: any;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    if (!msg || !msg.event) return;

    if (msg.event === 'init') {
      drawioWindow = e.source;
      ready = true;
      loadDiagram();
    } else if (msg.event === 'save') {
      onSave(msg.xml);
      requestExport('png');
    } else if (msg.event === 'export') {
      onExported(msg.data, msg.format);
    } else if (msg.event === 'autosave') {
      onSave(msg.xml);
    }
  }

  function sendToDrawio(data: any) {
    if (!drawioWindow) return;
    (drawioWindow as Window).postMessage(JSON.stringify(data), '*');
  }

  function loadDiagram() {
    if (!ready || !drawioWindow) return;
    loadedFileId = fileId;
    sendToDrawio({ action: 'load', autosave: 1, xml: content || '' });
  }

  export function requestExport(format: 'svg' | 'png' = 'png') {
    if (!ready) return;
    sendToDrawio({ action: 'export', format, scale: 2, bg: 'none', grid: false, shadow: false });
  }

  $: if (ready && fileId && fileId !== loadedFileId) {
    loadDiagram();
  }

  function initDrawio(_node: HTMLIFrameElement) {
    window.addEventListener('message', handleMessage);
    return {
      destroy() {
        window.removeEventListener('message', handleMessage);
        drawioWindow = null;
        ready = false;
      }
    };
  }
</script>

<div class="drawio-container">
  <iframe
    use:initDrawio
    src={DRAWIO_URL}
    title="Draw.io Editor - {fileName}"
    class="drawio-frame"
  ></iframe>
</div>

<style>
  .drawio-container {
    width: 100%;
    height: 100%;
    display: flex;
    overflow: hidden;
    background: var(--bg-deep);
  }

  .drawio-frame {
    width: 100%;
    height: 100%;
    border: none;
    background: #1a1a2e;
  }
</style>
