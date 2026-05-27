import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export function parseOrderXml(xmlString) {
  const parsed = parser.parse(xmlString);
  const order = parsed.order || {};
  const itemsRaw = order.items?.item;
  const items = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw ? [itemsRaw] : [];
  return {
    customer: order.customer || null,
    items: items.map((it) => ({
      sku: it.sku,
      name: it.name,
      price: Number(it.price),
      quantity: Number(it.quantity),
    })),
    coupon: order.coupon || null,
  };
}
