import { getSiteSettings } from "@/lib/settings";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: {
      template: `%s | ${settings.site_name}`,
      default: `${settings.site_name} — Student Success OS`,
    },
    description:
      "The all-in-one platform for students to find scholarships, track applications, build their college portfolio, and earn income.",
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} overflow-x-hidden`}>
      <body className="font-sans antialiased overflow-x-hidden w-full max-w-full m-0 p-0">{children}</body>
    </html>
  );
}
