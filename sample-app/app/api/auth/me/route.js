import { NextResponse } from "next/server";
import { getSession, getUserById } from "../../_store";
import { verifyToken } from "../../../lib/auth";

export async function GET(request) {
  const token = request.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ user: null });

  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ user: null });

  const session = getSession(token);
  if (!session) return NextResponse.json({ user: null });

  const user = getUserById(session.userId);
  return NextResponse.json({ user });
}
