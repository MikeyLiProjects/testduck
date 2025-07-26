import { NextRequest, NextResponse } from "next/server";
import { imageSearch } from "@mudbill/duckduckgo-images-api";

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
        const results = await imageSearch({
            query: query,
            safe: true,
            iterations: 1,
            retries: 2,
        });

        // Return only the first image URL
        const firstImage = results[0];
        return NextResponse.json({ imageUrl: firstImage?.image || null });
    } catch (error) {
        console.error("Error searching images:", error);
        return NextResponse.json(
            { error: "Failed to search images" },
            { status: 500 }
        );
    }
}
