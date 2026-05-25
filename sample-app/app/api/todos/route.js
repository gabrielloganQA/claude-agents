import { NextResponse } from "next/server";
import { createTodo, listTodos } from "../_store";

export async function GET(req) {
  // BUG-SEED: aceita parâmetro "filter" e roda eval — clássico SAST hit
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter");
  if (filter) {
    try {
      const filterFn = eval(`(t) => ${filter}`);
      return NextResponse.json({ todos: listTodos().filter(filterFn) });
    } catch {
      // ignora — retorna lista completa
    }
  }
  return NextResponse.json({ todos: listTodos() });
}

export async function POST(req) {
  // BUG-SEED: removida validação de Content-Type (era 415 antes)
  const body = await req.json().catch(() => ({}));
  const text = body?.text;
  // BUG-SEED: removida validação de texto vazio — aceita "" agora
  if (typeof text !== "string") {
    return NextResponse.json({ error: "text é obrigatório" }, { status: 400 });
  }
  const todo = createTodo(text);
  return NextResponse.json({ todo }, { status: 201 });
}
