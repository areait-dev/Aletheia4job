'use client';

import { useQuery } from "@tanstack/react-query";
import { getAllCandidatesAction } from "@/utils/actions";
import KanbanBoard from "./KanbanBoard";
import { useSearchParams } from "next/navigation";

export default function PipelineContent() {
  const searchParams = useSearchParams();
  const sector = searchParams.get("sector") || "tutti";

  const { data, isPending } = useQuery({
    queryKey: ["candidates", "pipeline", sector],
    queryFn: () => getAllCandidatesAction({ sector, limit: 2000 }),
  });

  if (isPending) return <div className="text-muted-foreground animate-pulse text-center py-20 font-bold">Caricamento Pipeline...</div>;

  return <KanbanBoard candidates={data?.candidates || []} />;
}
