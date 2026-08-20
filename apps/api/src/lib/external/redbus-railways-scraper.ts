import type { Page } from "playwright";
import { env } from "../../config/env";
import railwayStationData from "../../data/redbus/railwayStations.json";
import { createScrapeContext, getSharedBrowser } from "../playwright-browser";

const DEFAULT_BASE_URL = "https://www.redbus.in";
const RAILWAYS_PATH = "/railways/";
const SEARCH_PATH = "/railways/search";

interface StationRecord {
  stnCode?: string;
  stnName?: string;
  stnCity?: string;
}

/**
 * City → principal railway station. The bundled 4,598-station catalog is keyed by
 * station name/code/city, so destinations whose city name is not itself a station
 * ("Goa", "Delhi", "Mumbai") would otherwise fail to resolve. These map a traveller's
 * city to the station they would actually board at.
 */
const STATION_ALIASES: Record<string, { code: string; name: string }> = {
  delhi: { code: "NDLS", name: "New Delhi" },
  "new delhi": { code: "NDLS", name: "New Delhi" },
  ndls: { code: "NDLS", name: "New Delhi" },
  bangalore: { code: "SBC", name: "Bangalore Cy Junction" },
  bengaluru: { code: "SBC", name: "Bangalore Cy Junction" },
  "bangalore city": { code: "SBC", name: "Bangalore Cy Junction" },
  mumbai: { code: "CSTM", name: "Mumbai Cst" },
  "mumbai cst": { code: "CSTM", name: "Mumbai Cst" },
  cstm: { code: "CSTM", name: "Mumbai Cst" },
  bombay: { code: "CSTM", name: "Mumbai Cst" },
  kalyan: { code: "KYN", name: "Kalyan Jn" },
  "kalyan jn": { code: "KYN", name: "Kalyan Jn" },
  kyn: { code: "KYN", name: "Kalyan Jn" },
  patna: { code: "PNBE", name: "Patna Jn" },
  "patna jn": { code: "PNBE", name: "Patna Jn" },
  pnbe: { code: "PNBE", name: "Patna Jn" },
  raxaul: { code: "RXL", name: "Raxaul Jn" },
  "raxaul jn": { code: "RXL", name: "Raxaul Jn" },
  rxl: { code: "RXL", name: "Raxaul Jn" },
  amritsar: { code: "ASR", name: "Amritsar Jn" },
  "amritsar jn": { code: "ASR", name: "Amritsar Jn" },
  asr: { code: "ASR", name: "Amritsar Jn" },
  "rajendra nagar": { code: "RJPB", name: "Rajendra Nagar Bihar" },
  rjpb: { code: "RJPB", name: "Rajendra Nagar Bihar" },
  // Tourist destinations whose city name is not a station name.
  goa: { code: "MAO", name: "Madgaon Jn" },
  madgaon: { code: "MAO", name: "Madgaon Jn" },
  panaji: { code: "MAO", name: "Madgaon Jn" },
  panjim: { code: "MAO", name: "Madgaon Jn" },
  "vasco da gama": { code: "VSG", name: "Vasco Da Gama" },
  kolkata: { code: "HWH", name: "Howrah Jn" },
  calcutta: { code: "HWH", name: "Howrah Jn" },
  howrah: { code: "HWH", name: "Howrah Jn" },
  chennai: { code: "MAS", name: "Mgr Chennai Ctr" },
  madras: { code: "MAS", name: "Mgr Chennai Ctr" },
  hyderabad: { code: "SC", name: "Secunderabad Jn" },
  secunderabad: { code: "SC", name: "Secunderabad Jn" },
  jaipur: { code: "JP", name: "Jaipur" },
  varanasi: { code: "BSB", name: "Varanasi Jn" },
  banaras: { code: "BSB", name: "Varanasi Jn" },
  ahmedabad: { code: "ADI", name: "Ahmedabad Jn" },
  pune: { code: "PUNE", name: "Pune Jn" },
  lucknow: { code: "LKO", name: "Lucknow Nr" },
  agra: { code: "AGC", name: "Agra Cantt" },
  udaipur: { code: "UDZ", name: "Udaipur City" },
  jodhpur: { code: "JU", name: "Jodhpur Jn" },
  indore: { code: "INDB", name: "Indore Jn" },
  bhopal: { code: "BPL", name: "Bhopal Jn" },
  nagpur: { code: "NGP", name: "Nagpur" },
  surat: { code: "ST", name: "Surat" },
  vadodara: { code: "BRC", name: "Vadodara Jn" },
  coimbatore: { code: "CBE", name: "Coimbatore Jn" },
  madurai: { code: "MDU", name: "Madurai Jn" },
  kochi: { code: "ERS", name: "Ernakulam Jn" },
  ernakulam: { code: "ERS", name: "Ernakulam Jn" },
  trivandrum: { code: "TVC", name: "Trivandrum Cntl" },
  thiruvananthapuram: { code: "TVC", name: "Trivandrum Cntl" },
  visakhapatnam: { code: "VSKP", name: "Visakhapatnam" },
  bhubaneswar: { code: "BBS", name: "Bhubaneswar" },
  guwahati: { code: "GHY", name: "Guwahati" },
  dehradun: { code: "DDN", name: "Dehradun" },
  haridwar: { code: "HW", name: "Haridwar Jn" },
  jammu: { code: "JAT", name: "Jammu Tawi" },
  ranchi: { code: "RNC", name: "Ranchi" },
  raipur: { code: "R", name: "Raipur Jn" },
  chandigarh: { code: "CDG", name: "Chandigarh" },
  gaya: { code: "GAYA", name: "Gaya Jn" },
  puri: { code: "PURI", name: "Puri" },
  shirdi: { code: "SNSI", name: "Sainagar Shirdi" },
  tirupati: { code: "TPTY", name: "Tirupati" },
};
const STATION_CATALOG: StationRecord[] = (railwayStationData as { stations?: StationRecord[] }).stations ?? [];
const STATIONS_BY_KEY = new Map<string, StationRecord>();
for (const station of STATION_CATALOG) {
  for (const value of [station.stnCode, station.stnName, station.stnCity]) {
    if (value) STATIONS_BY_KEY.set(String(value).trim().toLowerCase(), station);
  }
}

