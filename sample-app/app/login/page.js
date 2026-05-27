"use client";

import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [me, setMe] = useState({ name: "Convidado" });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setMe(d.user);
      });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.error || "falha no login");
      return;
    }
    const d = await r.json();
    setMe(d.user);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe({ name: "Convidado" });
  }

  return (
    <main>
      <h1>Login</h1>
      <p data-testid="greeting">Olá, {me.name}</p>

      {me.id ? (
        <button onClick={logout} data-testid="logout">
          Sair
        </button>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
          <input
            data-testid="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            data-testid="password"
            type="password"
            placeholder="senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            data-testid="name"
            placeholder="nome (se primeiro acesso)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" data-testid="submit-login">
            Entrar
          </button>
        </form>
      )}

      {error && (
        <p role="alert" style={{ color: "crimson" }} data-testid="login-error">
          {error}
        </p>
      )}
    </main>
  );
}
