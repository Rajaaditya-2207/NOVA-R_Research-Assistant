import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import SessionHistory from '../components/SessionHistory'
import {
  Send,
  Sun,
  Moon,
  Trash2,
  X,
  FileText,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Settings2,
  Mic,
  Plus,
  CheckCircle2,
  Menu,
  LogOut
} from 'lucide-react'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const STORAGE_KEY = 'nova-r-session-id'

const buildUrl = (path: string) => `${API_BASE_URL}${path}`

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
  optimistic?: boolean
  attachedFiles?: UploadedFile[]
  attachedImages?: ImageAttachment[]
}

interface UploadedFile {
  id: number
  name: string
  size?: number
  uploadedAt?: string
  chunks?: number
  filePath?: string  // Unique filename on server for viewing original file
}

interface ImageAttachment {
  id: string
  url: string
  filename: string
  size: number
  filePath?: string  // File path on server for persistent access
}

interface UploadNotification {
  id: string
  fileName: string
  status: 'uploading' | 'success' | 'error'
  message?: string
}

const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '—'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

const formatMessage = (content: string) => {
  let formatted = content
    // Code blocks (```)
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg my-2 overflow-x-auto"><code>$1</code></pre>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>')
    // Bullet lists
    .replace(/^[*-] (.+)$/gm, '<li class="ml-4">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br>')
  
  // Wrap consecutive <li> in <ul>
  formatted = formatted.replace(/(<li[^>]*>.*?<\/li>(?:<br>)?)+/g, '<ul class="list-disc my-2">$&</ul>')
  formatted = formatted.replace(/<br><ul/g, '<ul').replace(/<\/ul><br>/g, '</ul>')
  
  return formatted
}

