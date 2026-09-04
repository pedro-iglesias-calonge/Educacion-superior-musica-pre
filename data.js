const NUMERIC_HINT = 0.9;

export function norm(s) {
  return String(s == null ? "" : s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function cleanNumeric(v) {
  return String(v).trim().replace(/,/g, ".").replace(/%/g, "").replace(/\s+/g, "");
}

export function isNum(v) {
  if (v == null || v === "") return true;
  const t = cleanNumeric(v);
  if (t === "" || t === ".") return true;
  return !Number.isNaN(Number(t));
}

export function numVal(v) {
  if (v == null || String(v).trim() === "") return 0;
  const n = Number(cleanNumeric(v));
  return Number.isNaN(n) ? 0 : n;
}

export function anoNum(v) {
  if (v == null) return null;
  const m = String(v).match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

export function isYearCol(h) {
  return norm(h) === "ANO";
}

export function colKey(h, v) {
  return isYearCol(h) ? anoNum(v) : v;
}

export function parseCSV(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(";").map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(";");
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] != null ? vals[idx].trim() : "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

export function detectTypes(headers, rows) {
  const types = {};
  const sample = rows.slice(0, 2000);
  for (const h of headers) {
    if (norm(h) === "ANO") {
      types[h] = "select";
      continue;
    }
    const uniq = new Set();
    let numeric = 0;
    let total = 0;
    for (const r of sample) {
      const v = r[h];
      if (v == null || v === "") continue;
      total++;
      if (isNum(v)) numeric++;
      uniq.add(norm(v));
    }
    if (total > 0 && numeric / total >= NUMERIC_HINT) types[h] = "num";
    else if (uniq.size > 0 && uniq.size <= 300) types[h] = "select";
    else types[h] = "text";
  }
  return types;
}

export function filterData(rows, opts) {
  const { catCol, selectedCats, allCats, colFilters } = opts;
  const selNorm = Array.isArray(selectedCats) ? selectedCats.map(norm) : null;
  return rows.filter((r) => {
    if (catCol && Array.isArray(selectedCats)) {
      if (selectedCats.length === 0) return false;
      if (selectedCats.length < allCats.length) {
        if (!selNorm.includes(norm(r[catCol]))) return false;
      }
    }
    for (const [h, f] of Object.entries(colFilters)) {
      if (!colFilterMatches(f, h, r[h] == null ? "" : r[h])) return false;
    }
    return true;
  });
}

export function colFilterMatches(f, h, v) {
  if (f.kind === "num") {
    const n = numVal(v);
    if (f.min != null && n < f.min) return false;
    if (f.max != null && n > f.max) return false;
    return true;
  }
  if (f.kind === "select") {
    if (isYearCol(h)) return anoNum(v) === f.value;
    return norm(v) === norm(f.value);
  }
  if (f.kind === "multi") {
    if (f.values.length === 0) return true;
    if (isYearCol(h)) {
      const y = anoNum(v);
      return y != null && f.values.includes(y);
    }
    return f.values.some((sel) => norm(sel) === norm(v));
  }
  if (f.kind === "text") {
    return norm(v).indexOf(norm(f.text)) !== -1;
  }
  return true;
}

export function aggregateByYear(rows, opts) {
  const { yearCol, metrics } = opts;
  const byYear = new Map();
  for (const r of rows) {
    const y = anoNum(r[yearCol]);
    if (y == null) continue;
    if (!byYear.has(y)) {
      const entry = { year: y };
      for (const m of metrics) entry[m] = 0;
      byYear.set(y, entry);
    }
    const entry = byYear.get(y);
    for (const m of metrics) entry[m] += numVal(r[m]);
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

export function buildColumnGroups(headers, groups, opts = {}) {
  const { fixedCols = [], excludedCols = [] } = opts;
  const fixedNorm = fixedCols.map(norm);
  const excludedNorm = excludedCols.map(norm);
  const covered = new Set();
  const result = [];
  for (const g of groups) {
    const columns = [];
    for (const c of g.columnas || []) {
      const n = norm(c);
      const header = headers.find((h) => norm(h) === n);
      if (!header) continue;
      if (fixedNorm.includes(n) || excludedNorm.includes(n)) continue;
      columns.push(header);
      covered.add(n);
    }
    if (columns.length > 0) result.push({ name: g.grupo, columns });
  }
  const orphans = headers.filter((h) => {
    const n = norm(h);
    return !fixedNorm.includes(n) && !excludedNorm.includes(n) && !covered.has(n);
  });
  if (orphans.length > 0) result.push({ name: "Sin clasificar", columns: orphans });
  return result;
}

export function searchGroups(groups, query, titles) {
  const q = norm(query);
  if (q === "") {
    return groups.map((g) => ({ ...g, total: g.columns.length, hasMatch: true }));
  }
  return groups.map((g) => {
    const columns = g.columns.filter((c) => {
      if (norm(c).includes(q)) return true;
      const t = titles && titles[c];
      return t ? norm(t).includes(q) : false;
    });
    return { ...g, columns, total: g.columns.length, hasMatch: columns.length > 0 };
  });
}

export function orderCategories(values, canonicalOrder) {
  const canonNorm = canonicalOrder.map(norm);
  const known = [];
  const unknown = [];
  for (const v of values) {
    const idx = canonNorm.indexOf(norm(v));
    if (idx === -1) unknown.push(v);
    else known.push([idx, v]);
  }
  known.sort((a, b) => a[0] - b[0]);
  unknown.sort((a, b) => a.localeCompare(b, "es"));
  return known.map(([, v]) => v).concat(unknown);
}

export function orderColumns(headers, types, visible, fixed, fixedFirst, instCol) {
  const vis = (h) => fixed.includes(h) || visible.has(h);
  const first = fixedFirst.filter((h) => headers.includes(h));
  const rest = headers.filter((h) => vis(h) && !first.includes(h) && h !== instCol);
  const strings = rest.filter((h) => (types[h] || "text") !== "num");
  const numeric = rest.filter((h) => (types[h] || "text") === "num");
  const ordered = [...first];
  if (instCol && vis(instCol) && headers.includes(instCol)) ordered.push(instCol);
  return ordered.concat(strings, numeric);
}

const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];

export function niceMax(v) {
  if (v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const d = v / pow;
  const n = NICE_STEPS.find((s) => s >= d) ?? 10;
  return n * pow;
}

export function toCsv(rows, headers) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    if (s.includes(";") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(esc).join(";")];
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r[h])).join(";"));
  }
  return lines.join("\r\n");
}