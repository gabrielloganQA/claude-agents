export const metadata = {
  title: "TOOD App (samplee)",
  description: "Aplicaçao de exemplo testada pelos agentes QA/Dev",
};

export default function RootLayout({ children }) {
  return (
    // BUG-SEED: removido lang="pt-BR" — viola WCAG 3.1.1 (Language of Page)
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
        {children}
      </body>
    </html>
  );
}
