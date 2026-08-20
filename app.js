import {
  norm,
  numVal,
  anoNum,
  colKey,
  isYearCol,
  parseCSV,
  detectTypes,
  filterData,
  aggregateByYear,
  orderCategories,
  orderColumns,
  niceMax,
  toCsv,
} from "./data.js";

const CSV_URL = "datos/Musica_2007_2026_clasificado_utf8.csv";
const STORAGE_KEY = "columnas_visibles_musica_v2";
const FIXED_COLS = ["AÑO", "NOMBRE CARRERA", "TOTAL MATRÍCULA PRIMER AÑO", "TOTAL MATRÍCULA"];
const FIRST_COLS = ["AÑO", "NOMBRE CARRERA"];
const INST_COL = "NOMBRE INSTITUCIÓN";
const CAT_COL = "CLASIFICACIÓN";
const CAT_ORDER = [
  "Interpretación musical",
  "Pedagogía en música",
  "Composición y arreglos",
  "Formación general",
  "Musicología e investigación musical",
  "Teoría de la música",
  "Musicoterapia",
  "Gestión Cultural",
  "Producción Musical/Tecnología y Sonido",
  "Otra",
];
const SERIES = [
  { col: "TOTAL MATRÍCULA", label: "Matrícula total", color: "#16ddd1" },
  { col: "TOTAL MATRÍCULA PRIMER AÑO", label: "Matrícula primer año", color: "#e7a21a" },
];
const METRIC_COLS = SERIES.map((s) => s.col);
const SERIES_BY_COL = Object.fromEntries(SERIES.map((s) => [s.col, s]));

const W = 1000;
const H = 420;
const mL = 70;
const mR = 20;
const mT = 20;
const mB = 45;
const plotW = W - mL - mR;
const plotH = H - mT - mB;

const $ = (sel) => document.querySelector(sel);

let headers = [];
let rows = [];
let types = {};
let catValues = [];
let visibleCols = new Set(FIXED_COLS);
let selectedCats = new Set();
let colFilters = {};
let sortKey = "AÑO";
let sortDir = "asc";
let columnTitles = {};

async function loadData() {
  const resp = await fetch(CSV_URL);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const text = await resp.text();
  const parsed = parseCSV(text);
  headers = parsed.headers;
  rows = parsed.rows;
  types = detectTypes(headers, rows);
  const catSet = new Set(rows.map((r) => r[CAT_COL]).filter((v) => v !== ""));
  catValues = orderCategories([...catSet], CAT_ORDER);
  selectedCats = new Set(catValues);
  visibleCols = restoreColumns();
  buildColumnTitles();
  buildColList();
  buildCatChips();
  renderAll();
}

