import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MaxWell | AI Rural Healthcare Assistant",
  description:
    "Triage-first AI assistant for rural healthcare: intake, urgency, hospitals, and referral notes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k";

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en">
        <body
          className={`${sora.variable} ${jetBrainsMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
