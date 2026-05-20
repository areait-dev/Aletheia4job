import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

type StatsCardsProps = {
  title: string;
  value: number;
  className?: string;
};

function StatsCards({ title, value, className }: StatsCardsProps) {
  return (
    <Card className={cn('glass-card overflow-hidden relative group transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 rounded-3xl', className)}>
      <CardHeader className='flex flex-row justify-between items-center pb-2 px-6 pt-6'>
        <CardTitle className='text-xs font-bold text-muted-foreground uppercase tracking-widest'>{title}</CardTitle>
        <div className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50 ring-1 ring-emerald-400/30' />
      </CardHeader>
      <div className='px-6 pb-6'>
        <p className='text-5xl font-black text-primary tracking-tighter group-hover:scale-105 origin-left transition-transform duration-300 [text-shadow:0_2px_8px_hsl(184_100%_29%_/_0.15)]'>
          {value}
        </p>
      </div>
      <div className='absolute -right-6 -bottom-6 w-32 h-32 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500' />
      <div className='absolute inset-0 rounded-3xl ring-1 ring-white/40 dark:ring-white/5 pointer-events-none' />
    </Card>
  );
}

export function StatsLoadingCard() {
  return (
    <Card className='glass-card h-[120px] rounded-2xl'>
      <CardHeader className='flex flex-row justify-between items-center'>
        <Skeleton className='h-4 w-[120px]' />
        <Skeleton className='h-4 w-4 rounded-full' />
      </CardHeader>
      <div className='px-6'>
        <Skeleton className='h-12 w-[80px]' />
      </div>
    </Card>
  );
}

export default StatsCards;