function buildColumnTitles() {
  const titleMap = {
    ANO: "Año de matrícula (código MAT_AÑO)",
    "TOTAL MATRICULA": "Total de estudiantes matriculados en la carrera",
    "TOTAL MATRICULA PRIMER ANO": "Total de estudiantes matriculados en primer año",
    "NOMBRE CARRERA": "Nombre de la carrera",
    "CLASIFICACION INSTITUCION NIVEL 1": "Tipo general de institución (ej. Universidades)",
    "CLASIFICACION INSTITUCION NIVEL 2": "Subtipo de institución",
    "CLASIFICACION INSTITUCION NIVEL 3": "Detalle de institución",
    "CODIGO DE INSTITUCION": "Código numérico de la institución",
    "NOMBRE INSTITUCION": "Nombre de la institución de educación superior",
    ACREDITACION_INSTITUCIONAL: "Estado de acreditación de la institución",
    REGION: "Región de la sede",
    PROVINCIA: "Provincia de la sede",
    COMUNA: "Comuna de la sede",
    "NOMBRE SEDE": "Nombre de la sede donde se imparte la carrera",
    "AREA DEL CONOCIMIENTO": "Área general del conocimiento (CINE)",
    "CINE-F 1997 AREA": "Área CINE 1997",
    "CINE-F 1997 SUBAREA": "Subárea CINE 1997",
    "AREA CARRERA GENERICA": "Área genérica de la carrera",
    "CINE-F 2013 AREA": "Área CINE 2013",
    "CINE-F 2013 SUBAREA": "Subárea CINE 2013",
    "NIVEL GLOBAL": "Nivel de la formación (pregrado, postgrado, etc.)",
    "CARRERA CLASIFICACION NIVEL 1": "Clasificación de la carrera, nivel 1",
    "CARRERA CLASIFICACION NIVEL 2": "Clasificación de la carrera, nivel 2",
    MODALIDAD: "Modalidad de estudio (presencial, distancia, etc.)",
    JORNADA: "Jornada (diurna, vespertina, etc.)",
    "TIPO DE PLAN DE LA CARRERA": "Tipo de plan de estudios",
    "DURACION ESTUDIO CARRERA": "Duración nominal de los estudios",
    "DURACION TOTAL DE CARRERA": "Duración total de la carrera",
    "CODIGO CARRERA": "Código identificador de la carrera",
    ACREDITACION_CARRERA: "Estado de acreditación de la carrera",
    "TOTAL RANGO DE EDAD": "Suma de todos los rangos de edad",
    "RANGO DE EDAD 15 A 19 ANOS": "Matriculados de 15 a 19 años",
    "RANGO DE EDAD 20 A 24 ANOS": "Matriculados de 20 a 24 años",
    "RANGO DE EDAD 25 A 29 ANOS": "Matriculados de 25 a 29 años",
    "RANGO DE EDAD 30 A 34 ANOS": "Matriculados de 30 a 34 años",
    "RANGO DE EDAD 35 A 39 ANOS": "Matriculados de 35 a 39 años",
    "RANGO DE EDAD 40 Y MAS ANOS": "Matriculados de 40 años o más",
    "RANGO DE EDAD SIN INFORMACION": "Matriculados cuya edad no está informada",
    "PROMEDIO EDAD CARRERA": "Edad promedio de los matriculados",
    "PROMEDIO EDAD MUJER": "Edad promedio de las mujeres",
    "PROMEDIO EDAD HOMBRE": "Edad promedio de los hombres",
    "PROMEDIO EDAD NO BINARIO": "Edad promedio de personas no binarias",
    "TES MUNICIPAL + SERVICIO LOCAL EDUCACION": "Egresados de establecimientos municipales o SLE",
    "TES PARTICULAR SUBVENCIONADO": "Egresados de establecimientos particular subvencionado",
    "TES PARTICULAR PAGADO": "Egresados de establecimientos particular pagado",
    "TES CORP. DE ADMINISTRACION DELEGADA": "Egresados de corporaciones de administración delegada",
    "TOTAL TES": "Total de egresados de educación media",
    "% COBERTURA TES": "Porcentaje de cobertura de egresados de educación media",
    "TIPO ESTABLECIMIENTO HC": "Egresados de establecimientos humanístico-científicos",
    "TIPO ESTABLECIMIENTO TP": "Egresados de establecimientos técnico-profesionales",
    "CLAS_EST ADULTO": "Egresados de educación de adultos",
    "CLAS_EST JOVEN": "Egresados jóvenes",
    CLASIFICACION: "Categoría de clasificación de la carrera (clasificación propia)",
  };
  const byNorm = {};
  for (const [k, t] of Object.entries(titleMap)) {
    byNorm[norm(k).replace(/\s+/g, "_")] = t;
  }
  columnTitles = {};
  for (const h of headers) {
    columnTitles[h] = byNorm[norm(h).replace(/\s+/g, "_")] || "";
  }
}

/* ---------- localStorage ---------- */
function restoreColumns() {
  let saved = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    saved = null;
  }
  const set = new Set(FIXED_COLS);
  if (Array.isArray(saved)) {
    for (const c of saved) {
      if (!FIXED_COLS.includes(c) && headers.includes(c)) set.add(c);
    }
  }
  return set;
}

function saveColumns() {
  const opts = [...visibleCols].filter((c) => !FIXED_COLS.includes(c));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
  } catch (e) {
    /* storage no disponible */
  }
}

/* ---------- Sidebar ---------- */
function buildColList() {
  const list = $("#colList");
  list.innerHTML = "";
  const optionals = headers.filter((h) => !FIXED_COLS.includes(h));
  for (const h of optionals) {
    const item = document.createElement("div");
    item.className = "col-item";
    item.dataset.col = h;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = "cb-" + norm(h).replace(/\s+/g, "_");
    cb.checked = visibleCols.has(h);
    cb.addEventListener("change", () => {
      if (cb.checked) visibleCols.add(h);
      else visibleCols.delete(h);
      saveColumns();
      renderAll();
    });

    const label = document.createElement("label");
    label.htmlFor = cb.id;
    label.textContent = h;
    if (columnTitles[h]) {
      label.dataset.tip = columnTitles[h];
    }

    item.appendChild(cb);
    item.appendChild(label);
    list.appendChild(item);
  }
}

