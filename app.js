/* app.js — State store and sync bridge */
(() => {
  // ── State ──────────────────────────────────────────────────────────────────
  let currentPage = 1;
  let totalPages  = 0;
  let categories  = [];
  let pdfReady    = false;
  let csvReady    = false;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const btnLoadPdf   = document.getElementById('btn-load-pdf');
  const btnLoadCsv   = document.getElementById('btn-load-csv');
  const inputPdf     = document.getElementById('input-pdf');
  const inputCsv     = document.getElementById('input-csv');
  const pdfCanvas    = document.getElementById('pdf-canvas');
  const pdfPlaceholder  = document.getElementById('pdf-placeholder');
  const pdfError        = document.getElementById('pdf-error');
  const pdfFilename     = document.getElementById('pdf-filename');
  const csvFilename     = document.getElementById('csv-filename');
  const timelinePanel      = document.getElementById('timeline-panel');
  const timelineContainer  = document.getElementById('timeline-container');
  const timelinePlaceholder = document.getElementById('timeline-placeholder');
  const dropOverlay  = document.getElementById('drop-overlay');
  const toast        = document.getElementById('toast');
  const resizeHandle   = document.getElementById('resize-handle');
  const sidebar        = document.getElementById('sidebar');
  const sidebarResize  = document.getElementById('sidebar-resize');

  // PDF controls overlay
  const pdfControls  = document.getElementById('pdf-controls');
  const btnPrev      = document.getElementById('btn-prev');
  const btnNext      = document.getElementById('btn-next');
  const pageInput    = document.getElementById('page-input');
  const totalPagesEl = document.getElementById('total-pages');
  const btnZoomIn    = document.getElementById('btn-zoom-in');
  const btnZoomOut   = document.getElementById('btn-zoom-out');
  const zoomLevel    = document.getElementById('zoom-level');
  const btnFitPage   = document.getElementById('btn-fit-page');
  const btnFitWidth  = document.getElementById('btn-fit-width');

  // ── File input ─────────────────────────────────────────────────────────────
  btnLoadPdf.addEventListener('click', () => inputPdf.click());
  btnLoadCsv.addEventListener('click', () => inputCsv.click());

  inputPdf.addEventListener('change', e => {
    const f = e.target.files[0]; if (f) loadPDF(f); inputPdf.value = '';
  });
  inputCsv.addEventListener('change', e => {
    const f = e.target.files[0]; if (f) loadCSV(f); inputCsv.value = '';
  });

  // ── Drag and drop ──────────────────────────────────────────────────────────
  let dragDepth = 0;
  document.addEventListener('dragenter', e => { e.preventDefault(); if (++dragDepth === 1) dropOverlay.classList.remove('hidden'); });
  document.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; dropOverlay.classList.add('hidden'); } });
  document.addEventListener('dragover',  e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault(); dragDepth = 0; dropOverlay.classList.add('hidden');
    Array.from(e.dataTransfer.files).forEach(file => {
      if (file.name.toLowerCase().endsWith('.pdf'))     loadPDF(file);
      else if (/\.(csv|xlsx|xls)$/i.test(file.name))   loadCSV(file);
      else showToast(`Unsupported file: "${file.name}"`);
    });
  });

  // ── Page navigation ────────────────────────────────────────────────────────
  btnPrev.addEventListener('click', () => setPage(currentPage - 1));
  btnNext.addEventListener('click', () => setPage(currentPage + 1));

  pageInput.addEventListener('change', () => { const n = parseInt(pageInput.value, 10); if (!isNaN(n)) setPage(n); });
  pageInput.addEventListener('keydown', e => { if (e.key === 'Enter') { const n = parseInt(pageInput.value, 10); if (!isNaN(n)) setPage(n); } });

  // ── Zoom controls ──────────────────────────────────────────────────────────
  btnZoomIn.addEventListener('click', async () => {
    _setCtrlsDisabled(true);
    await PDFViewer.zoomIn();
    _setCtrlsDisabled(false);
  });
  btnZoomOut.addEventListener('click', async () => {
    _setCtrlsDisabled(true);
    await PDFViewer.zoomOut();
    _setCtrlsDisabled(false);
  });
  btnFitPage.addEventListener('click', async () => {
    _setCtrlsDisabled(true);
    await PDFViewer.fitPage();
    _setFitButtons('page');
    _setCtrlsDisabled(false);
  });
  btnFitWidth.addEventListener('click', async () => {
    _setCtrlsDisabled(true);
    await PDFViewer.fitWidth();
    _setFitButtons('width');
    _setCtrlsDisabled(false);
  });

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.target === pageInput) return;
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    setPage(currentPage - 1);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')   setPage(currentPage + 1);
    if (e.key === 'Home') setPage(1);
    if (e.key === 'End')  setPage(totalPages);
    if ((e.ctrlKey || e.metaKey) && e.key === '=') { e.preventDefault(); btnZoomIn.click(); }
    if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); btnZoomOut.click(); }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); btnFitPage.click(); }
  });

  // ── Timeline resize handle (vertical) ─────────────────────────────────────
  let resizing = false, resizeStartY = 0, resizeStartH = 0;
  resizeHandle.addEventListener('mousedown', e => {
    resizing = true; resizeStartY = e.clientY; resizeStartH = timelinePanel.offsetHeight;
    document.body.style.userSelect = 'none'; document.body.style.cursor = 'ns-resize'; e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    timelinePanel.style.height = Math.max(80, Math.min(480, resizeStartH + (resizeStartY - e.clientY))) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!resizing) return; resizing = false;
    document.body.style.userSelect = ''; document.body.style.cursor = '';
  });

  // ── Sidebar resize handle (horizontal) ────────────────────────────────────
  let sideResizing = false, sideStartX = 0, sideStartW = 0;
  sidebarResize.addEventListener('mousedown', e => {
    sideResizing = true; sideStartX = e.clientX; sideStartW = sidebar.offsetWidth;
    document.body.style.userSelect = 'none'; document.body.style.cursor = 'ew-resize'; e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!sideResizing) return;
    sidebar.style.width = Math.max(120, Math.min(400, sideStartW + (e.clientX - sideStartX))) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!sideResizing) return; sideResizing = false;
    document.body.style.userSelect = ''; document.body.style.cursor = '';
  });

  // ── Core: setPage ──────────────────────────────────────────────────────────
  function setPage(n) {
    if (!pdfReady) return;
    n = Math.max(1, Math.min(n, totalPages));
    if (n === currentPage) return;
    currentPage = n;
    _updateNavUI();
    PDFViewer.navigateTo(n);
    Timeline.setActivePage(n);
  }

  // ── Load PDF ───────────────────────────────────────────────────────────────
  async function loadPDF(file) {
    pdfPlaceholder.classList.add('hidden');
    pdfError.classList.add('hidden');
    pdfCanvas.classList.add('hidden');
    pdfControls.classList.add('hidden');
    pdfReady = false;

    try {
      totalPages = await PDFViewer.init(file, pdfCanvas, _onPdfPageChange, _onZoomChange);

      pdfReady = true;
      currentPage = 1;
      pdfFilename.textContent = file.name;
      totalPagesEl.textContent = totalPages;
      pageInput.max = totalPages;
      pdfCanvas.classList.remove('hidden');
      pdfControls.classList.remove('hidden');
      _setFitButtons('page');
      _updateNavUI();
      _setCtrlsDisabled(false);

      if (csvReady) _renderTimeline();
      else showToast('PDF loaded. Now load a CSV or Excel categories file.');
    } catch (err) {
      pdfError.textContent = `Could not load PDF: ${err.message}`;
      pdfError.classList.remove('hidden');
      showToast('Failed to load PDF.', 4000);
    }
  }

  // ── Load CSV / Excel ───────────────────────────────────────────────────────
  async function loadCSV(file) {
    try {
      categories = await Parser.parse(file);
      if (!categories.length) throw new Error('No category rows found in file.');
      csvReady = true;
      csvFilename.textContent = file.name;
      if (pdfReady) _renderTimeline();
      else showToast('Categories loaded. Now load a PDF to see the timeline.');
    } catch (err) {
      showToast(`Category error: ${err.message}`, 5000);
    }
  }

  // ── Timeline ───────────────────────────────────────────────────────────────
  function _renderTimeline() {
    if (timelinePlaceholder) timelinePlaceholder.style.display = 'none';
    Timeline.render(categories, totalPages, page => setPage(page), timelineContainer);
    Timeline.setActivePage(currentPage);
  }

  // ── Callbacks ──────────────────────────────────────────────────────────────
  function _onPdfPageChange(n) {
    if (n === currentPage) return;
    currentPage = n;
    _updateNavUI();
    Timeline.setActivePage(n);
  }

  function _onZoomChange(pct) {
    zoomLevel.textContent = pct + '%';
    // Reflect fit mode if changed externally
    _setFitButtons(PDFViewer.getFitMode());
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  function _updateNavUI() {
    pageInput.value    = currentPage;
    btnPrev.disabled   = currentPage <= 1;
    btnNext.disabled   = currentPage >= totalPages;
  }

  function _setCtrlsDisabled(disabled) {
    [btnPrev, btnNext, btnZoomIn, btnZoomOut, btnFitPage, btnFitWidth].forEach(b => b.disabled = disabled);
    pageInput.disabled = disabled;
    if (!disabled) _updateNavUI(); // re-apply prev/next edge rules
  }

  function _setFitButtons(mode) {
    btnFitPage.classList.toggle('active',  mode === 'page');
    btnFitWidth.classList.toggle('active', mode === 'width');
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg, duration = 3000) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
  }
})();
