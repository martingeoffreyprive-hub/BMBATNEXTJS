import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BM BAT Manager",
  description: "Application de gestion BTP - Devis, Factures, Rapports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
