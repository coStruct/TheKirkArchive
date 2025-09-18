'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Header from '@/components/header'
import { EntryWithRelations } from '@/types/database'
import { CheckCircle, XCircle, Shield, AlertCircle, ChevronDown, ChevronRight, ExternalLink, BookOpen, BarChart3 } from 'lucide-react'
import { useVerifier } from '@/hooks/useVerifier'

export default function DashboardPage() {
  const router = useRouter()
  const { userId } = useAuth()
  const { isVerifier, error: verifierError, isReady } = useVerifier()
  const [entries, setEntries] = useState<EntryWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  useEffect(() => {
    // Don't do anything until both Clerk and verifier check are complete
    if (!isReady) return

    // If no user ID after Clerk is loaded, redirect
    if (!userId) {
      router.push('/')
      return
    }

    // If there was an error checking verifier status, redirect
    if (verifierError) {
      alert(`Error checking verifier status: ${verifierError}`)
      router.push('/')
      return
    }

    // If user is not a verifier, redirect
    if (!isVerifier) {
      alert('Access denied. Verifier access required.')
      router.push('/')
      return
    }

    // If we get here, user is authenticated and is a verifier
    fetchPendingEntries()
  }, [userId, isVerifier, verifierError, isReady, router])

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
  if (!isReady) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Header />

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <Shield className="text-blue-600" />
            Moderation Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Review and verify pending entries submitted by the community.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto mt-6 rounded-full"></div>
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
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="form-section">
                <button
                  type="button"
                  onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                      <span className="text-xs font-semibold">?</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {entry.question}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-4">
                        <span>Submitted {new Date(entry.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Video: {entry.video_id}</span>
                        {entry.start_seconds > 0 && (
                          <>
                            <span>•</span>
                            <span>@ {Math.floor(entry.start_seconds / 60)}m {entry.start_seconds % 60}s</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  {expandedEntry === entry.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedEntry === entry.id && (
                  <div className="p-6 border-t border-gray-100 animate-fade-in-up space-y-6">
                    {/* Video Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* Video Player */}
                        <div>
                          <p className="text-sm text-gray-600 mb-3 flex items-center">
                            📹 Video Preview
                            <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded font-mono">{entry.video_id}</span>
                          </p>
                          <div className="aspect-video bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden mb-3">
                            <iframe
                              src={`https://www.youtube.com/embed/${entry.video_id}${entry.start_seconds > 0 ? `?start=${entry.start_seconds}` : ''}`}
                              className="youtube-iframe"
                              allowFullScreen
                              title="YouTube video preview"
                            />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div>
                              {entry.start_seconds > 0 && (
                                <div className="text-blue-600 font-medium">
                                  Starts at: {Math.floor(entry.start_seconds / 60)}m {entry.start_seconds % 60}s
                                </div>
                              )}
                            </div>
                            <a
                              href={`https://youtu.be/${entry.video_id}${entry.start_seconds > 0 ? `?t=${entry.start_seconds}` : ''}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary text-sm py-1 px-3"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Open
                            </a>
                          </div>
                        </div>

                        {/* Entry Details */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-600 mb-2">Entry Details</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p><strong>Submitted by:</strong> {entry.submitted_by_clerk_id}</p>
                              <p><strong>Date:</strong> {new Date(entry.created_at).toLocaleString()}</p>
                            </div>
                          </div>

                          {entry.stats && entry.stats.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center">
                                <BarChart3 className="w-4 h-4 mr-1" />
                                Statistics ({entry.stats.length})
                              </h4>
                              <ul className="space-y-2">
                                {entry.stats.map((statWrapper, index) => (
                                  <li key={statWrapper.stat?.id || `stat-${index}`} className="p-2 bg-white rounded border-l-4 border-l-blue-500 text-sm">
                                    <div className="text-gray-900">{statWrapper.stat?.description}</div>
                                    {statWrapper.stat?.source_url && (
                                      <a
                                        href={statWrapper.stat.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-xs"
                                      >
                                        📊 View Source
                                      </a>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {entry.bible_verses && entry.bible_verses.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center">
                                <BookOpen className="w-4 h-4 mr-1" />
                                Bible References ({entry.bible_verses.length})
                              </h4>
                              <ul className="space-y-2">
                                {entry.bible_verses.map((verseWrapper, index) => (
                                  <li key={verseWrapper.verse?.id || `verse-${index}`} className="p-2 bg-white rounded border-l-4 border-l-purple-500 text-sm">
                                    <div className="font-medium text-purple-700">
                                      📖 {verseWrapper.verse?.book} {verseWrapper.verse?.chapter}:{verseWrapper.verse?.verse}
                                    </div>
                                    {verseWrapper.verse?.text && (
                                      <div className="text-gray-600 mt-1 italic">
                                        &quot;{verseWrapper.verse.text}&quot;
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-center pt-4">
                      <button
                        onClick={() => updateEntryStatus(entry.id, 'verified')}
                        disabled={updating === entry.id}
                        className="btn-primary flex items-center gap-2 px-6"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {updating === entry.id ? 'Verifying...' : 'Verify Entry'}
                      </button>
                      <button
                        onClick={() => updateEntryStatus(entry.id, 'rejected')}
                        disabled={updating === entry.id}
                        className="btn-danger flex items-center gap-2 px-6"
                      >
                        <XCircle className="w-4 h-4" />
                        {updating === entry.id ? 'Rejecting...' : 'Reject Entry'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}