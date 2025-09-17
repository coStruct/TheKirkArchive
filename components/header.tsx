'use client'

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Search, Plus } from 'lucide-react'

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Charlie Kirk Archive
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/search" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <Search size={20} />
              <span className="hidden sm:inline">Search</span>
            </Link>

            <SignedIn>
              <Link href="/submit" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <Plus size={20} />
                <span className="hidden sm:inline">Submit</span>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </nav>
      </div>
    </header>
  )
}