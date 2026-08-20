import type { Page } from "playwright";
import { env } from "../../config/env";
import hotelCityData from "../../data/redbus/redbusHotelCities.json";
import { createScrapeContext, getSharedBrowser } from "../playwright-browser";

const BASE_URL = "https://www.redbus.in";
const HOTELS_PATH = "/hotels/search";

interface HotelCityRecord {
  name: string;
  cityId: string;
  locationId?: string;
  type: string;
  lat: number;
  long: number;
  aliases?: string[];
}

const HOTEL_CITY_CATALOG = hotelCityData as HotelCityRecord[];

export class RedbusHotelsScraperError extends Error {
  readonly cause2?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "RedbusHotelsScraperError";
    this.cause2 = cause;
  }
}

/** One property card as rendered on the redBus hotel results page. */
export interface RawHotelResult {
  name: string;
  area: string | null;
  proximity: string | null;
  /** Nightly rate actually charged, in INR. */
  price: number | null;
  /** Pre-discount rate, when redBus shows a struck-through price. */
  originalPrice: number | null;
  taxes: number | null;
  rating: number | null;
  reviewCount: number | null;
  propertyType: string | null;
  badges: string[];
}

export interface HotelSearchParams {
  city: string;
  checkIn: string;
  checkOut: string;
  cityId?: string;
  rooms?: number;
  adults?: number;
  children?: number;
  limit?: number;
}

export interface HotelSearchResult {
  source: "redbus";
  query: { city: { name: string; id: string }; checkIn: string; checkOut: string; rooms: number; adults: number; children: number };
  /** Total properties redBus reports for the city — far larger than `results.length`. */
  propertyCount: number | null;
  count: number;
  results: RawHotelResult[];
}

export function resolveHotelCity(city: string): HotelCityRecord | undefined {
  const normalized = city.trim().toLowerCase();
  return HOTEL_CITY_CATALOG.find((item) =>
    [item.name, ...(item.aliases ?? [])].some((alias) => alias.toLowerCase() === normalized),
  );
}

export class RedbusHotelsScraper {
  private readonly timeoutMs: number;

  constructor(options: { timeoutMs?: number } = {}) {
    this.timeoutMs = options.timeoutMs ?? env.REDBUS_HOTEL_TIMEOUT_MS;
  }

  async searchHotels(params: HotelSearchParams): Promise<HotelSearchResult> {
    if (!params.city) throw new RedbusHotelsScraperError("Missing required parameter: city.");
    if (!params.checkIn) throw new RedbusHotelsScraperError("Missing required parameter: checkIn.");
    if (!params.checkOut) throw new RedbusHotelsScraperError("Missing required parameter: checkOut.");

    const catalogCity = resolveHotelCity(params.city);
    const cityId = params.cityId ?? catalogCity?.cityId;
    if (!cityId) {
      throw new RedbusHotelsScraperError(
        `No redBus hotel city ID for "${params.city}". Known cities: ${HOTEL_CITY_CATALOG.map((c) => c.name).join(", ")}.`,
      );
    }

    const browser = await getSharedBrowser();
    const context = await createScrapeContext(browser);
    const page = await context.newPage();

    try {
      page.setDefaultTimeout(this.timeoutMs);
      const searchUrl = this.buildSearchUrl({ ...params, cityId, ...(catalogCity ? { catalogCity } : {}) });
      await page.goto(searchUrl, { waitUntil: "commit", timeout: this.timeoutMs });
      await this.waitForResults(page);

      const { results, propertyCount } = await this.extractResults(page);
      const limited = typeof params.limit === "number" ? results.slice(0, params.limit) : results;

      return {
        source: "redbus",
        query: {
          city: { name: catalogCity?.name ?? params.city, id: cityId },
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          rooms: params.rooms ?? 1,
          adults: params.adults ?? 2,
          children: params.children ?? 0,
        },
        propertyCount,
        count: limited.length,
        results: limited,
      };
    } catch (error) {
      if (error instanceof RedbusHotelsScraperError) throw error;
      throw new RedbusHotelsScraperError("redBus hotel automation failed.", error);
    } finally {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
    }
  }

