import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

async function enrichWithOllama(text: string) {
  const prompt = `
Extract structured JSON from this tutor profile text.

Return ONLY valid JSON.

{
  "name_clean": string | null,
  "subjects": string[],
  "languages": string[],
  "location": string | null,
  "price": string | null,
  "heritage_markers": { "score": 0-10, "signals": string[] },
  "bicultural_signals": { "score": 0-10, "signals": string[] },
  "teen_rapport": { "score": 0-10, "signals": string[] }
}

Tutor profile text:
${text}
`;

  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      prompt,
      stream: false
    })
  });

  const data = await res.json();

  try {
    const clean = data.response.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

async function main() {
  const limitArg = process.argv.indexOf("--limit");
  const limit =
    limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : 5;

  const mentors = await prisma.stagedMentor.findMany({
    where: {
      status: "NEW"
    },
    take: limit
  });

  let processed = 0;
  let errored = 0;

  for (const mentor of mentors) {
    const raw = mentor.rawJson as any;

    const text = raw?.raw_text || mentor.bio || "";
    const lowerName = (mentor.name || "").toLowerCase();
    const lowerText = (text || "").toLowerCase();

  // skip obvious junk / blocked pages
    if (
        lowerName.includes("javascript is disabled") ||
        lowerText.includes("javascript is disabled") ||
        lowerText.includes("enable javascript")
    ) {
    console.log(`[SKIP_JUNK] ${mentor.id} ${mentor.name}`);
    continue;
    }

  // skip rows with too little usable content
    if (!text || text.length < 80) {
        console.log(`[SKIP_THIN] ${mentor.id} ${mentor.name}`);
        continue;
    }

    try {
      const enrichment = await enrichWithOllama(text);

      if (!enrichment) {
        errored++;
        continue;
      }

      const updatedRaw = {
        ...raw,
        enrichment
      };

      await prisma.stagedMentor.update({
        where: { id: mentor.id },
        data: {
          rawJson: updatedRaw,
          name:
            enrichment.name_clean &&
            enrichment.name_clean.length < 40
              ? enrichment.name_clean
              : mentor.name
        }
      });

      processed++;

      console.log(
        `[ENRICHED] ${mentor.id} → ${enrichment.name_clean}`
      );
    } catch (e) {
      errored++;
      console.log("[ERROR]", mentor.id, e);
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(
    `Done. processed=${processed} errored=${errored}`
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });