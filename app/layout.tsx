import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Animus",
  description: "Personal cognitive companion — Telegram + API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
