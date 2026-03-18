import Link from "next/link";
import { submitApplication } from "./actions";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams?:
    | { submitted?: string; error?: string }
    | Promise<{ submitted?: string; error?: string }>;
}) {
  const params = await Promise.resolve(searchParams ?? {});
  const submitted = params.submitted === "1";
  const hasError = params.error === "missing_required";

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/" className="text-sm text-gray-600 hover:underline">
        ← Back to home
      </Link>

      <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Apply as a Mentor</h1>
        <p className="mt-2 text-sm text-gray-600">
          Submit your profile for review. Approved mentors can be added to the public directory later.
        </p>

        {submitted ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Thanks. Your application was submitted to staging for review.
          </div>
        ) : null}

        {hasError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Name and bio are required.
          </div>
        ) : null}

        <form action={submitApplication} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Jane Kim"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="headline">
              Headline
            </label>
            <input
              id="headline"
              name="headline"
              className="w-full rounded-lg border px-3 py-2"
              placeholder="IB English mentor for globally mobile teens"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              required
              rows={6}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Tell us about your background, students you work with, and what you help with."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="qualifications">
              Qualifications
            </label>
            <textarea
              id="qualifications"
              name="qualifications"
              rows={4}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="IB graduate, 3 years tutoring experience"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="city">
                City
              </label>
              <input
                id="city"
                name="city"
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Singapore"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="country">
                Country
              </label>
              <input
                id="country"
                name="country"
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Singapore"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="mode">
              Teaching Mode
            </label>
            <select
              id="mode"
              name="mode"
              defaultValue="online"
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="online">Online</option>
              <option value="in-person">In-person</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="languages">
              Languages
            </label>
            <input
              id="languages"
              name="languages"
              className="w-full rounded-lg border px-3 py-2"
              placeholder="English, Mandarin"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="subjects">
              Subjects
            </label>
            <input
              id="subjects"
              name="subjects"
              className="w-full rounded-lg border px-3 py-2"
              placeholder="IB Math, AP Chemistry"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Submit Application
          </button>
        </form>
      </div>
    </main>
  );
}
