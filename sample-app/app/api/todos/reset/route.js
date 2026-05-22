import { NextResponse } from "next/server";
import { listTodos, _resetForTests } from "../../_store";

// Bloqueia POST em produção pra evitar wipe acidental de dados reais
// (a store é em memória, mas a intenção semântica permanece).
const PROD = process.env.NODE_ENV === "production" && process.env.ALLOW_RESET !== "1";

export async function GET() {
  return NextResponse.json({ count: listTodos().length });
}

export async function POST() {
  if (PROD) {
    return NextResponse.json(
      { error: "reset desabilitado em produção. Defina ALLOW_RESET=1 pra forçar." },
      { status: 403 },
    );
  }
  _resetForTests();
  return NextResponse.json({ ok: true, count: 0 });
}
