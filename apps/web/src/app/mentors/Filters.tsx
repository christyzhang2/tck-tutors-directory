"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  languages: string[];
  subjects: string[];
};

function toggleParam(params: URLSearchParams, key: string, value: string) {
  const values = params.getAll(key);
  if (values.includes(value)) {
    const next = values.filter((v) => v !== value);
    params.delete(key);
    next.forEach((v) => params.append(key, v));
  } else {
    params.append(key, value);
  }
}

export default function Filters({ languages, subjects }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const selectedLang = useMemo(() => new Set(sp.getAll("lang")), [sp]);
  const selectedSub = useMemo(() => new Set(sp.getAll("sub")), [sp]);

  function apply(mutator: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(sp.toString());
    mutator(p);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  }

  return (
    <div className="mb-6 space-y-4">
      <div>
        <div className="text-xs font-semibold text-gray-500 mb-2">LANGUAGES</div>
        <div className="flex flex-wrap gap-2">
          {languages.map((l) => {
            const active = selectedLang.has(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => apply((p) => toggleParam(p, "lang", l))}
                className={
                  "rounded-full border px-3 py-1 text-xs transition " +
                  (active ? "bg-black text-white" : "bg-white")
                }
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-500 mb-2">SUBJECTS</div>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => {
            const active = selectedSub.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => apply((p) => toggleParam(p, "sub", s))}
                className={
                  "rounded-full border px-3 py-1 text-xs transition " +
                  (active ? "bg-black text-white" : "bg-white")
                }
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {(selectedLang.size > 0 || selectedSub.size > 0) && (
        <button
          type="button"
          onClick={() =>
            apply((p) => {
              p.delete("lang");
              p.delete("sub");
            })
          }
          className="text-sm text-gray-600 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
