import { NextResponse } from "next/server";
import {
  getExpectedOpsSecret,
  isOpsAuthDisabled,
  opsCookieOptions,
} from "@/lib/jobs/cron-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const secret = getExpectedOpsSecret();

  if (isOpsAuthDisabled()) {
    return NextResponse.redirect(new URL("/status", request.url));
  }

  if (!secret || key !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const opts = opsCookieOptions(secret);
  const res = NextResponse.redirect(new URL("/status", request.url));
  res.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: opts.maxAge,
  });
  return res;
}
