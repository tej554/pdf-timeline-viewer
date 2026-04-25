/* timeline.js — Swimlane DOM builder */
const Timeline = (() => {
  let containerEl    = null;
  let onBlockClickCb = null;
  let activeBlocks   = [];
  let blockWidth     = 20;
  let blockGap       = 2;
  let blockStride    = 22;

  function render(categories, totalPages, onBlockClick, container) {
    onBlockClickCb = onBlockClick;
    containerEl    = container || document.getElementById('timeline-container');
    activeBlocks   = [];

    containerEl.removeEventListener('click', _handleClick);
    containerEl.innerHTML = '';

    // Adaptive block width — larger blocks for smaller docs
    blockWidth  = totalPages <= 15  ? 40
                : totalPages <= 30  ? 32
                : totalPages <= 60  ? 24
                : totalPages <= 100 ? 18
                : totalPages <= 200 ? 12
                : totalPages <= 400 ? 8 : 6;
    blockGap    = totalPages <= 60 ? 2 : 1;
    blockStride = blockWidth + blockGap;

    // ── Header row (column labels) ────────────────────────────────────────────
    containerEl.appendChild(_buildHeaderRow(totalPages));

    // ── Ruler row (page numbers) ──────────────────────────────────────────────
    containerEl.appendChild(_buildRuler(totalPages));

    // ── Swimlane rows ─────────────────────────────────────────────────────────
    categories.forEach((cat, idx) => {
      containerEl.appendChild(_buildSwimlane(cat, totalPages, idx));
    });

    containerEl.addEventListener('click', _handleClick);
  }

  function setActivePage(n) {
    activeBlocks.forEach(b => b.classList.remove('active'));
    activeBlocks = [];
    if (!containerEl) return;

    const blocks = containerEl.querySelectorAll(`.page-block[data-page="${n}"]`);
    let first = null;
    blocks.forEach(b => {
      b.classList.add('active');
      activeBlocks.push(b);
      if (!first) first = b;
    });
    if (first) {
      const panel = containerEl.parentElement;
      const savedScrollTop = panel.scrollTop;
      first.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      panel.scrollTop = savedScrollTop;
    }
  }

  // ── Builders ──────────────────────────────────────────────────────────────────

  function _buildHeaderRow(totalPages) {
    const row = document.createElement('div');
    row.className = 'swimlane timeline-header-row';

    const labelCol = document.createElement('div');
    labelCol.className = 'lane-label timeline-col-header';
    labelCol.innerHTML = '<span class="col-header-text">CATEGORY</span>';
    row.appendChild(labelCol);

    const trackCol = document.createElement('div');
    trackCol.className = 'lane-track timeline-col-header-track';
    trackCol.innerHTML = `<span class="col-header-track-text">DOCUMENT PAGES &nbsp;(${totalPages} total)</span>`;
    row.appendChild(trackCol);

    return row;
  }

  function _buildRuler(totalPages) {
    const row = document.createElement('div');
    row.className = 'swimlane ruler-row';

    // Spacer with resize handle
    const spacer = document.createElement('div');
    spacer.className = 'lane-label ruler-spacer';
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'label-resize-handle';
    resizeHandle.title = 'Drag to resize label column';
    _initLabelResize(resizeHandle);
    spacer.appendChild(resizeHandle);
    row.appendChild(spacer);

    // Ruler track
    const track = document.createElement('div');
    track.className = 'lane-track ruler-track';
    track.style.position = 'relative';
    track.style.minWidth  = (totalPages * blockStride + 16) + 'px';

    // Tick interval — show every page for small docs
    const interval = totalPages <= 30  ? 1
                   : totalPages <= 60  ? 5
                   : totalPages <= 150 ? 10
                   : totalPages <= 300 ? 25 : 50;

    const trackPad = 8; // matches .lane-track padding-left

    for (let pg = 1; pg <= totalPages; pg++) {
      if (pg !== 1 && pg !== totalPages && pg % interval !== 0) continue;

      const tick = document.createElement('div');
      tick.className = 'ruler-tick';
      // Center tick over the middle of the block
      const centerX = trackPad + (pg - 1) * blockStride + blockWidth / 2;
      tick.style.left = centerX + 'px';

      const label = document.createElement('span');
      label.className = 'tick-label';
      label.textContent = pg;

      const mark = document.createElement('span');
      mark.className = 'tick-mark';

      tick.appendChild(label);
      tick.appendChild(mark);
      track.appendChild(tick);
    }

    row.appendChild(track);
    return row;
  }

  function _buildSwimlane(cat, totalPages, idx) {
    const swimlane = document.createElement('div');
    swimlane.className = 'swimlane' + (idx % 2 === 0 ? ' swimlane-even' : '');

    // Label
    const label = document.createElement('div');
    label.className = 'lane-label';
    label.style.borderLeft = `4px solid ${cat.color}`;

    const dot = document.createElement('span');
    dot.className = 'label-dot';
    dot.style.background = cat.color;
    label.appendChild(dot);

    const textWrap = document.createElement('div');
    textWrap.className = 'label-text-wrap';

    const nameEl = document.createElement('span');
    nameEl.className = 'label-name';
    nameEl.textContent = cat.name;
    nameEl.title = cat.name;
    textWrap.appendChild(nameEl);

    if (cat.dateRange) {
      const dateEl = document.createElement('span');
      dateEl.className = 'label-date';
      dateEl.textContent = cat.dateRange;
      textWrap.appendChild(dateEl);
    }

    label.appendChild(textWrap);
    swimlane.appendChild(label);

    // Track
    const track = document.createElement('div');
    track.className = 'lane-track';

    for (let pg = 1; pg <= totalPages; pg++) {
      const block = document.createElement('div');
      block.className = 'page-block';
      block.dataset.page = pg;
      block.style.width = blockWidth + 'px';
      block.style.marginRight = blockGap + 'px';

      if (cat.pages.has(pg)) {
        block.style.backgroundColor = cat.color;
        block.title = `${cat.name} — Page ${pg}${cat.dateRange ? '\n' + cat.dateRange : ''}`;
      } else {
        block.classList.add('uncategorized');
        block.title = `Page ${pg}`;
      }

      track.appendChild(block);
    }

    swimlane.appendChild(track);
    return swimlane;
  }

  // ── Event handlers ────────────────────────────────────────────────────────────

  function _handleClick(e) {
    const block = e.target.closest('.page-block');
    if (!block) return;
    const page = parseInt(block.dataset.page, 10);
    if (!isNaN(page) && onBlockClickCb) onBlockClickCb(page);
  }

  // ── Label column resize ───────────────────────────────────────────────────────

  function _initLabelResize(handle) {
    let dragging = false, startX = 0, startW = 0;

    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      dragging = true;
      startX   = e.clientX;
      startW   = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--label-w'), 10) || 180;
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const newW = Math.max(80, Math.min(500, startW + (e.clientX - startX)));
      document.documentElement.style.setProperty('--label-w', newW + 'px');
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  return { render, setActivePage };
})();
