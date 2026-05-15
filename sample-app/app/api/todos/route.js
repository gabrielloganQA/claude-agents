import { NextResponse } from "next/server";
import { createTodo, listTodos } from "../_store";

export async function GET() {
  return NextResponse.json({ todos: listTodos() });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const text = body?.text;
  if (typeof text !== "string") {
    return NextResponse.json({ error: "text é obrigatório" }, { status: 400 });
  }
  const todo = createTodo(text);
  return NextResponse.json({ todo }, { status: 201 });
}

// BUG #3 (proposital): /api/todos/reset não existe — quem chamar leva 404,
// e a suite de testes tenta usar para isolar cenários.
