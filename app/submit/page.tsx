'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Header from '@/components/header'
import { extractYouTubeInfo } from '@/lib/utils'

export default function SubmitPage() {
  const router = useRouter()
  const { userId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    question: '',
    answer_summary: '',
    youtube_url: '',
    stats: [{ description: '', source_url: '' }],
    bible_verses: [{ book: '', chapter: '', verse: '', text: '' }]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      alert('Please sign in to submit entries')
      return
    }

    if (!extractYouTubeInfo(formData.youtube_url)) {
      alert('Please enter a valid YouTube URL')
      return
    }

    setLoading(true)

    try {
      const cleanStats = formData.stats.filter(s => s.description)
      const cleanVerses = formData.bible_verses.filter(v => v.book && v.chapter && v.verse)

      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          stats: cleanStats,
          bible_verses: cleanVerses
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

  const addVerse = () => {
    setFormData({
      ...formData,
      bible_verses: [...formData.bible_verses, { book: '', chapter: '', verse: '', text: '' }]
    })
  }

  const removeVerse = (index: number) => {
    setFormData({
      ...formData,
      bible_verses: formData.bible_verses.filter((_, i) => i !== index)
    })
  }

  const updateVerse = (index: number, field: string, value: string) => {
    const newVerses = [...formData.bible_verses]
    newVerses[index] = { ...newVerses[index], [field]: value }
    setFormData({ ...formData, bible_verses: newVerses })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Submit New Entry</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Debate Question
            </label>
            <input
              type="text"
              required
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What was the question or topic being debated?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer Summary
            </label>
            <textarea
              required
              value={formData.answer_summary}
              onChange={(e) => setFormData({ ...formData, answer_summary: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Summarize Charlie Kirk's response..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube URL
            </label>
            <input
              type="url"
              required
              value={formData.youtube_url}
              onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Related Statistics (Optional)
              </label>
              <button
                type="button"
                onClick={addStat}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                + Add Stat
              </button>
            </div>
            {formData.stats.map((stat, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={stat.description}
                  onChange={(e) => updateStat(index, 'description', e.target.value)}
                  placeholder="Stat description"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="url"
                  value={stat.source_url}
                  onChange={(e) => updateStat(index, 'source_url', e.target.value)}
                  placeholder="Source URL"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeStat(index)}
                  className="px-3 py-2 text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Bible Verses (Optional)
              </label>
              <button
                type="button"
                onClick={addVerse}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                + Add Verse
              </button>
            </div>
            {formData.bible_verses.map((verse, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                <input
                  type="text"
                  value={verse.book}
                  onChange={(e) => updateVerse(index, 'book', e.target.value)}
                  placeholder="Book"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={verse.chapter}
                  onChange={(e) => updateVerse(index, 'chapter', e.target.value)}
                  placeholder="Chapter"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={verse.verse}
                  onChange={(e) => updateVerse(index, 'verse', e.target.value)}
                  placeholder="Verse"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeVerse(index)}
                  className="px-3 py-2 text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Entry'}
          </button>
        </form>
      </main>
    </div>
  )
}