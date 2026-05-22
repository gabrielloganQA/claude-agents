"use client";

import { useEffect, useState } from "react";

export default function InventarioPage() {
  const [opcoes, setOpcoes] = useState({ almoxarifados: [], depositos: [], tipos: [] });
  const [form, setForm] = useState({ almoxarifado: "", deposito: "", data: "", tipo: "Geral" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => {
    fetch("/api/inventario/opcoes")
      .then((r) => r.json())
      .then(setOpcoes);
  }, []);

  function update(field, value) {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  }

  function validate() {
    const e = {};
    if (!form.deposito) e.deposito = "Campo obrigatório";
    if (!form.data) e.data = "Campo obrigatório";
    // BUG VAL-1 (proposital): não valida que data >= hoje
    return e;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    const r = await fetch("/api/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await r.json();
    setSubmitted(data.inventario || null);
  }

  // BUG STATE-1 (proposital): retorna TODOS os depositos sempre,
  // independente do almoxarifado selecionado. Em forms reais isso filtra.
  const depositosVisiveis = opcoes.depositos;

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", fontFamily: "system-ui" }}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 32, background: "#fff" }}>
        <h1 style={{ margin: "0 0 24px 0" }}>Inventário</h1>

        <form onSubmit={onSubmit} noValidate>
          {/* Almoxarifado — opcional */}
          <div style={{ marginBottom: 20 }}>
            {/* BUG A11Y-1 (proposital): <label> sem htmlFor — não tá linkado ao input */}
            <label style={{ display: "block", marginBottom: 8 }}>Almoxarifado</label>
            <select
              id="almoxarifado"
              value={form.almoxarifado}
              onChange={(e) => update("almoxarifado", e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #d1d5db" }}
            >
              <option value="">Selecione o almoxarifado</option>
              {opcoes.almoxarifados.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>

          {/* Depósito — obrigatório */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8 }}>
              {/* BUG A11Y-4 (proposital): * vermelho como único indicador (cor é único canal) */}
              <span style={{ color: "#ef4444" }}>*</span> Depósito
            </label>
            <select
              id="deposito"
              value={form.deposito}
              onChange={(e) => update("deposito", e.target.value)}
              /* BUG A11Y-2 (proposital): falta aria-required="true" */
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 4,
                border: errors.deposito ? "1px solid #ef4444" : "1px solid #d1d5db",
              }}
            >
              <option value="">Selecione o depósito</option>
              {depositosVisiveis.map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
            {errors.deposito && (
              /* BUG A11Y-3 (proposital): erro sem role="alert" / aria-live */
              <p style={{ color: "#ef4444", margin: "4px 0 0 0", fontSize: 14 }}>
                {errors.deposito}
              </p>
            )}
          </div>

          {/* Data — obrigatório */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8 }}>
              <span style={{ color: "#ef4444" }}>*</span> Data
            </label>
            <input
              id="data"
              type="date"
              value={form.data}
              onChange={(e) => update("data", e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 4,
                border: errors.data ? "1px solid #ef4444" : "1px solid #d1d5db",
              }}
            />
            {errors.data && (
              <p style={{ color: "#ef4444", margin: "4px 0 0 0", fontSize: 14 }}>
                {errors.data}
              </p>
            )}
          </div>

          {/* Tipo — default Geral */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8 }}>Tipo de Inventário</label>
            <select
              id="tipo"
              value={form.tipo}
              onChange={(e) => update("tipo", e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #d1d5db" }}
            >
              {opcoes.tipos.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            style={{
              padding: "10px 24px",
              background: "#1e40af",
              color: "#fff",
              border: 0,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Salvar
          </button>
        </form>

        {submitted && (
          <div data-testid="success" style={{ marginTop: 24, padding: 12, background: "#d1fae5", borderRadius: 4 }}>
            Inventário #{submitted.id} criado com sucesso.
          </div>
        )}
      </div>
    </main>
  );
}
