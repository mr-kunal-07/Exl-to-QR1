import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "QRCode By KodX",
  description: "Excel to QR Generator",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <main className="flex-1">{children}</main>

        <footer className="text-center py-4 mt-0 border-t border-slate-600 text-lg text-slate-500">
          © {new Date().getFullYear()} All rights reserved by KodX.in
        </footer>
      </body>
    </html>
  );
}
