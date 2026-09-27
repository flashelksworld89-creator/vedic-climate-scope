import "./globals.css";

export const metadata = { title: "Jyotish Deep Horoscope", description: "Traditional sidereal Jyotish calculation and interpretation engine" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
