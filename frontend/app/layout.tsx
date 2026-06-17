import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono, Open_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const Open_Sansfont = Open_Sans({
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'SpeakUP',
  description: 'Practice Languages Through Real Conversations',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className='dark'>
      <body className={`${Open_Sansfont.className} antialiased bg-black`}>
        <ClerkProvider>
          {children}
          <Toaster/>
        </ClerkProvider>
      </body>
    </html>
  )
}