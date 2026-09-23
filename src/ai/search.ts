import { GoogleGenAI } from "@google/genai";
import {
  getAllPackages,
  getAllHotels,
  getPackageById,
  formatPackageOut,
  getPackageRatingSummary,
} from "../db/index.ts";
import type { Package, Hotel } from "../db/index.ts";

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

export interface AISearchResult {
  query: string;
  matched_package_ids: number[];
  summary: string;
  criteria_detected: {
    budget?: string | null;
    theme?: string | null;
    destination?: string | null;
    travel_style?: string | null;
  };
  match_reasons: Record<string, string>;
  packages: any[];
  source: "gemini" | "semantic_engine";
}

/**
 * Intelligent heuristic fallback matcher if Gemini is unavailable, offline, or rate-limited.
 * Guarantees zero downtime and consistent testability.
 */
export function semanticSearchFallback(
  query: string,
  packagesList: Package[],
  hotels: Hotel[]
): AISearchResult {
  const lower = query.toLowerCase();
  const hotelMap = new Map(hotels.map(h => [h.id, h]));

  // 1. Detect budget constraints
  let maxPrice: number | null = null;
  const priceMatches = lower.match(/(?:under|below|less than|max|budget of|under\s*\$|\$)\s*(\d{3,5})/i);
  if (priceMatches && priceMatches[1]) {
    maxPrice = parseInt(priceMatches[1], 10);
  } else if (lower.includes("cheap") || lower.includes("budget") || lower.includes("affordable")) {
    maxPrice = 1400;
  }

  // 2. Detect style/theme
  let theme: string | null = null;
  let styleCategory: string | null = null;

  if (
    lower.includes("beach") ||
    lower.includes("island") ||
    lower.includes("sea") ||
    lower.includes("ocean") ||
    lower.includes("coastal") ||
    lower.includes("tropical")
  ) {
    styleCategory = "Beach & Islands";
    theme = "Beach & Coastal Getaway";
  } else if (
    lower.includes("culture") ||
    lower.includes("heritage") ||
    lower.includes("history") ||
    lower.includes("temple") ||
    lower.includes("pyramid") ||
    lower.includes("ancient") ||
    lower.includes("historic")
  ) {
    styleCategory = "Cultural & Heritage";
    theme = "Cultural & Historical Exploration";
  } else if (
    lower.includes("winter") ||
    lower.includes("snow") ||
    lower.includes("ski") ||
    lower.includes("glacier") ||
    lower.includes("alpine") ||
    lower.includes("mountain") ||
    lower.includes("aurora") ||
    lower.includes("northern lights")
  ) {
    styleCategory = "Alpine & Winter";
    theme = "Alpine & Winter Excursions";
  } else if (
    lower.includes("modern") ||
    lower.includes("city") ||
    lower.includes("metropolis") ||
    lower.includes("skyline") ||
    lower.includes("shopping") ||
    lower.includes("broadway")
  ) {
    styleCategory = "Modern Metropolises";
    theme = "Urban & Modern City Escapes";
  } else if (lower.includes("nature") || lower.includes("wildlife") || lower.includes("safari")) {
    styleCategory = "Nature & Wildlife";
    theme = "Nature & Wildlife Adventures";
  } else if (lower.includes("romantic") || lower.includes("honeymoon") || lower.includes("couple")) {
    theme = "Romantic Honeymoon Escapes";
  }

  // 3. Filter packages
  const scoredPackages: { pkg: Package; score: number; reason: string }[] = [];

  for (const pkg of packagesList) {
    let score = 0;
    const reasons: string[] = [];
    const pkgDestLower = pkg.destination.toLowerCase();
    const pkgNameLower = pkg.name.toLowerCase();
    const pkgDescLower = pkg.description.toLowerCase();

    // Destination match
    const destTokens = pkgDestLower.split(/[,\s]+/).filter(t => t.length > 2);
    for (const t of destTokens) {
      if (lower.includes(t)) {
        score += 5;
        reasons.push(`matches destination ${pkg.destination}`);
        break;
      }
    }

    // Budget match
    if (maxPrice !== null) {
      if (pkg.price <= maxPrice) {
        score += 3;
        reasons.push(`priced at $${pkg.price.toFixed(2)} (within $${maxPrice} budget)`);
      } else {
        // Exceeds explicit budget
        score -= 10;
      }
    }

    // Theme & style match
    if (styleCategory) {
      const isBeach = ["maldives", "santorini", "amalfi", "bali"].some(d => pkgDestLower.includes(d));
      const isCulture = ["rome", "cairo", "barcelona", "kyoto"].some(d => pkgDestLower.includes(d));
      const isWinter = ["switzerland", "iceland", "reykjavik"].some(d => pkgDestLower.includes(d));
      const isCity = ["tokyo", "dubai", "singapore", "new york"].some(d => pkgDestLower.includes(d));
      const isNature = ["cape town", "bali", "switzerland"].some(d => pkgDestLower.includes(d));

      if (
        (styleCategory === "Beach & Islands" && isBeach) ||
        (styleCategory === "Cultural & Heritage" && isCulture) ||
        (styleCategory === "Alpine & Winter" && isWinter) ||
        (styleCategory === "Modern Metropolises" && isCity) ||
        (styleCategory === "Nature & Wildlife" && isNature)
      ) {
        score += 4;
        reasons.push(`features ${styleCategory} itinerary highlights`);
      }
    }

    if (theme === "Romantic Honeymoon Escapes") {
      if (["santorini", "paris", "maldives", "amalfi"].some(d => pkgDestLower.includes(d))) {
        score += 4;
        reasons.push("renowned romantic destination with scenic ocean/city vistas");
      }
    }

    // Ratings check
    const ratingSummary = getPackageRatingSummary(pkg.id);
    if (lower.includes("top rated") || lower.includes("rating") || lower.includes("best") || lower.includes("luxury")) {
      if (ratingSummary.rating >= 4.7) {
        score += 2;
        reasons.push(`high traveler rating of ${ratingSummary.rating}★`);
      }
    }

    // Keyword matches in description
    const keywords = ["temple", "pyramid", "glacier", "mountain", "beach", "caldera", "lagoon", "eiffel", "museum"];
    for (const kw of keywords) {
      if (lower.includes(kw) && (pkgDescLower.includes(kw) || pkgNameLower.includes(kw))) {
        score += 2;
        reasons.push(`includes ${kw} experiences`);
      }
    }

    if (score > 0) {
      const hotel = hotelMap.get(pkg.hotel_id);
      const compositeReason = reasons.length > 0
        ? `${pkg.name} in ${pkg.destination} ${reasons.join(", ")} at ${hotel?.name || "top resort"}.`
        : `${pkg.name} in ${pkg.destination} matches your request ($${pkg.price.toFixed(2)}).`;
      scoredPackages.push({ pkg, score, reason: compositeReason });
    }
  }

  // Sort by score descending
  scoredPackages.sort((a, b) => b.score - a.score);

  const matchedItems = scoredPackages.slice(0, 4);
  const matchedIds = matchedItems.map(item => item.pkg.id);
  const matchReasons: Record<string, string> = {};
  matchedItems.forEach(item => {
    matchReasons[item.pkg.id] = item.reason;
  });

  const formattedPackages = matchedItems.map(item =>
    formatPackageOut(item.pkg, hotelMap.get(item.pkg.hotel_id))
  );

  let summary = "";
  if (matchedItems.length > 0) {
    const names = matchedItems.map(m => m.pkg.name).slice(0, 2).join(" and ");
    summary = `Found ${matchedItems.length} curated package${matchedItems.length > 1 ? "s" : ""} matching your search for "${query}". Top recommendations include ${names}.`;
  } else {
    summary = `No packages closely matched your specific filters for "${query}". Try broadening your price range or exploring our 16 global destinations.`;
  }

  return {
    query,
    matched_package_ids: matchedIds,
    summary,
    criteria_detected: {
      budget: maxPrice ? `Up to $${maxPrice}` : null,
      theme,
      travel_style: styleCategory,
    },
    match_reasons: matchReasons,
    packages: formattedPackages,
    source: "semantic_engine",
  };
}

