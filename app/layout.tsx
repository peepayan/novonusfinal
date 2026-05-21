import type { Metadata } from "next";
import {
  Inter,
  Inter_Tight,
  Geist_Mono,
  Inclusive_Sans,
  Cinzel,
  Space_Grotesk,
  Orbitron,
  Stack_Sans_Notch,
  DM_Sans,
  Kode_Mono,
} from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

/* TT Norms Pro — self-hosted, Light + Medium + Bold weights, WOFF2 for
   smallest payload. Outside /public so the licensed files aren't
   served as raw static assets. */
const ttNormsPro = localFont({
  src: [
    {
      path: "./fonts/TTNormsPro-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/TTNormsPro-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/TTNormsPro-DemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/TTNormsPro-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/TTNormsPro-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-tt-norms-pro",
  display: "swap",
});

/* TT Norms Pro Expanded — distinct subfamily with wider proportions.
   Drives the main Somatic Layer heading. */
const ttNormsProExpanded = localFont({
  src: "./fonts/TTNormsProExpanded-Bold.woff2",
  variable: "--font-tt-norms-pro-expanded",
  display: "swap",
  weight: "700",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/* Inter Tight — the typeface redbud.vc uses for body + headings.
   Loaded as a variable font so any weight 100–900 is available. */
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
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

/* Robotic, geometric display face — iconic sci-fi / aerospace feel.
   Drives the main Somatic Layer heading. */
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

/* Stack Sans Notch — display sans with notched detailing, designed by
   Koto for Stack Overflow. Drives the hero heading. */
const stackSansNotch = Stack_Sans_Notch({
  variable: "--font-stack-sans-notch",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

/* DM Sans — geometric sans with low contrast, slightly condensed.
   Currently driving the hero heading. */
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

/* Kode Mono — single typeface in the Delta Robotics style.
   Pipes through every other font variable via globals.css so the
   whole page renders in this monospace without touching call sites. */
const kodeMono = Kode_Mono({
  variable: "--font-kode-mono",
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
      className={`${inter.variable} ${interTight.variable} ${geistMono.variable} ${inclusiveSans.variable} ${cinzel.variable} ${spaceGrotesk.variable} ${orbitron.variable} ${ttNormsPro.variable} ${ttNormsProExpanded.variable} ${stackSansNotch.variable} ${dmSans.variable} ${kodeMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink text-paper" suppressHydrationWarning>{children}</body>
    </html>
  );
}
