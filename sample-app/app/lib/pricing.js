export const TAX_RATE = 0.1;

export function lineTotal(item) {
  return item.price * item.quantity;
}

export function subtotal(items) {
  return items.reduce((sum, it) => sum + lineTotal(it), 0);
}

export function applyCoupon(subtotalValue, coupon) {
  if (!coupon) return 0;
  if (coupon.type === "percent") {
    return subtotalValue * (coupon.discount / 100);
  }
  return coupon.discount;
}

export function calcTax(subtotalValue) {
  return subtotalValue * TAX_RATE;
}

export function calculateTotal({ items, coupon }) {
  const sub = subtotal(items);
  const discount = applyCoupon(sub, coupon);
  const tax = calcTax(sub - discount);
  return {
    subtotal: sub,
    discount,
    tax,
    total: sub - discount + tax,
  };
}

export function isCouponValid(coupon) {
  if (!coupon) return false;
  return new Date(coupon.expiresAt) > new Date();
}
