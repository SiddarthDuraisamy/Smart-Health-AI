'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon,
  XMarkIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface ChatMessage {
  type: 'user_message' | 'ai_message' | 'system' | 'typing' | 'error'
  message: string
  timestamp: string
  user_id?: string
  user_name?: string
  sender?: string
  status?: 'sent' | 'delivered' | 'error'
  confidence?: number
  suggestions?: string[]
  error?: boolean
}

interface RealTimeChatAssistantProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  consultationId?: string
}

export default function RealTimeChatAssistant({ 
  isOpen, 
  onClose, 
  userId, 
  consultationId 
}: RealTimeChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  
  const websocketRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const connectWebSocket = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      console.error('❌ No authentication token found')
      setConnectionStatus('error')
      return
    }

    // Always try to extract user ID from token if not provided
    let finalUserId = userId
    if (!finalUserId || finalUserId.trim() === '' || finalUserId === 'undefined' || finalUserId === 'null') {
      console.warn('⚠️ No user ID provided, extracting from JWT token. UserId received:', userId)
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]))
        console.log('🔍 JWT payload:', tokenPayload)
        finalUserId = tokenPayload.sub?.replace('@', '_').replace('.', '_') || 'unknown'
        console.log('🔧 Using email-based ID:', finalUserId)
      } catch (e) {
        console.error('❌ Failed to decode JWT:', e)
        setConnectionStatus('error')
        setMessages(prev => [...prev, {
          type: 'error',
          message: 'Unable to connect: Authentication failed. Please refresh the page.',
          timestamp: new Date().toISOString(),
          error: true
        }])
        return
      }
    }

    setConnectionStatus('connecting')
    
    const wsUrl = `ws://localhost:8000/api/v1/ws/chat/${finalUserId}?token=${encodeURIComponent(token)}`
    console.log('🔗 Connecting to WebSocket:', wsUrl)
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('✅ WebSocket connected')
      setIsConnected(true)
      setConnectionStatus('connected')
      
      // Add welcome message
      setMessages(prev => [...prev, {
        type: 'system',
        message: '🤖 AI Health Assistant connected. How can I help you today?',
        timestamp: new Date().toISOString(),
        sender: 'system'
      }])
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📨 Received message:', data)
        
        if (data.type === 'typing') {
          setIsTyping(true)
          // Clear typing indicator after 3 seconds
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
          }
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false)
          }, 3000)
        } else {
          setIsTyping(false)
          setMessages(prev => [...prev, data])
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onclose = (event) => {
      console.log('❌ WebSocket disconnected:', event.code, event.reason)
      setIsConnected(false)
      setConnectionStatus('disconnected')
      
      // Attempt to reconnect after 3 seconds if not intentionally closed
      if (event.code !== 1000 && isOpen) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...')
          connectWebSocket()
        }, 3000)
      }
    }

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
      setConnectionStatus('error')
    }

    websocketRef.current = ws
  }, [userId, isOpen])

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    if (websocketRef.current) {
      websocketRef.current.close(1000, 'User closed chat')
      websocketRef.current = null
    }
    
    setIsConnected(false)
    setConnectionStatus('disconnected')
    setIsTyping(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      connectWebSocket()
    } else {
      disconnectWebSocket()
    }

    return () => {
      disconnectWebSocket()
    }
  }, [isOpen, connectWebSocket, disconnectWebSocket])

  const sendMessage = () => {
    if (!currentMessage.trim() || !isConnected || !websocketRef.current) {
      return
    }

    const messageData = {
      type: 'chat',
      message: currentMessage.trim(),
      consultation_id: consultationId,
      language: 'en',
      timestamp: new Date().toISOString()
    }

    try {
      websocketRef.current.send(JSON.stringify(messageData))
      setCurrentMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        type: 'error',
        message: 'Failed to send message. Please try again.',
        timestamp: new Date().toISOString(),
        error: true
      }])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500'
      case 'connecting': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'error': return 'Connection Error'
      default: return 'Disconnected'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <SparklesIcon className="h-8 w-8 text-blue-600" />
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Health Assistant</h2>
              <p className={`text-xs ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[400px] max-h-[500px] bg-gray-50">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${
              message.type === 'user_message' ? 'justify-end' : 'justify-start'
            }`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                message.type === 'user_message' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                  : message.type === 'system'
                  ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border'
                  : message.type === 'error'
                  ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}>
                <div className="flex items-start space-x-2">
                  {message.type === 'ai_message' && (
                    <SparklesIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  )}
                  {message.type === 'error' && (
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{message.message}</p>
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs opacity-75">Suggestions:</p>
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentMessage(suggestion)}
                            className="block text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors duration-200"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs opacity-60">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                      {message.confidence && (
                        <p className="text-xs opacity-60">
                          {Math.round(message.confidence * 100)}% confidence
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 px-4 py-3 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
          <div className="flex space-x-3">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Ask me about your health..." : "Connecting..."}
              className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              disabled={!isConnected}
              maxLength={500}
            />
            <button
              onClick={sendMessage}
              disabled={!isConnected || !currentMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              <span>Send</span>
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Powered by AI • For informational purposes only
            </p>
            <p className="text-xs text-gray-400">
              {currentMessage.length}/500
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
