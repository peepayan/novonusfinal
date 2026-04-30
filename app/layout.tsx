import type { Metadata } from "next";
import {
  Inter,
  Geist_Mono,
  Inclusive_Sans,
  Cinzel,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const inclusiveSans = Inclusive_Sans({
  variable: "--font-inclusive",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "Novonus Somatic Control Stack | The New Industry Standard in Yard Operations",
  description:
    "Max throughput. Easy-to-use. Rapid ROI. Novonus Somatic Control Stack is the only AI-native, fully-integrated platform for the yard of the future.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} ${inclusiveSans.variable} ${cinzel.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink text-paper" suppressHydrationWarning>{children}</body>
    </html>
  );
}
