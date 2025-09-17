'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/header'
import EntryCard from '@/components/entry-card'
import { EntryWithRelations } from '@/types/database'
import { useAuth } from '@clerk/nextjs'

export default function Home() {
  const { userId, isLoaded } = useAuth()
  const [entries, setEntries] = useState<EntryWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    try {
      const response = await fetch('/api/entries?status=verified')
      const data = await response.json()
      setEntries(data)
    } catch (error) {
      console.error('Error fetching entries:', error)
    } finally {
      setLoading(false)
    }
  }

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
        fetchEntries()
      } else if (response.status === 429) {
        alert('Rate limit exceeded. Please try again later.')
      }
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Charlie Kirk Memorial Debate Archive
          </h1>
          <p className="text-gray-600">
            A community-verified collection of Charlie Kirk&apos;s most impactful debates and arguments.
            Help preserve and verify the accuracy of these important moments.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No verified entries yet. Be the first to contribute!</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onVote={handleVote}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}