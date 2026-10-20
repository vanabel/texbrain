<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  /** `x` splits left/right. `y` splits top/bottom. */
  export let axis: 'x' | 'y' = 'x';

  const dispatch = createEventDispatcher<{ resize: { delta: number }; resizestart: void; resizeend: void }>();

  let dragging = false;
  let start = 0;

  function onMouseDown(e: MouseEvent) {
    const vertical = axis === 'y';
    dragging = true;
    start = vertical ? e.clientY : e.clientX;
    document.body.style.cursor = vertical ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    dispatch('resizestart');

    function onMouseMove(ev: MouseEvent) {
      const next = vertical ? ev.clientY : ev.clientX;
      const delta = next - start;
      start = next;
      dispatch('resize', { delta });
    }

    function onMouseUp() {
      dragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dispatch('resizeend');
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="resizer"
  class:axis-y={axis === 'y'}
  class:active={dragging}
  on:mousedown={onMouseDown}
  role="separator"
  aria-orientation={axis === 'y' ? 'horizontal' : 'vertical'}
  tabindex="-1"
></div>

<style>
  .resizer {
    width: 3px;
    cursor: col-resize;
    background: var(--border);
    flex-shrink: 0;
    position: relative;
  }

  .resizer.axis-y {
    width: 100%;
    height: 3px;
    cursor: row-resize;
  }

  .resizer:hover,
  .resizer.active {
    background: var(--accent);
  }

  .resizer::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -4px;
    right: -4px;
  }

  .resizer.axis-y::after {
    left: 0;
    right: 0;
    top: -4px;
    bottom: -4px;
  }
</style>
