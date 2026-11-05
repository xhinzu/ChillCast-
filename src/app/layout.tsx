import React from "react";
import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Nunito,
  Newsreader,
  Arimo,
  Nunito_Sans,
  Jost,
  Playfair_Display,
} from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/context/AuthContext";
import type { Profile } from "@/types/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const interFont = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const nunitoFont = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const newsreaderFont = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const arimoFont = Arimo({
  variable: "--font-arimo",
  subsets: ["latin"],
});

const nunitoSansFont = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

const jostFont = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

const playfairFont = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChillCast — Ambient Lo-Fi & Music Player",
  description: "Personal music sanctuary blending ambient lo-fi soundscapes, live synced lyrics, YouTube, and Spotify.",
  icons: {
    icon: "/myujiku-logo.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialUser = null;
  let initialProfile: Profile | null = null;

  try {
    const supabase = await createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      initialUser = user;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        initialProfile = (profile as Profile) || null;
      }
    }
  } catch {
    // Guest mode fallback
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${interFont.variable} ${nunitoFont.variable} ${newsreaderFont.variable} ${arimoFont.variable} ${nunitoSansFont.variable} ${jostFont.variable} ${playfairFont.variable} h-full antialiased bg-black`}
    >
      <body className="h-screen w-screen overflow-hidden bg-black text-white flex flex-col antialiased">
        <AuthProvider
          initialUser={initialUser}
          initialProfile={initialProfile}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL}
          supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
