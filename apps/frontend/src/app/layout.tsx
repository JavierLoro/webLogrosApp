import type { Metadata } from "next";
import { Anybody, DM_Sans, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
const spaceGrotesk = Space_Grotesk({ variable:"--font-space-grotesk", subsets:["latin"] });
const dmSans = DM_Sans({ variable:"--font-dm-sans", subsets:["latin"] });
const plexMono = IBM_Plex_Mono({ variable:"--font-ibm-plex-mono", subsets:["latin"], weight:["400","500","600"] });
const anybody = Anybody({ variable:"--font-anybody", subsets:["latin"], weight:["400","700","800","900"], display:"swap" });
export const metadata: Metadata = { title:{ default:"LockerBoard | El catálogo de logros de tu equipo", template:"%s | LockerBoard" }, description:"Reúne los hitos de tu equipo en una sala privada con logros y puntos definidos por vosotros." };
export default function RootLayout({ children }: Readonly<{ children:React.ReactNode }>) { return <html lang="es" className={`${spaceGrotesk.variable} ${dmSans.variable} ${plexMono.variable} ${anybody.variable}`}><body className="min-h-screen flex flex-col"><Header />{children}</body></html>; }
