'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/header'
import EntryCard from '@/components/entry-card'
import { EntryWithRelations } from '@/types/database'
import { useAuth } from '@clerk/nextjs'
import { Search } from 'lucide-react'

function SearchContent() {
  const searchParams = useSearchParams()
  const { userId } = useAuth()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [entries, setEntries] = useState<EntryWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/entries?q=${encodeURIComponent(query)}&status=verified`)
      const data = await response.json()
      setEntries(data)
    } catch (error) {
      console.error('Error searching entries:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialQuery = searchParams.get('q')
    if (initialQuery) {
      setQuery(initialQuery)
      handleSearch()
    }
  }, [])

  const handleVote = async (entryId: string, voteType: 'upvote' | 'downvote') => {
    if (!userId) {
      alert('Please sign in to vote')
      return
    }

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entry_id: entryId, vote_type: voteType }),
      })

      if (response.ok) {
        handleSearch()
      } else if (response.status === 429) {
        alert('Rate limit exceeded. Please try again later.')
      }
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Archive</h1>
        <p className="text-gray-600 mb-6">
          Search through Charlie Kirk&apos;s debate responses by keywords, topics, or Bible verses.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for debates, topics, or arguments..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Search size={20} />
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : hasSearched && entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">
            No results found for &quot;{query}&quot;. Try different keywords.
          </p>
        </div>
      ) : entries.length > 0 ? (
        <div>
          <p className="text-gray-600 mb-4">
            Found {entries.length} result{entries.length !== 1 ? 's' : ''} for &quot;{query}&quot;
          </p>
          <div className="grid gap-6">
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onVote={handleVote}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600">
            Enter a search query to find specific debates and arguments.
          </p>
        </div>
      )}
    </main>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <SearchContent />
      </Suspense>
    </div>
  )
}