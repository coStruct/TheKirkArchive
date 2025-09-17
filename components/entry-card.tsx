import { EntryWithRelations } from '@/types/database'
import { CheckCircle, Clock, XCircle, ThumbsUp, ThumbsDown } from 'lucide-react'
import { generateYouTubeUrl } from '@/lib/utils'

interface EntryCardProps {
  entry: EntryWithRelations
  onVote?: (entryId: string, voteType: 'upvote' | 'downvote') => void
}

export default function EntryCard({ entry, onVote }: EntryCardProps) {
  const youtubeUrl = generateYouTubeUrl(entry.video_id, entry.start_seconds)

  const statusIcon = {
    pending: <Clock className="text-yellow-500" size={16} />,
    verified: <CheckCircle className="text-green-500" size={16} />,
    rejected: <XCircle className="text-red-500" size={16} />
  }[entry.verified_status]

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex-1">
          {entry.question}
        </h3>
        <div className="flex items-center gap-2 ml-4">
          {statusIcon}
          <span className="text-sm text-gray-600 capitalize">
            {entry.verified_status}
          </span>
        </div>
      </div>

      <p className="text-gray-700 mb-4">{entry.answer_summary}</p>

      {entry.stats && entry.stats.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-600 mb-2">Related Stats:</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {entry.stats.map((stat) => (
              <li key={stat.id}>
                {stat.description}
                {stat.source_url && (
                  <a
                    href={stat.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-blue-600 hover:underline"
                  >
                    [source]
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.bible_verses && entry.bible_verses.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-600 mb-2">Bible References:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {entry.bible_verses.map((verse) => (
              <li key={verse.id}>
                {verse.book} {verse.chapter}:{verse.verse}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm"
        >
          Watch on YouTube
        </a>

        {entry.vote_count && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => onVote?.(entry.id, 'upvote')}
              className="flex items-center gap-1 text-gray-600 hover:text-green-600 transition-colors"
            >
              <ThumbsUp size={16} />
              <span className="text-sm">{entry.vote_count.upvotes}</span>
            </button>
            <button
              onClick={() => onVote?.(entry.id, 'downvote')}
              className="flex items-center gap-1 text-gray-600 hover:text-red-600 transition-colors"
            >
              <ThumbsDown size={16} />
              <span className="text-sm">{entry.vote_count.downvotes}</span>
            </button>
            <span className="text-sm text-gray-500">
              Score: {entry.vote_count.weighted_score}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}