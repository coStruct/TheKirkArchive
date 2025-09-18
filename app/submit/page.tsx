'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Header from '@/components/header'
import { extractYouTubeInfo } from '@/lib/utils'
import { BookOpen, Plus, Minus, ExternalLink, CheckCircle, AlertCircle, ChevronDown, ChevronRight, HelpCircle, Link, TrendingUp } from 'lucide-react'

interface BibleVerseRange {
  book: string
  startChapter: number
  startVerse: number
  endChapter?: number
  endVerse?: number
  text?: string
}

interface FormStep {
  id: string
  title: string
  description: string
  required: boolean
  completed: boolean
  expanded: boolean
}

const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah',
  'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
  'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke',
  'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians',
  'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'
]

export default function SubmitPage() {
  const router = useRouter()
  const { userId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [youtubePreview, setYoutubePreview] = useState<{ videoId: string; startSeconds: number } | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [bookSearch, setBookSearch] = useState('')
  const [showBookDropdown, setShowBookDropdown] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    question: '',
    answer_summary: '',
    youtube_url: '',
    timestamp_minutes: '',
    timestamp_seconds: '',
    stats: [{ description: '', source_url: '' }],
    bible_verse_ranges: [{ book: '', startChapter: '', startVerse: '', endChapter: '', endVerse: '', text: '' }]
  })

  const [steps, setSteps] = useState<FormStep[]>([
    { id: 'question-video', title: 'Question + Video', description: 'Add the YouTube link and type the debate question', required: true, completed: false, expanded: true },
    { id: 'stats', title: 'Related Statistics', description: 'Add any facts or data mentioned (optional)', required: false, completed: false, expanded: false },
    { id: 'verses', title: 'Bible References', description: 'Include any Scripture verses cited (optional)', required: false, completed: false, expanded: false },
    { id: 'review', title: 'Review & Submit', description: 'Final check before submission', required: true, completed: false, expanded: false }
  ])

  const updateStepCompletion = useCallback(() => {
    setSteps(prevSteps => prevSteps.map(step => {
      switch (step.id) {
        case 'question-video':
          return { ...step, completed: formData.question.trim().length > 0 && !!youtubePreview }
        case 'stats':
          return { ...step, completed: true } // Optional, always complete
        case 'verses':
          return { ...step, completed: true } // Optional, always complete
        case 'review':
          return { ...step, completed: formData.question.trim().length > 0 && !!youtubePreview }
        default:
          return step
      }
    }))
  }, [formData.question, youtubePreview])

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

  // Update step completion when relevant fields change
  useEffect(() => {
    updateStepCompletion()
  }, [formData.question, youtubePreview, updateStepCompletion])

  const toggleStep = (stepId: string) => {
    setSteps(prevSteps => prevSteps.map(step =>
      step.id === stepId
        ? { ...step, expanded: !step.expanded }
        : { ...step, expanded: false }
    ))
  }

  const moveToNextStep = () => {
    const currentIndex = steps.findIndex(step => step.expanded)
    if (currentIndex < steps.length - 1) {
      toggleStep(steps[currentIndex + 1].id)
    }
  }


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
      const endVerse = chapter === endChapter ? (range.endVerse || range.startVerse) : 999

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

      const bibleVerses = formData.bible_verse_ranges
        .filter(r => r.book && r.startChapter && r.startVerse)
        .flatMap(range => {
          return expandBibleVerseRange({
            book: range.book,
            startChapter: parseInt(range.startChapter.toString()),
            startVerse: parseInt(range.startVerse.toString()),
            endChapter: range.endChapter ? parseInt(range.endChapter.toString()) : undefined,
            endVerse: range.endVerse ? parseInt(range.endVerse.toString()) : undefined,
            text: range.text
          })
        })

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
        setShowConfirmation(true)
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

  const filteredBooks = BIBLE_BOOKS.filter(book =>
    book.toLowerCase().includes(bookSearch.toLowerCase())
  )

  const isValidSourceUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      // Check if it's a valid URL and not a YouTube URL
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  const isYouTubeUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')
    } catch {
      return false
    }
  }

  const handleConfirmationClose = () => {
    setShowConfirmation(false)
    router.push('/')
  }

  const Tooltip = ({ content, children }: { content: string; children: React.ReactNode }) => (
    <div className="group relative inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Header />

      <main className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Submit New Entry
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Contribute to the archive by submitting a debate question and Charlie Kirk&apos;s response from a YouTube video.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto mt-6 rounded-full"></div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Main Form */}
          <div>
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Submit Your Entry</h2>
                <div className="text-sm text-gray-600">
                  {steps.filter(s => s.completed).length} of {steps.filter(s => s.required).length} required steps complete
                </div>
              </div>
              <div className="flex space-x-2">
                {steps.map((step) => (
                  <div key={step.id} className="flex-1">
                    <div className={`h-2 rounded-full transition-colors ${
                      step.completed ? 'bg-green-500' :
                      step.expanded ? 'bg-blue-500' :
                      'bg-gray-200'
                    }`} />
                    <p className={`text-xs mt-1 text-center ${
                      step.completed ? 'text-green-700' :
                      step.expanded ? 'text-blue-700' :
                      'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Steps */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {steps.map((step) => (
                <div key={step.id} className="form-section">
                  <button
                    type="button"
                    onClick={() => toggleStep(step.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        step.completed ? 'bg-green-500 text-white' :
                        step.expanded ? 'bg-blue-500 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <span className="text-xs font-semibold">{steps.indexOf(step) + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${step.required ? 'text-gray-900' : 'text-gray-700'}`}>
                            {step.title} {step.required && <span className="text-red-500">*</span>}
                          </h3>
                          {step.id === 'question-video' && (
                            <Tooltip content="Paste the YouTube URL, then watch the clip and type the exact question that was asked.">
                              <HelpCircle className="w-4 h-4 text-gray-400" />
                            </Tooltip>
                          )}
                          {step.id === 'stats' && (
                            <Tooltip content="Include factual claims with sources when possible. This helps with verification.">
                              <HelpCircle className="w-4 h-4 text-gray-400" />
                            </Tooltip>
                          )}
                          {step.id === 'verses' && (
                            <Tooltip content="Include any Scripture references mentioned in the response.">
                              <HelpCircle className="w-4 h-4 text-gray-400" />
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{step.description}</p>
                      </div>
                    </div>
                    {step.expanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {step.expanded && (
                    <div className="p-6 border-t border-gray-100 animate-fade-in-up">
                      {step.id === 'question-video' && (
                        <div className="space-y-6">
                          {/* YouTube URL Section */}
                          <div>
                            <label className="form-label flex items-center mb-2">
                              📺 YouTube URL <span className="text-red-500 ml-1">*</span>
                            </label>
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
                            ) : null}
                          </div>

                          {/* Video Player & Timestamp (when video is loaded) */}
                          {youtubePreview && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="grid lg:grid-cols-2 gap-6">
                                {/* Video Player */}
                                <div>
                                  <p className="text-sm text-gray-600 mb-3">📹 Video Preview</p>
                                  <div className="aspect-video bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden mb-3">
                                    <iframe
                                      src={`https://www.youtube.com/embed/${youtubePreview.videoId}${getTotalSeconds() > 0 ? `?start=${getTotalSeconds()}` : ''}`}
                                      className="youtube-iframe"
                                      allowFullScreen
                                      title="YouTube video preview"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <div>
                                      <span className="text-gray-600">Video ID:</span>
                                      <code className="bg-white px-2 py-1 rounded font-mono text-xs ml-1">{youtubePreview.videoId}</code>
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

                                {/* Timestamp Controls */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm text-gray-600">⏰ Question Start Time (optional)</p>
                                    <Tooltip content="When in the video does the question begin? This creates a direct link to the moment.">
                                      <HelpCircle className="w-4 h-4 text-gray-400" />
                                    </Tooltip>
                                  </div>
                                  <div className="flex items-center gap-2 mb-4">
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
                                  </div>
                                  {(formData.timestamp_minutes || formData.timestamp_seconds) && (
                                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                                      <div className="text-sm text-blue-800">
                                        <strong>Start time:</strong> {getTotalSeconds()}s
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Question Section */}
                          <div>
                            <label className="form-label flex items-center mb-2">
                              💭 Debate Question <span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.question}
                              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                              className={`form-input ${formData.question ? 'success' : ''}`}
                              placeholder="e.g., 'What's your stance on school choice and education vouchers?'"
                            />
                            <p className="text-sm text-gray-500 mt-2">
                              💡 <em>Watch the clip and type the question exactly as asked</em>
                            </p>
                            {formData.question && (
                              <div className="helper-text success flex items-center mt-2">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Question captured
                              </div>
                            )}
                          </div>

                          {/* Continue Button */}
                          {formData.question.trim() && youtubePreview && (
                            <div className="flex justify-center pt-4">
                              <button
                                type="button"
                                onClick={moveToNextStep}
                                className="btn-primary px-8"
                              >
                                Continue to Statistics
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {step.id === 'stats' && (
                        <div className="space-y-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                              Add any facts or data Charlie referenced in his answer. Include the statistic and link to the source if available.
                            </p>
                          </div>

                          <div className="space-y-4">
                            {formData.stats.map((stat, index) => (
                              <div key={index} className="card p-5 border-l-4 border-l-blue-500">
                                <div className="space-y-4">
                                  <div>
                                    <label className="form-label flex items-center mb-2">
                                      <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                                      Statistic / Claim <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={stat.description}
                                      onChange={(e) => updateStat(index, 'description', e.target.value)}
                                      placeholder="e.g., '65% of Americans support this policy according to Pew Research'"
                                      className={`form-input ${stat.description.trim() ? 'success' : ''}`}
                                    />
                                    {stat.description.trim() && (
                                      <div className="helper-text success flex items-center mt-1">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Statistic added
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <label className="form-label flex items-center mb-2">
                                      <Link className="w-4 h-4 mr-2 text-green-600" />
                                      Source URL <span className="text-sm text-gray-500 font-normal">(optional but recommended)</span>
                                    </label>
                                    <div className="flex gap-3">
                                      <input
                                        type="url"
                                        value={stat.source_url}
                                        onChange={(e) => updateStat(index, 'source_url', e.target.value)}
                                        placeholder="https://www.pewresearch.org/... (not a YouTube link)"
                                        className={`form-input flex-1 ${
                                          stat.source_url ?
                                            (isValidSourceUrl(stat.source_url) ? 'success' : 'error') : ''
                                        }`}
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
                                    {stat.source_url && (
                                      isValidSourceUrl(stat.source_url) ? (
                                        <div className="helper-text success flex items-center mt-1">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Valid source URL
                                        </div>
                                      ) : isYouTubeUrl(stat.source_url) ? (
                                        <div className="helper-text error flex items-center mt-1">
                                          <AlertCircle className="w-3 h-3 mr-1" />
                                          This should be a source/study link, not a video
                                        </div>
                                      ) : (
                                        <div className="helper-text error flex items-center mt-1">
                                          <AlertCircle className="w-3 h-3 mr-1" />
                                          Please enter a valid URL
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}


                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={addStat}
                                className="btn-secondary flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Add Another Statistic
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={moveToNextStep}
                            className="btn-primary"
                          >
                            Continue to Bible References
                          </button>
                        </div>
                      )}

                      {step.id === 'verses' && (
                        <div className="space-y-4">
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <p className="text-sm text-purple-800">
                              Include any Scripture verses Charlie cited in his response. Add the book, chapter, and verse numbers.
                            </p>
                          </div>

                          <div className="space-y-4">
                            {formData.bible_verse_ranges.map((range, index) => (
                              <div key={index} className="card p-5 border-l-4 border-l-purple-500">
                                <div className="space-y-4">
                                  <div>
                                    <label className="form-label flex items-center mb-2">
                                      <BookOpen className="w-4 h-4 mr-2 text-purple-600" />
                                      Bible Book <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        required
                                        value={range.book}
                                        onChange={(e) => {
                                          updateVerseRange(index, 'book', e.target.value)
                                          setBookSearch(e.target.value)
                                          setShowBookDropdown(index)
                                        }}
                                        onFocus={() => {
                                          setBookSearch(range.book)
                                          setShowBookDropdown(index)
                                        }}
                                        onBlur={() => {
                                          // Delay hiding to allow click on dropdown items
                                          setTimeout(() => setShowBookDropdown(null), 150)
                                        }}
                                        placeholder="e.g., Genesis, Matthew, Romans..."
                                        className={`form-input ${range.book ? 'success' : ''}`}
                                      />
                                      {showBookDropdown === index && bookSearch && filteredBooks.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                          {filteredBooks.slice(0, 8).map((book) => (
                                            <button
                                              key={book}
                                              type="button"
                                              onClick={() => {
                                                updateVerseRange(index, 'book', book)
                                                setBookSearch('')
                                                setShowBookDropdown(null)
                                              }}
                                              className="w-full text-left text-gray-900 px-3 py-2 hover:bg-gray-100 text-sm"
                                            >
                                              {book}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    {range.book && (
                                      <div className="helper-text success flex items-center mt-1">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Book selected
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="form-label mb-2">Starting Reference <span className="text-red-500">*</span></label>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min="1"
                                          required
                                          value={range.startChapter}
                                          onChange={(e) => updateVerseRange(index, 'startChapter', e.target.value)}
                                          placeholder="Ch"
                                          className="form-input w-20 text-center text-sm"
                                        />
                                        <span className="text-gray-400 font-bold">:</span>
                                        <input
                                          type="number"
                                          min="1"
                                          required
                                          value={range.startVerse}
                                          onChange={(e) => updateVerseRange(index, 'startVerse', e.target.value)}
                                          placeholder="V"
                                          className="form-input w-20 text-center text-sm"
                                        />
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1">Chapter : Verse</p>
                                    </div>
                                    <div>
                                      <label className="form-label mb-2">Ending Reference <span className="text-sm text-gray-500 font-normal">(optional)</span></label>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min="1"
                                          value={range.endChapter}
                                          onChange={(e) => updateVerseRange(index, 'endChapter', e.target.value)}
                                          placeholder="Ch"
                                          className="form-input w-20 text-center text-sm"
                                        />
                                        <span className="text-gray-400 font-bold">:</span>
                                        <input
                                          type="number"
                                          min="1"
                                          value={range.endVerse}
                                          onChange={(e) => updateVerseRange(index, 'endVerse', e.target.value)}
                                          placeholder="V"
                                          className="form-input w-20 text-center text-sm"
                                        />
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1">For verse ranges only</p>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="form-label flex items-center mb-2">
                                      Verse Text <span className="text-sm text-gray-500 font-normal">(optional but helpful)</span>
                                    </label>
                                    <div className="flex gap-3">
                                      <textarea
                                        value={range.text}
                                        onChange={(e) => updateVerseRange(index, 'text', e.target.value)}
                                        placeholder="Paste the verse text for context and verification..."
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
                                  </div>

                                  {range.book && range.startChapter && range.startVerse && (
                                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                      <div className="text-sm text-purple-700">
                                        <strong>📖 Reference:</strong> {range.book} {range.startChapter}:{range.startVerse}
                                        {(range.endChapter || range.endVerse) && (
                                          <>-{range.endChapter || range.startChapter}:{range.endVerse || range.startVerse}</>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}


                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={addVerseRange}
                                className="btn-secondary flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Add Another Reference
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={moveToNextStep}
                            className="btn-primary"
                          >
                            Review & Submit
                          </button>
                        </div>
                      )}

                      {step.id === 'review' && (
                        <div className="space-y-6">
                          <div className="bg-gray-50 p-6 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-4">Review Your Entry</h4>
                            <div className="space-y-3 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Question:</span>
                                <p className="text-gray-900 mt-1">{formData.question || 'Not provided'}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Video:</span>
                                <p className="text-gray-900 mt-1">
                                  {youtubePreview ? (
                                    <>
                                      {youtubePreview.videoId}
                                      {getTotalSeconds() > 0 && ` (starts at ${getTotalSeconds()}s)`}
                                    </>
                                  ) : 'Not provided'}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Statistics:</span>
                                <p className="text-gray-900 mt-1">
                                  {formData.stats.filter(s => s.description.trim()).length} added
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Bible References:</span>
                                <p className="text-gray-900 mt-1">
                                  {formData.bible_verse_ranges.filter(r => r.book).length} added
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="text-center">
                            <button
                              type="submit"
                              disabled={loading || !youtubePreview || !formData.question.trim()}
                              className="btn-primary text-lg py-4 px-8"
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
                              <div className="status-warning mt-4">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                Please complete all required steps
                              </div>
                            )}

                            <div className="text-sm text-gray-500 space-y-1 mt-4">
                              <p>✅ Reviewed by verified moderators</p>
                              <p>📝 Quality checked for accuracy</p>
                              <p>🚀 Published to help the community</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </form>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full animate-fade-in-up">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Entry Submitted Successfully!</h3>
                <p className="text-gray-600 mb-6">
                  Thank you for contributing to the archive. Your entry is now pending verification by our moderation team.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowConfirmation(false)
                      // Reset form for another entry
                      setFormData({
                        question: '',
                        answer_summary: '',
                        youtube_url: '',
                        timestamp_minutes: '',
                        timestamp_seconds: '',
                        stats: [{ description: '', source_url: '' }],
                        bible_verse_ranges: [{ book: '', startChapter: '', startVerse: '', endChapter: '', endVerse: '', text: '' }]
                      })
                      setYoutubePreview(null)
                      setSteps(prevSteps => prevSteps.map((step, index) => ({
                        ...step,
                        completed: false,
                        expanded: index === 0
                      })))
                    }}
                    className="btn-primary w-full"
                  >
                    Submit Another Entry
                  </button>
                  <button
                    onClick={handleConfirmationClose}
                    className="btn-secondary w-full"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}