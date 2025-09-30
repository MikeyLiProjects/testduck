"use client";

import { useState } from "react";

export default function ImageSearch() {
    const [query, setQuery] = useState("");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError("");
        setImageUrl(null);

        try {
            const response = await fetch(
                `/api/search-images?q=${encodeURIComponent(query)}`
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to search images");
            }

            setImageUrl(data.imageUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">
                    Image Search
                </h1>
                <p className="text-gray-600">
                    Search for images using DuckDuckGo
                </p>
            </div>

            <div className="flex gap-4 mb-8 justify-center">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your search term..."
                    className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                    onClick={handleSearch}
                    disabled={isLoading || !query.trim()}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? "Searching..." : "Search"}
                </button>
            </div>

            {error && (
                <div className="text-center mb-6">
                    <p className="text-red-500 bg-red-50 p-4 rounded-lg">
                        {error}
                    </p>
                </div>
            )}

            {isLoading && (
                <div className="text-center mb-6">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-600">
                        Searching for images...
                    </p>
                </div>
            )}

            {imageUrl && (
                <div className="flex justify-center">
                    <div className="max-w-md">
                        <img
                            src={imageUrl}
                            alt="Search result"
                            className="w-full h-auto rounded-lg shadow-lg"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src =
                                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YWFhYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=";
                            }}
                        />
                        <div className="mt-4 text-center">
                            <a
                                href={imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 underline"
                            >
                                View Image URL
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {!isLoading && !error && !imageUrl && !query && query && (
                <div className="text-center">
                    <p className="text-gray-500">
                        No image found for &quot;{query}&quot;
                    </p>
                </div>
            )}
        </div>
    );
}
