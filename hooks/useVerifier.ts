'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

interface VerifierStatus {
  is_verifier: boolean
  clerk_id_hash: string
}

interface UseVerifierReturn {
  isVerifier: boolean
  isLoading: boolean
  error: string | null
  clerkIdHash: string | null
}

export function useVerifier(): UseVerifierReturn {
  const { userId, isLoaded } = useAuth()
  const [isVerifier, setIsVerifier] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clerkIdHash, setClerkIdHash] = useState<string | null>(null)

  useEffect(() => {
    async function checkVerifierStatus() {
      if (!isLoaded) return

      if (!userId) {
        setIsVerifier(false)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/verifiers')

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: VerifierStatus = await response.json()

        setIsVerifier(data.is_verifier)
        setClerkIdHash(data.clerk_id_hash)
      } catch (err) {
        console.error('Error checking verifier status:', err)
        setError(err instanceof Error ? err.message : 'Failed to check verifier status')
        setIsVerifier(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkVerifierStatus()
  }, [userId, isLoaded])

  return {
    isVerifier,
    isLoading,
    error,
    clerkIdHash
  }
}