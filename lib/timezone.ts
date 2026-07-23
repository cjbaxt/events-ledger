export const COUNTRY_TZ: Record<string, string> = {
  AT: "Europe/Vienna",   BE: "Europe/Brussels",  HR: "Europe/Zagreb",
  CZ: "Europe/Prague",   DK: "Europe/Copenhagen", FI: "Europe/Helsinki",
  FR: "Europe/Paris",    DE: "Europe/Berlin",     GR: "Europe/Athens",
  HU: "Europe/Budapest", IE: "Europe/Dublin",     IT: "Europe/Rome",
  LU: "Europe/Luxembourg", MT: "Europe/Malta",    NL: "Europe/Amsterdam",
  NO: "Europe/Oslo",     PL: "Europe/Warsaw",     PT: "Europe/Lisbon",
  RO: "Europe/Bucharest", SK: "Europe/Bratislava", SI: "Europe/Ljubljana",
  ES: "Europe/Madrid",   SE: "Europe/Stockholm",  CH: "Europe/Zurich",
  GB: "Europe/London",   UK: "Europe/London",
  AU: "Australia/Sydney",  NZ: "Pacific/Auckland",
  JP: "Asia/Tokyo",      KR: "Asia/Seoul",        CN: "Asia/Shanghai",
  SG: "Asia/Singapore",  HK: "Asia/Hong_Kong",   IN: "Asia/Kolkata",
  AE: "Asia/Dubai",      IL: "Asia/Jerusalem",    EG: "Africa/Cairo",
  ZA: "Africa/Johannesburg", MA: "Africa/Casablanca",
  US: "America/New_York",  CA: "America/Toronto",  MX: "America/Mexico_City",
  AR: "America/Argentina/Buenos_Aires", BR: "America/Sao_Paulo",
};

const COUNTRY_ALIAS: Record<string, string> = {
  "UNITED KINGDOM": "GB", "GREAT BRITAIN": "GB", "ENGLAND": "GB",
  "SCOTLAND": "GB", "WALES": "GB", "NORTHERN IRELAND": "GB",
  "IRELAND": "IE", "NETHERLANDS": "NL", "THE NETHERLANDS": "NL",
  "HOLLAND": "NL", "AUSTRALIA": "AU", "CZECHIA": "CZ",
  "CZECH REPUBLIC": "CZ", "NEW ZEALAND": "NZ", "SOUTH AFRICA": "ZA",
  "UNITED ARAB EMIRATES": "AE", "UAE": "AE", "UNITED STATES": "US", "USA": "US",
};

export function countryToTz(country: string | null | undefined): string {
  if (!country) return "Europe/London";
  const upper = country.trim().toUpperCase();
  const code = COUNTRY_ALIAS[upper] ?? upper;
  return COUNTRY_TZ[code] ?? "Europe/London";
}
