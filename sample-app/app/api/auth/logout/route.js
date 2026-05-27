import { NextResponse } from "next/server";
import { deleteSession } from "../../_store";

export async function POST(request) {
  const token = request.cookies.get("session")?.value;
  if (token) deleteSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("session");
  return res;
}
