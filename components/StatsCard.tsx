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
    <Card className={cn('glass overflow-hidden relative group border-white/20 transition-all duration-300 hover:shadow-xl rounded-2xl', className)}>
      <CardHeader className='flex flex-row justify-between items-center pb-2 px-6 pt-6'>
        <CardTitle className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>{title}</CardTitle>
        <div className='w-2 h-2 rounded-full bg-primary animate-pulse' />
      </CardHeader>
      <div className='px-6 pb-6'>
        <p className='text-5xl font-black text-primary tracking-tighter'>
          {value}
        </p>
      </div>
      <div className='absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors' />
    </Card>
  );
}

export function StatsLoadingCard() {
  return (
    <Card className='glass h-[120px] rounded-2xl'>
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
