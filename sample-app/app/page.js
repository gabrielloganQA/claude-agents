"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
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
      setError("Falha ao criar TODO");
    }
  }

  async function toggle(id) {
    // Optimistic update — atualiza UI imediatamente pra o checkbox refletir
    // o estado novo antes do round-trip do fetch terminar. Sem isso, o
    // controlled component force volta pro estado antigo entre o click e a
    // resposta do servidor (Playwright check() não consegue lidar).
    setTodos((curr) => curr.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    await fetch(`/api/todos/${id}`, { method: "PATCH" });
    // re-sync com o servidor (resolve edge case de toggles concorrentes)
    load();
  }

  async function remove(id) {
    // Optimistic remove
    setTodos((curr) => curr.filter((t) => t.id !== id));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main>
      <h1>TODO App</h1>
      <p style={{ color: "#666" }}>App de exemplo para os agentes QA/Dev.</p>

      <form onSubmit={addTodo} style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          aria-label="Novo TODO"
          placeholder="O que precisa ser feito?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", fontSize: 16 }}
        />
        <button type="submit" style={{ padding: "8px 16px", fontSize: 16 }}>
          Adicionar
        </button>
      </form>

      {error && (
        <p style={{ color: "crimson" }} role="alert">
          {error}
        </p>
      )}
      {initialLoading ? (
        <p>Carregando...</p>
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
                borderBottom: "1px solid #eee",
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
              <button onClick={() => remove(t.id)} aria-label={`Remover ${t.text}`}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
