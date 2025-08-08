import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
        return NextResponse.json(
            { error: "Query parameter is required" },
            { status: 400 }
        );
    }

    try {
        const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(
            query
        )}&form=HDRSC2&adlt=strict&setlang=en-US&mkt=en-US`;

        const allOriginsRaw = `https://api.allorigins.win/raw?url=${encodeURIComponent(
            bingUrl
        )}`;
        const allOriginsGet = `https://api.allorigins.win/get?url=${encodeURIComponent(
            bingUrl
        )}`;

        // Fire parallel requests with timeouts, take the first successful one
        const directFetch = fetchWithTimeout(
            bingUrl,
            {
                method: "GET",
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            },
            3500
        ).then((res) =>
            res.ok ? res.text() : Promise.reject(new Error("direct not ok"))
        );

        const rawFetch = fetchWithTimeout(
            allOriginsRaw,
            { method: "GET" },
            5000
        ).then((res) =>
            res.ok ? res.text() : Promise.reject(new Error("raw not ok"))
        );

        let html: string | null = null;
        try {
            html = await Promise.any([directFetch, rawFetch]);
        } catch {
            // Fallback to AllOrigins JSON
            try {
                const resJson = await fetchWithTimeout(
                    allOriginsGet,
                    { method: "GET" },
                    5000
                );
                if (resJson.ok) {
                    const data = (await resJson.json()) as {
                        contents?: string;
                    };
                    html = data?.contents || null;
                }
            } catch {
                // will handle below
            }
        }

        if (!html) {
            throw new Error("All upstream strategies failed");
        }

        const firstImageUrl =
            extractFirstBingImageUrlFast(html) ||
            extractFirstBingImageUrl(html);
        return NextResponse.json({ imageUrl: firstImageUrl || null });
    } catch (error) {
        console.error("Error searching images:", error);
        return NextResponse.json(
            { error: "Failed to search images" },
            { status: 500 }
        );
    }
}

function extractFirstBingImageUrl(html: string): string | null {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Prefer metadata from elements with "m" attribute (e.g., .iusc)
    const metaEl = (document.querySelector(".iusc[m]") ||
        document.querySelector("[m]")) as HTMLElement | null;
    if (metaEl) {
        const mAttr = metaEl.getAttribute("m");
        if (mAttr) {
            try {
                const meta = JSON.parse(mAttr);
                if (
                    typeof meta?.murl === "string" &&
                    meta.murl.startsWith("http")
                ) {
                    return meta.murl;
                }
                if (
                    typeof meta?.turl === "string" &&
                    meta.turl.startsWith("http")
                ) {
                    return meta.turl;
                }
            } catch {
                // ignore JSON parse errors
            }
        }
    }

    // Fallbacks: try common image elements
    const imgMimg = document.querySelector<HTMLImageElement>("img.mimg");
    if (imgMimg?.src && imgMimg.src.startsWith("http")) return imgMimg.src;

    const anyImg = Array.from(
        document.querySelectorAll<HTMLImageElement>("img")
    ).find((img) => {
        const src = img.getAttribute("src") || img.getAttribute("data-src");
        return !!src && /^(https?:)?\/\//.test(src);
    });
    if (anyImg) {
        const src =
            anyImg.getAttribute("src") || anyImg.getAttribute("data-src");
        if (src) return src.startsWith("//") ? `https:${src}` : src;
    }

    return null;
}

function extractFirstBingImageUrlFast(html: string): string | null {
    // Fast regex-only pass: look for murl (main) or turl (thumb) in serialized JSON
    const murlMatch = html.match(/"murl"\s*:\s*"(http[^"\\]+)"/);
    if (murlMatch?.[1]) return normalizeBingEscapes(murlMatch[1]);
    const turlMatch = html.match(/"turl"\s*:\s*"(http[^"\\]+)"/);
    if (turlMatch?.[1]) return normalizeBingEscapes(turlMatch[1]);
    return null;
}

function normalizeBingEscapes(url: string): string {
    return url
        .replace(/\\\//g, "/")
        .replace(/\\u0026/g, "&")
        .replace(/&amp;/g, "&");
}

async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number
): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}
