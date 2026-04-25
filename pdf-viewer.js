/* pdf-viewer.js — PDF.js wrapper with zoom support */
const PDFViewer = (() => {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

  let pdfDoc         = null;
  let canvasEl       = null;
  let onPageChangeCb = null;
  let onZoomChangeCb = null;
  let currentPage    = 1;
  let renderTask     = null;
  let preloadCache   = {};

  // Zoom state
  let fitMode     = 'page';   // 'page' | 'width' | 'custom'
  let customScale = 1.0;

  // ── Public API ───────────────────────────────────────────────────────────────

  async function init(file, canvas, onPageChange, onZoomChange) {
    canvasEl       = canvas;
    onPageChangeCb = onPageChange;
    onZoomChangeCb = onZoomChange || null;
    currentPage    = 1;
    fitMode        = 'page';
    customScale    = 1.0;
    preloadCache   = {};
    renderTask     = null;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    loadingTask.onPassword = () => { throw new Error('Password-protected PDFs are not supported.'); };

    pdfDoc = await loadingTask.promise;
    await _renderToCanvas(1, canvasEl);  // fires onZoomChangeCb internally
    onPageChangeCb && onPageChangeCb(1);
    _preloadAdjacent(1);

    return pdfDoc.numPages;
  }

  async function navigateTo(n) {
    if (!pdfDoc) return;
    n = Math.max(1, Math.min(n, pdfDoc.numPages));
    _cancelRender();
    currentPage = n;
    await _renderToCanvas(n, canvasEl);
    onPageChangeCb && onPageChangeCb(n);
    _preloadAdjacent(n);
  }

  async function zoomIn() {
    const cur = _lastScale;
    customScale = Math.min(cur * 1.25, 10);
    fitMode = 'custom';
    preloadCache = {};
    await _renderToCanvas(currentPage, canvasEl);
  }

  async function zoomOut() {
    const cur = _lastScale;
    customScale = Math.max(cur / 1.25, 0.1);
    fitMode = 'custom';
    preloadCache = {};
    await _renderToCanvas(currentPage, canvasEl);
  }

  async function fitPage() {
    fitMode = 'page';
    preloadCache = {};
    await _renderToCanvas(currentPage, canvasEl);
  }

  async function fitWidth() {
    fitMode = 'width';
    preloadCache = {};
    await _renderToCanvas(currentPage, canvasEl);
  }

  function getTotalPages()  { return pdfDoc ? pdfDoc.numPages : 0; }
  function getFitMode()     { return fitMode; }

  // ── Private ──────────────────────────────────────────────────────────────────

  function _computeScale(page) {
    const container = canvasEl.parentElement || document.getElementById('pdf-canvas-container');
    const pad  = 32;
    const availW = (container.clientWidth  || 800) - pad;
    const availH = (container.clientHeight || 600) - pad;
    const baseVP = page.getViewport({ scale: 1 });

    if (fitMode === 'width')  return Math.max(0.1, availW / baseVP.width);
    if (fitMode === 'page')   return Math.max(0.1, Math.min(availW / baseVP.width, availH / baseVP.height));
    return Math.max(0.1, customScale); // 'custom'
  }

  let _lastScale = 1;

  async function _renderToCanvas(n, canvas) {
    _cancelRender();
    const page     = await pdfDoc.getPage(n);
    const scale    = _computeScale(page);
    _lastScale     = scale;
    const viewport = page.getViewport({ scale });

    canvas.width  = viewport.width;
    canvas.height = viewport.height;

    const ctx  = canvas.getContext('2d');
    renderTask = page.render({ canvasContext: ctx, viewport });
    await renderTask.promise;
    renderTask = null;

    onZoomChangeCb && onZoomChangeCb(Math.round(scale * 100));
  }

  function _cancelRender() {
    if (renderTask) { try { renderTask.cancel(); } catch (_) {} renderTask = null; }
  }

  function _preloadAdjacent(n) {
    [n - 1, n + 1].forEach(adj => {
      if (adj < 1 || adj > pdfDoc.numPages || preloadCache[adj]) return;

      const offscreen = document.createElement('canvas');
      preloadCache[adj] = pdfDoc.getPage(adj).then(async page => {
        const scale    = _computeScale(page);
        const viewport = page.getViewport({ scale });
        offscreen.width  = viewport.width;
        offscreen.height = viewport.height;
        const task = page.render({ canvasContext: offscreen.getContext('2d'), viewport });
        await task.promise;
        return offscreen;
      }).catch(() => null);

      const keys = Object.keys(preloadCache).map(Number);
      if (keys.length > 6) {
        const farthest = keys.sort((a, b) => Math.abs(b - n) - Math.abs(a - n))[0];
        delete preloadCache[farthest];
      }
    });
  }

  return { init, navigateTo, zoomIn, zoomOut, fitPage, fitWidth, getTotalPages, getFitMode };
})();
