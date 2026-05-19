"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { publishToBroadbeanAction, unpublishFromBroadbeanAction } from "@/utils/actions";
import { Globe, Loader2, X, ExternalLink } from "lucide-react";

export default function BroadbeanSection({
  jobId,
  broadbeanStatus,
  broadbeanError,
}: {
  jobId: string;
  broadbeanStatus: string | null;
  broadbeanError: string | null;
}) {
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);

  const publishMutation = useMutation({
    mutationFn: () => publishToBroadbeanAction(jobId),
    onSuccess: (data) => {
      if (data.success && data.widgetUrl) {
        setWidgetUrl(data.widgetUrl);
      }
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishFromBroadbeanAction(jobId),
  });

  const status = broadbeanStatus || "NOT_SENT";

  return (
    <>
      <div className="glass rounded-3xl p-6 space-y-4 border border-primary/10">
        <h3 className="font-bold flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" /> Broadbean Multiposting
        </h3>

        {status === "PUBLISHED" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/10 rounded-lg px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              Pubblicato su Broadbean
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => unpublishMutation.mutate()}
              disabled={unpublishMutation.isPending}
            >
              {unpublishMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rimozione in corso...</>
              ) : (
                "Rimuovi dai portali"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              variant="default"
              className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Pubblicazione in corso...</>
              ) : (
                <><ExternalLink className="w-4 h-4 mr-2" /> Pubblica su Job Board (Broadbean)</>
              )}
            </Button>
            {status === "ERROR" && broadbeanError && (
              <div className="text-xs text-red-500 bg-red-500/10 rounded-lg p-3 leading-relaxed break-words">
                {broadbeanError}
              </div>
            )}
          </div>
        )}
      </div>

      {widgetUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-background rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h3 className="font-bold text-lg">Seleziona i portali su Broadbean</h3>
              <button
                onClick={() => setWidgetUrl(null)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <iframe
                src={widgetUrl}
                className="w-full h-[600px] rounded-b-3xl"
                title="Broadbean Widget"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
