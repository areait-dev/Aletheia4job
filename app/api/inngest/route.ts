import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processCV, processCandidateCV } from "@/inngest/functions/cv-processing";

const isDev = process.env.NODE_ENV === "development";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processCV, processCandidateCV],
  serveOrigin: isDev ? "http://127.0.0.1:3000" : undefined,
});
