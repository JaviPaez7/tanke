import { describe, expect, it } from "vitest";
import { emptyResultsMessage, zoneLabel } from "./emptyResults.js";

describe("zona del aviso sin resultados", () => {
  it("usa el municipio si hay uno y si no la provincia", () => {
    expect(zoneLabel({ selectedProvince: "Las Palmas", selectedMunicipality: "Telde" })).toBe(
      "en Telde",
    );
    expect(zoneLabel({ selectedProvince: "Las Palmas", selectedMunicipality: "" })).toBe(
      "en Las Palmas",
    );
    expect(zoneLabel({ selectedProvince: "Toda España", selectedMunicipality: "" })).toBe(
      "en toda España",
    );
  });

  it("pone delante el artículo que el Ministerio deja entre paréntesis", () => {
    expect(
      zoneLabel({
        selectedProvince: "Las Palmas",
        selectedMunicipality: "Aldea de San Nicolás (La)",
      }),
    ).toBe("en La Aldea de San Nicolás");
  });

  it("con GPS habla del radio, no del selector", () => {
    expect(
      zoneLabel({
        userLocation: { lat: 28.1, lng: -15.4 },
        searchRadius: 20,
        selectedProvince: "Las Palmas",
        selectedMunicipality: "Telde",
      }),
    ).toBe("a menos de 20 km de ti");
  });
});

describe("texto del aviso sin resultados", () => {
  it("repite el texto buscado y la zona", () => {
    const { title } = emptyResultsMessage({
      searchTerm: " Repsol ",
      fuelLabel: "G95",
      fuelIsCause: false,
      zone: "en Las Palmas",
    });
    expect(title).toBe('No hay gasolineras que coincidan con "Repsol" en Las Palmas');
  });

  it("menciona el combustible solo cuando es lo que vacía la lista", () => {
    expect(
      emptyResultsMessage({
        searchTerm: "Repsol",
        fuelLabel: "GLP",
        fuelIsCause: true,
        zone: "en Las Palmas",
      }).title,
    ).toBe('No hay gasolineras con GLP que coincidan con "Repsol" en Las Palmas');
    expect(
      emptyResultsMessage({
        searchTerm: "",
        fuelLabel: "GNC",
        fuelIsCause: true,
        zone: "en Telde",
      }).title,
    ).toBe("No hay gasolineras con GNC en Telde");
  });
});
