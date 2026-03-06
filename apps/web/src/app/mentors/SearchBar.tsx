"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [value, setValue] = useState(searchParams.get("q") ?? "");

  // Keep input in sync if you navigate back/forward
  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        const q = value.trim();

        if (q) params.set("q", q);
        else params.delete("q");

        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
        router.refresh(); // <-- key: forces server component to refetch
      });
    }, 250);

    return () => clearTimeout(t);
  }, [value, pathname, router, searchParams, startTransition]);

  return (
    <div className="mb-6">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search mentors by name, headline, bio…"
        className="w-full rounded-lg border px-3 py-2"
      />
      <div className="mt-1 text-xs text-gray-500">
        {isPending ? "Searching…" : "Type to search"}
      </div>
    </div>
  );
}