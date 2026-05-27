import { NextResponse } from "next/server";
import { listCoupons, getCoupon } from "../_store";
import { isCouponValid } from "../../lib/pricing";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const c = getCoupon(code);
    if (!c) return NextResponse.json({ error: "coupon not found" }, { status: 404 });
    return NextResponse.json({ coupon: c, valid: isCouponValid(c) });
  }
  return NextResponse.json({ coupons: listCoupons() });
}
