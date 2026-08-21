import { env } from "../../config/env";
import { isTransientHttpError, retry } from "../retry";

const BASE_URL = "https://commons.wikimedia.org/w/api.php";

export class WikimediaCommonsClientError extends Error {
  readonly status?: number;
  readonly payload?: unknown;

  constructor(message: string, details: { status?: number; payload?: unknown } = {}) {
    super(message);
    this.name = "WikimediaCommonsClientError";
    if (details.status !== undefined) this.status = details.status;
    if (details.payload !== undefined) this.payload = details.payload;
  }
}

export interface WikimediaImage {
  /** Commons file title, e.g. `File:Taj Mahal at sunset.jpg`. */
  title: string;
  /** A thumbnail URL at (approximately) the requested search width. */
  url: string;
  /** The Commons file description page, for attribution. */
  pageUrl?: string;
  width?: number;
  height?: number;
  attribution?: string;
  license?: string;
}

export interface RawImageInfo {
  url?: string;
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  width?: number;
  height?: number;
  descriptionurl?: string;
  mime?: string;
  extmetadata?: {
    Artist?: { value?: string };
    LicenseShortName?: { value?: string };
  };
}

export interface RawPage {
  title?: string;
  missing?: string;
  imageinfo?: RawImageInfo[];
}

interface QueryResponse {
  query?: {
    pages?: Record<string, RawPage>;
  };
}

/** Strips HTML tags Commons embeds in extmetadata fields (e.g. an `<a>` around the artist name). */
function stripHtml(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const text = value.replace(/<[^>]*>/g, "").trim();
  return text || undefined;
}

function pagesOf(response: QueryResponse): RawPage[] {
  const pages = response.query?.pages;
  if (!pages) return [];
  return Object.values(pages).filter((page) => !page.missing);
}

export function toWikimediaImage(page: RawPage): WikimediaImage | undefined {
  const title = page.title;
  const info = page.imageinfo?.[0];
  const url = info?.thumburl ?? info?.url;
  if (!title || !url) return undefined;
  if (info?.mime && !info.mime.startsWith("image/")) return undefined;

  const width = info?.thumbwidth ?? info?.width;
  const height = info?.thumbheight ?? info?.height;
  const attribution = stripHtml(info?.extmetadata?.Artist?.value);
  const license = stripHtml(info?.extmetadata?.LicenseShortName?.value);

  return {
    title,
    url,
    ...(info?.descriptionurl ? { pageUrl: info.descriptionurl } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(attribution ? { attribution } : {}),
    ...(license ? { license } : {}),
  };
}

export class WikimediaCommonsClient {
  private readonly userAgent = env.WIKIMEDIA_USER_AGENT;

  /**
   * Searches Commons' File namespace for images matching `query`, ranked by
   * relevance. `filetype:bitmap` keeps results to photographs rather than the
   * SVGs/PDFs/audio Commons search can otherwise surface.
   */
  async searchImages(query: string, limit: number): Promise<WikimediaImage[]> {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: `filetype:bitmap ${query}`,
      gsrlimit: String(limit),
      prop: "imageinfo",
      iiprop: "url|extmetadata|size|mime",
      iiurlwidth: "1200",
      format: "json",
    });

    const response = await this.get<QueryResponse>(params, `Wikimedia Commons search "${query}"`);
    return pagesOf(response)
      .map(toWikimediaImage)
      .filter((image): image is WikimediaImage => Boolean(image));
  }

  /** Resolves a Commons file title to a thumbnail URL at the given width. */
  async resolveImageUrl(fileTitle: string, width: number): Promise<string | undefined> {
    const params = new URLSearchParams({
      action: "query",
      titles: fileTitle,
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: String(width),
      redirects: "1",
      format: "json",
    });

    const response = await this.get<QueryResponse>(params, `Wikimedia Commons photo ${fileTitle}`);
    const info = pagesOf(response)[0]?.imageinfo?.[0];
    return info?.thumburl ?? info?.url;
  }

  private async get<T>(params: URLSearchParams, label: string): Promise<T> {
    return retry(() => this.getOnce<T>(params), { label, isRetryable: isTransientHttpError });
  }

  private async getOnce<T>(params: URLSearchParams): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}?${params.toString()}`, {
        method: "GET",
        headers: { "User-Agent": this.userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(env.EXTERNAL_API_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new WikimediaCommonsClientError(`Wikimedia Commons timed out after ${env.EXTERNAL_API_TIMEOUT_MS}ms.`);
      }
      throw new WikimediaCommonsClientError(`Wikimedia Commons request failed: ${(error as Error).message}`);
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new WikimediaCommonsClientError("Wikimedia Commons returned invalid JSON.", {
          status: response.status,
          payload: text,
        });
      }
    }

    if (!response.ok) {
      throw new WikimediaCommonsClientError("Wikimedia Commons request failed.", { status: response.status, payload });
    }

    return (payload ?? {}) as T;
  }
}
