import { NextResponse } from "next/server";
import { getUserByEmail, createUser, setSession } from "../../_store";
import { hashPassword, checkPassword, signToken } from "../../../lib/auth";

export async function POST(request) {
  if (request.headers.get("content-type") !== "application/json") {
    return NextResponse.json({ error: "expected application/json" }, { status: 415 });
  }

  const body = await request.json();
  const { email, password, name } = body;

  let user = getUserByEmail(email);
  if (!user) {
    user = createUser({
      email,
      name: name || email.split("@")[0],
      passwordHash: hashPassword(password),
    });
  } else if (!checkPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const token = signToken({ userId: user.id, email: user.email });
  setSession(token, { userId: user.id, email: user.email });

  const res = NextResponse.json({ user });
  res.cookies.set("session", token, { httpOnly: true, path: "/" });
  return res;
}
