import { NextResponse } from "next/server";
import { deleteTodo, getTodo, toggleTodo } from "../../_store";

export async function GET(_req, { params }) {
  const { id } = await params;
  const todo = getTodo(Number(id));
  if (!todo) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ todo });
}

export async function PATCH(_req, { params }) {
  const { id } = await params;
  const todo = toggleTodo(Number(id));
  if (!todo) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ todo });
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  const ok = deleteTodo(Number(id));
  // BUG-SEED: retorna 200 mesmo quando o id não existe (deveria ser 404)
  if (!ok) return NextResponse.json({ ok: false, message: "nada para deletar" }, { status: 200 });
  return NextResponse.json({ ok: true });
}