export class RedbusRailwaysScraperError extends Error {
  readonly cause2?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "RedbusRailwaysScraperError";
    this.cause2 = cause;
  }
}

export interface RawTrainResult {
  trainNumber: string | null;
  name: string | null;
  departure: string | null;
  arrival: string | null;
  /** Journey time as published by redBus ("04h 58min"), in minutes. */
  durationMinutes: number | null;
  price: string | null;
  /** Cheapest class fare found on the card, in INR. */
  cheapestFare: number | null;
  /** Class-wise fares, e.g. { SL: 150, "3A": 520, "2A": 725 }. */
  classFares: Record<string, number>;
  /** Actual boarding/dropping stations, which may differ from the requested pair. */
  boardingStation: string | null;
  droppingStation: string | null;
  rawText: string;
}

export interface RailwaySearchParams {
  from: string;
  to: string;
  date: string;
  src?: string;
  dst?: string;
  srcName?: string;
  dstName?: string;
  limit?: number;
  freeCancellation?: boolean;
}

export interface RailwaySearchResult {
  source: "redbus";
  query: { from: { code?: string; name: string }; to: { code?: string; name: string }; date: string };
  count: number;
  results: RawTrainResult[];
}

function resolveStation(query: string | undefined, code: string | undefined, name: string | undefined): { code?: string; name: string } {
  if (code) {
    const normalizedCode = code.trim().toLowerCase();
    const alias = STATION_ALIASES[normalizedCode];
    const catalogStation = STATIONS_BY_KEY.get(normalizedCode);
    return {
      code: code.trim().toUpperCase(),
      name: alias?.name || name || catalogStation?.stnName || query || code.trim().toUpperCase(),
    };
  }

  const normalized = String(query ?? "").trim();
  const alias = STATION_ALIASES[normalized.toLowerCase()];
  if (alias) return { ...alias };

  const catalogStation = STATIONS_BY_KEY.get(normalized.toLowerCase());
  if (catalogStation?.stnCode && catalogStation.stnName) {
    return { code: catalogStation.stnCode, name: catalogStation.stnName };
  }

  return { name: normalized };
}

