import { NextResponse } from "next/server";
import { getOrder } from "../../_store";

export async function GET(_request, { params }) {
  const { id } = await params;
  const order = getOrder(Number(id));
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ order });
}
