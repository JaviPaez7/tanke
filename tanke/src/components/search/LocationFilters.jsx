import { sortedProvinceNames } from "../../data/provinces";

export function LocationFilters({
  selectedProvince,
  selectedMunicipality,
  municipalities,
  onProvinceChange,
  onMunicipalityChange,
  municipalityDisabled = false,
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <label
          htmlFor="tanke-province"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--app-muted)]"
        >
          Provincia
        </label>
        <select
          id="tanke-province"
          className="control w-full px-3"
          value={selectedProvince}
          onChange={(e) => onProvinceChange(e.target.value)}
        >
          <option value="Toda España">Toda España</option>
          {sortedProvinceNames.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="tanke-municipality"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--app-muted)]"
        >
          Municipio
        </label>
        <select
          id="tanke-municipality"
          className="control w-full px-3 disabled:opacity-50"
          value={selectedMunicipality}
          disabled={municipalityDisabled}
          onChange={(e) => onMunicipalityChange(e.target.value)}
        >
          <option value="">Todos los municipios</option>
          {municipalities.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
