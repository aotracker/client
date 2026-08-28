import { NextResponse } from "next/server";
import { jsonError, parseJsonBody } from "@/lib/api-route";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { verifyAdminRequest } from "@/lib/auth/admin";
import {
  applyFeedFilterPatch,
  parseFeedFilters,
} from "@/lib/discord-feed-shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const feeds = await db
      .select({
        id: schema.discordFeeds.id,
        discordGuildId: schema.discordFeeds.discordGuildId,
        feedType: schema.discordFeeds.feedType,
        targetName: schema.discordFeeds.targetName,
        region: schema.discordFeeds.region,
        channelId: schema.discordFeeds.channelId,
        filters: schema.discordFeeds.filters,
        enabled: schema.discordFeeds.enabled,
        updatedAt: schema.discordFeeds.updatedAt,
        serverName: schema.discordServers.name,
      })
      .from(schema.discordFeeds)
      .leftJoin(
        schema.discordServers,
        eq(schema.discordFeeds.discordGuildId, schema.discordServers.discordGuildId)
      )
      .orderBy(desc(schema.discordFeeds.updatedAt))
      .limit(100);

    return NextResponse.json({
      feeds: feeds.map((feed) => ({
        ...feed,
        filters: parseFeedFilters(feed.filters),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load Discord feeds",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = await parseJsonBody<{
    id?: string;
    filters?: {
      minFame?: number | null;
      minSilver?: number | null;
      contentTypes?: string[] | null;
      paused?: boolean | null;
      minPlayers?: number | null;
      createThread?: boolean | null;
    };
  }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  try {
    if (!body.id) {
      return jsonError("Missing feed id", 400);
    }

    const existing = await db.query.discordFeeds.findFirst({
      where: eq(schema.discordFeeds.id, body.id),
    });
    if (!existing) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    const next = applyFeedFilterPatch(
      parseFeedFilters(existing.filters),
      body.filters ?? {}
    );

    const [updated] = await db
      .update(schema.discordFeeds)
      .set({ filters: next, updatedAt: new Date() })
      .where(eq(schema.discordFeeds.id, body.id))
      .returning();

    return NextResponse.json({
      feed: updated
        ? { ...updated, filters: parseFeedFilters(updated.filters) }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update feed",
      },
      { status: 500 }
    );
  }
}
