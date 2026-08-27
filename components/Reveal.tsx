'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Ritardo dell'animazione in ms, utile per effetti "a cascata" su liste. */
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
  [key: string]: any;
}

// Rivela il contenuto con una piccola animazione (fade + slide-up) quando
// entra in viewport, invece che tutto insieme al caricamento della pagina.
// Usa IntersectionObserver + le utility di tailwindcss-animate già presenti
// nel progetto (niente nuove dipendenze). Rispetta prefers-reduced-motion.
export default function Reveal({ children, className, delay = 0, as: Tag = 'div', ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Comp = Tag as any;

  return (
    <Comp
      ref={ref}
      style={visible ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'transition-all duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        className
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}
