'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/header'
import { EntryWithRelations } from '@/types/database'
import { useAuth } from '@clerk/nextjs'
import { ChevronDown, ChevronRight, ExternalLink, BookOpen, BarChart3, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react'

export default function Home() {
  const { userId } = useAuth()
  const [entries, setEntries] = useState<EntryWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Header />

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Charlie Kirk Archive
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            A community-verified collection of Charlie Kirk&apos;s most impactful debates and arguments.
            Help preserve and verify the accuracy of these important moments.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto mt-6 rounded-full"></div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto h-12 w-12 text-blue-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Entries Yet</h2>
            <p className="text-gray-600">Be the first to contribute to the archive!</p>
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
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-100 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {entry.question}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span>Video: {entry.video_id}</span>
                        {entry.start_seconds > 0 && (
                          <>
                            <span>•</span>
                            <span>@ {Math.floor(entry.start_seconds / 60)}m {entry.start_seconds % 60}s</span>
                          </>
                        )}
                        {entry.vote_count && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3" />
                                {entry.vote_count.upvotes}
                              </span>
                              <span className="flex items-center gap-1">
                                <ThumbsDown className="w-3 h-3" />
                                {entry.vote_count.downvotes}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
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

                          {/* Voting Section */}
                          {entry.vote_count && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2">Community Feedback</h4>
                              <div className="flex items-center gap-4 p-3 bg-white rounded-lg border">
                                <button
                                  onClick={() => handleVote(entry.id, 'upvote')}
                                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                  <span className="font-medium">{entry.vote_count.upvotes}</span>
                                </button>
                                <button
                                  onClick={() => handleVote(entry.id, 'downvote')}
                                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                  <span className="font-medium">{entry.vote_count.downvotes}</span>
                                </button>
                                <div className="text-sm text-gray-500 ml-auto">
                                  Score: <span className="font-medium">{entry.vote_count.weighted_score}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
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