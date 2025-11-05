'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  BellIcon, 
  XMarkIcon,
  CheckIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'

interface Notification {
  _id: string
  title: string
  message: string
  type: string
  from_doctor: string
  read: boolean
  created_at: string
  scheduled_at?: string
  consultation_type?: string
}

interface NotificationBellProps {
  className?: string
}

export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastNotificationCount = useRef(0)

  // Initialize notification sound using Web Audio API
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    const createNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        return () => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
          
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.3)
        }
      } catch (error) {
        console.log('Web Audio API not supported:', error)
        return null
      }
    }

    const playSound = createNotificationSound()
    if (playSound) {
      audioRef.current = { play: playSound } as any
    }
  }, [])

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/my-notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
        
        // Play sound if new notifications arrived
        if (data.unread_count > lastNotificationCount.current && lastNotificationCount.current > 0) {
          if (audioRef.current?.play) {
            audioRef.current.play()
          }
        }
        lastNotificationCount.current = data.unread_count
      } else if (response.status === 401) {
        // Token expired or invalid - redirect to login
        console.log('Authentication failed - redirecting to login')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/auth/login'
        return
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        fetchNotifications() // Refresh notifications
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        fetchNotifications() // Refresh notifications
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Clear all notifications (for testing)
  const clearAllNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/clear-all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        fetchNotifications() // Refresh notifications
      }
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }

  // Fetch notifications on mount and set up polling
  useEffect(() => {
    fetchNotifications()
    
    // Poll for new notifications every 3 seconds for real-time updates
    const interval = setInterval(fetchNotifications, 3000)
    
    return () => clearInterval(interval)
  }, [])

  const formatTime = (dateString: string) => {
    try {
      // Parse the UTC timestamp
      const date = new Date(dateString)
      const now = new Date()
      
      // Calculate difference in milliseconds
      const diffInMs = now.getTime() - date.getTime()
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
      
      console.log(`Notification time: ${dateString}, Current time: ${now.toISOString()}, Diff: ${diffInMinutes}m`)
      
      if (diffInMinutes < 1) return 'Just now'
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
      return date.toLocaleDateString()
    } catch (error) {
      console.error('Error parsing date:', dateString, error)
      return 'Unknown time'
    }
  }

  const formatScheduledTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full transition-colors duration-200"
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-6 w-6 text-blue-600" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <BellIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No notifications yet</p>
                <p className="text-sm">You'll see appointment updates here</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <CalendarIcon className="h-4 w-4 text-blue-500" />
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        {notification.message}
                      </p>
                      
                      {notification.scheduled_at && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
                          <ClockIcon className="h-3 w-3" />
                          <span>{formatScheduledTime(notification.scheduled_at)}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          From: {notification.from_doctor} • {formatTime(notification.created_at)}
                        </span>
                        
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                          >
                            <CheckIcon className="h-3 w-3" />
                            <span>Mark read</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