function formatSearchDate(date: string): string {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new RedbusRailwaysScraperError(`Invalid journey date: ${date}. Use YYYY-MM-DD.`);
  return `${match[1]}${match[2]}${match[3]}`;
}

async function isUsable(locator: { count(): Promise<number>; first(): { isVisible(): Promise<boolean> } }): Promise<boolean> {
  try {
    return (await locator.count()) > 0 && (await locator.first().isVisible());
  } catch {
    return false;
  }
}

export class RedbusRailwaysScraper {
  private readonly baseUrl = DEFAULT_BASE_URL;
  private readonly timeoutMs: number;

  constructor(options: { timeoutMs?: number } = {}) {
    this.timeoutMs = options.timeoutMs ?? env.REDBUS_TIMEOUT_MS;
  }

  async searchTrains(params: RailwaySearchParams): Promise<RailwaySearchResult> {
    const fromStation = resolveStation(params.from, params.src, params.srcName);
    const toStation = resolveStation(params.to, params.dst, params.dstName);
    if (!fromStation.name) throw new RedbusRailwaysScraperError("Missing required parameter: from.");
    if (!toStation.name) throw new RedbusRailwaysScraperError("Missing required parameter: to.");
    if (!params.date) throw new RedbusRailwaysScraperError("Missing required parameter: date.");

    const browser = await getSharedBrowser();
    const context = await createScrapeContext(browser);
    const page = await context.newPage();

    try {
      page.setDefaultTimeout(this.timeoutMs);
      if (fromStation.code && toStation.code) {
        await this.gotoSearchResults(page, {
          fromStation: fromStation as { code: string; name: string },
          toStation: toStation as { code: string; name: string },
          date: params.date,
          freeCancellation: params.freeCancellation ?? false,
        });
      } else {
        await this.gotoRailways(page);
        await this.selectJourneyDate(page, params.date);
        await this.selectStation(page, "From", fromStation.name);
        await this.selectStation(page, "To", toStation.name);
        await this.clickSearch(page);
      }
      await this.waitForResults(page);

      const results = await this.extractResults(page);
      return {
        source: "redbus",
        query: { from: fromStation, to: toStation, date: params.date },
        count: typeof params.limit === "number" ? Math.min(results.length, params.limit) : results.length,
        results: typeof params.limit === "number" ? results.slice(0, params.limit) : results,
      };
    } catch (error) {
      if (error instanceof RedbusRailwaysScraperError) throw error;
      throw new RedbusRailwaysScraperError("redBus railway automation failed.", error);
    } finally {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
    }
  }

  private async gotoRailways(page: Page): Promise<void> {
    await page.goto(new URL(RAILWAYS_PATH, this.baseUrl).toString(), { waitUntil: "commit", timeout: this.timeoutMs });
    await page.waitForFunction(() => /From|To|Search Trains/i.test(document.body?.innerText || ""), { timeout: this.timeoutMs });
  }

  private async gotoSearchResults(
    page: Page,
    params: { fromStation: { code: string; name: string }; toStation: { code: string; name: string }; date: string; freeCancellation: boolean },
  ): Promise<void> {
    const url = new URL(SEARCH_PATH, this.baseUrl);
    url.searchParams.set("src", params.fromStation.code);
    url.searchParams.set("dst", params.toStation.code);
    url.searchParams.set("doj", formatSearchDate(params.date));
    url.searchParams.set("srcName", params.fromStation.name);
    url.searchParams.set("dstName", params.toStation.name);
    url.searchParams.set("fcOpted", String(params.freeCancellation));
    url.searchParams.set("ref", "home");
    await page.goto(url.toString(), { waitUntil: "commit", timeout: this.timeoutMs });
  }

