import { NextResponse } from "next/server";
import { parseOrderXml } from "../../../lib/xml";
import { calculateTotal, isCouponValid } from "../../../lib/pricing";
import { createOrder, getCoupon } from "../../_store";

export async function POST(request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const xml = await file.text();
  const parsed = parseOrderXml(xml);

  let coupon = null;
  if (parsed.coupon) {
    coupon = getCoupon(parsed.coupon);
    if (coupon && !isCouponValid(coupon)) coupon = null;
  }

  const totals = calculateTotal({ items: parsed.items, coupon });

  const order = createOrder({
    items: parsed.items,
    customerEmail: parsed.customer?.email,
    couponCode: coupon?.code || null,
    source: "xml-upload",
    ...totals,
  });

  return NextResponse.json({ order }, { status: 201 });
}
