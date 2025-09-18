'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Header from '@/components/header'
import { EntryWithRelations } from '@/types/database'
import { CheckCircle, XCircle, Shield, AlertCircle } from 'lucide-react'
import { useVerifier } from '@/hooks/useVerifier'

export default function DashboardPage() {
  const router = useRouter()
  const { userId } = useAuth()
  const { isVerifier, isLoading: verifierLoading, error: verifierError } = useVerifier()
  const [entries, setEntries] = useState<EntryWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }

    // Wait for verifier status to load
    if (verifierLoading) return

    if (verifierError) {
      alert(`Error checking verifier status: ${verifierError}`)
      router.push('/')
      return
    }

    if (!isVerifier) {
      alert('Access denied. Verifier access required.')
      router.push('/')
      return
    }

    fetchPendingEntries()
  }, [userId, isVerifier, verifierLoading, verifierError, router])

  const fetchPendingEntries = async () => {
    try {
      const response = await fetch('/api/entries?status=pending')
      const data = await response.json()
      setEntries(data)
    } catch (error) {
      console.error('Error fetching entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateEntryStatus = async (entryId: string, status: 'verified' | 'rejected') => {
    setUpdating(entryId)

    try {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verified_status: status }),
      })

      if (response.ok) {
        setEntries(entries.filter(e => e.id !== entryId))
      } else {
        const errorData = await response.json()
        alert(`Failed to update entry status: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating entry:', error)
      alert('Network error updating entry status')
    } finally {
      setUpdating(null)
    }
  }

  // Show loading while checking verifier status
  if (verifierLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Checking access permissions...</p>
          </div>
        </main>
      </div>
    )
  }

  // Show error if verifier check failed
  if (verifierError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Check Failed</h2>
            <p className="text-gray-600 mb-4">{verifierError}</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Return to Home
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Show access denied if not a verifier
  if (!isVerifier) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              Verifier access is required to use the moderation dashboard.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Return to Home
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="text-blue-600" />
            Moderation Dashboard
          </h1>
          <p className="text-gray-600">
            Review and verify pending entries submitted by the community.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading pending entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h2>
            <p className="text-gray-600">No pending entries to review.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {entries.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-6 bg-white shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {entry.question}
                  </h3>
                  <p className="text-gray-700">{entry.answer_summary}</p>
                </div>

                <div className="mb-4">
                  <a
                    href={`https://youtu.be/${entry.video_id}?t=${entry.start_seconds}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Verify on YouTube
                  </a>
                </div>

                {entry.stats && entry.stats.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Stats to verify:</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {entry.stats.map((stat) => (
                        <li key={stat.id}>{stat.description}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => updateEntryStatus(entry.id, 'verified')}
                    disabled={updating === entry.id}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} />
                    {updating === entry.id ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    onClick={() => updateEntryStatus(entry.id, 'rejected')}
                    disabled={updating === entry.id}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle size={20} />
                    {updating === entry.id ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}