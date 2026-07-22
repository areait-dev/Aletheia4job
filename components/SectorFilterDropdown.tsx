'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SectorFilterDropdown({
  sectors,
  activeSector,
}: {
  sectors: string[];
  activeSector?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full border border-border bg-white/70 dark:bg-background/70 backdrop-blur-sm hover:border-primary/30 transition-all duration-200"
      >
        <span className="text-muted-foreground">Settore:</span>
        <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">
          {activeSector ?? 'Tutti'}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-56 rounded-2xl border border-border bg-white/95 dark:bg-background/95 backdrop-blur-md shadow-xl shadow-black/5 py-1.5 max-h-72 overflow-y-auto">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center justify-between px-4 py-2 text-xs font-medium hover:bg-primary/5 transition-colors',
              !activeSector ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            Tutti
            {!activeSector && <Check className="w-3.5 h-3.5" />}
          </Link>
          {sectors.map(s => (
            <Link
              key={s}
              href={`/?sector=${encodeURIComponent(s)}`}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center justify-between px-4 py-2 text-xs font-medium hover:bg-primary/5 transition-colors',
                activeSector === s ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {s}
              {activeSector === s && <Check className="w-3.5 h-3.5" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
