/**
 * Build hierarchical PSGC JSON using correspondence_code to attach barangays
 * to their true city/municipality parent. Avoids prefix-based grouping.
 *
 * Usage:
 *   node src/pages/data/build-psgc-json.js
 *
 * Input:
 *   data/PSGC-3Q-2025-Publication-Datafile.xlsx
 *
 * Output:
 *   public/psgc.json
 */

import fs from "fs";
import path from "path";
import xlsx from "xlsx";

const INPUT_FILE = path.resolve("data/PSGC-3Q-2025-Publication-Datafile.xlsx");
const OUTPUT_FILE = path.resolve("public/psgc.json");

const SHEET_PSGC = "PSGC";
const SHEET_PROV_SUM = "Prov Sum"; // optional, if present

// Optional manual overrides for province display names
const manualProvinceNameOverrides = {
  "0402000000": "Cavite",
};

function normHeader(h = "") {
  return String(h).trim().toLowerCase().replace(/[\s_/()-]+/g, "_");
}
function digits(s) {
  return String(s || "").replace(/\D/g, "");
}
function deriveParents10(codeDigits) {
  if ((codeDigits || "").length !== 10) return { regionCode: "", provinceCode: "", citymunCode: "" };
  return {
    regionCode: codeDigits.slice(0, 2) + "00000000",
    provinceCode: codeDigits.slice(0, 4) + "000000",
    citymunCode: codeDigits.slice(0, 6) + "0000",
  };
}
function readSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };
  const aoa = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });
  if (!aoa.length) return { headers: [], rows: [] };
  const headers = aoa[0].map(normHeader);
  const rows = [];
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row || row.length === 0) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] != null ? String(row[idx]).trim() : "";
    });
    rows.push(obj);
  }
  return { headers, rows };
}
function pick(row, candidates) {
  for (const c of candidates) {
    if (row[c] != null && row[c] !== "") return String(row[c]).trim();
  }
  return "";
}
function levelFromGeoString(raw) {
  const s = String(raw || "").toLowerCase();
  if (/region/.test(s)) return "region";
  if (/province/.test(s)) return "province";
  if (/barangay/.test(s)) return "barangay";
  if (/(city|municipality|mun)/.test(s)) return "citymun";
  return "";
}
function isPlaceholderProvinceName(name) {
  return /^Province \d{4}$/.test(name || "");
}

function buildProvinceNameMap(workbook) {
  const { headers, rows } = readSheet(workbook, SHEET_PROV_SUM);
  if (!rows.length) {
    return {};
  }
  const codeCandidates = ["10_digit_psgc", "psgc", "psgc_code", "province_code", "code"];
  const nameCandidates = ["name", "province", "prov_name", "province_name"];
  const map = {};
  rows.forEach((r) => {
    const rawCode = pick(r, codeCandidates);
    const c = digits(rawCode);
    if (c.length !== 10) return;
    const pcode = c.slice(0, 4) + "000000";
    const n = pick(r, nameCandidates);
    if (n) map[pcode] = n;
  });
  return map;
}

