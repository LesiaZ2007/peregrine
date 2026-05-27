import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata = {
  title: "Peregrine — Find Your Cheapest Flight",
  description:
    "Smart flight search with price predictions, multi-destination comparison, layover discovery, and real-time price monitoring.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={jakarta.variable} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
        <ToastProvider>
        <Nav />
        <main style={{ flex: 1 }}>{children}</main>
        <footer style={{
          background: "var(--navy)",
          color: "rgba(255,255,255,.5)",
          textAlign: "center",
          padding: "20px",
          fontSize: "13px",
          fontWeight: 500,
        }}>
          © {new Date().getFullYear()} Peregrine · Find your flight, not just a price
        </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
