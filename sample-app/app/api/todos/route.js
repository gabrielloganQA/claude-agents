import { NextResponse } from "next/server";
import { createTodo, listTodos } from "../_store";

export async function GET() {
  return NextResponse.json({ todos: listTodos() });
}

export async function POST(req) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type deve ser application/json" },
      { status: 415 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const text = body?.text;
  if (typeof text !== "string" || text.trim() === "") {
    return NextResponse.json({ error: "text é obrigatório e não pode ser vazio" }, { status: 400 });
  }
  const todo = createTodo(text);
  return NextResponse.json({ todo }, { status: 201 });
}
