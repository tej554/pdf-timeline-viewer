/* parser.js — CSV / Excel → normalised categories[] */
const Parser = (() => {
  const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

  function expandPages(str) {
    const pages = new Set();
    str.split(',').forEach(part => {
      part = part.trim();
      if (!part) return;
      const range = part.match(/^(\d+)-(\d+)$/);
      if (range) {
        const lo = parseInt(range[1], 10);
        const hi = parseInt(range[2], 10);
        for (let i = lo; i <= hi; i++) pages.add(i);
      } else {
        const n = parseInt(part, 10);
        if (!isNaN(n) && n > 0) pages.add(n);
      }
    });
    return pages;
  }

  function normaliseRow(row) {
    const get = key => {
      const found = Object.keys(row).find(k => k.trim().toLowerCase() === key);
      return found !== undefined ? String(row[found] || '').trim() : undefined;
    };

    const name      = get('category');
    let   color     = get('color');
    let   pagesStr  = get('pages');
    // Optional columns
    const dateRange = get('date_range') || get('date range') || get('dates') || '';

    if (name === undefined)     throw new Error('Missing required column: "category"');
    if (color === undefined)    throw new Error('Missing required column: "color"');
    if (pagesStr === undefined) throw new Error('Missing required column: "pages"');

    // PapaParse puts overflow columns (unquoted commas in pages) into __parsed_extra
    if (row.__parsed_extra && Array.isArray(row.__parsed_extra) && row.__parsed_extra.length) {
      pagesStr += ',' + row.__parsed_extra.join(',');
    }

    if (!HEX_RE.test(color)) {
      console.warn(`[parser] Invalid hex color "${color}" for "${name}" — using fallback #888888`);
      color = '#888888';
    }

    if (!name) throw new Error('Empty category name in row');

    return { name, color, dateRange, pages: expandPages(pagesStr) };
  }

  async function parse(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv')                   return parseCSV(file);
    if (ext === 'xlsx' || ext === 'xls') return parseXLSX(file);
    throw new Error(`Unsupported file type ".${ext}". Please load a .csv or .xlsx file.`);
  }

  function parseCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete(results) {
          try { resolve(results.data.map(normaliseRow)); }
          catch (e) { reject(e); }
        },
        error(err) { reject(new Error(err.message || String(err))); }
      });
    });
  }

  async function parseXLSX(file) {
    const buf   = await file.arrayBuffer();
    const wb    = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows  = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return rows.map(normaliseRow);
  }

  return { parse };
})();
