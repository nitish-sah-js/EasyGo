import type { Page } from "playwright";
import { env } from "../../config/env";
import redbusCitiesData from "../../data/redbus/redbusCities.json";
import { createScrapeContext, getSharedBrowser } from "../playwright-browser";

const DEFAULT_BASE_URL = "https://www.redbus.in";
const BUS_PATH = "/bus-tickets/";

interface CityRecord {
  id: string;
  name: string;
  aliases: string[];
}

const BUS_CITY_CATALOG = new Map<string, CityRecord>();
for (const city of Object.values(redbusCitiesData as Record<string, CityRecord>)) {
  for (const alias of city.aliases) BUS_CITY_CATALOG.set(alias.toLowerCase(), city);
}

/** City IDs resolved live via redBus's suggestion API, cached for the process lifetime. */
const resolvedCityCache = new Map<string, CityRecord>();

export class RedbusBusScraperError extends Error {
  readonly cause2?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "RedbusBusScraperError";
    this.cause2 = cause;
  }
}

/**
 * A single bookable departure, scraped from a bus result card.
 * `fare` is the real per-seat price redBus shows for that service.
 */
export interface RawBusResult {
  operator: string | null;
  departure: string | null;
  arrival: string | null;
  durationMinutes: number | null;
  fare: number | null;
  seatsAvailable: number | null;
  busType: string | null;
  rating: number | null;
  rawText: string;
}

/**
 * Route-level facts redBus publishes even when no bookable departures are listed
 * (dates too far out, sold out, or a route page with no live inventory).
 */
export interface BusRouteSummary {
  operatorCount: number | null;
  dailyServices: number | null;
  cheapestFare: number | null;
  averageDurationMinutes: number | null;
  firstBusClock: string | null;
  lastBusClock: string | null;
  /** Per-operator timings table: real operator names, first/last departure, duration. */
  operatorTimings: Array<{ operator: string; firstBus: string | null; lastBus: string | null; durationMinutes: number | null }>;
}

export interface BusSearchParams {
  from: string;
  to: string;
  date: string;
  fromCityId?: string;
  toCityId?: string;
  limit?: number;
}

export interface BusSearchResult {
  source: "redbus";
  query: { from: { name: string; id: string }; to: { name: string; id: string }; date: string };
  count: number;
  results: RawBusResult[];
  summary: BusRouteSummary | null;
  /** true when redBus explicitly states no buses run this route on this date. */
  noServiceOnRoute: boolean;
}

