import React, { useEffect, useMemo, useState } from "react";
import { loadPSGC } from "../../../utils/psgcLoader"; // adjust path if needed

/**
 * Props (unchanged for your parent):
 * - value: { region, province, municipality, barangay } (names)
 * - onChange: (partial) => void  (called with names)
 *
 * Internally, selects use PSGC codes to avoid name mismatches like
 * "City of Imus" vs "Imus City" vs "Imus".
 */
export default function PHAddressPicker({ value = {}, onChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const regionName = value?.region || "";
  const provinceName = value?.province || "";
  const municipalityName = value?.municipality || "";
  const barangayName = value?.barangay || "";

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const d = await loadPSGC();
        if (alive) setData(d);
      } catch (e) {
        console.error("[PHAddressPicker] load error", e);
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const regions = useMemo(() => data?.regions || [], [data]);

  // Resolve selected objects from NAMES (what parent stores)
  const selectedRegion = useMemo(
    () => regions.find(r => normalize(r.name) === normalize(regionName)),
    [regions, regionName]
  );

  const provinces = useMemo(
    () => selectedRegion?.provinces || [],
    [selectedRegion]
  );

  const selectedProvince = useMemo(
    () => provinces.find(p => normalize(p.name) === normalize(provinceName)),
    [provinces, provinceName]
  );

  const municipalities = useMemo(
    () => selectedProvince?.municipalities || [],
    [selectedProvince]
  );

  const selectedMunicipality = useMemo(
    () => municipalities.find(m => normalize(m.name) === normalize(municipalityName)),
    [municipalities, municipalityName]
  );

  const barangays = useMemo(
    () => selectedMunicipality?.barangays || [],
    [selectedMunicipality]
  );

  // Helpers
  function normalize(s = "") {
    // Case-insensitive; also collapse common “City of X” vs “X City” patterns
    const t = String(s).trim().toLowerCase();
    return t
      .replace(/^city of\s+/, "")     // "City of Imus" -> "Imus"
      .replace(/\s+city$/, "")        // "Imus City" -> "Imus"
      .replace(/\s+/g, " ");          // collapse spaces
  }

  const update = (patch) => onChange({ ...value, ...patch });

  // Handlers: selects carry CODE as value; we map code -> name for parent state
  const handleRegion = (e) => {
    const code = e.target.value;
    const reg = regions.find(r => r.code === code);
    update({
      region: reg?.name || "",
      province: "",
      municipality: "",
      barangay: "",
    });
  };

  const handleProvince = (e) => {
    const code = e.target.value;
    const prov = provinces.find(p => p.code === code);
    update({
      province: prov?.name || "",
      municipality: "",
      barangay: "",
    });
  };

  const handleMunicipality = (e) => {
    const code = e.target.value;
    const muni = municipalities.find(m => m.code === code);
    update({
      municipality: muni?.name || "",
      barangay: "",
    });
  };

  const handleBarangay = (e) => {
    const code = e.target.value;
    const brgy = barangays.find(b => b.code === code);
    update({ barangay: brgy?.name || "" });
  };

  if (loading) return <div className="text-sm text-gray-500">Loading PSGC...</div>;
  if (!data) return <div className="text-sm text-red-600">Unable to load PSGC dataset.</div>;

  // Select “values” are CODES (resolved from current names). If name not found yet, use empty string.
  const selectedRegionCode = selectedRegion?.code || "";
  const selectedProvinceCode = selectedProvince?.code || "";
  const selectedMunicipalityCode = selectedMunicipality?.code || "";
  const selectedBarangayCode = (() => {
    const b = barangays.find(x => normalize(x.name) === normalize(barangayName));
    return b?.code || "";
  })();

  return (
    <div className="space-y-2 text-gray-700">
      {/* Region */}
      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1">
          Region <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedRegionCode}
          onChange={handleRegion}
          className="border px-3 py-2 rounded-lg text-sm"
        >
          <option value="">Select Region</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Province */}
      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1">
          Province <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedProvinceCode}
          onChange={handleProvince}
          disabled={!selectedRegionCode}
          className="border px-3 py-2 rounded-lg text-sm disabled:bg-gray-100"
        >
          <option value="">Select Province</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Municipality / City */}
      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1">
          Municipality / City <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedMunicipalityCode}
          onChange={handleMunicipality}
          disabled={!selectedProvinceCode}
          className="border px-3 py-2 rounded-lg text-sm disabled:bg-gray-100"
        >
          <option value="">Select Municipality / City</option>
          {municipalities.map((m) => (
            <option key={m.code} value={m.code}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Barangay */}
      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1">
          Barangay <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedBarangayCode}
          onChange={handleBarangay}
          disabled={!selectedMunicipalityCode}
          className="border px-3 py-2 rounded-lg text-sm disabled:bg-gray-100"
        >
          <option value="">Select Barangay</option>
          {barangays.map((b) => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Optional debug */}
      <div className="mt-2 text-xs text-gray-500">
        <div>Region: {regionName || "-"}</div>
        <div>Province: {provinceName || "-"}</div>
        <div>Municipality: {municipalityName || "-"}</div>
        <div>Barangay: {barangayName || "-"}</div>
      </div>
    </div>
  );
}