import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { approveStagedMentor, rejectStagedMentor } from "./actions";

export default async function StagedMentorsAdminPage() {
  const items = await prisma.stagedMentor.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { source: true },
    take: 200,
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Staged Mentors</h1>
          <p className="text-sm text-gray-600">
            Review crawled/extracted entries before publishing to the live directory.
          </p>
        </div>
        <Link href="/mentors" className="text-sm text-gray-600 hover:underline">
          ← Back to directory
        </Link>
      </div>

      <div className="space-y-3">
        {items.map((m) => (
          <div key={m.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">
                {m.name ?? <span className="text-gray-500">(no name yet)</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border px-2 py-1 text-xs">
                  {m.status}
                </span>
                <form action={approveStagedMentor.bind(null, m.id)}>
                  <button
                    type="submit"
                    disabled={m.status === "APPROVED" || m.status === "REJECTED"}
                    className="rounded-md border border-green-300 px-3 py-1 text-xs font-medium text-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectStagedMentor.bind(null, m.id)}>
                  <button
                    type="submit"
                    disabled={m.status === "APPROVED" || m.status === "REJECTED"}
                    className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>

            {m.headline ? <div className="mt-1 text-sm text-gray-700">{m.headline}</div> : null}
            <div className="mt-2 text-xs text-gray-500">
              Source: {m.source.domain} ·{" "}
              <a className="underline" href={m.source.url} target="_blank" rel="noreferrer">
                open
              </a>
            </div>

            {m.bio ? (
              <div className="mt-3 text-sm text-gray-800 line-clamp-3">
                {m.bio}
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-500">(no bio extracted)</div>
            )}
          </div>
        ))}

        {items.length === 0 ? (
          <div className="rounded-xl border p-6 text-gray-600">
            Nothing staged yet. Next step is to crawl pages into this table.
          </div>
        ) : null}
      </div>
    </main>
  );
}