/**
 * Primary Natural Language Search using Gemini API with fallback resilience.
 */
export async function searchPackagesWithAI(query: string, customPackagesList?: Package[]): Promise<AISearchResult> {
  const packagesList = customPackagesList || await getAllPackages();
  const hotels = await getAllHotels();
  const hotelMap = new Map(hotels.map(h => [h.id, h]));

  const ai = getGenAI();

  if (ai) {
    try {
      const catalogSummary = packagesList
        .map(p => {
          const h = hotelMap.get(p.hotel_id);
          const r = getPackageRatingSummary(p.id);
          return `ID: ${p.id} | Name: "${p.name}" | Destination: ${p.destination} | Hotel: ${h?.name || "Resort"} | Price: $${p.price} | Departure: ${p.available_date} | Rating: ${r.rating}★ (${r.count} reviews) | Details: ${p.description}`;
        })
        .join("\n");

      const systemInstruction = `You are TourGuide AI, the intelligent search engine for the Tourist Management System.
Analyze the user's natural language search query and select the matching tour packages from the provided catalog.
Carefully evaluate destination, budget/price constraints (e.g. 'under $1500'), travel style (beach, cultural, winter/alpine, city, romantic, luxury), departure dates, and traveler ratings.

Current Package Catalog:
${catalogSummary}

Respond ONLY with a JSON object in this exact schema:
{
  "matched_package_ids": [number],
  "summary": "1-2 sentence overview of why these packages match the user request",
  "criteria_detected": {
    "budget": "string or null",
    "theme": "string or null",
    "destination": "string or null",
    "travel_style": "string or null"
  },
  "match_reasons": {
    "<packageId>": "1 concise sentence explaining specifically why this package fits the user's criteria"
  }
}
If no packages fit the criteria, return an empty array for matched_package_ids and explain why in summary.`;

      const geminiCall = ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: query.trim(),
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      // 3.5s timeout guard to prevent stalling
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
      const response = await Promise.race([geminiCall, timeoutPromise]);

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed && Array.isArray(parsed.matched_package_ids)) {
          const matchedIds: number[] = parsed.matched_package_ids;
          const matchedPackages: Package[] = [];
          for (const id of matchedIds) {
            const p = await getPackageById(Number(id));
            if (p) matchedPackages.push(p);
          }

          const formatted = matchedPackages.map(p =>
            formatPackageOut(p, hotelMap.get(p.hotel_id))
          );

          return {
            query,
            matched_package_ids: matchedIds,
            summary: parsed.summary || `Found ${formatted.length} packages tailored to your request.`,
            criteria_detected: parsed.criteria_detected || {},
            match_reasons: parsed.match_reasons || {},
            packages: formatted,
            source: "gemini",
          };
        }
      }
    } catch (err: any) {
      console.warn("Gemini natural language search encountered an error, activating semantic engine:", err?.message || err);
    }
  }

  // Fallback to high-accuracy local semantic engine
  return semanticSearchFallback(query, packagesList, hotels);
}
