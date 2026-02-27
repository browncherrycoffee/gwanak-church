import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAuthToken } from "@/lib/auth";
import { checkRateLimit, recordFailedAttempt, resetAttempts } from "@/lib/rate-limit";

const COOKIE_NAME = "gwanak-auth";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const MAX_PASSWORD_LENGTH = 200;

function getClientIp(headerStore: Headers): string {
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const headerStore = await headers();
  const ip = getClientIp(headerStore);

  // Rate limiting check
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `너무 많은 시도입니다. ${rateCheck.retryAfterSeconds}초 후 다시 시도하세요.` },
      { status: 429 },
    );
  }

  // Parse body safely
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const { password } = (body && typeof body === "object" ? body : {}) as { password?: string };

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: "서버 설정 오류" },
      { status: 500 },
    );
  }

  // Input validation
  if (!password || typeof password !== "string" || password.length > MAX_PASSWORD_LENGTH) {
    recordFailedAttempt(ip);
    await delay(1000);
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  if (password !== adminPassword) {
    recordFailedAttempt(ip);
    await delay(1000);
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  // Success
  resetAttempts(ip);
  const token = await createAuthToken();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
