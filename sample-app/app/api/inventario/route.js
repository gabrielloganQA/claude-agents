import { NextResponse } from "next/server";
import { createInventario, listInventarios } from "./_store";

export async function GET() {
  return NextResponse.json({ inventarios: listInventarios() });
}

export async function POST(req) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type deve ser application/json" },
      { status: 415 },
    );
  }
  const body = await req.json().catch(() => ({}));

  // BUG API-1 (proposital): só verifica se data tem o campo, mas aceita string vazia.
  // Cliente "tira proveito" da validação só visual, mas a API engole.
  if (!("deposito" in body) || !("data" in body)) {
    return NextResponse.json({ error: "deposito e data são obrigatórios" }, { status: 400 });
  }

  const inv = createInventario({
    almoxarifado: body.almoxarifado || null,
    deposito: body.deposito,  // pode vir string vazia — bug intencional
    data: body.data,
    tipo: body.tipo || "Geral",
  });
  return NextResponse.json({ inventario: inv }, { status: 201 });
}
