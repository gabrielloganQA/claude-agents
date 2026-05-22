import { NextResponse } from "next/server";
import { ALMOXARIFADOS, DEPOSITOS, TIPOS } from "../_store";

export async function GET() {
  return NextResponse.json({
    almoxarifados: ALMOXARIFADOS,
    depositos: DEPOSITOS,
    tipos: TIPOS,
  });
}
