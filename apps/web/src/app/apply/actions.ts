"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function parseCommaSeparated(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function submitApplication(formData: FormData) {
  const sourceUrl = "manual://apply";
  const sourceDomain = "manual_apply";
  const name = getString(formData.get("name"));
  const headline = getString(formData.get("headline"));
  const bio = getString(formData.get("bio"));
  const qualifications = getString(formData.get("qualifications"));
  const city = getString(formData.get("city"));
  const country = getString(formData.get("country"));
  const rawMode = getString(formData.get("mode"));
  const mode = ["online", "in-person", "hybrid"].includes(rawMode) ? rawMode : "online";
  const languages = parseCommaSeparated(formData.get("languages"));
  const subjects = parseCommaSeparated(formData.get("subjects"));

  if (!name || !bio) {
    redirect("/apply?error=missing_required");
  }

  const source = await prisma.rawSource.upsert({
    where: { url: sourceUrl },
    update: { domain: sourceDomain, title: "Manual Apply Submission" },
    create: {
      url: sourceUrl,
      domain: sourceDomain,
      title: "Manual Apply Submission",
    },
  });

  await prisma.stagedMentor.create({
    data: {
      status: "NEW",
      sourceId: source.id,
      name,
      headline: headline || null,
      bio,
      city: city || null,
      country: country || null,
      rawJson: {
        source: sourceDomain,
        source_url: sourceUrl,
        source_domain: sourceDomain,
        submittedAt: new Date().toISOString(),
        form: {
          name,
          headline,
          bio,
          qualifications,
          city,
          country,
          mode,
          languages,
          subjects,
        },
      },
    },
  });

  redirect("/apply?submitted=1");
}
