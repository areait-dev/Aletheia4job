'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Briefcase } from 'lucide-react';

export default function JobFilterSelector({ jobs }: { jobs: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleJobChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('jobId', value);
    } else {
      params.delete('jobId');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const currentJobId = searchParams.get('jobId') || 'all';

  return (
    <div className="flex items-center gap-2">
      <Briefcase className="w-4 h-4 text-muted-foreground" />
      <Select value={currentJobId} onValueChange={handleJobChange}>
        <SelectTrigger className="w-[250px] glass border-none rounded-xl">
          <SelectValue placeholder="Filtra per Posizione" />
        </SelectTrigger>
        <SelectContent className="glass border-border/50 rounded-xl">
          <SelectItem value="all">Tutte le posizioni</SelectItem>
          {jobs.map((job) => (
            <SelectItem key={job.id} value={job.id}>
              {job.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
