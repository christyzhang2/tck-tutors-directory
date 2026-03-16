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
  const name = getString(formData.get("name"));
  const headline = getString(formData.get("headline"));
  const bio = getString(formData.get("bio"));
  const city = getString(formData.get("city"));
  const country = getString(formData.get("country"));
  const languages = parseCommaSeparated(formData.get("languages"));
  const subjects = parseCommaSeparated(formData.get("subjects"));

  if (!name || !bio) {
    redirect("/apply?error=missing_required");
  }

  const source = await prisma.rawSource.upsert({
    where: { url: "manual_apply" },
    update: { domain: "manual_apply", title: "Manual Apply Submission" },
    create: {
      url: "manual_apply",
      domain: "manual_apply",
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
        source: "manual_apply",
        submittedAt: new Date().toISOString(),
        form: {
          name,
          headline,
          bio,
          city,
          country,
          languages,
          subjects,
        },
      },
    },
  });

  redirect("/apply?submitted=1");
}