  private buildSearchUrl(params: HotelSearchParams & { cityId: string; catalogCity?: HotelCityRecord }): string {
    const url = new URL(HOTELS_PATH, BASE_URL);
    const city = params.catalogCity;
    const query: Record<string, string | undefined> = {
      city: city?.name ?? params.city,
      cityId: params.cityId,
      type: city?.type ?? "city",
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      rooms: String(params.rooms ?? 1),
      adults: String(params.adults ?? 2),
      children: String(params.children ?? 0),
      countryId: "IN",
      locationId: city?.locationId,
      locationName: city?.name ?? params.city,
      lat: city ? String(city.lat) : undefined,
      long: city ? String(city.long) : undefined,
      contextType: city?.type ?? "city",
      contextId: params.cityId,
    };
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, value);
    }
    return url.toString();
  }

  /**
   * Waits for property cards rather than `networkidle` — redBus keeps background
   * requests in flight, so waiting for quiet costs the whole timeout budget.
   *
   * Cards are awaited first: the "N properties found" counter is present before the
   * tuples mount, so using it as the ready-signal returns an empty result under
   * headless Chromium, which hydrates noticeably slower than headed.
   */
  private async waitForResults(page: Page): Promise<void> {
    const cardsAppeared = await page
      .waitForSelector("[class*='tupleWrapper___']", { timeout: Math.min(this.timeoutMs, 20_000) })
      .then(() => true)
      .catch(() => false);

    if (cardsAppeared) {
      await page.waitForTimeout(1_000);
      return;
    }

    await page
      .waitForFunction(() => /properties found|No properties|no hotels/i.test(document.body?.innerText || ""), { timeout: 5_000 })
      .catch(() => {});
  }

  /**
   * redBus ships CSS-module class names whose hash suffix changes between
   * deployments (`hotelName___42f731`), so every selector matches on the stable
   * prefix before the hash rather than the full class name.
   */
  private async extractResults(page: Page): Promise<{ results: RawHotelResult[]; propertyCount: number | null }> {
    return page.evaluate(() => {
      const clean = (value: string | null | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();
      const text = (root: Element, selector: string): string | null => {
        const node = root.querySelector(selector);
        return node ? clean((node as HTMLElement).innerText) || null : null;
      };
      const money = (value: string | null): number | null => {
        if (!value) return null;
        const digits = value.replace(/[^0-9]/g, "");
        if (!digits) return null;
        const parsed = Number(digits);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      };

      const cards = Array.from(document.querySelectorAll("[class*='tupleWrapper___']"));
      const results = cards.map((card) => {
        const areaRow = text(card, "[class*='areaRow___']");
        // "Baga · Resort" — locality and property type share one row.
        const [area, propertyType] = (areaRow ?? "").split("·").map((part) => clean(part));
        const ratingValue = text(card, "[class*='ratingValue___']");
        const ratingCount = text(card, "[class*='ratingCount___']");

        return {
          name: text(card, "[class*='hotelName___']") ?? "",
          area: area || null,
          proximity: text(card, "[class*='proximityText___']"),
          price: money(text(card, "[class*='priceRow___']")),
          originalPrice: money(text(card, "[class*='struckPrice___']")),
          taxes: money(text(card, "[class*='taxText___']")),
          rating: ratingValue ? Number(ratingValue) : null,
          reviewCount: ratingCount ? Number(ratingCount.replace(/[^0-9]/g, "")) : null,
          propertyType: propertyType || null,
          badges: Array.from(card.querySelectorAll("[class*='uspTag___']"))
            .map((tag) => clean((tag as HTMLElement).innerText))
            .filter((label) => label.length > 0 && label.length < 40),
        };
      });

      const body = clean(document.body?.innerText);
      const found = body.match(/([\d,]+)\s+propert(?:y|ies)\s+found/i)?.[1];

      return {
        results: results.filter((row) => row.name.length > 0 && row.price !== null),
        propertyCount: found ? Number(found.replace(/,/g, "")) : null,
      };
    });
  }
}
