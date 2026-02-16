import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agentbase - WordPress for AI',
  description: 'Build AI-first applications effortlessly with Agentbase',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}
