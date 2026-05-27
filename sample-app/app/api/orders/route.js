import { NextResponse } from "next/server";
import { createOrder, listOrders, getCoupon, getSession } from "../_store";
import { calculateTotal, isCouponValid } from "../../lib/pricing";

export async function GET(request) {
  const token = request.cookies.get("session")?.value;
  const session = token ? getSession(token) : null;
  const all = listOrders();
  if (session) {
    return NextResponse.json({ orders: all });
  }
  return NextResponse.json({ orders: all });
}

export async function POST(request) {
  if (request.headers.get("content-type") !== "application/json") {
    return NextResponse.json({ error: "expected application/json" }, { status: 415 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { items, couponCode, customerEmail } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  let coupon = null;
  if (couponCode) {
    coupon = getCoupon(couponCode);
    if (coupon && !isCouponValid(coupon)) {
      coupon = null;
    }
  }

  const totals = calculateTotal({ items, coupon });

  const order = createOrder({
    items,
    customerEmail,
    couponCode: coupon?.code || null,
    ...totals,
  });

  return NextResponse.json({ order }, { status: 201 });
}
