"use client";

import { useEffect, useState } from "react";

const SAMPLE_ITEMS = [
  { sku: "A1", name: "Camiseta", price: 49.9, quantity: 1 },
  { sku: "B2", name: "Caneca", price: 19.9, quantity: 2 },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState(SAMPLE_ITEMS);
  const [couponCode, setCouponCode] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [flagOn, setFlagOn] = useState(false);

  async function load() {
    const r = await fetch("/api/orders");
    const d = await r.json();
    setOrders(d.orders || []);
  }

  async function loadFlag() {
    const r = await fetch("/api/testkit/flags");
    const d = await r.json();
    setFlagOn(!!d.flags?.["nova-tela-confirmacao"]);
  }

  useEffect(() => {
    load();
    loadFlag();
  }, []);

  function updateQty(idx, qty) {
    setItems((curr) => curr.map((it, i) => (i === idx ? { ...it, quantity: Number(qty) } : it)));
  }

  async function placeOrder(e) {
    e.preventDefault();
    const r = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, couponCode, customerEmail }),
    });
    const d = await r.json();
    if (r.ok) {
      setConfirmation(d.order);
      load();
    }
  }

  return (
    <main>
      <h1>Pedidos</h1>

      <form onSubmit={placeOrder} style={{ display: "grid", gap: 12, maxWidth: 480 }}>
        <h2>Novo pedido</h2>
        {items.map((it, idx) => (
          <div
            key={it.sku}
            data-testid={`item-${it.sku}`}
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <span style={{ flex: 1 }}>
              {it.name} — R$ {it.price.toFixed(2)}
            </span>
            <input
              type="number"
              value={it.quantity}
              onChange={(e) => updateQty(idx, e.target.value)}
              data-testid={`qty-${it.sku}`}
              style={{ width: 60 }}
            />
          </div>
        ))}

        <input
          placeholder="Cupom (opcional)"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          data-testid="coupon"
        />
        <input
          placeholder="Email do cliente"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          data-testid="customer-email"
        />
        <button type="submit" data-testid="place-order">
          Fechar pedido
        </button>
      </form>

      {confirmation &&
        (flagOn ? (
          <section
            data-testid="confirmation-new"
            style={{ marginTop: 24, padding: 16, background: "#e8f5e9" }}
          >
            <h2>Pedido #{confirmation.id} confirmado!</h2>
            <p>
              Total: <strong>R$ {confirmation.total.toFixed(2)}</strong>
            </p>
            <p>Recebimento por email em instantes.</p>
          </section>
        ) : (
          <p data-testid="confirmation-old" style={{ marginTop: 16 }}>
            Pedido #{confirmation.id} criado. Total R$ {confirmation.total.toFixed(2)}.
          </p>
        ))}

      <h2 style={{ marginTop: 32 }}>Histórico</h2>
      <ul data-testid="orders-list">
        {orders.map((o) => (
          <li key={o.id} data-testid="order-row">
            #{o.id} — R$ {o.total.toFixed(2)} ({o.items.length} item(ns))
          </li>
        ))}
      </ul>
    </main>
  );
}
