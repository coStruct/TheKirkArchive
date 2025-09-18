'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Header from '@/components/header'
import { extractYouTubeInfo } from '@/lib/utils'
import { Play, Clock, BookOpen, BarChart3, Plus, Minus, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'

interface BibleVerseRange {
  book: string
  startChapter: number
  startVerse: number
  endChapter?: number
  endVerse?: number
  text?: string
}

export default function SubmitPage() {
  const router = useRouter()
  const { userId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [youtubePreview, setYoutubePreview] = useState<{ videoId: string; startSeconds: number } | null>(null)
  const [formData, setFormData] = useState({
    question: '',
    answer_summary: '',
    youtube_url: '',
    timestamp_minutes: '',
    timestamp_seconds: '',
    stats: [{ description: '', source_url: '' }],
    bible_verse_ranges: [{ book: '', startChapter: '', startVerse: '', endChapter: '', endVerse: '', text: '' }]
  })

  // Auto-parse YouTube URL and extract timestamp
  useEffect(() => {
    if (formData.youtube_url) {
      const info = extractYouTubeInfo(formData.youtube_url)
      if (info) {
        setYoutubePreview(info)
        if (info.startSeconds > 0) {
          const minutes = Math.floor(info.startSeconds / 60)
          const seconds = info.startSeconds % 60
          setFormData(prev => ({
            ...prev,
            timestamp_minutes: minutes.toString(),
            timestamp_seconds: seconds.toString()
          }))
        }
      } else {
        setYoutubePreview(null)
      }
    } else {
      setYoutubePreview(null)
    }
  }, [formData.youtube_url])

  const getTotalSeconds = () => {
    const minutes = parseInt(formData.timestamp_minutes || '0')
    const seconds = parseInt(formData.timestamp_seconds || '0')
    return minutes * 60 + seconds
  }

  const expandBibleVerseRange = (range: BibleVerseRange): Array<{ book: string; chapter: number; verse: number; text: string }> => {
    const verses = []
    const startChapter = range.startChapter
    const endChapter = range.endChapter || range.startChapter

    for (let chapter = startChapter; chapter <= endChapter; chapter++) {
      const startVerse = chapter === startChapter ? range.startVerse : 1
      const endVerse = chapter === endChapter ? (range.endVerse || range.startVerse) : 999 // We'll let the backend handle verse limits

      for (let verse = startVerse; verse <= endVerse; verse++) {
        verses.push({
          book: range.book,
          chapter,
          verse,
          text: range.text || ''
        })
      }
    }

    return verses
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      alert('Please sign in to submit entries')
      return
    }

    if (!youtubePreview) {
      alert('Please enter a valid YouTube URL')
      return
    }

    setLoading(true)

    try {
      const cleanStats = formData.stats.filter(s => s.description.trim())

      // Convert Bible verse ranges to individual verses
      const bibleVerses = formData.bible_verse_ranges
        .filter(r => r.book && r.startChapter && r.startVerse)
        .flatMap(range => {
          return expandBibleVerseRange({
            book: range.book,
            startChapter: parseInt(range.startChapter),
            startVerse: parseInt(range.startVerse),
            endChapter: range.endChapter ? parseInt(range.endChapter) : undefined,
            endVerse: range.endVerse ? parseInt(range.endVerse) : undefined,
            text: range.text
          })
        })

      // Create YouTube URL with timestamp
      const totalSeconds = getTotalSeconds()
      const youtubeUrl = totalSeconds > 0
        ? `https://youtu.be/${youtubePreview.videoId}?t=${totalSeconds}`
        : `https://youtu.be/${youtubePreview.videoId}`

      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: formData.question,
          answer_summary: undefined,
          youtube_url: youtubeUrl,
          stats: cleanStats,
          bible_verses: bibleVerses
        }),
      })

      if (response.ok) {
        alert('Entry submitted successfully! It will be reviewed by moderators.')
        router.push('/')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error submitting entry:', error)
      alert('Failed to submit entry')
    } finally {
      setLoading(false)
    }
  }

  const addStat = () => {
    setFormData({
      ...formData,
      stats: [...formData.stats, { description: '', source_url: '' }]
    })
  }

  const removeStat = (index: number) => {
    setFormData({
      ...formData,
      stats: formData.stats.filter((_, i) => i !== index)
    })
  }

  const updateStat = (index: number, field: string, value: string) => {
    const newStats = [...formData.stats]
    newStats[index] = { ...newStats[index], [field]: value }
    setFormData({ ...formData, stats: newStats })
  }

  const addVerseRange = () => {
    setFormData({
      ...formData,
      bible_verse_ranges: [...formData.bible_verse_ranges, { book: '', startChapter: '', startVerse: '', endChapter: '', endVerse: '', text: '' }]
    })
  }

  const removeVerseRange = (index: number) => {
    setFormData({
      ...formData,
      bible_verse_ranges: formData.bible_verse_ranges.filter((_, i) => i !== index)
    })
  }

  const updateVerseRange = (index: number, field: string, value: string) => {
    const newVerses = [...formData.bible_verse_ranges]
    newVerses[index] = { ...newVerses[index], [field]: value }
    setFormData({ ...formData, bible_verse_ranges: newVerses })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Header />

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Submit New Entry
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Contribute to the archive by submitting a debate question and Charlie Kirk&apos;s response from a YouTube video.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto mt-6 rounded-full"></div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Form */}
          <div className="space-y-8">
            {/* Question Section */}
            <div className="form-section animate-fade-in-up">
              <div className="form-section-header">
                <h3 className="form-section-title">
                  <BookOpen className="form-section-icon" />
                  Debate Question
                </h3>
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">Required</span>
              </div>
              <div>
                <label className="form-label">What was the question or topic being debated?</label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className={`form-input ${formData.question ? 'success' : ''}`}
                  placeholder="Enter the debate question or topic that was discussed..."
                />
                {formData.question && (
                  <div className="helper-text success flex items-center mt-2">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Question captured
                  </div>
                )}
              </div>
            </div>

            {/* YouTube Video Section */}
            <div className="form-section animate-fade-in-up">
              <div className="form-section-header">
                <h3 className="form-section-title">
                  <Play className="form-section-icon" />
                  YouTube Video
                </h3>
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">Required</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="form-label">YouTube URL</label>
                  <input
                    type="url"
                    required
                    value={formData.youtube_url}
                    onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                    className={`form-input ${youtubePreview ? 'success' : formData.youtube_url && !youtubePreview ? 'error' : ''}`}
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  />
                  {youtubePreview ? (
                    <div className="helper-text success flex items-center mt-2">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Valid YouTube video detected
                    </div>
                  ) : formData.youtube_url ? (
                    <div className="helper-text error flex items-center mt-2">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Please enter a valid YouTube URL
                    </div>
                  ) : (
                    <div className="helper-text mt-2">
                      Paste the YouTube URL where Charlie Kirk responds to the question
                    </div>
                  )}
                </div>

                {/* Compact Timestamp Input */}
                <div>
                  <label className="form-label flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Question start time (optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={formData.timestamp_minutes}
                      onChange={(e) => setFormData({ ...formData, timestamp_minutes: e.target.value })}
                      className="form-input w-20 text-center"
                      placeholder="0"
                    />
                    <span className="text-gray-500 text-sm">min</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.timestamp_seconds}
                      onChange={(e) => setFormData({ ...formData, timestamp_seconds: e.target.value })}
                      className="form-input w-20 text-center"
                      placeholder="0"
                    />
                    <span className="text-gray-500 text-sm">sec</span>
                    {(formData.timestamp_minutes || formData.timestamp_seconds) && (
                      <span className="text-sm text-blue-600 font-medium ml-2">
                        = {getTotalSeconds()}s
                      </span>
                    )}
                  </div>
                  <div className="helper-text mt-1">
                    When in the video does the question start? Creates a direct link.
                  </div>
                </div>

                {/* Video Preview */}
                {youtubePreview && (
                  <div className="mt-4">
                    <div className="aspect-video bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden mb-3">
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubePreview.videoId}${getTotalSeconds() > 0 ? `?start=${getTotalSeconds()}` : ''}`}
                        className="youtube-iframe"
                        allowFullScreen
                        title="YouTube video preview"
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-gray-600">Video:</span>
                          <code className="bg-white px-2 py-1 rounded font-mono text-xs ml-1">{youtubePreview.videoId}</code>
                        </div>
                        {getTotalSeconds() > 0 && (
                          <div>
                            <span className="text-gray-600">Start:</span>
                            <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-xs ml-1">{getTotalSeconds()}s</code>
                          </div>
                        )}
                      </div>
                      <a
                        href={`https://youtu.be/${youtubePreview.videoId}${getTotalSeconds() > 0 ? `?t=${getTotalSeconds()}` : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm py-1 px-3"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics Section */}
            <div className="form-section animate-fade-in-up">
              <div className="form-section-header">
                <h3 className="form-section-title">
                  <BarChart3 className="form-section-icon" />
                  Related Statistics
                </h3>
                <button
                  type="button"
                  onClick={addStat}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Statistic
                </button>
              </div>
              <div className="space-y-4">
                {formData.stats.map((stat, index) => (
                  <div key={index} className="card p-4 border-l-4 border-l-blue-500 animate-slide-in-right">
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={stat.description}
                        onChange={(e) => updateStat(index, 'description', e.target.value)}
                        placeholder="e.g., '65% of Americans support this policy according to Pew Research'"
                        className="form-input"
                      />
                      <div className="flex gap-3">
                        <input
                          type="url"
                          value={stat.source_url}
                          onChange={(e) => updateStat(index, 'source_url', e.target.value)}
                          placeholder="Source URL (optional but recommended)"
                          className="form-input flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeStat(index)}
                          className="btn-danger flex-shrink-0"
                          title="Remove statistic"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {formData.stats.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Add any statistical claims or data mentioned in the response</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bible Verses */}
            <div className="form-section animate-fade-in-up">
              <div className="form-section-header">
                <h3 className="form-section-title">
                  <BookOpen className="form-section-icon" />
                  Bible References
                </h3>
                <button
                  type="button"
                  onClick={addVerseRange}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Reference
                </button>
              </div>
              <div className="space-y-4">
                {formData.bible_verse_ranges.map((range, index) => (
                  <div key={index} className="card p-4 border-l-4 border-l-purple-500 animate-slide-in-right">
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={range.book}
                        onChange={(e) => updateVerseRange(index, 'book', e.target.value)}
                        placeholder="Book (e.g., John, Romans, 1 Corinthians)"
                        className="form-input"
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-600">From:</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={range.startChapter}
                              onChange={(e) => updateVerseRange(index, 'startChapter', e.target.value)}
                              placeholder="Ch"
                              className="form-input w-16 text-center text-sm"
                            />
                            <span className="text-gray-400 font-semibold">:</span>
                            <input
                              type="number"
                              min="1"
                              value={range.startVerse}
                              onChange={(e) => updateVerseRange(index, 'startVerse', e.target.value)}
                              placeholder="V"
                              className="form-input w-16 text-center text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-600">To (optional):</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={range.endChapter}
                              onChange={(e) => updateVerseRange(index, 'endChapter', e.target.value)}
                              placeholder="Ch"
                              className="form-input w-16 text-center text-sm"
                            />
                            <span className="text-gray-400 font-semibold">:</span>
                            <input
                              type="number"
                              min="1"
                              value={range.endVerse}
                              onChange={(e) => updateVerseRange(index, 'endVerse', e.target.value)}
                              placeholder="V"
                              className="form-input w-16 text-center text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <textarea
                          value={range.text}
                          onChange={(e) => updateVerseRange(index, 'text', e.target.value)}
                          placeholder="Verse text (optional but helpful for context)"
                          rows={2}
                          className="form-input flex-1 resize-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeVerseRange(index)}
                          className="btn-danger flex-shrink-0 self-start"
                          title="Remove verse range"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>

                      {range.book && range.startChapter && range.startVerse && (
                        <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="text-sm text-purple-700">
                            <strong>Reference:</strong> {range.book} {range.startChapter}:{range.startVerse}
                            {(range.endChapter || range.endVerse) && (
                              <>-{range.endChapter || range.startChapter}:{range.endVerse || range.startVerse}</>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {formData.bible_verse_ranges.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Add any Bible verses referenced in the response</p>
                  </div>
                )}
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 flex items-start">
                  <BookOpen className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Examples:</strong> &quot;John 3:16&quot;, &quot;Romans 8:28-30&quot;, &quot;1 Corinthians 13:1-13&quot;
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Additional Info */}
          <div className="space-y-8">

            {/* Submission Tips */}
            <div className="card p-6 bg-blue-50 border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 Submission Tips</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Be specific and clear with your question</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Include timestamp for easier review</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Add statistics with source URLs when possible</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Reference relevant Bible verses if mentioned</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Submit Button - Full Width */}
          <div className="lg:col-span-2">
            <div className="card-elevated p-8 text-center animate-fade-in-up">
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Ready to Submit?</h3>
                <p className="text-gray-600 mb-6">
                  Your contribution will be reviewed by our moderation team to ensure accuracy and quality.
                </p>

                <button
                  type="submit"
                  disabled={loading || !youtubePreview || !formData.question.trim()}
                  className="btn-primary w-full text-lg py-4 px-8 mb-4"
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner mr-3"></div>
                      Submitting Entry...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-3" />
                      Submit Entry for Review
                    </>
                  )}
                </button>

                {(!youtubePreview || !formData.question.trim()) && (
                  <div className="status-warning mb-4">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Please provide a question and valid YouTube URL
                  </div>
                )}

                <div className="text-sm text-gray-500 space-y-1">
                  <p>✅ Reviewed by verified moderators</p>
                  <p>📝 Quality checked for accuracy</p>
                  <p>🚀 Published to help the community</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}