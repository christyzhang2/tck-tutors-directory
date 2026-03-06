import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const url = "https://example.com/tutor/aiko";
  const domain = "example.com";

  const source = await prisma.rawSource.upsert({
    where: { url },
    update: { domain },
    create: { url, domain, title: "Example Tutor Profile" },
  });

  await prisma.stagedMentor.create({
    data: {
      sourceId: source.id,
      status: "NEW",
      name: "Aiko S. (staged)",
      headline: "IB Math mentor (Tokyo). Calm, structured, teen-friendly.",
      bio: "International school alum (IB). Great at bridging parent expectations and teen motivation.",
      city: "Tokyo",
      country: "Japan",
      timezone: "Asia/Tokyo",
      rawJson: {
        extractedAt: new Date().toISOString(),
        sample: true,
        fields: {
          name: "Aiko S.",
          curriculum: ["IB"],
          subjects: ["IB Math"],
          languages: ["English", "Japanese"],
        },
      },
      fingerprint: "example.com|aiko",
    },
  });

  console.log("Staged 1 mentor ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
