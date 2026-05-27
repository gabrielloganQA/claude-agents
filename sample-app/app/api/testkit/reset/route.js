import { NextResponse } from "next/server";
import { _resetForTests } from "../../_store";
import { resetFlags } from "../../../lib/flags";

export async function POST() {
  _resetForTests();
  resetFlags();
  return NextResponse.json({ ok: true });
}
