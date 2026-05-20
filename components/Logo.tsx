import Image from 'next/image';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
};

// Logo originale: 1105x716 → aspect ≈ 1.54:1
function logoSize(height: number) {
  return { width: Math.round(height * (1105 / 716)), height };
}

export default function Logo({ className, size = 28, showText = true, textClassName }: LogoProps) {
  const dims = logoSize(size);
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative shrink-0" style={{ width: dims.width, height: dims.height }}>
        <Image
          src="/logo-brand.png"
          alt="Aletheia Logo"
          fill
          className="object-contain object-left"
          priority
          sizes={`${dims.width}px`}
        />
      </div>
      {showText && (
        <div>
          <h1 className={cn('text-xl font-bold tracking-tight text-foreground', textClassName)}>
            Job <span className="text-primary">Aletheia</span>
          </h1>
        </div>
      )}
    </div>
  );
}
