import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Filters from "./Filters";

export default async function MentorsPage({
  searchParams,
}: {
  searchParams?: { q?: string; lang?: string | string[]; sub?: string | string[] } | Promise<any>;
}) {
  const sp = await Promise.resolve(searchParams ?? {});
  const query = (sp.q ?? "").trim();

  const lang = Array.isArray(sp.lang) ? sp.lang : sp.lang ? [sp.lang] : [];
  const sub = Array.isArray(sp.sub) ? sp.sub : sp.sub ? [sp.sub] : [];
  console.log("SEARCH q =", query);
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

  // ...rest of your component


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
        {mentors.map((m) => (
          <Link
            key={m.id}
            href={`/mentors/${m.id}`}
            className="rounded-xl border p-4 shadow-sm hover:shadow transition"
          >
            <div className="text-lg font-medium">{m.name}</div>
            {m.headline && (
              <div className="text-sm text-gray-600 mt-1">
                {m.headline}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {m.mentorTags.map((mt) => (
                <span
                  key={mt.tag.id}
                  className="text-xs border px-2 py-1 rounded-full"
                >
                  {mt.tag.label}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}