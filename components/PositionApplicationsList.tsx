"use client";

import { useQuery } from "@tanstack/react-query";
import { getSingleJobAction } from "@/utils/actions";
import Link from "next/link";
import {
  Users,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn, getScoreColor } from "@/lib/utils";
import AnalyzeAIButton from "./AnalyzeAIButton";
import ApplicationStatusSelect from "./ApplicationStatusSelect";

interface PositionApplicationsListProps {
  jobId: string;
  initialApplications: any[];
}

export default function PositionApplicationsList({
  jobId,
  initialApplications,
}: PositionApplicationsListProps) {
  const { data: job } = useQuery({
    queryKey: ["single-job", jobId],
    queryFn: () => getSingleJobAction(jobId),
    initialData: { applications: initialApplications } as any,
    refetchInterval: (query) => {
      const apps = query.state.data?.applications || [];
      const hasPending = apps.some(
        (a: any) => a.parsingStatus === "PENDING" || a.parsingStatus === "PROCESSING"
      );
      return hasPending ? 3000 : false;
    },
  });

  const applications = job?.applications || [];

  return (
    <div className="glass rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Candidature Ricevute ({applications.length})
        </h2>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Users className="w-12 h-12 text-muted-foreground/20 mx-auto" />
          <p className="text-muted-foreground">Nessuna candidatura ricevuta per questa posizione.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {applications.map((app: any) => (
            <div
              key={app.id}
              className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {app.candidate.firstName?.[0] ?? ""}
                  {app.candidate.lastName?.[0] ?? ""}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/jobs/${app.candidateId}`}
                    className="font-bold hover:text-primary transition-colors block truncate"
                  >
                    {app.candidate.firstName} {app.candidate.lastName}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-0.5">
                    <span className="truncate max-w-[120px] sm:max-w-none">
                      {app.candidate.email}
                    </span>
                    <span>•</span>
                    <span className="whitespace-nowrap">
                      {new Date(app.createdAt).toLocaleDateString("it-IT")}
                    </span>
                    {(() => {
                      const ps = app.parsingStatus;
                      if (ps === "PENDING" || ps === "PROCESSING") {
                        return (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-lg text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-400 whitespace-nowrap">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              Analisi in corso...
                            </span>
                          </>
                        );
                      }
                      if (ps === "FAILED") {
                        return (
                          <>
                            <span>•</span>
                            <span className="font-bold px-1.5 py-0.5 rounded-lg text-[10px] bg-red-100 dark:bg-red-950/30 text-red-600 border border-red-300 whitespace-nowrap">
                              Parsing Fallito
                            </span>
                          </>
                        );
                      }
                      const score = app.matchingScore ?? app.candidate.matchingScore;
                      if (score !== null && score !== undefined) {
                        return (
                          <>
                            <span>•</span>
                            <span
                              className={cn(
                                "font-bold px-1.5 py-0.5 rounded-lg text-[10px] whitespace-nowrap",
                                getScoreColor(score)
                              )}
                            >
                              {score}% Match
                            </span>
                          </>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {app.jobId && (
                  <AnalyzeAIButton candidateId={app.candidateId} jobId={app.jobId} />
                )}
                <ApplicationStatusSelect
                  applicationId={app.id}
                  currentStatus={app.status}
                />
                <Link
                  href={`/jobs/${app.candidateId}`}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
