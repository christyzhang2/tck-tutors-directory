import { PrismaClient, TagType } from "@prisma/client";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function upsertTag(type: TagType, label: string) {
  return prisma.tag.upsert({
    where: { type_label: { type, label } },
    update: {},
    create: { type, label },
  });
}

async function main() {
  // Tags (you can expand later)
  const tags = {
    languages: await Promise.all([
      upsertTag(TagType.LANGUAGE, "English (Fluent)"),
      upsertTag(TagType.LANGUAGE, "Mandarin (Native)"),
      upsertTag(TagType.LANGUAGE, "Japanese (Native)"),
      upsertTag(TagType.LANGUAGE, "Korean (Native)"),
    ]),
    subjects: await Promise.all([
      upsertTag(TagType.SUBJECT, "IB Math"),
      upsertTag(TagType.SUBJECT, "IB Physics"),
      upsertTag(TagType.SUBJECT, "IGCSE English"),
      upsertTag(TagType.SUBJECT, "AP Calculus"),
      upsertTag(TagType.SUBJECT, "AP Chemistry"),
    ]),
    curriculum: await Promise.all([
      upsertTag(TagType.CURRICULUM, "IB"),
      upsertTag(TagType.CURRICULUM, "IGCSE"),
      upsertTag(TagType.CURRICULUM, "AP"),
    ]),
    heritage: await Promise.all([
      upsertTag(TagType.HERITAGE, "Japan / International School"),
      upsertTag(TagType.HERITAGE, "Korea / International School"),
      upsertTag(TagType.HERITAGE, "China / International School"),
      upsertTag(TagType.HERITAGE, "Taiwan / International School"),
      upsertTag(TagType.HERITAGE, "Hong Kong / International School"),
    ]),
    interests: await Promise.all([
      upsertTag(TagType.INTEREST, "Anime"),
      upsertTag(TagType.INTEREST, "Gaming"),
      upsertTag(TagType.INTEREST, "K-pop"),
      upsertTag(TagType.INTEREST, "Coding"),
    ]),
    tck: await Promise.all([
      upsertTag(TagType.TCK_MARKER, "Third Culture Kid"),
      upsertTag(TagType.TCK_MARKER, "Returnee"),
      upsertTag(TagType.TCK_MARKER, "Bilingual Home"),
    ]),
  };

  const mentorDefs = [
    {
      name: "Aiko S.",
      headline: "IB Math mentor (Tokyo/HK). Calm, structured, teen-friendly.",
      bio: "International school alum (IB). Helps students bridge parent expectations with practical study systems. Explains in English/Japanese.",
      city: "Tokyo",
      country: "Japan",
      timezone: "Asia/Tokyo",
      culturalBridgeFit: "Strong",
      teenRapport: "Strong",
      tagLabels: ["IB", "IB Math", "English (Fluent)", "Japanese (Native)", "Japan / International School", "Anime", "Third Culture Kid"],
    },
    {
      name: "Min-jun K.",
      headline: "AP Calculus + Physics coach (Seoul). High-rigor, clear steps.",
      bio: "Korean international school background. Good at ‘code-switching’ between strict parent goals and teen motivation.",
      city: "Seoul",
      country: "South Korea",
      timezone: "Asia/Seoul",
      culturalBridgeFit: "Strong",
      teenRapport: "Moderate",
      tagLabels: ["AP", "AP Calculus", "IB Physics", "English (Fluent)", "Korean (Native)", "Korea / International School", "Gaming", "Returnee"],
    },
    // add 13 more (keep it simple—variety matters more than perfection)
  ];

  // wipe old seeded mentors (optional)
  // await prisma.mentorTag.deleteMany();
  // await prisma.mentor.deleteMany();

  for (const m of mentorDefs) {
    const mentor = await prisma.mentor.create({
      data: {
        name: m.name,
        headline: m.headline,
        bio: m.bio,
        city: m.city,
        country: m.country,
        timezone: m.timezone,
        culturalBridgeFit: m.culturalBridgeFit,
        teenRapport: m.teenRapport,
      },
    });

    const tagRecords = await prisma.tag.findMany({
      where: { label: { in: m.tagLabels } },
    });

    await prisma.mentorTag.createMany({
      data: tagRecords.map((t) => ({ mentorId: mentor.id, tagId: t.id })),
      skipDuplicates: true,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