function slug(value: string): string {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = { bengaluru: "bangalore", bangalore: "bangalore", tirupati: "tirupathi" };
  return (aliases[normalized] ?? normalized).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatBusDate(date: string): string {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new RedbusBusScraperError(`Invalid journey date: ${date}. Use YYYY-MM-DD.`);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${match[3]}-${months[Number(match[2]) - 1]}-${match[1]}`;
}

export class RedbusBusScraper {
  private readonly baseUrl = DEFAULT_BASE_URL;
  private readonly timeoutMs: number;

  constructor(options: { timeoutMs?: number } = {}) {
    this.timeoutMs = options.timeoutMs ?? env.REDBUS_TIMEOUT_MS;
  }

  async searchBuses(params: BusSearchParams): Promise<BusSearchResult> {
    if (!params.from) throw new RedbusBusScraperError("Missing required parameter: from.");
    if (!params.to) throw new RedbusBusScraperError("Missing required parameter: to.");
    if (!params.date) throw new RedbusBusScraperError("Missing required parameter: date.");

    const resolved = this.applyCityCatalog(params);

    const browser = await getSharedBrowser();
    const context = await createScrapeContext(browser);
    const page = await context.newPage();

    try {
      page.setDefaultTimeout(this.timeoutMs);

      // Cities outside the bundled catalog are resolved live, which needs a redBus
      // session cookie — hence the homepage visit before querying the suggestion API.
      if (!resolved.fromCityId || !resolved.toCityId) {
        await page.goto(this.baseUrl, { waitUntil: "domcontentloaded", timeout: this.timeoutMs });

        if (!resolved.fromCityId) {
          const city = await this.lookupCity(page, params.from);
          if (city) {
            resolved.fromCityId = city.id;
            resolved.from = city.name;
          }
        }
        if (!resolved.toCityId) {
          const city = await this.lookupCity(page, params.to);
          if (city) {
            resolved.toCityId = city.id;
            resolved.to = city.name;
          }
        }
      }

      if (!resolved.fromCityId || !resolved.toCityId) {
        throw new RedbusBusScraperError(
          `redBus does not list a bus city for "${params.from}" / "${params.to}".`,
        );
      }

      await page.goto(this.buildSearchUrl(resolved), { waitUntil: "commit", timeout: this.timeoutMs });
      await this.waitForResults(page);

      const { results, summary, noServiceOnRoute } = await this.extractResults(page);
      return {
        source: "redbus",
        query: {
          from: { name: resolved.from, id: String(resolved.fromCityId) },
          to: { name: resolved.to, id: String(resolved.toCityId) },
          date: resolved.date,
        },
        count: typeof params.limit === "number" ? Math.min(results.length, params.limit) : results.length,
        results: typeof params.limit === "number" ? results.slice(0, params.limit) : results,
        summary,
        noServiceOnRoute,
      };
    } catch (error) {
      if (error instanceof RedbusBusScraperError) throw error;
      throw new RedbusBusScraperError("redBus bus automation failed.", error);
    } finally {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
    }
  }

  /**
   * Resolves a city name to a redBus bus-city ID via `/rpw/api/citySuggestion`.
   *
   * The endpoint is plain JSON but sits behind Akamai bot protection, so it is called
   * from inside the page (which already holds a valid session) rather than with a bare
   * fetch. Results are cached process-wide; the bundled catalog remains the fast path.
   */
  private async lookupCity(page: Page, city: string): Promise<CityRecord | undefined> {
    const key = city.trim().toLowerCase();
    const cached = resolvedCityCache.get(key);
    if (cached) return cached;

    let payload: unknown;
    try {
      payload = await page.evaluate(async (query) => {
        const response = await fetch(
          `/rpw/api/citySuggestion?search=${encodeURIComponent(query)}&limit=10&routeDetection=false`,
          { headers: { accept: "application/json" } },
        );
        if (!response.ok) return null;
        return response.json();
      }, city);
    } catch {
      return undefined;
    }
    if (!payload) return undefined;

    // The response nests matches under a Solr-style grouped structure; collect every
    // {ID, Name, locationType} triple rather than depending on the exact envelope.
    const candidates: Array<{ id: string; name: string; type: string }> = [];
    const walk = (node: unknown, depth = 0): void => {
      if (depth > 6 || node === null || typeof node !== "object") return;
      if (Array.isArray(node)) {
        for (const item of node) walk(item, depth + 1);
        return;
      }
      const record = node as Record<string, unknown>;
      if (record.ID !== undefined && typeof record.Name === "string") {
        candidates.push({
          id: String(record.ID),
          name: record.Name,
          type: String(record.locationType ?? ""),
        });
      }
      for (const value of Object.values(record)) walk(value, depth + 1);
    };
    walk(payload);

    // Prefer a CITY (results are already rank-sorted); an AREA is a boarding point,
    // not a searchable route endpoint.
    const match = candidates.find((item) => item.type === "CITY");
    if (!match) return undefined;

    // "Patna (Bihar)" → "Patna": the route slug and query string want the bare name.
    const record: CityRecord = {
      id: match.id,
      name: match.name.replace(/\s*\([^)]*\)\s*$/, "").trim() || match.name,
      aliases: [key],
    };
    resolvedCityCache.set(key, record);
    return record;
  }

  private applyCityCatalog(params: BusSearchParams): BusSearchParams & { fromCityId?: string; toCityId?: string } {
    const from = BUS_CITY_CATALOG.get(params.from.trim().toLowerCase());
    const to = BUS_CITY_CATALOG.get(params.to.trim().toLowerCase());
    return {
      ...params,
      ...(from && !params.fromCityId ? { fromCityId: from.id, from: from.name } : {}),
      ...(to && !params.toCityId ? { toCityId: to.id, to: to.name } : {}),
    };
  }

  private buildSearchUrl(params: BusSearchParams & { fromCityId?: string; toCityId?: string }): string {
    const routeSlug = `${slug(params.from)}-to-${slug(params.to)}`;
    const url = new URL(`${BUS_PATH}${routeSlug}`, this.baseUrl);
    const query: Record<string, string | undefined> = {
      fromCityName: params.from,
      fromCityId: params.fromCityId,
      fromCityType: "CITY",
      toCityName: params.to,
      toCityId: params.toCityId,
      destCountry: "IND",
      toCityType: "CITY",
      onward: formatBusDate(params.date),
      doj: formatBusDate(params.date),
      ref: "modifySearch",
    };
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, value);
    }
    return url.toString();
  }

  /**
   * Waits for live result cards, not for the network to go quiet: redBus keeps ad and
   * analytics requests running, so `networkidle` reliably burns the whole timeout on a
   * page that finished rendering seconds earlier.
   *
   * Cards are awaited *first and on their own*. The route summary ("Daily Bus Services",
   * "Cheapest Bus Ticket Price") is server-rendered SEO copy that is present in the
   * initial HTML, so treating it as a ready-signal returns before the cards mount —
   * headless Chromium hydrates ~6s in versus ~2s headed, which silently downgraded
   * every headless search to the summary fallback.
   */
  private async waitForResults(page: Page): Promise<void> {
    const cardsAppeared = await page
      .waitForSelector("[class*='timeFareBoWrap___']", { timeout: Math.min(this.timeoutMs, 20_000) })
      .then(() => true)
      .catch(() => false);

    if (cardsAppeared) {
      // Let the rest of the first batch settle in.
      await page.waitForTimeout(1_500);
      return;
    }

    // No inventory rendered — settle for whatever the page does say, so the caller can
    // tell "no buses on this route" apart from a broken scrape.
    await page
      .waitForFunction(
        () => /No buses found|no buses are available|Cheapest Bus Ticket Price|Daily Bus Services/i.test(document.body?.innerText || ""),
        { timeout: 5_000 },
      )
      .catch(() => {});
  }

  /**
   * Extracts, in order of fidelity:
   *   1. bookable departures from result cards (real times + real per-seat fares);
   *   2. the route summary redBus renders even with zero inventory — operator count,
   *      cheapest fare, average duration, and a per-operator timings table.
   *
   * Both are returned so the mapper can prefer real departures and fall back to the
   * summary rather than inventing a schedule.
   */
  private async extractResults(
    page: Page,
  ): Promise<{ results: RawBusResult[]; summary: BusRouteSummary | null; noServiceOnRoute: boolean }> {
    return page.evaluate(() => {
      const clean = (value: string | null | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();
      const toMinutes = (hours: string | undefined, minutes: string | undefined): number | null => {
        const h = hours ? Number(hours) : 0;
        const m = minutes ? Number(minutes) : 0;
        const total = h * 60 + m;
        return total > 0 ? total : null;
      };
      const money = (value: string | null | undefined): number | null => {
        if (!value) return null;
        const digits = value.replace(/[^0-9]/g, "");
        if (!digits) return null;
        const parsed = Number(digits);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      };

      // ---- 1. Bookable departures -------------------------------------------------
      // Each field has its own CSS-module class. Reading them individually is far more
      // reliable than splitting the card's flattened text, where promotional badges
      // ("Exclusive 10% OFF") sit in front of the operator name. Hash suffixes change
      // between redBus deployments, so every selector matches the stable prefix.
      const text = (root: Element, selector: string): string | null => {
        const node = root.querySelector(selector);
        return node ? clean((node as HTMLElement).innerText) || null : null;
      };

      const cardNodes = Array.from(document.querySelectorAll("[class*='timeFareBoWrap___']"));
      const seen = new Set<string>();
      const results: RawBusResult[] = [];

      for (const node of cardNodes) {
        const cardText = clean((node as HTMLElement).innerText);
        const departure = text(node, "[class*='boardingTime___']");
        const arrival = text(node, "[class*='droppingTime___']");
        const durationText = text(node, "[class*='duration___']");
        const fareText = text(node, "[class*='finalFare___']");
        const operator = text(node, "[class*='travelsName___']")?.replace(/\s*®\s*$/, "").trim() ?? null;

        const duration = durationText?.match(/(\d+)\s*h(?:rs?)?\s*(?:(\d+)\s*m)?/i);
        const minutes = duration ? toMinutes(duration[1], duration[2]) : null;
        const price = money(fareText);

        // Drop anything that isn't a complete, plausible departure rather than
        // back-filling the gaps with guesses.
        if (!departure || !operator || minutes === null || price === null) continue;
        if (minutes < 30 || minutes > 48 * 60) continue;
        if (price < 50 || price > 20_000) continue;

        const key = `${operator}|${departure}|${price}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const seats = text(node, "[class*='totalSeats___']")?.match(/(\d+)/)?.[1];
        const rating = text(node, "[class*='rating___']")?.match(/\b([1-5](?:\.\d)?)\b/)?.[1];

        results.push({
          operator,
          departure,
          arrival,
          durationMinutes: minutes,
          fare: price,
          seatsAvailable: seats ? Number(seats) : null,
          busType: text(node, "[class*='busType___']"),
          rating: rating ? Number(rating) : null,
          rawText: cardText.slice(0, 400),
        });
      }

      // ---- 2. Route summary -------------------------------------------------------
      const body = clean(document.body?.innerText);
      const avgDuration = body.match(/Avg\.?\s*Bus Duration\s*:\s*(\d+)\s*hrs?(?:\s*(\d+)\s*mins?)?/i);
      const summary: BusRouteSummary = {
        operatorCount: body.match(/Bus Companies\s*:\s*([\d,]+)/i)?.[1]
          ? Number(body.match(/Bus Companies\s*:\s*([\d,]+)/i)?.[1]?.replace(/,/g, ""))
          : null,
        dailyServices: body.match(/Daily Bus Services\s*:\s*([\d,]+)/i)?.[1]
          ? Number(body.match(/Daily Bus Services\s*:\s*([\d,]+)/i)?.[1]?.replace(/,/g, ""))
          : null,
        cheapestFare: money(body.match(/Cheapest Bus Ticket Price\s*:\s*(?:INR|₹)\s*([\d,]+)/i)?.[1]),
        averageDurationMinutes: avgDuration ? toMinutes(avgDuration[1], avgDuration[2]) : null,
        firstBusClock: body.match(/First Bus\s*:\s*(\d{1,2}:\d{2})/i)?.[1] ?? null,
        lastBusClock: body.match(/Last Bus\s*:\s*(\d{1,2}:\d{2})/i)?.[1] ?? null,
        operatorTimings: [],
      };

      // The operator timings table flattens to a single run of text:
      //   "… Duration Maharani Travels First Bus - 03:20 Last Bus - 23:55 5 hrs 15 mins
      //    VIEW PRICE NueGo First Bus - 06:30 …"
      // Each row ends with "VIEW PRICE", so splitting on that marker keeps the operator
      // name from swallowing the previous row's trailing text.
      const seenOperators = new Set<string>();
      for (const chunk of body.split(/VIEW PRICE/i)) {
        const row = chunk.match(
          /(.*?)\s*First Bus\s*-\s*(\d{1,2}:\d{2})\s*Last Bus\s*-\s*(\d{1,2}:\d{2})\s*(\d+)\s*hrs?\s*(\d+)?\s*mins?/i,
        );
        if (!row) continue;

        // Drop the table header that precedes the first row.
        const operator = clean(row[1] ?? "")
          .replace(/.*\bDuration\b\s*/i, "")
          .replace(/^Bus Operator\s*/i, "")
          .trim();
        if (!operator || operator.length > 45 || seenOperators.has(operator.toLowerCase())) continue;
        seenOperators.add(operator.toLowerCase());

        summary.operatorTimings.push({
          operator,
          firstBus: row[2] ?? null,
          lastBus: row[3] ?? null,
          durationMinutes: toMinutes(row[4], row[5]),
        });
      }

      const hasSummary =
        summary.cheapestFare !== null ||
        summary.averageDurationMinutes !== null ||
        summary.operatorTimings.length > 0;

      // redBus renders "Oops!! No buses found / no buses are available on this route"
      // when the route genuinely has no service — distinct from a failed scrape.
      const noServiceOnRoute = /No buses found|no buses are available on this route/i.test(body);

      return { results, summary: hasSummary ? summary : null, noServiceOnRoute };
    });
  }
}
