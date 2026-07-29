import L from "leaflet";
import { resolveBrand } from "../../data/brands";
import { priceTier } from "../../utils/stations";

const TIER_BORDER = {
  cheap: "#059669",
  average: "#d97706",
  expensive: "#dc2626",
  none: "#94a3b8",
};

export function createPriceMarker(price, average, isCheapest, stationName) {
  const tier = priceTier(price, average);
  const border = isCheapest ? "#4f46e5" : TIER_BORDER[tier];
  const brand = resolveBrand(stationName);
  const safePrice = price > 0 ? price.toFixed(3) : "--";
  const logoHtml = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="" width="14" height="14" style="width:14px;height:14px;object-fit:contain;border-radius:999px;background:#fff;padding:1px;border:1px solid #e2e8f0;" />`
    : "";

  return L.divIcon({
    className: "custom-price-marker",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;position:relative;">
        <div class="price-marker ${isCheapest ? "marker-cheapest" : ""}" style="border-color:${border};">
          ${logoHtml}
          <span style="margin-left:${logoHtml ? "4px" : "0"}">${safePrice}€</span>
        </div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${border};margin-top:-1px;"></div>
      </div>
    `,
    iconSize: [64, 40],
    iconAnchor: [32, 40],
  });
}