$("#colSearch").addEventListener("input", (e) => {
  const q = norm(e.target.value);
  for (const item of $("#colList").children) {
    item.style.display = norm(item.dataset.col).includes(q) ? "" : "none";
  }
});

$("#btnClearCols").addEventListener("click", () => {
  for (const h of headers) {
    if (!FIXED_COLS.includes(h)) visibleCols.delete(h);
  }
  saveColumns();
  buildColList();
  renderAll();
});

/* ---------- Category chips ---------- */
function setCats(update) {
  update();
  colFilters = {};
  buildCatChips();
  renderAll();
}

function buildCatChips() {
  const chips = $("#catChips");
  chips.innerHTML = "";
  const counts = {};
  for (const r of rows) {
    const c = r[CAT_COL];
    counts[c] = (counts[c] || 0) + 1;
  }
  for (const c of catValues) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (selectedCats.has(c) ? " active" : "");
    btn.dataset.cat = c;
    btn.innerHTML = `<span>${escapeHtml(c)}</span><span class="cnt">${counts[c]}</span>`;
    btn.addEventListener("click", () => {
      setCats(() => {
        if (selectedCats.has(c)) selectedCats.delete(c);
        else selectedCats.add(c);
      });
    });
    chips.appendChild(btn);
  }
}

$("#catAll").addEventListener("click", () => {
  setCats(() => {
    selectedCats = new Set(catValues);
  });
});

$("#catNone").addEventListener("click", () => {
  setCats(() => {
    selectedCats = new Set();
  });
});

/* ---------- Filtering ---------- */
function filterOpts(extraColFilters = colFilters) {
  return {
    catCol: CAT_COL,
    selectedCats: [...selectedCats],
    allCats: catValues,
    colFilters: extraColFilters,
  };
}

function filteredRows() {
  return filterData(rows, filterOpts());
}

/* ---------- Table ---------- */
function buildFilterRow(th, h) {
  const t = types[h] || "text";
  if (t === "num") {
    const wrap = document.createElement("div");
    wrap.className = "range";
    const apply = () => {
      const minVal = min.value === "" ? null : Number(min.value);
      const maxVal = max.value === "" ? null : Number(max.value);
      const invalid = minVal != null && maxVal != null && minVal > maxVal;
      min.classList.toggle("invalid", invalid);
      max.classList.toggle("invalid", invalid);
      if (invalid) return;
      if (!colFilters[h]) colFilters[h] = { kind: "num" };
      colFilters[h].min = minVal;
      colFilters[h].max = maxVal;
      if (colFilters[h].min == null && colFilters[h].max == null) delete colFilters[h];
      renderAll();
    };
    const min = document.createElement("input");
    min.type = "number";
    min.placeholder = "min";
    min.value = colFilters[h] && colFilters[h].min != null ? colFilters[h].min : "";
    min.addEventListener("keydown", (e) => {
      if (e.key === "Enter") apply();
    });
    min.addEventListener("change", apply);
    const max = document.createElement("input");
    max.type = "number";
    max.placeholder = "max";
    max.value = colFilters[h] && colFilters[h].max != null ? colFilters[h].max : "";
    max.addEventListener("keydown", (e) => {
      if (e.key === "Enter") apply();
    });
    max.addEventListener("change", apply);
    wrap.appendChild(min);
    wrap.appendChild(max);
    th.appendChild(wrap);
  } else {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-btn" + (colFilters[h] ? " active" : "");
    btn.dataset.filterCol = h;
    btn.textContent = colFilters[h] ? summarizeMulti(h) : "Filtrar";
    btn.addEventListener("click", () => toggleFilterPop(h));
    th.appendChild(btn);
  }
}

function summarizeMulti(h) {
  const f = colFilters[h];
  if (f.values.length === 1) return displayValue(h, f.values[0]);
  return `${f.values.length} valores`;
}

