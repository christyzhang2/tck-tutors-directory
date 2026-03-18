"use server";

import { TagType, type Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type JsonObject = Prisma.JsonObject;
type JsonValue = Prisma.JsonValue;

function toJsonObject(value: JsonValue | null | undefined): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

function getNestedObject(value: JsonObject, key: string) {
  const child = value[key];
  return child && typeof child === "object" && !Array.isArray(child) ? (child as JsonObject) : {};
}

function getString(value: JsonValue | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getStringArray(value: JsonValue | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function firstString(...values: Array<JsonValue | null | undefined>) {
  for (const value of values) {
    const normalized = getString(value);
    if (normalized) return normalized;
  }
  return null;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function scoreToSignal(value: JsonValue | null | undefined) {
  const obj = value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : null;
  const score = obj && typeof obj["score"] === "number" ? obj["score"] : null;

  if (typeof score !== "number") return null;
  if (score >= 8) return "Strong";
  if (score >= 5) return "Moderate";
  return "Emerging";
}

function normalizeMode(value: string | null) {
  if (value === "online" || value === "in-person" || value === "hybrid") {
    return value;
  }
  return null;
}

function collectTagInputs(rawJson: JsonObject): Array<{ type: TagType; label: string }> {
  const enrichment = getNestedObject(rawJson, "enrichment");
  const form = getNestedObject(rawJson, "form");

  const languages = unique([
    ...getStringArray(rawJson.languages),
    ...getStringArray(form.languages),
    ...getStringArray(enrichment.languages),
  ]);
  const subjects = unique([
    ...getStringArray(rawJson.subjects),
    ...getStringArray(form.subjects),
    ...getStringArray(enrichment.subjects),
  ]);
  const curriculum = unique([
    ...getStringArray(rawJson.curriculum),
    ...getStringArray(form.curriculum),
  ]);
  const interests = unique([
    ...getStringArray(rawJson.interests),
    ...getStringArray(form.interests),
  ]);
  const heritage = unique([
    ...getStringArray(rawJson.heritage_markers),
    ...getStringArray(getNestedObject(enrichment, "heritage_markers")["signals"]),
  ]);

  const tagGroups: Array<{ type: TagType; values: string[] }> = [
    { type: TagType.LANGUAGE, values: languages },
    { type: TagType.SUBJECT, values: subjects },
    { type: TagType.CURRICULUM, values: curriculum },
    { type: TagType.INTEREST, values: interests },
    { type: TagType.HERITAGE, values: heritage },
  ];

  return tagGroups.flatMap((group) =>
    group.values.map((label) => ({ type: group.type, label })),
  );
}

async function upsertTags(tagInputs: Array<{ type: TagType; label: string }>) {
  if (!tagInputs.length) return [];

  const dedupedInputs = unique(tagInputs.map((tag) => `${tag.type}::${tag.label}`)).map((key) => {
    const [type, label] = key.split("::");
    return { type: type as TagType, label };
  });

  return Promise.all(
    dedupedInputs.map((tagInput) =>
      prisma.tag.upsert({
        where: { type_label: { type: tagInput.type, label: tagInput.label } },
        update: {},
        create: { type: tagInput.type, label: tagInput.label },
      }),
    ),
  );
}

async function attachTagsForMentor(
  db: Prisma.TransactionClient,
  mentorId: string,
  tags: Array<{ id: string }>,
) {
  const tagIds = unique(tags.map((tag) => tag.id));
  if (!tagIds.length) return;

  await db.mentorTag.createMany({
    data: tagIds.map((tagId) => ({ mentorId, tagId })),
    skipDuplicates: true,
  });
}

async function publishMentor(
  staged: {
    id: string;
    name: string | null;
    headline: string | null;
    bio: string | null;
    city: string | null;
    country: string | null;
    timezone: string | null;
  },
  rawJson: JsonObject,
) {
  const enrichment = getNestedObject(rawJson, "enrichment");
  const form = getNestedObject(rawJson, "form");

  const name =
    firstString(
      staged.name,
      rawJson.name,
      form.name,
      enrichment.name_clean,
      rawJson.name_clean,
    ) ?? "Unnamed Mentor";
  const headline = firstString(staged.headline, rawJson.headline, form.headline);
  const bio = firstString(staged.bio, rawJson.bio, form.bio);
  const city = firstString(staged.city, rawJson.city, form.city, enrichment.location, rawJson.location);
  const country = firstString(staged.country, rawJson.country, form.country);
  const timezone = firstString(staged.timezone, rawJson.timezone, form.timezone);
  const qualifications = firstString(rawJson.qualifications, form.qualifications);
  const mode = normalizeMode(firstString(rawJson.mode, form.mode));
  const culturalBridgeFit =
    firstString(rawJson.culturalBridgeFit, form.culturalBridgeFit) ??
    scoreToSignal(enrichment.bicultural_signals);
  const teenRapport =
    firstString(rawJson.teenRapport, form.teenRapport) ??
    scoreToSignal(enrichment.teen_rapport);

  const tags = await upsertTags(collectTagInputs(rawJson));

  await prisma.$transaction(async (tx) => {
    const mentor = await tx.mentor.create({
      data: {
        name,
        headline,
        bio,
        city,
        country,
        timezone,
        qualifications,
        mode,
        culturalBridgeFit,
        teenRapport,
      },
    });

    await attachTagsForMentor(tx, mentor.id, tags);

    await tx.stagedMentor.update({
      where: { id: staged.id },
      data: { status: "APPROVED" },
    });
  });
}

export async function approveStagedMentor(stagedMentorId: string) {
  const staged = await prisma.stagedMentor.findUnique({
    where: { id: stagedMentorId },
  });

  if (!staged || staged.status === "APPROVED" || staged.status === "REJECTED") {
    revalidatePath("/admin/staged");
    return;
  }

  const rawJson = toJsonObject(staged.rawJson);
  await publishMentor(staged, rawJson);

  revalidatePath("/admin/staged");
  revalidatePath("/mentors");
}

export async function rejectStagedMentor(stagedMentorId: string) {
  const staged = await prisma.stagedMentor.findUnique({
    where: { id: stagedMentorId },
    select: { status: true },
  });

  if (!staged || staged.status === "APPROVED" || staged.status === "REJECTED") {
    revalidatePath("/admin/staged");
    return;
  }

  await prisma.stagedMentor.update({
    where: { id: stagedMentorId },
    data: { status: "REJECTED" },
  });

  revalidatePath("/admin/staged");
}
