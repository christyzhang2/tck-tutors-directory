import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

function formatMode(mode: string | null) {
  if (!mode) return "Not set";
  if (mode === "in-person") return "In-person";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export default async function MentorProfilePage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const { id } = await Promise.resolve(params);

  const mentor = await prisma.mentor.findUnique({
    where: { id },
    include: { mentorTags: { include: { tag: true } } },
  });

  if (!mentor) return notFound();

  const tags = mentor.mentorTags.map((mt) => mt.tag);
  const grouped = tags.reduce<Record<string, string[]>>((acc, t) => {
    acc[t.type] ??= [];
    acc[t.type].push(t.label);
    return acc;
  }, {});

  const order = ["LANGUAGE", "CURRICULUM", "SUBJECT", "HERITAGE", "TCK_MARKER", "INTEREST"];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/mentors" className="text-sm text-gray-600 hover:underline">
        ← Back to mentors
      </Link>

      <h1 className="mt-4 text-3xl font-semibold">{mentor.name}</h1>
      {mentor.headline ? <p className="mt-2 text-gray-700">{mentor.headline}</p> : null}

      <div className="mt-3 text-sm text-gray-500">
        {[mentor.city, mentor.country].filter(Boolean).join(", ")}
        {mentor.timezone ? ` · ${mentor.timezone}` : ""}
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-zinc-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Cultural Bridge Fit
          </div>
          <div className="mt-2 text-lg font-medium text-gray-900">
            {mentor.culturalBridgeFit ?? "Not set"}
          </div>
        </div>
        <div className="rounded-xl border bg-zinc-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Teen Rapport
          </div>
          <div className="mt-2 text-lg font-medium text-gray-900">
            {mentor.teenRapport ?? "Not set"}
          </div>
        </div>
      </section>

      {mentor.bio ? (
        <section className="mt-6">
          <h2 className="text-lg font-medium">About</h2>
          <p className="mt-2 whitespace-pre-line text-gray-800">{mentor.bio}</p>
        </section>
      ) : null}

      <section className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="text-lg font-medium">Teaching Details</h2>
        <div className="mt-3 text-sm text-gray-700">
          <span className="font-medium text-gray-900">Teaching Mode:</span> {formatMode(mentor.mode)}
        </div>
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-900">Qualifications</div>
          <p className="mt-2 whitespace-pre-line text-sm text-gray-700">
            {mentor.qualifications ?? "Not set"}
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-medium">Tags</h2>
        <div className="mt-3 space-y-4">
          {order.filter((k) => grouped[k]?.length).map((k) => (
            <div key={k}>
              <div className="text-xs font-semibold text-gray-500">{k.replace("_", " ")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {grouped[k].map((label) => (
                  <span key={`${k}-${label}`} className="rounded-full border px-2 py-1 text-xs">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