  private async selectStation(page: Page, label: "From" | "To", query: string): Promise<void> {
    await page.keyboard.press("Escape").catch(() => {});
    const field = label === "From" ? "src" : "dst";
    const input = await this.stationInput(page, label);
    await input.click({ force: true });

    const searchInput = page.locator(`#${field}-search-input`).first();
    try {
      await searchInput.waitFor({ state: "visible", timeout: 5000 });
      await searchInput.fill(query);
    } catch {
      await this.enterText(page, input, query);
    }

    const suggestions = page.locator(`#${field}-suggestions button.suggestion-item`);
    await suggestions.first().waitFor({ state: "visible", timeout: this.timeoutMs });
    const matchingSuggestion = suggestions.filter({ hasText: query }).first();
    if ((await matchingSuggestion.count()) > 0) {
      await matchingSuggestion.click();
    } else {
      await suggestions.first().click();
    }
  }

  private async enterText(page: Page, locator: ReturnType<Page["locator"]>, value: string): Promise<void> {
    try {
      await locator.fill("");
      await locator.pressSequentially(value, { delay: 35 });
      return;
    } catch (error) {
      if (!/not an <input>|editable|fill/i.test(String((error as Error)?.message ?? error))) throw error;
    }
    await page.keyboard.press("Control+A").catch(() => {});
    await page.keyboard.press("Backspace").catch(() => {});
    await page.keyboard.type(value, { delay: 35 });
  }

  private async stationInput(page: Page, label: "From" | "To"): Promise<ReturnType<Page["locator"]>> {
    const field = label === "From" ? "src" : "dst";
    const byField = page.locator(`[data-field="${field}"]`).first();
    if (await isUsable(byField)) return byField;

    const direct = page.getByLabel(label).first();
    if (await isUsable(direct)) return direct;

    const placeholder = page.getByPlaceholder(label, { exact: false }).first();
    if (await isUsable(placeholder)) return placeholder;

    const fieldNearLabel = page.locator(`xpath=//*[normalize-space()="${label}"]/following::input[1]`).first();
    if (await isUsable(fieldNearLabel)) return fieldNearLabel;

    const fallbackIndex = label === "From" ? 0 : 1;
    const fallback = page.locator("input").nth(fallbackIndex);
    if (await isUsable(fallback)) return fallback;

    throw new RedbusRailwaysScraperError(`Could not find ${label} station input.`);
  }

  private async selectJourneyDate(page: Page, date: string): Promise<void> {
    const journeyDate = new Date(`${date}T00:00:00+05:30`);
    if (Number.isNaN(journeyDate.getTime())) {
      throw new RedbusRailwaysScraperError(`Invalid journey date: ${date}. Use YYYY-MM-DD.`);
    }

    const dateInput = page.getByLabel(/date|journey/i).first();
    if (await isUsable(dateInput)) {
      await dateInput.click();
    } else {
      const dateText = page.getByText(/Date of Journey/i).first();
      if (await isUsable(dateText)) await dateText.click();
      else await page.locator("input").nth(2).click();
    }

    const day = String(journeyDate.getDate());
    const option = page.getByText(new RegExp(`^${day}$`)).first();
    await option.waitFor({ state: "visible", timeout: this.timeoutMs });
    await option.click();
  }

  private async clickSearch(page: Page): Promise<void> {
    const search = page.getByRole("button", { name: /search trains/i }).first();
    if (await isUsable(search)) {
      await search.click();
      return;
    }
    const textSearch = page.getByText(/search trains/i).first();
    if (await isUsable(textSearch)) {
      await textSearch.click();
      return;
    }
    throw new RedbusRailwaysScraperError("Could not find Search Trains control.");
  }

  private async waitForResults(page: Page): Promise<void> {
    // Result cards begin with a five-digit train number; waiting for one is a far
    // better signal than `networkidle` on a page with continuous background traffic.
    await page
      .waitForFunction(
        () => {
          const text = document.body?.innerText || "";
          return /\b\d{5}\b/.test(text) || /No trains|no direct trains/i.test(text);
        },
        { timeout: this.timeoutMs },
      )
      .catch(() => {});
    await page.waitForTimeout(1_000);
  }