function displayValue(h, v) {
  return isYearCol(h) ? String(anoNum(v)) : v;
}

function filterBtnEl(h) {
  return document.querySelector(`.filter-btn[data-filter-col="${CSS.escape(h)}"]`);
}

/* ---------- Popover de selección múltiple ---------- */
let activeFilterCol = null;
let filterPop = null;

function ensureFilterPop() {
  if (filterPop) return filterPop;
  filterPop = document.createElement("div");
  filterPop.id = "filterPop";
  filterPop.className = "filter-popover";
  filterPop.hidden = true;

  const searchWrap = document.createElement("div");
  searchWrap.className = "fp-search";
  const search = document.createElement("input");
  search.type = "text";
  search.placeholder = "Buscar…";
  search.className = "fp-search-input";
  search.addEventListener("input", renderFilterList);
  searchWrap.appendChild(search);

  const list = document.createElement("div");
  list.className = "fp-list";
  list.addEventListener("change", (e) => {
    if (!e.target.closest("input[type=checkbox]")) return;
    applyMultiSelection();
  });

  const actions = document.createElement("div");
  actions.className = "fp-actions";
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "fp-clear";
  clear.textContent = "Ninguna";
  clear.addEventListener("click", () => {
    if (!activeFilterCol) return;
    delete colFilters[activeFilterCol];
    renderAll();
  });
  const count = document.createElement("span");
  count.className = "fp-count";
  actions.appendChild(clear);
  actions.appendChild(count);

  filterPop.appendChild(searchWrap);
  filterPop.appendChild(list);
  filterPop.appendChild(actions);
  document.body.appendChild(filterPop);

  document.addEventListener("click", (e) => {
    if (!filterPop || filterPop.hidden) return;
    if (e.target.closest(".filter-popover") || e.target.closest(".filter-btn")) return;
    closeFilterPop();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeFilterPop();
  });
  window.addEventListener(
    "scroll",
    (e) => {
      if (e.target && e.target.closest && e.target.closest(".filter-popover")) return;
      closeFilterPop();
    },
    true,
  );
  window.addEventListener("resize", closeFilterPop);

  return filterPop;
}

function renderFilterList() {
  if (!activeFilterCol || !filterPop) return;
  const h = activeFilterCol;
  const list = filterPop.querySelector(".fp-list");
  const q = norm(filterPop.querySelector(".fp-search-input").value);
  const avail = getAvail(h);
  const selected = new Set(colFilters[h] ? colFilters[h].values : []);
  const shown = avail.filter((v) => {
    if (q === "") return true;
    return norm(v).includes(q) || norm(displayValue(h, v)).includes(q);
  });
  list.innerHTML = "";
  if (shown.length === 0) {
    list.textContent = "Sin valores disponibles";
    setFilterCount(selected.size);
    return;
  }
  for (const v of shown) {
    const key = colKey(h, v);
    const row = document.createElement("label");
    row.className = "fp-item";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.key = String(key);
    cb.checked = selected.has(key);
    const span = document.createElement("span");
    span.textContent = displayValue(h, v);
    row.appendChild(cb);
    row.appendChild(span);
    list.appendChild(row);
  }
  setFilterCount(selected.size);
}

function setFilterCount(n) {
  const count = filterPop.querySelector(".fp-count");
  count.textContent = n === 0 ? "Sin filtro" : `${n} seleccionado${n === 1 ? "" : "s"}`;
}

function refreshFilterPop() {
  if (!activeFilterCol || !filterPop) return;
  const h = activeFilterCol;
  const selected = new Set(colFilters[h] ? colFilters[h].values : []);
  const cbs = filterPop.querySelectorAll(".fp-item input[type=checkbox]");
  for (const cb of cbs) {
    cb.checked = selected.has(colKey(h, cb.dataset.key));
  }
  setFilterCount(selected.size);
}

function applyMultiSelection() {
  if (!activeFilterCol || !filterPop) return;
  const h = activeFilterCol;
  const values = [...filterPop.querySelectorAll(".fp-item input:checked")].map((cb) =>
    colKey(activeFilterCol, cb.dataset.key),
  );
  if (values.length === 0) delete colFilters[h];
  else colFilters[h] = { kind: "multi", values };
  renderAll();
}

