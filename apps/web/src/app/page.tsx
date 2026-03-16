import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-20">
      <div className="mx-auto max-w-4xl rounded-3xl border bg-white p-10 shadow-sm">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            TCK Tutors Directory
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
            Find mentors who can bridge cultures and connect with globally mobile teens.
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-600">
            Browse the live mentor directory or submit your own mentor profile for review.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/mentors"
            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Browse Mentors
          </Link>
          <Link
            href="/apply"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
          >
            Apply as a Mentor
          </Link>
        </div>
      </div>
    </main>
  );
}
