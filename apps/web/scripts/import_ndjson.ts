import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

type CrawlItem = {
  source_url: string;
  source_domain: string;
  name?: string | null;
  headline?: string | null;
  bio?: string | null;
  subjects?: string[];
  languages?: string[];
  price?: string | null;
  location?: string | null;
  raw_text?: string | null;
  metadata?: Record<string, unknown>;
};

function fingerprintFor(item: CrawlItem) {
  // simple URL-based fingerprint for now
  return `${item.source_domain}|${item.source_url}`.toLowerCase();
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node --import tsx scripts/import_ndjson.ts <path_to_ndjson>");
    process.exit(1);
  }

  const abs = path.resolve(file);
  const lines = fs.readFileSync(abs, "utf-8").split("\n").filter(Boolean);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const line of lines) {
    const item = JSON.parse(line) as CrawlItem;

    if (!item.source_url || !item.source_domain) {
      skipped++;
      continue;
    }

    const url = item.source_url;
    const domain = item.source_domain;
    const fp = fingerprintFor(item);

    const source = await prisma.rawSource.upsert({
      where: { url },
      update: { domain },
      create: { url, domain },
    });

    const existing = await prisma.stagedMentor.findUnique({
      where: { fingerprint: fp },
      select: { id: true, status: true },
    });

    if (!existing) {
      await prisma.stagedMentor.create({
        data: {
          sourceId: source.id,
          status: "NEW",
          name: item.name ?? null,
          headline: item.headline ?? null,
          bio: item.bio ?? null,
          rawJson: JSON.parse(JSON.stringify(item)) as Prisma.InputJsonValue,
          fingerprint: fp,
        },
      });
      created++;
      continue;
    }

    await prisma.stagedMentor.update({
      where: { id: existing.id },
      data: {
        sourceId: source.id,
        status:
          existing.status === "REVIEWING" || existing.status === "APPROVED"
            ? existing.status
            : "NEW",
        name: item.name ?? null,
        headline: item.headline ?? null,
        bio: item.bio ?? null,
        rawJson: JSON.parse(JSON.stringify(item)) as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
    updated++;
  }

  console.log(`Imported: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
