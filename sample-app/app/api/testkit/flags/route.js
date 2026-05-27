import { NextResponse } from "next/server";
import { listFlags, setFlag } from "../../../lib/flags";

export async function GET() {
  return NextResponse.json({ flags: listFlags() });
}

export async function POST(request) {
  const { name, value } = await request.json();
  setFlag(name, value);
  return NextResponse.json({ flags: listFlags() });
}
