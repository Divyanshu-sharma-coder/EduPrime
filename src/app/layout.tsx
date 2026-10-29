import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { EmergencyShortcut } from "@/components/emergency-shortcut";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EduPrime | Learn with purpose",
  description: "Live classes, expert teachers and a clearer path to your next milestone.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(inter.variable, playfair.variable, jetbrains.variable, "font-sans", geist.variable)}>
      <body><EmergencyShortcut />{children}</body>
    </html>
  );
}
