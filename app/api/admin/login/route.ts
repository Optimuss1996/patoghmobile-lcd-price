import { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  checkCredentials,
  createSessionToken,
  isAdmin,
} from "@/lib/admin-auth";

export async function GET() {
  return Response.json({ authenticated: await isAdmin() });
}

export async function POST(request: NextRequest) {
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return Response.json(
      { error: "ADMIN_USERNAME و ADMIN_PASSWORD در تنظیمات سرور تعریف نشده‌اند" },
      { status: 500 },
    );
  }
  const body = await request.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!checkCredentials(username, password)) {
    await new Promise((r) => setTimeout(r, 600)); // کند کردن حدس زدن رمز
    return Response.json({ error: "نام کاربری یا رمز عبور اشتباه است" }, { status: 401 });
  }
  const token = createSessionToken()!;
  const remember = body?.remember === true;
  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    // با «ذخیره برای ورود بعدی» ۳۰ روز می‌ماند؛ بدون آن تا بستن مرورگر
    `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${
      remember ? `; Max-Age=${ADMIN_COOKIE_MAX_AGE}` : ""
    }${isHttps ? "; Secure" : ""}`,
  );
  return res;
}

export async function DELETE() {
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
  );
  return res;
}
