import type { Metadata } from "next";
import { Inter, Fraunces, Manrope } from "next/font/google";
import "./globals.css";

// Inter segue servindo só o painel (--font-inter, escopado em .admin).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Manrope é a fonte do site público (mais quente e autoral que o Inter).
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Carin · Nail Designer",
  description: "Agende seu horário. Alongamento, gel e nail art em Sorocaba.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