const Chat: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(false)  // Changed to false - no auto-init
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploadedImages, setUploadedImages] = useState<ImageAttachment[]>([])
  const [sessionDocuments, setSessionDocuments] = useState<UploadedFile[]>([])  // Current session docs only
  const [sessionImages, setSessionImages] = useState<ImageAttachment[]>([])  // Current session images only
  const [error, setError] = useState<string | null>(null)
  const [uploadNotifications, setUploadNotifications] = useState<UploadNotification[]>([])
  const [viewingFile, setViewingFile] = useState<UploadedFile | null>(null)
  const [expandedFileId, setExpandedFileId] = useState<number | null>(null)
  const [user, setUser] = useState<{ name: string; email?: string; picture?: string; auth_type: string } | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const userDocsLoadedRef = useRef<boolean>(false)

  // Use only session-specific documents (not user-level)
  useMemo(() => {
    const uniqueFiles = Array.from(
      new Map(sessionDocuments.map(file => [file.id, file])).values()
    )
    setUploadedFiles(uniqueFiles)
    
    const uniqueImages = Array.from(
      new Map(sessionImages.map(img => [img.id, img])).values()
    )
    setUploadedImages(uniqueImages)
  }, [sessionDocuments, sessionImages])

  const displayError = useCallback((message: string) => {
    setError(message)
    window.setTimeout(() => setError(null), 5000)
  }, [])

  const addUploadNotification = useCallback((notification: UploadNotification) => {
    setUploadNotifications(prev => [...prev, notification])
    if (notification.status !== 'uploading') {
      setTimeout(() => {
        setUploadNotifications(prev => prev.filter(n => n.id !== notification.id))
      }, 3000)
    }
  }, [])

  const updateUploadNotification = useCallback((id: string, updates: Partial<UploadNotification>) => {
    setUploadNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, ...updates } : n))
    )
    if (updates.status !== 'uploading') {
      setTimeout(() => {
        setUploadNotifications(prev => prev.filter(n => n.id !== id))
      }, 3000)
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  useEffect(() => {
    // Check auth status on mount
    const checkAuth = async () => {
      try {
        const response = await fetch(buildUrl('/auth/status'), { credentials: 'include' })
        const data = await response.json()
        if (data.user) {
          setUser(data.user)
        }
      } catch (err) {
        console.error('Auth check failed:', err)
      }
    }
    void checkAuth()
  }, []) // Run only once on mount

  const handleLogout = async () => {
    try {
      await fetch(buildUrl('/auth/logout'), { 
        method: 'POST',
        credentials: 'include'
      })
      sessionStorage.removeItem(STORAGE_KEY)
      navigate('/login')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  const parseHistory = (history: Array<Record<string, unknown>>): Message[] =>
    history.map((item, index) => {
      const role = (item.role as string) === 'assistant' ? 'assistant' : 'user'
      const createdAt = item.created_at as string | undefined
      const attachments = item.attachments as { files?: UploadedFile[], images?: ImageAttachment[] } | null | undefined
      
      return {
        id: String(item.id ?? `${role}-${createdAt ?? index}`),
        content: String(item.content ?? ''),
        sender: role,
        timestamp: createdAt ? new Date(createdAt) : new Date(),
        attachedFiles: attachments?.files,
        attachedImages: attachments?.images
      }
    })

  const loadHistory = useCallback(async (activeSessionId: string) => {
    setIsHistoryLoading(true)
    try {
      const response = await fetch(buildUrl(`/chat/history/${activeSessionId}`), { credentials: 'include' })
      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }
      const data = await response.json()
      const history = Array.isArray(data.history) ? data.history : []
      setMessages(parseHistory(history))
    } catch (error) {
      console.error('History load error:', error)
      displayError('Failed to load chat history.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [displayError])

  const loadDocuments = useCallback(async (activeSessionId: string) => {
    try {
      const response = await fetch(buildUrl(`/chat/documents/${activeSessionId}`), { credentials: 'include' })
      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }
      const data = await response.json()
      const docs = Array.isArray(data.documents) ? data.documents : []
      
      // Filter out documents without proper filenames
      const validDocs = docs.filter((doc: Record<string, unknown>) => {
        const name = doc.name ?? doc.filename
        return name && String(name).trim() !== '' && String(name) !== 'Document'
      })
      
      // Group chunks by base filename
      const fileGroups = new Map<string, { ids: number[], size: number, uploadedAt?: string, filePath?: string }>()
      
      validDocs.forEach((doc: Record<string, unknown>) => {
        const fullName = String(doc.name ?? doc.filename)
        // Extract base filename (remove " (part X/Y)" suffix)
        const baseNameMatch = fullName.match(/^(.+?)(?: \(part \d+\/\d+\))?$/)
        const baseName = baseNameMatch ? baseNameMatch[1] : fullName
        
        const docSize = typeof doc.size === 'number' ? doc.size : 0
        const docId = Number(doc.id)
        const uploadedAt = typeof doc.uploaded_at === 'string' ? doc.uploaded_at : undefined
        const filePath = typeof doc.file_path === 'string' ? doc.file_path : undefined
        
        if (fileGroups.has(baseName)) {
          const group = fileGroups.get(baseName)!
          group.ids.push(docId)
          group.size += docSize
          // Preserve file_path if it exists
          if (!group.filePath && filePath) {
            group.filePath = filePath
          }
        } else {
          fileGroups.set(baseName, { 
            ids: [docId], 
            size: docSize,
            uploadedAt,
            filePath
          })
        }
      })
      
      // Convert grouped files to uploadedFiles format
      const sessionFiles = Array.from(fileGroups.entries()).map(([name, group]) => ({
        id: group.ids[0], // Use first chunk's ID for operations
        name,
        size: group.size,
        uploadedAt: group.uploadedAt,
        chunks: group.ids.length,
        filePath: group.filePath
      }))
      
      // Store session-specific documents
      setSessionDocuments(sessionFiles)
    } catch (error) {
      console.error('Document load error:', error)
      displayError('Failed to load uploaded documents.')
    }
  }, [displayError])

  // Removed unused loadAllUserDocuments function

  const initializeSession = useCallback(async (forceNew = false): Promise<string | null> => {
    setIsBootstrapping(true)
    try {
      let activeSessionId: string | null = forceNew ? null : sessionStorage.getItem(STORAGE_KEY)

      if (!activeSessionId) {
        const response = await fetch(buildUrl('/chat/session'), { method: 'POST', credentials: 'include' })
        if (!response.ok) {
          throw new Error('Failed to create session')
        }
        const data = await response.json()
        activeSessionId = String(data.session_id)
        sessionStorage.setItem(STORAGE_KEY, activeSessionId)
      }

      setSessionId(activeSessionId)
      await Promise.all([loadHistory(activeSessionId), loadDocuments(activeSessionId)])
      return activeSessionId
    } catch (error) {
      console.error('Session init error:', error)
      displayError('Unable to initialise the chat session. Please refresh and try again.')
      return null
    } finally {
      setIsBootstrapping(false)
    }
  }, [displayError, loadDocuments, loadHistory])

  // Don't auto-initialize session - only create when user sends first message
  // This prevents empty sessions from being created

  const ensureSession = useCallback(async () => {
    if (sessionId) {
      return sessionId
    }
    
    // Try to restore from sessionStorage first
    const storedId = sessionStorage.getItem(STORAGE_KEY)
    if (storedId) {
      setSessionId(storedId)
      // Load history and documents for existing session
      setIsBootstrapping(true)
      try {
        await Promise.all([loadHistory(storedId), loadDocuments(storedId)])
      } catch (error) {
        console.error('Error loading session:', error)
      } finally {
        setIsBootstrapping(false)
      }
      return storedId
    }
    
    // Create new session only when needed
    return initializeSession()
  }, [sessionId, initializeSession, loadHistory, loadDocuments])

  const handleSessionSelect = useCallback(async (newSessionId: string) => {
    if (newSessionId === sessionId) return
    
    setIsBootstrapping(true)
    setSessionId(newSessionId)
    sessionStorage.setItem(STORAGE_KEY, newSessionId)
    setMessages([])
    // Clear session-specific documents (user docs will persist)
    setSessionDocuments([])
    setSessionImages([])
    
    try {
      await Promise.all([
        loadHistory(newSessionId),
        loadDocuments(newSessionId)
      ])
    } catch (error) {
      console.error('Error loading session:', error)
    } finally {
      setIsBootstrapping(false)
    }
  }, [sessionId, loadHistory, loadDocuments])

  const handleNewSession = useCallback(async () => {
    sessionStorage.removeItem(STORAGE_KEY)
    setSessionId(null)
    setMessages([])
    setUploadedFiles([])
    await initializeSession(true)
  }, [initializeSession])

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isLoading) return

    const activeSessionId = await ensureSession()
    if (!activeSessionId) return

    // Create copies of files and images for the message (prevents deletion sync issues)
    const filesForMessage = uploadedFiles.map(f => ({...f}))
    const imagesForMessage = uploadedImages.map(img => ({...img}))

    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
      content: trimmed,
      sender: 'user',
      timestamp: new Date(),
      optimistic: true,
      attachedFiles: filesForMessage.length > 0 ? filesForMessage : undefined,
      attachedImages: imagesForMessage.length > 0 ? imagesForMessage : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    
    // Prepare image URLs for vision model
    const imagesToSend = uploadedImages.map(img => img.url)
    
    // Clear uploaded files and images from input area after sending
    setUploadedFiles([])
    setUploadedImages([])
    setExpandedFileId(null)
    
    // Clear session files and images after sending (they're attached to message now)
    setSessionImages([])
    setSessionDocuments([])
    
    setIsLoading(true)

    try {
      const response = await fetch(buildUrl('/chat/ask'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          message: trimmed,
          session_id: activeSessionId,
          images: imagesToSend,
          attached_files: filesForMessage,
          attached_images: imagesForMessage
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: `temp-assistant-${Date.now()}`,
        content: String(data.response || ''),
        sender: 'assistant',
        timestamp: new Date(),
        optimistic: true
      }

      setMessages(prev => [...prev, assistantMessage])
      // Don't reload history - it would lose the attached files/images
      // The optimistic messages already have all the data we need
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(msg => !msg.optimistic))
      displayError('Sorry, I encountered an error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSendMessage()
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || isUploading) return

    const activeSessionId = await ensureSession()
    if (!activeSessionId) return

    const existingCount = uploadedFiles.length
    const maxFiles = 5
    const availableSlots = maxFiles - existingCount

    if (availableSlots <= 0) {
      displayError(`You can only upload up to ${maxFiles} files per session.`)
      return
    }

    const fileQueue = Array.from(files).slice(0, availableSlots)
    if (fileQueue.length < files.length) {
      displayError(`Only the first ${availableSlots} file(s) were uploaded to stay within the session limit.`)
    }

    setIsUploading(true)

    try {
      for (const file of fileQueue) {
        const notificationId = `upload-${Date.now()}-${Math.random()}`
        
        // Show uploading notification
        addUploadNotification({
          id: notificationId,
          fileName: file.name,
          status: 'uploading'
        })

        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('session_id', activeSessionId)

          const response = await fetch(buildUrl('/chat/upload'), {
            method: 'POST',
            credentials: 'include',
            body: formData
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Upload failed')
          }

          // Check if it's an image upload
          if (data.type === 'image') {
            // Store image separately for vision model
            const imageAttachment: ImageAttachment = {
              id: data.id,
              url: data.url,
              filename: data.filename,
              size: data.size,
              filePath: data.file_path  // Save file path for persistence
            }
            setSessionImages(prev => [...prev, imageAttachment])
            
            updateUploadNotification(notificationId, {
              status: 'success',
              message: 'Image ready for analysis'
            })
          } else {
            // Handle regular document upload
            const uploaded = data.file as Record<string, unknown> | undefined
            const newFile: UploadedFile = {
              id: Number(uploaded?.id ?? Date.now()),
              name: String(uploaded?.name ?? file.name),
              size: typeof uploaded?.size === 'number' ? uploaded?.size : file.size,
              uploadedAt: typeof uploaded?.uploaded_at === 'string' ? uploaded?.uploaded_at : undefined,
              chunks: typeof uploaded?.chunks === 'number' ? uploaded?.chunks : 1,
              filePath: typeof uploaded?.file_path === 'string' ? uploaded?.file_path : undefined
            }

            setSessionDocuments(prev => [...prev, newFile])
            
            updateUploadNotification(notificationId, {
              status: 'success',
              message: 'Uploaded successfully'
            })
          }
        } catch (error) {
          console.error('Upload error:', error)
          
          // Update to error
          updateUploadNotification(notificationId, {
            status: 'error',
            message: error instanceof Error ? error.message : 'Upload failed'
          })
        }
      }

      await loadDocuments(activeSessionId)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      setIsUploading(false)
    }
  }

  const removeFile = async (fileName: string) => {
    const activeSessionId = await ensureSession()
    if (!activeSessionId) return

    try {
      const response = await fetch(
        buildUrl(`/chat/upload/by-name/${encodeURIComponent(fileName)}?session_id=${encodeURIComponent(activeSessionId)}`), 
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMsg = (data as Record<string, string>).error || 'Failed to delete file'
        throw new Error(errorMsg)
      }

      setUploadedFiles(prev => prev.filter(f => f.name !== fileName))
    } catch (error) {
      console.error('Error removing file:', error)
      displayError(error instanceof Error ? error.message : 'Unable to remove the selected file.')
    }
  }

  const clearChat = async () => {
    const confirmClear = window.confirm('Start a fresh session? Your current conversation and uploaded documents will remain stored for reference.')
    if (!confirmClear) return

    sessionStorage.removeItem(STORAGE_KEY)
    setMessages([])
    setUploadedFiles([])
    await initializeSession(true)
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-[#E0E0E0] transition-colors duration-200 overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
      
      {/* Session History Sidebar */}
      <div className={`${showSidebar ? 'fixed md:relative inset-y-0 left-0 z-40 w-full sm:w-80 md:w-64' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900`}>
        <SessionHistory
          currentSessionId={sessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
        />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between p-2 sm:p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              <Menu size={18} className="sm:w-5 sm:h-5" />
            </button>
            <Link to="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
            </Link>
            <h1 className="font-semibold text-base sm:text-lg">NOVA-R</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">{/*Changed from line 536*/}
          {user && (
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1 sm:py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-sky-400 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden md:block">
                <p className="text-sm font-medium">{user.name}</p>
                {user.auth_type === 'trial' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Trial Mode</p>
                )}
              </div>
            </div>
          )}
          <button className="hidden sm:block p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <Settings2 size={18} className="sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} className="sm:w-5 sm:h-5" /> : <Moon size={18} className="sm:w-5 sm:h-5" />}
          </button>
           <button
            onClick={() => void clearChat()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Clear chat"
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          {user && (
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={18} className="sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-2 sm:p-4">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && !isLoading && !isHistoryLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <img 
                src="/nova-avatar.png" 
                alt="NOVA-R" 
                className="w-20 h-20 rounded-full mb-4 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4';
                  e.currentTarget.parentElement?.appendChild(fallback);
                }}
              />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to NOVA-R</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">How can I help you today?</p>
            </div>
          )}
           <div className="space-y-8">
            {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-4 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden">
                {message.sender === 'user' ? (
                  <>
                    {user?.picture ? (
                      <img 
                        src={user.picture} 
                        alt={user.name} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-full h-full bg-sky-400 flex items-center justify-center text-white font-bold"
                      style={{ display: user?.picture ? 'none' : 'flex' }}
                    >
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </>
                ) : (
                  <img 
                    src="/nova-avatar.png" 
                    alt="NOVA" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = 'w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold';
                      fallback.textContent = 'N';
                      target.parentElement?.appendChild(fallback);
                    }}
                  />
                )}
              </div>
              <div className={`flex-1 ${message.sender === 'user' ? 'flex flex-col items-end' : ''}`}>
                {/* Show attached images for user messages */}
                {message.sender === 'user' && message.attachedImages && message.attachedImages.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2 justify-end max-w-[85%]">
                    {message.attachedImages.map((image) => (
                      <div
                        key={image.id}
                        className="relative group cursor-pointer"
                        onClick={() => window.open(image.url, '_blank')}
                        title={`Click to view full size: ${image.filename}`}
                      >
                        <img
                          src={image.url}
                          alt={image.filename}
                          className="h-32 w-32 object-cover rounded-lg border-2 border-blue-400/50 hover:border-blue-400 transition-colors"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg truncate">
                          {image.filename}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Show attached files for user messages */}
                {message.sender === 'user' && message.attachedFiles && message.attachedFiles.length > 0 && (
                  <div className="mb-2 space-y-2 max-w-[85%] w-full">
                    {message.attachedFiles.map((file) => (
                      <div key={file.id} className="w-full">
                        <button
                          onClick={() => setExpandedFileId(expandedFileId === file.id ? null : file.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-200 rounded-lg text-sm border border-blue-300 dark:border-blue-400/30 hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors cursor-pointer"
                        >
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate flex-1 text-left">{file.name}</span>
                          <span className="opacity-70 text-xs">({formatFileSize(file.size)})</span>
                          {file.chunks && file.chunks > 1 && (
                            <span className="opacity-70 text-xs">×{file.chunks}</span>
                          )}
                          <span className="text-xs">{expandedFileId === file.id ? '▼' : '▶'}</span>
                        </button>
                        
                        {/* Inline document viewer */}
                        {expandedFileId === file.id && file.filePath && (
                          <div className="mt-2 bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-blue-300 dark:border-blue-400/30">
                            <div className="flex items-center justify-between p-2 bg-blue-100 dark:bg-blue-500/10 border-b border-blue-300 dark:border-blue-400/30">
                              <span className="text-xs text-blue-700 dark:text-blue-200">{file.name}</span>
                              <a
                                href={buildUrl(`/chat/file/${file.filePath}`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Open in new tab ↗
                              </a>
                            </div>
                            <iframe
                              src={buildUrl(`/chat/file/${file.filePath}`)}
                              className="w-full h-96 border-0"
                              title={file.name}
                            />
                          </div>
                        )}
                        
                        {expandedFileId === file.id && !file.filePath && (
                          <div className="mt-2 p-4 bg-red-500/10 border border-red-400/30 rounded-lg text-red-300 text-sm">
                            Original file not available. This may be an older document.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div
                  className={`p-4 rounded-2xl shadow-sm max-w-[85%] ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white break-words'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                  } ${message.optimistic ? 'opacity-80' : ''}`}
                >
                  <div
                    className={`prose prose-sm max-w-none ${
                      message.sender === 'user' ? 'prose-invert' : 'dark:prose-invert'
                    }`}
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  />
                </div>
                <div
                  className={`mt-2 text-xs text-gray-500 dark:text-gray-400 ${
                    message.sender === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}

          {(isLoading || isHistoryLoading) && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                N
              </div>
              <div className="flex-1">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {isHistoryLoading ? 'Loading your conversation…' : 'Crafting a response…'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Upload Notifications - Moved above textarea */}
      {uploadNotifications.length > 0 && (
        <div className="px-4 pb-2">
          <div className="max-w-3xl mx-auto space-y-2">
          {uploadNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300 ${
                notification.status === 'uploading'
                  ? 'bg-blue-50/90 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700'
                  : notification.status === 'success'
                  ? 'bg-green-50/90 dark:bg-green-900/40 border-green-200 dark:border-green-700'
                  : 'bg-red-50/90 dark:bg-red-900/40 border-red-200 dark:border-red-700'
              }`}
            >
              {notification.status === 'uploading' && (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
              )}
              {notification.status === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              )}
              {notification.status === 'error' && (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {notification.fileName}
                </p>
                {notification.message && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {notification.message}
                  </p>
                )}
                {notification.status === 'uploading' && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Processing embeddings...
                  </p>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Uploaded Files Display */}
       {uploadedImages.length > 0 && (
        <div className="px-4 lg:px-6 py-2">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Images for analysis:</p>
            <div className="flex flex-wrap gap-2">
              {uploadedImages.map((image) => (
                <div
                  key={image.id}
                  className="relative group"
                >
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    onClick={() => setUploadedImages(prev => prev.filter(img => img.id !== image.id))}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg truncate">
                    {image.filename}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="p-2 sm:p-4">
        <div className="max-w-3xl mx-auto">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/20 text-red-400 p-3 rounded-lg mb-4">
              <AlertCircle size={20} />
              <p>{error}</p>
              <button onClick={() => setError(null)} className="ml-auto p-1">
                <X size={18} />
              </button>
            </div>
          )}
          
          {/* Compact file attachments notification */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 space-y-1">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <button
                    onClick={() => setExpandedFileId(expandedFileId === file.id ? null : file.id)}
                    className="flex-1 text-left truncate text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                    title={file.name}
                  >
                    {file.name}
                  </button>
                  <span className="text-xs text-blue-600/70 dark:text-blue-400/70">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    onClick={() => void removeFile(file.name)}
                    className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded transition-colors"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5 text-blue-700 dark:text-blue-300" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Compact image attachments notification */}
          {uploadedImages.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedImages.map((image) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="h-16 w-16 object-cover rounded-lg border-2 border-blue-400/50 cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => window.open(image.url, '_blank')}
                    title={`Click to view: ${image.filename}`}
                  />
                  <button
                    onClick={() => setUploadedImages(prev => prev.filter(img => img.id !== image.id))}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Expandable document preview */}
          {expandedFileId && uploadedFiles.find(f => f.id === expandedFileId) && (
            <div className="mb-3 bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-blue-300 dark:border-blue-700 shadow-lg">
              <div className="flex items-center justify-between p-2 bg-blue-100 dark:bg-blue-500/10 border-b border-blue-300 dark:border-blue-400/30">
                <span className="text-xs text-blue-700 dark:text-blue-200 truncate">
                  {uploadedFiles.find(f => f.id === expandedFileId)?.name}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={buildUrl(`/chat/file/${uploadedFiles.find(f => f.id === expandedFileId)?.filePath}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 underline"
                  >
                    Open in new tab ↗
                  </a>
                  <button
                    onClick={() => setExpandedFileId(null)}
                    className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-blue-700 dark:text-blue-300" />
                  </button>
                </div>
              </div>
              <iframe
                src={buildUrl(`/chat/file/${uploadedFiles.find(f => f.id === expandedFileId)?.filePath}`)}
                className="w-full h-96 border-0"
                title={uploadedFiles.find(f => f.id === expandedFileId)?.name}
              />
            </div>
          )}
          
          <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-transparent rounded-full flex items-center p-1 sm:p-2 shadow-lg transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.pdf,.doc,.docx,.md,.csv,.json,.xml,.html,.py,.js,.ts,.jsx,.tsx,.java,.cpp,.c,.cs,.rb,.go,.rs,.swift,.png,.jpg,.jpeg,.gif,.webp,.bmp,.mp4,.avi,.mov,.mkv,.webm,.mp3,.wav,.ogg,.m4a"
              className="hidden"
              onChange={(e) => void handleFileUpload(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadedFiles.length >= 5 || isUploading || isBootstrapping}
              className="p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
              title="Upload document"
            >
              <Plus size={18} className="sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask NOVA-R"
              className="flex-1 bg-transparent resize-none border-none outline-none px-2 sm:px-4 text-sm sm:text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100"
              rows={1}
              disabled={isLoading || isBootstrapping}
            />
            <button className="hidden sm:block p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <Mic size={18} className="sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isBootstrapping}
              className="p-2 sm:p-3 bg-blue-600 text-white rounded-full disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              {isLoading ? <Loader2 size={18} className="sm:w-5 sm:h-5 animate-spin" /> : <Send size={18} className="sm:w-5 sm:h-5" />}
            </button>
          </div>
          <p className="text-xs text-center text-gray-500 dark:text-gray-500 mt-3">
            NOVA-R may display inaccurate info, including about people, so double-check its responses.
          </p>
        </div>
      </footer>

      {/* File View Modal */}
      {viewingFile && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setViewingFile(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{viewingFile.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(viewingFile.size)}
                    {viewingFile.chunks && viewingFile.chunks > 1 && ` • ${viewingFile.chunks} chunks`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingFile(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {viewingFile.filePath ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <iframe
                    src={buildUrl(`/chat/file/${viewingFile.filePath}`)}
                    className="w-full h-full min-h-[500px] border border-gray-200 dark:border-gray-700 rounded-lg"
                    title={viewingFile.name}
                  />
                  <a
                    href={buildUrl(`/chat/file/${viewingFile.filePath}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Open in New Tab
                  </a>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <p>Original file not available</p>
                  <p className="text-sm mt-2">This may be an older document uploaded before file storage was enabled.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

export default Chat