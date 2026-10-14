'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AREAS_CHANGED_EVENT, AREAS_SET_EVENT, TEACHER_AREAS } from '@/utils/teacherLongList';

// Indice delle aree di docenza nell'hero: selezionarle qui le preseleziona nel form.
export default function TeacherAreaIndex() {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const onChanged = (e: Event) => setSelected((e as CustomEvent<string[]>).detail ?? []);
    window.addEventListener(AREAS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(AREAS_CHANGED_EVENT, onChanged);
  }, []);

  const toggle = (area: string) => {
    const next = selected.includes(area) ? selected.filter((a) => a !== area) : [...selected, area];
    setSelected(next);
    window.dispatchEvent(new CustomEvent(AREAS_SET_EVENT, { detail: next }));
  };

  return (
    <div className="space-y-8">
      <ul className="flex flex-wrap gap-2.5 sm:gap-3">
        {TEACHER_AREAS.map((area, i) => {
          const active = selected.includes(area);
          return (
            <li
              key={area}
              className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both motion-reduce:animate-none"
              style={{ animationDelay: `${200 + i * 70}ms` }}
            >
              <button
                type="button"
                aria-pressed={active}
                onClick={() => toggle(area)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9D879] focus-visible:ring-offset-2 focus-visible:ring-offset-[#007882]',
                  active
                    ? 'bg-white border-white text-[#007882]'
                    : 'border-white/60 text-white hover:bg-white/15',
                )}
              >
                {active && <Check className="w-4 h-4" aria-hidden="true" />}
                {area}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 min-h-[3rem]" aria-live="polite">
        <a
          href="#candidatura"
          className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#007882] hover:bg-white/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9D879] focus-visible:ring-offset-2 focus-visible:ring-offset-[#007882]"
        >
          {selected.length > 0 ? 'Compila il profilo' : 'Vai al form'}
        </a>
        <span className="text-sm text-[#FFFFFF]/85">
          {selected.length === 0
            ? 'Tocca le aree in cui puoi fare docenza.'
            : selected.length === 1
              ? '1 area scelta, la ritrovi nel form.'
              : `${selected.length} aree scelte, le ritrovi nel form.`}
        </span>
      </div>
    </div>
  );
}
