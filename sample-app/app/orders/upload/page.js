"use client";

import { useState } from "react";

export default function UploadPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function upload(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const form = new FormData(e.target);
    const r = await fetch("/api/orders/upload", { method: "POST", body: form });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(d.error || `falha no upload (${r.status})`);
      return;
    }
    setResult(d.order);
  }

  return (
    <main>
      <h1>Upload de pedido (XML)</h1>
      <p>Envie um arquivo XML com a estrutura esperada de pedido.</p>

      <form onSubmit={upload} encType="multipart/form-data">
        <input type="file" name="file" data-testid="file-input" />
        <button type="submit" data-testid="upload-submit">
          Enviar
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: "crimson" }} data-testid="upload-error">
          {error}
        </p>
      )}

      {result && (
        <section data-testid="upload-result" style={{ marginTop: 16 }}>
          <h2>Pedido #{result.id} criado</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
