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
          answer_summary: formData.answer_summary.trim() || undefined,
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
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit New Entry</h1>
          <p className="text-gray-600">Submit a debate question and Charlie Kirk&apos;s response from a YouTube video.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Main Form */}
          <div className="space-y-6">
            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="inline w-4 h-4 mr-1" />
                Debate Question *
              </label>
              <input
                type="text"
                required
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What was the question or topic being debated?"
              />
            </div>

            {/* YouTube URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Play className="inline w-4 h-4 mr-1" />
                YouTube URL *
              </label>
              <input
                type="url"
                required
                value={formData.youtube_url}
                onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                className={`w-full px-3 py-2 border text-gray-900 rounded-md focus:outline-none focus:ring-2 ${
                  youtubePreview ? 'border-green-300 focus:ring-green-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
              />
              {youtubePreview && (
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Valid YouTube video detected
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                Question Start Time (Optional)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  value={formData.timestamp_minutes}
                  onChange={(e) => setFormData({ ...formData, timestamp_minutes: e.target.value })}
                  className="w-20 px-3 py-2 border text-gray-900 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <span className="text-gray-500">min</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formData.timestamp_seconds}
                  onChange={(e) => setFormData({ ...formData, timestamp_seconds: e.target.value })}
                  className="w-20 px-3 py-2 border text-gray-900 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <span className="text-gray-500">sec</span>
                {(formData.timestamp_minutes || formData.timestamp_seconds) && (
                  <span className="text-sm text-gray-600">
                    = {getTotalSeconds()}s total
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                When in the video does the question/topic start? This will create a direct link.
              </p>
            </div>

            {/* Answer Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Answer Summary (Optional)
              </label>
              <textarea
                value={formData.answer_summary}
                onChange={(e) => setFormData({ ...formData, answer_summary: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional: Summarize Charlie Kirk's response. If left blank, moderators will watch the video directly."
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank if you prefer moderators to watch the video directly.
              </p>
            </div>


            {/* Statistics */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  <BarChart3 className="inline w-4 h-4 mr-1" />
                  Related Statistics (Optional)
                </label>
                <button
                  type="button"
                  onClick={addStat}
                  className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Stat
                </button>
              </div>
              <div className="space-y-3">
                {formData.stats.map((stat, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-md bg-gray-50">
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={stat.description}
                        onChange={(e) => updateStat(index, 'description', e.target.value)}
                        placeholder="Statistical claim or fact mentioned"
                        className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={stat.source_url}
                          onChange={(e) => updateStat(index, 'source_url', e.target.value)}
                          placeholder="Source URL (optional)"
                          className="flex-1 px-3 py-2 border text-gray-900 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeStat(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-700 rounded-md hover:bg-red-50"
                          title="Remove statistic"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Preview & Bible Verses */}
          <div className="space-y-6">
            {/* YouTube Preview */}
            {youtubePreview && (
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Play className="w-4 h-4 mr-1" />
                  Video Preview
                </h3>
                <div className="aspect-video bg-gray-100 rounded-md mb-3">
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubePreview.videoId}${getTotalSeconds() > 0 ? `?start=${getTotalSeconds()}` : ''}`}
                    className="w-full h-full rounded-md"
                    allowFullScreen
                  />
                </div>
                <div className="text-sm text-gray-600">
                  <p className="mb-1">Video ID: <code className="bg-gray-100 px-1 rounded">{youtubePreview.videoId}</code></p>
                  {getTotalSeconds() > 0 && (
                    <p>Start time: <code className="bg-gray-100 px-1 rounded">{getTotalSeconds()}s</code></p>
                  )}
                </div>
                <a
                  href={`https://youtu.be/${youtubePreview.videoId}${getTotalSeconds() > 0 ? `?t=${getTotalSeconds()}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open in YouTube
                </a>
              </div>
            )}

            {/* Bible Verses */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  <BookOpen className="inline w-4 h-4 mr-1" />
                  Bible References (Optional)
                </label>
                <button
                  type="button"
                  onClick={addVerseRange}
                  className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Range
                </button>
              </div>
              <div className="space-y-3">
                {formData.bible_verse_ranges.map((range, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-md bg-gray-50">
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={range.book}
                        onChange={(e) => updateVerseRange(index, 'book', e.target.value)}
                        placeholder="Book (e.g., John, Romans, 1 Corinthians)"
                        className="w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">From:</label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              min="1"
                              value={range.startChapter}
                              onChange={(e) => updateVerseRange(index, 'startChapter', e.target.value)}
                              placeholder="Ch"
                              className="w-16 px-2 py-1 border text-gray-900 border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-gray-500 self-center">:</span>
                            <input
                              type="number"
                              min="1"
                              value={range.startVerse}
                              onChange={(e) => updateVerseRange(index, 'startVerse', e.target.value)}
                              placeholder="V"
                              className="w-16 px-2 py-1 border text-gray-900 border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">To (optional):</label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              min="1"
                              value={range.endChapter}
                              onChange={(e) => updateVerseRange(index, 'endChapter', e.target.value)}
                              placeholder="Ch"
                              className="w-16 px-2 py-1 border text-gray-900 border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-gray-500 self-center">:</span>
                            <input
                              type="number"
                              min="1"
                              value={range.endVerse}
                              onChange={(e) => updateVerseRange(index, 'endVerse', e.target.value)}
                              placeholder="V"
                              className="w-16 px-2 py-1 border text-gray-900 border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <textarea
                          value={range.text}
                          onChange={(e) => updateVerseRange(index, 'text', e.target.value)}
                          placeholder="Verse text (optional)"
                          rows={2}
                          className="flex-1 px-3 py-2 border text-gray-900 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeVerseRange(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-700 rounded-md hover:bg-red-50 self-start"
                          title="Remove verse range"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>

                      {range.book && range.startChapter && range.startVerse && (
                        <div className="text-xs text-gray-600 mt-1">
                          Preview: <span className="font-medium">
                            {range.book} {range.startChapter}:{range.startVerse}
                            {(range.endChapter || range.endVerse) && (
                              <>-{range.endChapter || range.startChapter}:{range.endVerse || range.startVerse}</>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Examples: &quot;John 3:16&quot;, &quot;Romans 8:28-30&quot;, &quot;1 Corinthians 13:1-13&quot;
              </p>
            </div>
          </div>

          {/* Submit Button - Full Width */}
          <div className="lg:col-span-2">
            <div className="border-t pt-6">
              <button
                type="submit"
                disabled={loading || !youtubePreview || !formData.question.trim()}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Entry for Review
                  </>
                )}
              </button>

              {(!youtubePreview || !formData.question.trim()) && (
                <div className="mt-2 flex items-center text-sm text-amber-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Please provide a question and valid YouTube URL
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2 text-center">
                Your submission will be reviewed by moderators before being published.
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}