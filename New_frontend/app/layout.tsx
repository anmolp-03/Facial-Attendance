import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Anmol App',
  description: 'This is a face recognition employee attendance and management system'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
