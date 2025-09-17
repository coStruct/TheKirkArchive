import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractYouTubeInfo(url: string) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)(?:[&?]t=(\d+))?/
  const match = url.match(regex)

  if (!match) return null

  return {
    videoId: match[1],
    startSeconds: match[2] ? parseInt(match[2]) : 0
  }
}

export function generateYouTubeUrl(videoId: string, startSeconds: number = 0) {
  const url = `https://youtu.be/${videoId}`
  return startSeconds > 0 ? `${url}?t=${startSeconds}` : url
}