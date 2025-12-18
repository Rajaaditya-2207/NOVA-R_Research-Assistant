import React, { useState, useEffect } from 'react'
import { MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const buildUrl = (path: string) => `${API_BASE_URL}${path}`

interface Session {
  id: string
  title: string
  created_at: string
  last_activity: string
  message_count: number
}

interface SessionHistoryProps {
  currentSessionId: string | null
  onSessionSelect: (sessionId: string) => void
  onNewSession: () => void
}

const SessionHistory: React.FC<SessionHistoryProps> = ({
  currentSessionId,
  onSessionSelect,
  onNewSession
}) => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const fetchSessions = async () => {
    try {
      const response = await fetch(buildUrl('/chat/sessions'), {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
    // Refresh every 30 seconds
    const interval = setInterval(fetchSessions, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this chat? This cannot be undone.')) return

    try {
      const response = await fetch(buildUrl(`/chat/session/${sessionId}`), {
        method: 'DELETE',
        credentials: 'include'
      })
      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId))
        if (sessionId === currentSessionId) {
          onNewSession()
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const startEditing = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(session.id)
    setEditingTitle(session.title)
  }

  const saveTitle = async (sessionId: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }

    try {
      const response = await fetch(buildUrl(`/chat/session/${sessionId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: editingTitle })
      })
      if (response.ok) {
        setSessions(sessions.map(s =>
          s.id === sessionId ? { ...s, title: editingTitle } : s
        ))
      }
    } catch (error) {
      console.error('Failed to rename session:', error)
    } finally {
      setEditingId(null)
    }
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onNewSession}
        className="m-3 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all"
      >
        + New Chat
      </button>

      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {sessions.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">
            No chat history yet
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSessionSelect(session.id)}
              className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                session.id === currentSessionId
                  ? 'bg-purple-100 dark:bg-purple-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0 text-gray-400" />
                <div className="flex-1 min-w-0">
                  {editingId === session.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle(session.id)
                          if (e.key === 'Escape') cancelEditing()
                        }}
                        className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                        autoFocus
                      />
                      <button
                        onClick={() => saveTitle(session.id)}
                        className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {session.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(session.last_activity)} · {session.message_count} messages
                      </div>
                    </>
                  )}
                </div>
                {editingId !== session.id && (
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => startEditing(session, e)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default SessionHistory
