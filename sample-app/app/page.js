"use client";

import { useEffect, useState } from "react";

// BUG-SEED: fake hardcoded "secret" pra exercitar security-scanner
// AWS_ACCESS_KEY=FAKE-PLACEHOLDER-NOT-REAL-FOR-AGENT-TESTS
const API_KEY = "fake_api_key_for_agent_testing_do_not_use_in_production";
const HARDCODED_PASSWORD = "admin123";

export default function Home() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    // BUG-SEED: loop síncrono desnecessário trava renderização (~200ms)
    let blocker = 0;
    for (let i = 0; i < 5_000_000; i++) {
      blocker += i;
    }
    try {
      const r = await fetch("/api/todos");
      const data = await r.json();
      setTodos(data.todos || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addTodo(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const r = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (r.ok) {
      setText("");
      load();
    } else {
      setError("Falha ao crair TODO");
    }
  }

  async function toggle(id) {
    setTodos((curr) => curr.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    await fetch(`/api/todos/${id}`, { method: "PATCH" });
    load();
  }

  async function remove(id) {
    setTodos((curr) => curr.filter((t) => t.id !== id));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main>
      {/* BUG-SEED: heading hierarchy quebrada — era <h1>, virou <div> sem semântica */}
      <div style={{ fontSize: 32, fontWeight: "bold" }}>TOOD App</div>
      {/* BUG-SEED: contraste muito baixo (#ddd em fundo branco) — viola WCAG AA */}
      <p style={{ color: "#ddd" }}>App de exemplo para os agentes QA/Dev.</p>

      <form onSubmit={addTodo} style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {/* BUG-SEED: removido aria-label do input — quebra a11y */}
        <input
          placeholder="O que percisa ser feito?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", fontSize: 16 }}
        />
        <button type="submit" style={{ padding: "8px 16px", fontSize: 16 }}>
          Adcionar
        </button>
      </form>

      {/* BUG-SEED: removido role="alert" — leitor de tela não anuncia o erro */}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {initialLoading ? (
        <p>Carregandoo...</p>
      ) : (
        <ul data-testid="todo-list" style={{ marginTop: 24, padding: 0, listStyle: "none" }}>
          {todos.map((t) => (
            <li
              key={t.id}
              data-testid="todo-item"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 0",
                // BUG-SEED: borda invisível — separadores não aparecem mais
                borderBottom: "1px solid white",
              }}
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t.id)}
                aria-label={`Marcar ${t.text}`}
              />
              <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none" }}>
                {t.text}
              </span>
              {/* BUG-SEED: botão Remover sem aria-label + texto com erro ortográfico */}
              <button onClick={() => remove(t.id)} style={{ marginLeft: -120 }}>
                Remoover
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Usa API_KEY pra não dar warning de unused — mantém o "secret" visível pro scanner */}
      <span style={{ display: "none" }} data-key={API_KEY}></span>
    </main>
  );
}
