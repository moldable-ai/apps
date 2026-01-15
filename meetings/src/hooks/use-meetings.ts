'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useWorkspace } from '@moldable/ui'
import type { Meeting, TranscriptSegment } from '@/types'

export function useMeetings() {
  const queryClient = useQueryClient()
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  const {
    data: meetings = [],
    isLoading,
    refetch: refreshMeetings,
  } = useQuery<Meeting[]>({
    queryKey: ['meetings', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/meetings')
      if (!res.ok) {
        console.error('Failed to load meetings:', res.statusText)
        return []
      }
      const data = (await res.json()) as Meeting[]
      // Convert date strings back to Date objects
      return data.map((m) => ({
        ...m,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
        endedAt: m.endedAt ? new Date(m.endedAt) : undefined,
        segments: m.segments.map((s) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        })),
      }))
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (meeting: Meeting) => {
      const res = await fetchWithWorkspace('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meeting),
      })
      if (!res.ok) {
        throw new Error('Failed to save meeting')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const res = await fetchWithWorkspace(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Failed to delete meeting')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] })
    },
  })

  const addMeeting = useCallback(
    (meeting: Meeting) => {
      saveMutation.mutate(meeting)
    },
    [saveMutation],
  )

  const updateMeeting = useCallback(
    (meeting: Meeting) => {
      saveMutation.mutate(meeting)
    },
    [saveMutation],
  )

  const deleteMeeting = useCallback(
    (meetingId: string) => {
      deleteMutation.mutate(meetingId)
    },
    [deleteMutation],
  )

  const getMeetingById = useCallback(
    async (meetingId: string): Promise<Meeting | null> => {
      const res = await fetchWithWorkspace(`/api/meetings/${meetingId}`)
      if (!res.ok) return null
      const meeting = (await res.json()) as Meeting
      return {
        ...meeting,
        createdAt: new Date(meeting.createdAt),
        updatedAt: new Date(meeting.updatedAt),
        endedAt: meeting.endedAt ? new Date(meeting.endedAt) : undefined,
        segments: meeting.segments.map((s) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        })),
      }
    },
    [fetchWithWorkspace],
  )

  return {
    meetings,
    isLoading,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    getMeetingById,
    refreshMeetings,
  }
}

export function useActiveMeeting() {
  const { fetchWithWorkspace } = useWorkspace()
  const [meeting, setMeeting] = useState<Meeting | null>(null)

  const startMeeting = useCallback(
    (id: string, title: string, saveAudio: boolean) => {
      const newMeeting: Meeting = {
        id,
        title,
        createdAt: new Date(),
        updatedAt: new Date(),
        duration: 0,
        segments: [],
        saveAudio,
      }
      setMeeting(newMeeting)
      return newMeeting
    },
    [],
  )

  const addSegment = useCallback(
    (segment: TranscriptSegment) => {
      setMeeting((prev) => {
        if (!prev) return prev
        const updated = {
          ...prev,
          segments: [...prev.segments, segment],
          updatedAt: new Date(),
        }
        // Auto-save to server
        fetchWithWorkspace('/api/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        })
        return updated
      })
    },
    [fetchWithWorkspace],
  )

  const updateDuration = useCallback((duration: number) => {
    setMeeting((prev) => {
      if (!prev) return prev
      return { ...prev, duration, updatedAt: new Date() }
    })
  }, [])

  const updateTitle = useCallback(
    (title: string) => {
      setMeeting((prev) => {
        if (!prev) return prev
        const updated = { ...prev, title, updatedAt: new Date() }
        fetchWithWorkspace('/api/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        })
        return updated
      })
    },
    [fetchWithWorkspace],
  )

  const endMeeting = useCallback(
    (audioPath?: string) => {
      setMeeting((prev) => {
        if (!prev) return prev
        const ended: Meeting = {
          ...prev,
          endedAt: new Date(),
          updatedAt: new Date(),
          audioPath,
        }
        fetchWithWorkspace('/api/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ended),
        })
        return ended
      })
    },
    [fetchWithWorkspace],
  )

  const clearMeeting = useCallback(() => {
    setMeeting(null)
  }, [])

  return {
    meeting,
    startMeeting,
    addSegment,
    updateDuration,
    updateTitle,
    endMeeting,
    clearMeeting,
  }
}
