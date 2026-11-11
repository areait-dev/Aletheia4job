import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/utils/db", () => ({ default: {}, dbUnscoped: {} }));
vi.mock("@/utils/webhooks/processIncomingApplication", () => ({ processIncomingApplication: vi.fn() }));
vi.mock("@/utils/get-linkedin-jobs", () => ({ getLinkedInJobsForOrg: vi.fn() }));

import { POST as webhookPost } from "@/app/api/webhooks/multiposting/route";
import { GET as feeds } from "@/app/api/feeds/route";
import { GET as jobsFeed } from "@/app/api/jobs/feed/route";
import { GET as linkedinFeed } from "@/app/api/linkedin-feed/route";
import { updateSession } from "@/utils/supabase/middleware";
import { isMultipostingEnabled, isMultipostingPath } from "@/utils/featureFlags";

const PATHS = ["/api/webhooks/multiposting", "/api/feeds", "/api/jobs/feed", "/api/linkedin-feed"];

describe("flag MULTIPOSTING_ENABLED", () => {
  beforeEach(() => {
    delete process.env.MULTIPOSTING_ENABLED;
  });
  afterEach(() => {
    delete process.env.MULTIPOSTING_ENABLED;
  });

  it("è spento di default e si accende solo con 'true'", () => {
    expect(isMultipostingEnabled()).toBe(false);
    process.env.MULTIPOSTING_ENABLED = "false";
    expect(isMultipostingEnabled()).toBe(false);
    process.env.MULTIPOSTING_ENABLED = "1";
    expect(isMultipostingEnabled()).toBe(false);
    process.env.MULTIPOSTING_ENABLED = "true";
    expect(isMultipostingEnabled()).toBe(true);
  });

  it("riconosce solo gli endpoint del multiposting", () => {
    PATHS.forEach((p) => expect(isMultipostingPath(p)).toBe(true));
    expect(isMultipostingPath("/api/public/jobs")).toBe(false);
    expect(isMultipostingPath("/api/webhooks/cronofy")).toBe(false);
  });

  it("spento: webhook e feed rispondono 404", async () => {
    const webhook = await webhookPost(
      new NextRequest("http://localhost/api/webhooks/multiposting", { method: "POST", body: "{}" }),
    );
    expect(webhook.status).toBe(404);
    expect((await feeds(new Request("http://localhost/api/feeds?token=x"))).status).toBe(404);
    expect((await jobsFeed(new Request("http://localhost/api/jobs/feed?token=x"))).status).toBe(404);
    expect((await linkedinFeed()).status).toBe(404);
  });

  it("spento: il middleware risponde 404 prima del login, per ogni endpoint", async () => {
    for (const p of PATHS) {
      const res = await updateSession(new NextRequest(`http://localhost${p}`));
      expect(res.status, p).toBe(404);
    }
  });

  it("acceso: il webhook è raggiungibile (senza secret risponde 401, non 404) e il middleware lo lascia passare", async () => {
    process.env.MULTIPOSTING_ENABLED = "true";
    delete process.env.MULTIPOSTING_WEBHOOK_SECRET;
    const webhook = await webhookPost(
      new NextRequest("http://localhost/api/webhooks/multiposting", { method: "POST", body: "{}" }),
    );
    expect(webhook.status).toBe(401);
    const res = await updateSession(new NextRequest("http://localhost/api/webhooks/multiposting", { method: "POST" }));
    expect(res.status).toBe(200);
  });
});
