import "dotenv/config";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type EnrichmentResult = {
  name_clean: string | null;
  name_confidence: "high" | "medium" | "low";
  subjects: string[];
  languages: string[];
  location: string | null;
  price: string | null;
  heritage_markers: { score: number; signals: string[] };
  bicultural_signals: { score: number; signals: string[] };
  teen_rapport: { score: number; signals: string[] };
  notes: string[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function looksLikeBadName(name: string | null | undefined) {
  if (!name) return true;
  const n = name.toLowerCase();
  return (
    n.includes("javascript is disabled") ||
    n.includes("enable javascript") ||
    n.length > 40
  );
}

async function enrichWithGPT(text: string): Promise<EnrichmentResult | null> {
  const prompt = `
You are extracting structured tutor profile data from messy scraped text.

Return ONLY valid JSON with this exact schema:

{
  "name_clean": "string or null",
  "name_confidence": "high | medium | low",
  "subjects": ["string"],
  "languages": ["string"],
  "location": "string or null",
  "price": "string or null",
  "heritage_markers": { "score": 0-10, "signals": ["string"] },
  "bicultural_signals": { "score": 0-10, "signals": ["string"] },
  "teen_rapport": { "score": 0-10, "signals": ["string"] },
  "notes": ["string"]
}

Rules:
- If the tutor's real name is unclear, set name_clean to null.
- Do not guess aggressively.
- Subjects and languages should be concise normalized strings.
- Scores should be conservative.
- notes should be short and practical.

Tutor profile text:
${text}
`;

  const response = await openai.responses.create({
    model: "gpt-5-mini",
    input: prompt,
  });

  const output = response.output_text?.trim();
  if (!output) return null;

  try {
    return JSON.parse(output) as EnrichmentResult;
  } catch {
    return null;
  }
}

async function main() {
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : 5;

  const mentors = await prisma.stagedMentor.findMany({
    where: {
      status: "NEW",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  let processed = 0;
  let skipped = 0;
  let errored = 0;

  for (const mentor of mentors) {
    const raw = mentor.rawJson as any;
    const text = raw?.raw_text || raw?.bio || mentor.bio || "";

    const lowerName = (mentor.name || "").toLowerCase();
    const lowerText = (text || "").toLowerCase();

    if (
      lowerName.includes("javascript is disabled") ||
      lowerText.includes("javascript is disabled") ||
      lowerText.includes("enable javascript")
    ) {
      console.log(`[SKIP_JUNK] ${mentor.id} ${mentor.name}`);
      skipped++;
      continue;
    }

    if (!text || text.length < 80) {
      console.log(`[SKIP_THIN] ${mentor.id} ${mentor.name}`);
      skipped++;
      continue;
    }

    try {
      const enrichment = await enrichWithGPT(text);

      if (!enrichment) {
        console.log(`[ERROR_PARSE] ${mentor.id}`);
        errored++;
        continue;
      }

      const updatedRaw = {
        ...raw,
        enrichment,
      };

      await prisma.stagedMentor.update({
        where: { id: mentor.id },
        data: {
          rawJson: updatedRaw as any,
          name:
            enrichment.name_confidence === "high" &&
            enrichment.name_clean &&
            !looksLikeBadName(enrichment.name_clean)
              ? enrichment.name_clean
              : mentor.name,
        },
      });

      processed++;
      console.log(`[ENRICHED] ${mentor.id} -> ${enrichment.name_clean}`);
    } catch (e) {
      console.log("[ERROR]", mentor.id, e);
      errored++;
    }

    await sleep(1500);
  }

  console.log(
    `Done. processed=${processed} skipped=${skipped} errored=${errored}`
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
  