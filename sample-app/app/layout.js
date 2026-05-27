import Link from "next/link";

export const metadata = {
  title: "Sample App",
  description: "Aplicação de exemplo testada pelos agentes QA/Dev",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          maxWidth: 800,
          margin: "2rem auto",
          padding: "0 1rem",
        }}
      >
        <nav
          data-testid="navbar"
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 24,
            paddingBottom: 12,
            borderBottom: "1px solid #ddd",
          }}
        >
          <Link href="/">TODOs</Link>
          <Link href="/orders">Pedidos</Link>
          <Link href="/orders/upload">Upload XML</Link>
          <Link href="/login">Login</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
