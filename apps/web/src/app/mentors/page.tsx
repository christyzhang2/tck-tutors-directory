import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Filters from "./Filters";

type MentorsSearchParams = {
  q?: string;
  lang?: string | string[];
  sub?: string | string[];
};

function formatMode(mode: string | null) {
  if (!mode) return null;
  if (mode === "in-person") return "In-person";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export default async function MentorsPage({
  searchParams,
}: {
  searchParams?: MentorsSearchParams | Promise<MentorsSearchParams>;
}) {
  const sp = await Promise.resolve(searchParams ?? {});
  const query = (sp.q ?? "").trim();

  const lang = Array.isArray(sp.lang) ? sp.lang : sp.lang ? [sp.lang] : [];
  const sub = Array.isArray(sp.sub) ? sp.sub : sp.sub ? [sp.sub] : [];
  const [languageTags, subjectTags] = await Promise.all([
    prisma.tag.findMany({
      where: { type: "LANGUAGE" },
      select: { label: true },
      orderBy: { label: "asc" },
    }),
    prisma.tag.findMany({
      where: { type: "SUBJECT" },
      select: { label: true },
      orderBy: { label: "asc" },
    }),
  ]);

  const languages = languageTags.map((t) => t.label);
  const subjects = subjectTags.map((t) => t.label);

  const mentors = await prisma.mentor.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { headline: { contains: query, mode: "insensitive" } },
              { bio: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(lang.length
        ? { mentorTags: { some: { tag: { type: "LANGUAGE", label: { in: lang } } } } }
        : {}),
      ...(sub.length
        ? { mentorTags: { some: { tag: { type: "SUBJECT", label: { in: sub } } } } }
        : {}),
    },
    include: { mentorTags: { include: { tag: true } } },
    take: 100,
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-6">Mentors</h1>
      <form className="mb-6 flex gap-2" method="GET" action="/mentors">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search mentors..."
          className="w-full rounded-lg border px-3 py-2"
        />
        <button type="submit" className="rounded-lg border px-4 py-2 text-sm">Search
        </button>
      </form>
      <Filters languages={languages} subjects={subjects} />

      <div className="grid gap-4 sm:grid-cols-2">
        {mentors.map((m) => {
          const location = [m.city, m.country].filter(Boolean).join(", ");
          const locationAndMode = [location, formatMode(m.mode)].filter(Boolean).join(" / ");

          return (
            <Link
              key={m.id}
              href={`/mentors/${m.id}`}
              className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow"
            >
              <div className="text-lg font-medium">{m.name}</div>
              {m.headline && (
                <div className="mt-1 text-sm text-gray-600">
                  {m.headline}
                </div>
              )}
              {locationAndMode ? (
                <div className="mt-2 text-sm text-gray-500">{locationAndMode}</div>
              ) : null}

              <div className="mt-3 grid gap-2 rounded-lg bg-zinc-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Cultural Bridge Fit</span>
                  <span className="font-medium text-gray-800">{m.culturalBridgeFit ?? "Not set"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Teen Rapport</span>
                  <span className="font-medium text-gray-800">{m.teenRapport ?? "Not set"}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {m.mentorTags.slice(0, 5).map((mt) => (
                  <span
                    key={mt.tag.id}
                    className="text-xs border px-2 py-1 rounded-full"
                  >
                    {mt.tag.label}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
