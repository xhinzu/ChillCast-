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
  title: "Chillify — Ambient Lo-Fi & Music Player",
  description: "Spotify-inspired music player blending ambient lo-fi soundscapes, live synced lyrics, YouTube, and Spotify.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${interFont.variable} ${nunitoFont.variable} ${newsreaderFont.variable} ${arimoFont.variable} ${nunitoSansFont.variable} ${jostFont.variable} ${playfairFont.variable} h-full antialiased bg-black`}
    >
      <body className="h-screen w-screen overflow-hidden bg-black text-white flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
