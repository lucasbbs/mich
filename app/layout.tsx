import "./globals.css";
import cx from "classnames";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { inter, sfPro } from "./fonts";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Word Grid Studio - Admin",
  description:
    "Create and manage puzzle grids with numbered clues, hints, and custom layouts.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cx(
          sfPro.variable,
          inter.variable,
          "bg-slate-50 text-slate-900 antialiased",
        )}
      >
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-5xl px-6 py-12">{children}</div>
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
