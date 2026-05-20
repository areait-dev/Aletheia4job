'use client';

import { useEffect, useState } from 'react';

export default function BackgroundDecorations() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Large blurred circle – top left */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-40"
        style={{
          background: 'radial-gradient(circle, hsl(184 100% 29% / 0.5) 0%, transparent 70%)',
          animation: 'float-slow 20s ease-in-out infinite',
          filter: 'blur(80px)',
        }}
      />

      {/* Large blurred circle – bottom right */}
      <div
        className="absolute -bottom-40 -right-32 w-[600px] h-[600px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, hsl(184 80% 45% / 0.35) 0%, transparent 70%)',
          animation: 'float-medium 25s ease-in-out infinite',
          filter: 'blur(100px)',
        }}
      />

      {/* Geometric diamond shape – center right */}
      <div
        className="absolute top-1/4 -right-20 w-[300px] h-[300px] opacity-25"
        style={{
          background: 'linear-gradient(135deg, hsl(184 100% 29% / 0.3), hsl(224 40% 30% / 0.15))',
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          animation: 'float-fast 15s ease-in-out infinite',
          filter: 'blur(60px)',
        }}
      />

      {/* Small blurred ellipse – top right */}
      <div
        className="absolute top-1/3 right-1/4 w-[200px] h-[100px] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, hsl(184 100% 29% / 0.25) 0%, transparent 70%)',
          animation: 'float-slow 18s ease-in-out infinite reverse',
          filter: 'blur(50px)',
          transform: 'rotate(-20deg)',
        }}
      />

      {/* Small blurred circle – bottom left */}
      <div
        className="absolute bottom-1/4 left-1/6 w-[180px] h-[180px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, hsl(224 50% 20% / 0.3) 0%, transparent 70%)',
          animation: 'float-medium 22s ease-in-out infinite 5s',
          filter: 'blur(70px)',
        }}
      />

      {/* Subtle ring shape – center left */}
      <div
        className="absolute top-1/2 left-1/3 w-[250px] h-[250px] opacity-15"
        style={{
          border: '2px solid hsl(184 80% 45% / 0.2)',
          borderRadius: '50%',
          animation: 'float-slow 30s ease-in-out infinite 2s',
          filter: 'blur(40px)',
        }}
      />

      {/* Pulsing glow – center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, hsl(184 100% 29% / 0.2) 0%, transparent 60%)',
          animation: 'pulse-glow 8s ease-in-out infinite',
          filter: 'blur(120px)',
        }}
      />
    </div>
  );
}
