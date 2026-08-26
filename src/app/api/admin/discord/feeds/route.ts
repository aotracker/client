import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { verifyAdminRequest } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function parseFilters(value: unknown): {
  minFame?: number;
  minSilver?: number;
  contentTypes?: string[];
  paused?: boolean;
  minPlayers?: number;
  createThread?: boolean;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as {
    minFame?: number;
    minSilver?: number;
    contentTypes?: string[];
    paused?: boolean;
    minPlayers?: number;
    createThread?: boolean;
  };
}

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        filters: parseFilters(feed.filters),
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      filters?: {
        minFame?: number | null;
        minSilver?: number | null;
        contentTypes?: string[] | null;
        paused?: boolean | null;
        minPlayers?: number | null;
        createThread?: boolean | null;
      };
    };
    if (!body.id) {
      return NextResponse.json({ error: "Missing feed id" }, { status: 400 });
    }

    const existing = await db.query.discordFeeds.findFirst({
      where: eq(schema.discordFeeds.id, body.id),
    });
    if (!existing) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    const current = parseFilters(existing.filters);
    const next = { ...current };
    if (body.filters) {
      if ("minFame" in body.filters) {
        const value = body.filters.minFame;
        if (value && value > 0) next.minFame = value;
        else delete next.minFame;
      }
      if ("minSilver" in body.filters) {
        const value = body.filters.minSilver;
        if (value && value > 0) next.minSilver = value;
        else delete next.minSilver;
      }
      if ("contentTypes" in body.filters) {
        const types = (body.filters.contentTypes ?? []).filter(
          (type) => type === "SOLO" || type === "GROUP" || type === "ZVZ"
        );
        if (types.length > 0) next.contentTypes = types;
        else delete next.contentTypes;
      }
      if ("paused" in body.filters) {
        if (body.filters.paused) next.paused = true;
        else delete next.paused;
      }
      if ("minPlayers" in body.filters) {
        const value = body.filters.minPlayers;
        if (value && value > 0) next.minPlayers = value;
        else delete next.minPlayers;
      }
      if ("createThread" in body.filters) {
        if (body.filters.createThread) next.createThread = true;
        else delete next.createThread;
      }
    }

    const [updated] = await db
      .update(schema.discordFeeds)
      .set({ filters: next, updatedAt: new Date() })
      .where(eq(schema.discordFeeds.id, body.id))
      .returning();

    return NextResponse.json({
      feed: updated
        ? { ...updated, filters: parseFilters(updated.filters) }
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
