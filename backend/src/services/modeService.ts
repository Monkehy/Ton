import geoip from "geoip-lite";
import type { FastifyRequest } from "fastify";

const restrictedCountries = new Set(["CN", "US"]);

function pickCountry(request: FastifyRequest): { country: string; reason: string } {
  const cfCountry = request.headers["cf-ipcountry"];
  const cfCountryCode = typeof cfCountry === "string" ? cfCountry.toUpperCase() : "";

  const ip = request.ip ?? request.headers["x-forwarded-for"] ?? request.socket?.remoteAddress ?? "";
  const geo = geoip.lookup(Array.isArray(ip) ? ip[0] : String(ip));
  const geoCountry = geo?.country?.toUpperCase() ?? "UNKNOWN";

  if (cfCountryCode && cfCountryCode !== "XX" && cfCountryCode !== "T1") {
    if (geoCountry !== "UNKNOWN" && geoCountry !== cfCountryCode) {
      return { country: cfCountryCode, reason: "GEO_CONFLICT" };
    }
    return { country: cfCountryCode, reason: "CF_IPCOUNTRY" };
  }

  return { country: geoCountry, reason: "GEOIP_FALLBACK" };
}

export function resolveMode(request: FastifyRequest): {
  mode: "MODE_CLEAN" | "MODE_GAMING";
  modeReason: string;
} {
  const { country, reason } = pickCountry(request);
  if (country === "UNKNOWN") {
    return { mode: "MODE_CLEAN", modeReason: "UNKNOWN_COUNTRY" };
  }

  if (restrictedCountries.has(country)) {
    return { mode: "MODE_CLEAN", modeReason: `${reason}:${country}` };
  }

  return { mode: "MODE_GAMING", modeReason: `${reason}:${country}` };
}