function buildHierarchy(workbook) {
  const { headers, rows } = readSheet(workbook, SHEET_PSGC);
  if (!rows.length) {
    console.error(`[PSGC] Sheet "${SHEET_PSGC}" missing or empty.`);
    return { regions: [], meta: {} };
  }
  console.log("[PSGC] PSGC headers:", headers);

  const provinceNameMap = buildProvinceNameMap(workbook);

  const col = {
    code: ["10_digit_psgc", "psgc", "psgc_code", "code"],
    name: ["name", "geographic_name", "official_name", "area_name"],
    geo: ["geographic_level", "level", "classification"],
    corr: ["correspondence_code", "parent_code", "parent_psgc"],
  };

  // Maps
  const regions = new Map();                     // key: regionCode (10)
  const provinces = new Map();                   // key: provinceCode (10)
  const cityByCode = new Map();                  // key: city code (10)
  const cityByCorrKey = new Map();               // key: digits(correspondence_code) from CITY rows (any length)
  const cityObjs = [];                           // keep reference list for passes

  // Counters
  let regionRows = 0, provinceRows = 0, cityRows = 0, brgyRows = 0;
  let brgysViaCorr = 0, brgysViaFallback = 0, brgysOrphan = 0;

  // Pass 1: register regions, provinces, and all city/municipalities
  rows.forEach((r) => {
    const code = digits(pick(r, col.code));
    if (code.length !== 10) return;
    const name = pick(r, col.name);
    const lvl = levelFromGeoString(pick(r, col.geo));

    if (lvl === "region") {
      regionRows++;
      if (!regions.has(code)) regions.set(code, { code, name: name || `Region ${code.slice(0, 2)}`, provinces: [] });
      else if (name) regions.get(code).name = name;
      return;
    }

    if (lvl === "province") {
      provinceRows++;
      const { regionCode } = deriveParents10(code);
      if (!provinces.has(code)) {
        const initialName = name || provinceNameMap[code] || `Province ${code.slice(0, 4)}`;
        provinces.set(code, { code, name: initialName, regionCode, municipalities: [] });
      } else if (name) {
        provinces.get(code).name = name;
      }
      if (regionCode && !regions.has(regionCode)) {
        regions.set(regionCode, { code: regionCode, name: `Region ${regionCode.slice(0, 2)}`, provinces: [] });
      }
      return;
    }

    if (lvl === "citymun") {
      cityRows++;
      const cityObj = {
        code, // 10-digit PSGC city/mun code (may not be used for barangay attachment)
        name: name || `City/Mun ${code.slice(0, 6)}`,
        provinceCode: deriveParents10(code).provinceCode,
        barangays: [],
        corrKey: digits(pick(r, col.corr)) || "", // city’s own correspondence_code (key for barangay attach)
      };
      cityObjs.push(cityObj);
      cityByCode.set(code, cityObj);
      if (cityObj.corrKey) {
        // Multiple cities should not share the same corrKey; last one wins if so
        cityByCorrKey.set(cityObj.corrKey, cityObj);
      }
      // Ensure province placeholder
      const { regionCode, provinceCode } = deriveParents10(code);
      if (provinceCode && !provinces.has(provinceCode)) {
        const pname = provinceNameMap[provinceCode] || `Province ${provinceCode.slice(0, 4)}`;
        provinces.set(provinceCode, { code: provinceCode, name: pname, regionCode, municipalities: [] });
        if (regionCode && !regions.has(regionCode)) {
          regions.set(regionCode, { code: regionCode, name: `Region ${regionCode.slice(0, 2)}`, provinces: [] });
        }
      }
      return;
    }

    // Barangays handled in pass 2
  });

  // Pass 2: attach barangays using correspondence_code ONLY (no prefix grouping)
  rows.forEach((r) => {
    const code = digits(pick(r, col.code));
    if (code.length !== 10) return;
    const lvl = levelFromGeoString(pick(r, col.geo));
    if (lvl !== "barangay") return;

    brgyRows++;
    const name = pick(r, col.name) || code;
    const corr = digits(pick(r, col.corr)); // THIS is the parent key we trust

    let parentCity = null;

    // 1) Exact match to a city’s corrKey
    if (corr) {
      parentCity = cityByCorrKey.get(corr) || null;
      if (parentCity) {
        parentCity.barangays.push({ code, name });
        brgysViaCorr++;
        return;
      }
    }

    // 2) If corr looks like a 10-digit city code, try match by code
    if (!parentCity && corr.length === 10) {
      parentCity = cityByCode.get(corr) || null;
      if (parentCity) {
        parentCity.barangays.push({ code, name });
        brgysViaFallback++;
        return;
      }
    }

    // 3) LAST RESORT: try derive parent city code from this barangay’s PSGC (may be wrong in this dataset)
    const derivedCity = deriveParents10(code).citymunCode;
    if (derivedCity && cityByCode.has(derivedCity)) {
      cityByCode.get(derivedCity).barangays.push({ code, name });
      brgysViaFallback++;
      return;
    }

    brgysOrphan++;
  });

  // Province names: apply overrides and provinceNameMap replacements
  provinces.forEach((pObj, pCode) => {
    if (isPlaceholderProvinceName(pObj.name) && provinceNameMap[pCode]) {
      pObj.name = provinceNameMap[pCode];
    }
    if (manualProvinceNameOverrides[pCode]) {
      pObj.name = manualProvinceNameOverrides[pCode];
    }
  });

  // Rename municipalities if their names equal province name exactly (avoid confusion)
  cityObjs.forEach((m) => {
    const prov = provinces.get(m.provinceCode);
    if (!prov) return;
    if (prov.name && m.name && prov.name.toLowerCase() === m.name.toLowerCase() && !/ city$/i.test(m.name)) {
      m.name = m.name + " City";
    }
  });

  // Attach cities to provinces
  provinces.forEach((p) => (p.municipalities = []));
  cityObjs.forEach((m) => {
    const prov = provinces.get(m.provinceCode);
    if (prov) {
      prov.municipalities.push({ code: m.code, name: m.name, barangays: m.barangays });
    }
  });

  // Attach provinces to regions
  regions.forEach((r) => (r.provinces = []));
  provinces.forEach((p) => {
    const reg = regions.get(p.regionCode);
    if (reg) reg.provinces.push({ code: p.code, name: p.name, municipalities: p.municipalities });
  });

  // Sort
  function alpha(a, key = "name") {
    a.sort((x, y) => x[key].localeCompare(y[key]));
  }
  regions.forEach((r) => {
    alpha(r.provinces);
    r.provinces.forEach((p) => {
      alpha(p.municipalities);
      p.municipalities.forEach((m) => alpha(m.barangays));
    });
  });

  const regionArr = Array.from(regions.values()).sort((a, b) => a.name.localeCompare(b.name));

  console.log("[PSGC] Row classification counts:", {
    regionRows,
    provinceRows,
    cityRows,
    brgyRows,
    brgysViaCorr,
    brgysViaFallback,
    brgysOrphan,
  });

  return {
    regions: regionArr,
    meta: {
      generatedAt: new Date().toISOString(),
      source: path.basename(INPUT_FILE),
      sheetsParsed: [SHEET_PSGC, SHEET_PROV_SUM],
      note: "Barangays attached using correspondence_code keyed to city/municipality correspondence_code.",
      stats: { regionRows, provinceRows, cityRows, brgyRows, brgysViaCorr, brgysViaFallback, brgysOrphan },
    },
  };
}

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error("Input file not found:", INPUT_FILE);
    process.exit(1);
  }
  const workbook = xlsx.readFile(INPUT_FILE, { cellDates: false });
  const result = buildHierarchy(workbook);
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf8");

  const provinceCount = result.regions.reduce((s, r) => s + (r.provinces?.length || 0), 0);
  console.log(`PSGC JSON written to ${OUTPUT_FILE}`);
  console.log(`Regions: ${result.regions.length} | Provinces: ${provinceCount}`);
}

main();