function openFilterPop(h) {
  ensureFilterPop();
  activeFilterCol = h;
  filterPop.querySelector(".fp-search-input").value = "";
  renderFilterList();
  filterPop.hidden = false;
  positionFilterPop(filterBtnEl(h));
  filterPop.querySelector(".fp-search-input").focus();
}

function positionFilterPop(btn) {
  if (!btn || !filterPop) return;
  const r = btn.getBoundingClientRect();
  const pr = filterPop.getBoundingClientRect();
  let x = r.left;
  let y = r.bottom + 4;
  if (x + pr.width > window.innerWidth) x = window.innerWidth - pr.width - 8;
  if (y + pr.height > window.innerHeight) y = r.top - pr.height - 4;
  filterPop.style.left = x + "px";
  filterPop.style.top = y + "px";
}

function toggleFilterPop(h) {
  if (activeFilterCol === h) {
    closeFilterPop();
    return;
  }
  openFilterPop(h);
}

function closeFilterPop() {
  activeFilterCol = null;
  if (filterPop) filterPop.hidden = true;
}

function refreshOpenPop() {
  if (!activeFilterCol || !filterPop || filterPop.hidden) return;
  const btn = filterBtnEl(activeFilterCol);
  if (!btn) {
    closeFilterPop();
    return;
  }
  refreshFilterPop();
  positionFilterPop(btn);
}

