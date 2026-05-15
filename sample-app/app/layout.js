export const metadata = {
  title: "TODO App (sample)",
  description: "Aplicação de exemplo testada pelos agentes QA/Dev",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
        {children}
      </body>
    </html>
  );
}