  private async extractResults(page: Page): Promise<RawTrainResult[]> {
    return page.evaluate(() => {
      const clean = (value: string): string => value.replace(/\s+/g, " ").trim();
      const bodyText = clean(document.body?.innerText || "");

      // Result cards start at a five-digit train number; slice the page between
      // consecutive numbers so each chunk is one train.
      const firstTrain = bodyText.search(/\b\d{5}\b/);
      const journeyText = firstTrain >= 0 ? bodyText.slice(firstTrain) : bodyText;
      const starts = Array.from(journeyText.matchAll(/\b\d{5}\b/g)).map((match) => match.index ?? 0);
      const seen = new Set<string>();

      return starts
        .map((start, index) => clean(journeyText.slice(start, starts[index + 1])))
        .filter((text) => text.length >= 20)
        .map((text) => {
          const trainNumber = text.match(/^\d{5}\b/)?.[0] ?? null;
          const times = text.match(/\b\d{1,2}:\d{2}\s?(?:AM|PM)?\b/gi) ?? [];
          const key = `${trainNumber}|${times[0] ?? ""}|${times[1] ?? ""}`;
          if (!trainNumber || seen.has(key)) return null;
          seen.add(key);

          // "04h 58min" / "04 h 58 min" — redBus renders both spacings.
          const duration = text.match(/(\d{1,2})\s*h\s*(\d{1,2})?\s*min/i);
          const durationMinutes = duration
            ? Number(duration[1]) * 60 + (duration[2] ? Number(duration[2]) : 0)
            : null;

          // Class-wise fares: "SL ₹150 Available 1 ... 3A ₹520 ..."
          const classFares: Record<string, number> = {};
          for (const match of text.matchAll(/\b(SL|1A|2A|3A|3E|CC|EC|2S|FC)\b\s*(?:Rs\.?|₹)\s?([\d,]+)/gi)) {
            const cls = (match[1] ?? "").toUpperCase();
            const fare = Number((match[2] ?? "").replace(/,/g, ""));
            if (cls && Number.isFinite(fare) && fare > 0 && classFares[cls] === undefined) classFares[cls] = fare;
          }
          const fares = Object.values(classFares);
          const anyFare = text.match(/(?:Rs\.?|₹)\s?([\d,]+)/)?.[1];
          const cheapestFare = fares.length > 0
            ? Math.min(...fares)
            : anyFare ? Number(anyFare.replace(/,/g, "")) : null;

          // "Silaut (SLT) Raxaul Jn (RXL)" — the stations actually served, which for an
          // alternate-trip result differ from the stations that were searched. The
          // captured run can trail a preceding time ("08:35 AM Patna Jn") or a redBus
          // label ("Starting station Madgaon"), so both are stripped.
          const stationPairs = Array.from(text.matchAll(/([A-Za-z][A-Za-z .]*?)\s*\(([A-Z]{2,5})\)/g))
            .map((match) => {
              // The captured run can trail a time ("08:35 AM Patna Jn"), a redBus label
              // ("Starting station Madgaon"), or a distance/halt note lifted from the
              // alternate-trip row ("7km from NDLS Madgaon", "2 min halt Sagauli Jn").
              // Everything before the last such marker is dropped.
              let name = clean(match[1] ?? "");
              name = name.replace(/^.*?\b(?:AM|PM)\s+/i, "");
              name = name.replace(/^.*?\bkm from [A-Z]{2,5}\s+/i, "");
              name = name.replace(/^.*?\bmin halt\s+/i, "");
              name = name.replace(/^.*?\b(?:Starting station|Last station|View Route)\s+/i, "");
              name = name.replace(/\s+(?:Starting station|Last station|View Route)$/i, "");
              return clean(name);
            })
            .filter((name) => name.length > 1);

          const withoutNumber = text.slice(trainNumber.length).trim();
          const name = clean(withoutNumber.split(/\b[MTWFS](?:\s+[MTWFS]){2,6}\b/)[0] ?? "");

          return {
            trainNumber,
            name: name || null,
            departure: times[0] ?? null,
            arrival: times[1] ?? null,
            durationMinutes,
            price: cheapestFare !== null ? String(cheapestFare) : null,
            cheapestFare,
            classFares,
            boardingStation: stationPairs[0] ?? null,
            droppingStation: stationPairs[1] ?? null,
            rawText: text.slice(0, 600),
          };
        })
        .filter((value): value is NonNullable<typeof value> => value !== null);
    });
  }
}