function getAvail(h) {
  const extra = { ...colFilters };
  delete extra[h];
  const filtered = filterData(rows, filterOpts(extra));
  const set = new Set();
  for (const r of filtered) {
    const v = r[h];
    if (v == null || v === "") continue;
    set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function renderTable() {
  const filtered = filteredRows();
  const thead = $("#tableHead");
  const tbody = $("#tableBody");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  const visible = orderedCols();
  const headerRow = document.createElement("tr");
  const idxTh = document.createElement("th");
  idxTh.textContent = "#";
  idxTh.style.cursor = "default";
  headerRow.appendChild(idxTh);
  for (const h of visible) {
    const th = document.createElement("th");
    const isWrap = h === "NOMBRE CARRERA" || h === "NOMBRE INSTITUCIÓN";
    const isNum = (types[h] || "text") === "num";
    th.textContent = h;
    if (sortKey === h) th.className = sortDir === "asc" ? "sort-asc" : "sort-desc";
    th.addEventListener("click", () => sortBy(h));
    if (isWrap) th.classList.add("col-wrap");
    if (isNum) th.classList.add("num-col");
    if (columnTitles[h]) {
      th.dataset.tip = columnTitles[h];
    }
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);

  const filterRow = document.createElement("tr");
  filterRow.className = "filter-row";
  const emptyTh = document.createElement("th");
  emptyTh.style.cursor = "default";
  filterRow.appendChild(emptyTh);
  for (const h of visible) {
    const th = document.createElement("th");
    buildFilterRow(th, h);
    filterRow.appendChild(th);
  }
  thead.appendChild(filterRow);

  const sorted = sortRows(filtered);
  const frag = document.createDocumentFragment();
  sorted.forEach((r, i) => {
    const tr = document.createElement("tr");
    const tdIdx = document.createElement("td");
    tdIdx.textContent = String(i + 1);
    tdIdx.className = "cell-txt";
    tr.appendChild(tdIdx);
    for (const h of visible) {
      const td = document.createElement("td");
      const v = r[h] == null ? "" : r[h];
      td.textContent = formatCell(h, v);
      if (h === "NOMBRE CARRERA" || h === "NOMBRE INSTITUCIÓN") td.classList.add("col-wrap");
      if ((types[h] || "text") === "num") td.className += " cell-num";
      else td.className += " cell-txt";
      tr.appendChild(td);
    }
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
  thead.style.setProperty("--hdr", headerRow.offsetHeight + "px");
}

function formatCell(h, v) {
  if (h === "AÑO") {
    const y = anoNum(v);
    return y == null ? "—" : String(y);
  }
  if ((types[h] || "text") === "num") {
    if (v === "") return "—";
    const n = numVal(v);
    if (norm(h).includes("COBERTURA")) return n.toLocaleString("es-CL") + "%";
    return n.toLocaleString("es-CL");
  }
  return v || "—";
}

function sortBy(h) {
  if (sortKey === h) sortDir = sortDir === "asc" ? "desc" : "asc";
  else {
    sortKey = h;
    sortDir = "asc";
  }
  renderTable();
  renderChart();
}

function sortRows(rowsArr) {
  const t = types[sortKey] || "text";
  return [...rowsArr].sort((a, b) => {
    let va, vb;
    if (sortKey === "AÑO") {
      va = anoNum(a[sortKey]);
      vb = anoNum(b[sortKey]);
    } else if (t === "num") {
      va = numVal(a[sortKey]);
      vb = numVal(b[sortKey]);
    } else {
      va = norm(a[sortKey]);
      vb = norm(b[sortKey]);
    }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
}

function orderedCols() {
  return orderColumns(headers, types, visibleCols, FIXED_COLS, FIRST_COLS, INST_COL);
}

/* ---------- Summary ---------- */
function renderResumen(filtered) {
  const cars = new Set(filtered.map((r) => r["CÓDIGO CARRERA"]).filter(Boolean));
  const inst = new Set(filtered.map((r) => r["NOMBRE INSTITUCIÓN"]).filter(Boolean));
  const total = filtered.reduce((acc, r) => acc + numVal(r["TOTAL MATRÍCULA"]), 0);
  const years = filtered.map((r) => anoNum(r["AÑO"])).filter((y) => y != null);
  const minY = years.length ? Math.min(...years) : null;
  const maxY = years.length ? Math.max(...years) : null;

  $("#card-registros .card-value").textContent = filtered.length.toLocaleString("es-CL");
  $("#card-carreras .card-value").textContent = cars.size.toLocaleString("es-CL");
  $("#card-instituciones .card-value").textContent = inst.size.toLocaleString("es-CL");
  $("#card-matricula .card-value").textContent = total.toLocaleString("es-CL");
  $("#card-anos .card-value").textContent = years.length
    ? `${minY} – ${maxY}`
    : "—";
  $("#resultCount").textContent = `${filtered.length.toLocaleString("es-CL")} registros visibles`;
}

/* ---------- Chart ---------- */
function renderChart() {
  const filtered = filteredRows();
  const data = aggregateByYear(filtered, {
    yearCol: "AÑO",
    metrics: METRIC_COLS,
  });

  const svg = $("#chart");
  svg.innerHTML = "";

  if (data.length === 0) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", "500");
    t.setAttribute("y", "210");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("fill", "var(--muted)");
    t.textContent = "Sin datos para el gráfico";
    g.appendChild(t);
    svg.appendChild(g);
    renderSide(filtered);
    return;
  }

  const { yMax, n, xAt, yAt, ticks } = chartScale(data);
  const ns = "http://www.w3.org/2000/svg";

  for (const t of ticks) {
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", mL);
    line.setAttribute("y1", t.y);
    line.setAttribute("x2", W - mR);
    line.setAttribute("y2", t.y);
    line.setAttribute("stroke", "var(--border)");
    line.setAttribute("stroke-dasharray", "4 4");
    svg.appendChild(line);

    const lbl = document.createElementNS(ns, "text");
    lbl.setAttribute("x", mL - 8);
    lbl.setAttribute("y", t.y + 4);
    lbl.setAttribute("text-anchor", "end");
    lbl.setAttribute("fill", "var(--muted)");
    lbl.setAttribute("font-size", "11");
    lbl.textContent = Math.round(t.val).toLocaleString("es-CL");
    svg.appendChild(lbl);
  }

  for (const s of SERIES) {
    const d = seriesPath(data, s.col, xAt, yAt);
    if (d) {
      const poly = document.createElementNS(ns, "path");
      poly.setAttribute("d", d);
      poly.setAttribute("fill", "none");
      poly.setAttribute("stroke", s.color);
      poly.setAttribute("stroke-width", "3");
      poly.setAttribute("stroke-linejoin", "round");
      poly.setAttribute("stroke-linecap", "round");
      svg.appendChild(poly);
    }
    data.forEach((d, i) => {
      if (d[s.col] <= 0) return;
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", xAt(i));
      c.setAttribute("cy", yAt(d[s.col]));
      c.setAttribute("r", "4");
      c.setAttribute("fill", s.color);
      c.style.cursor = "pointer";
      c.addEventListener("mousemove", (e) => {
        showYearTip(e, d);
      });
      c.addEventListener("mouseleave", hideTooltip);
      svg.appendChild(c);
    });
  }

  data.forEach((d, i) => {
    const cx = xAt(i);
    const yr = document.createElementNS(ns, "text");
    yr.setAttribute("x", cx);
    yr.setAttribute("y", H - mB + 22);
    yr.setAttribute("text-anchor", "middle");
    yr.setAttribute("fill", "var(--muted)");
    yr.setAttribute("font-size", "11");
    yr.textContent = String(d.year);
    svg.appendChild(yr);
  });

  renderLegend();
  renderSide(filtered);
}

function seriesPath(data, col, xAt, yAt) {
  let path = "";
  let started = false;
  data.forEach((d, i) => {
    if (d[col] <= 0) {
      started = false;
      return;
    }
    path += `${started ? "L" : "M"}${xAt(i)},${yAt(d[col])}`;
    started = true;
  });
  return path;
}

function chartScale(data) {
  const maxVal = Math.max(...data.map((d) => Math.max(...METRIC_COLS.map((m) => d[m]))));
  const yMax = niceMax(maxVal);
  const n = data.length;
  const xAt = (i) => (n > 1 ? mL + (i / (n - 1)) * plotW : mL + plotW / 2);
  const yAt = (v) => mT + plotH - (v / yMax) * plotH;
  const ticks = [];
  for (let g = 0; g <= 5; g++) {
    ticks.push({ y: mT + (plotH / 5) * g, val: yMax - (yMax / 5) * g });
  }
  return { yMax, n, xAt, yAt, ticks };
}

function buildChartSvg(data) {
  const { xAt, yAt, ticks } = chartScale(data);

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Poppins, Arial, sans-serif">`,
  );
  parts.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  parts.push(
    `<text x="${W / 2}" y="20" text-anchor="middle" font-size="20" font-weight="700" fill="#333333">Matrícula por año</text>`,
  );

  for (const t of ticks) {
    parts.push(
      `<line x1="${mL}" y1="${t.y}" x2="${W - mR}" y2="${t.y}" stroke="#dddddd" stroke-dasharray="4 4"/>`,
    );
    parts.push(
      `<text x="${mL - 8}" y="${t.y + 4}" text-anchor="end" font-size="12" fill="#666666">${Math.round(t.val).toLocaleString("es-CL")}</text>`,
    );
  }

  for (const s of SERIES) {
    const d = seriesPath(data, s.col, xAt, yAt);
    if (d) {
      parts.push(
        `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`,
      );
    }
  }

  data.forEach((d, i) => {
    const cx = xAt(i);
    parts.push(
      `<text x="${cx}" y="${H - mB + 22}" text-anchor="middle" font-size="12" fill="#666666">${d.year}</text>`,
    );
  });

  parts.push(
    `<line x1="${mL}" y1="${mT}" x2="${mL}" y2="${H - mB}" stroke="#cccccc" stroke-width="1"/>`,
  );
  parts.push(
    `<line x1="${mL}" y1="${H - mB}" x2="${W - mR}" y2="${H - mB}" stroke="#cccccc" stroke-width="1"/>`,
  );

  const ly = H - mB + 40;
  let lx = mL;
  for (const s of SERIES) {
    parts.push(`<rect x="${lx}" y="${ly - 9}" width="14" height="14" rx="3" fill="${s.color}"/>`);
    parts.push(
      `<text x="${lx + 20}" y="${ly}" font-size="13" fill="#333333">${s.label}</text>`,
    );
    lx += 20 + (s.label.length * 8) + 26;
  }

  parts.push(`</svg>`);
  return parts.join("");
}

function renderLegend() {
  const legend = $("#legend");
  legend.innerHTML = "";
  for (const s of SERIES) {
    const item = document.createElement("span");
    item.className = "legend-item";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = s.color;
    const label = document.createElement("span");
    label.textContent = s.label;
    item.appendChild(sw);
    item.appendChild(label);
    legend.appendChild(item);
  }
}

function renderSide(filtered) {
  const cats = $("#sideCats");
  cats.innerHTML = "";
  if (selectedCats.size === 0) {
    cats.textContent = "Ninguna";
  } else if (selectedCats.size === catValues.length) {
    cats.textContent = "Todas";
  } else {
    const list = [...selectedCats].sort((a, b) => a.localeCompare(b, "es"));
    for (const c of list) {
      const chip = document.createElement("span");
      chip.className = "side-cat";
      chip.textContent = c;
      cats.appendChild(chip);
    }
  }

  const filters = $("#sideFilters");
  filters.innerHTML = "";
  const active = Object.keys(colFilters);
  if (active.length === 0) {
    filters.textContent = "Sin filtros de columna";
  } else {
    for (const h of active) {
      const f = colFilters[h];
      const badge = document.createElement("span");
      badge.className = "side-filter";
      badge.textContent = `${h}: ${describeFilter(f)}`;
      filters.appendChild(badge);
    }
  }

  $("#sideCount").textContent = `${filtered.length.toLocaleString("es-CL")} registros`;
}

function describeFilter(f) {
  if (f.kind === "num") {
    const parts = [];
    if (f.min != null) parts.push(`≥ ${f.min}`);
    if (f.max != null) parts.push(`≤ ${f.max}`);
    return parts.join(" ");
  }
  return f.values.join(", ");
}

function showYearTip(e, entry) {
  const tip = $("#tooltip");
  tip.innerHTML = "";
  const yEl = document.createElement("span");
  yEl.className = "tt-year";
  yEl.textContent = `Año ${entry.year}`;
  tip.appendChild(yEl);
  for (const s of SERIES) {
    const row = document.createElement("div");
    row.className = "tt-row";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = s.color;
    const label = document.createElement("span");
    label.textContent = s.label;
    const val = document.createElement("span");
    val.className = "tt-val";
    val.textContent = entry[s.col].toLocaleString("es-CL");
    row.appendChild(sw);
    row.appendChild(label);
    row.appendChild(val);
    tip.appendChild(row);
  }
  tip.hidden = false;
  positionTip(e);
}

function hideTooltip() {
  const tip = $("#tooltip");
  tip.hidden = true;
  tip.classList.remove("tip-column");
}

/* ---------- Column tooltip (custom, follows mouse) ---------- */
document.addEventListener("mouseover", (e) => {
  const tip = $("#tooltip");
  if (e.target.closest("#chart") || e.target.closest("#tooltip") || e.target.closest(".filter-popover")) return;
  const el = e.target.closest("[data-tip]");
  if (!el) {
    hideTooltip();
    return;
  }
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  tip.classList.add("tip-column");
  positionTip(e);
});

document.addEventListener("mousemove", (e) => {
  if (!$("#tooltip").hidden) positionTip(e);
});

function positionTip(e) {
  const tip = $("#tooltip");
  const rect = tip.getBoundingClientRect();
  let x = e.clientX + 16;
  let y = e.clientY + 16;
  if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - 16;
  if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - 16;
  tip.style.left = x + "px";
  tip.style.top = y + "px";
}

/* ---------- Clear all ---------- */
function clearFilters() {
  colFilters = {};
  selectedCats = new Set(catValues);
  buildCatChips();
  renderAll();
}

$("#clearAll").addEventListener("click", clearFilters);

/* ---------- Descargas ---------- */
function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCsv() {
  const filtered = filteredRows();
  const csv = "\ufeff" + toCsv(filtered, headers);
  downloadBlob(csv, "text/csv;charset=utf-8", "listado_matricula_filtrado.csv");
}

function downloadChartPng() {
  const data = aggregateByYear(filteredRows(), {
    yearCol: "AÑO",
    metrics: METRIC_COLS,
  });
  if (data.length === 0) return;
  const svg = buildChartSvg(data);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onerror = () => {
    URL.revokeObjectURL(url);
    console.error("No se pudo generar el PNG del gráfico");
  };
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, W, H);
    URL.revokeObjectURL(url);
    canvas.toBlob((png) => {
      if (!png) return;
      downloadBlob(png, "image/png", "grafico_matricula.png");
    }, "image/png");
  };
  img.src = url;
}

$("#btnDownloadCsv").addEventListener("click", downloadCsv);
$("#btnDownloadPng").addEventListener("click", downloadChartPng);

function renderAll() {
  const filtered = filteredRows();
  renderResumen(filtered);
  renderTable();
  renderChart();
  refreshOpenPop();
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

loadData().catch((err) => {
  console.error(err);
  $("#resultCount").textContent = "Error al cargar los datos";
});