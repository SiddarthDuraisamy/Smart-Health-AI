'use client'

import { useState, useEffect } from 'react'
import { 
  HeartIcon, 
  UserGroupIcon,
  ChartBarIcon,
  CalendarIcon,
  UserIcon,
  BellIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  total_consultations: number
  recent_consultations: number
  consultation_statuses: { [key: string]: number }
  top_conditions: Array<{ condition: string; count: number }>
  overview?: {
    total_patients: number
    total_consultations: number
    recent_consultations: number
  }
}

export default function DoctorDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [consultations, setConsultations] = useState<any[]>([])
  const [pendingConsultations, setPendingConsultations] = useState<any[]>([])
  const [todaysSchedule, setTodaysSchedule] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationSound, setNotificationSound] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchUserData()
    fetchDashboardStats()
    fetchConsultations()
    fetchPendingConsultations()
    generateMockNotifications()
    initializeNotificationSystem()
  }, [])

  const initializeNotificationSystem = () => {
    // Try to initialize notification sound, but don't fail if file doesn't exist
    try {
      const audio = new Audio('/notification-sound.mp3')
      audio.preload = 'auto'
      audio.onerror = () => {
        console.log('Notification sound file not found, will use fallback sound')
        setNotificationSound(null)
      }
      setNotificationSound(audio)
    } catch (error) {
      console.log('Could not initialize notification sound:', error)
      setNotificationSound(null)
    }

    // Start real-time notification polling
    startRealTimeNotifications()
  }

  const startRealTimeNotifications = () => {
    // Check immediately on start
    checkForNewAppointments()
    
    // Poll for new appointments every 5 seconds for better real-time experience
    const interval = setInterval(async () => {
      await checkForNewAppointments()
    }, 5000)

    // Cleanup on unmount
    return () => clearInterval(interval)
  }

  const checkForNewAppointments = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Use the working consultations endpoint from the logs
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/my-consultations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const consultationsData = await response.json()
        console.log('📊 Consultations API response:', consultationsData)
        
        // Handle both array and object responses
        const consultations = Array.isArray(consultationsData) ? consultationsData : consultationsData.consultations || []
        console.log('📋 Parsed consultations:', consultations.length, 'items')
        
        // Check for consultations created in the last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 120000)
        const recentConsultations = consultations.filter((consultation: any) => {
          const createdTime = new Date(consultation.created_at)
          const isRecent = createdTime > twoMinutesAgo && consultation.status === 'SCHEDULED'
          if (isRecent) {
            console.log('🔔 Found recent consultation:', consultation)
          }
          return isRecent
        })
        
        console.log('⏰ Recent consultations found:', recentConsultations.length)
        
        // Add notifications for new consultations
        recentConsultations.forEach((consultation: any) => {
          const existingNotification = notifications.find(n => n.appointmentId === consultation._id)
          if (!existingNotification) {
            const newNotification = {
              id: Date.now() + Math.random(),
              appointmentId: consultation._id,
              type: 'consultation',
              title: '🔔 New Consultation Request!',
              message: `New consultation: "${consultation.chief_complaint || consultation.reason || 'General consultation'}" - ${formatAppointmentTime(consultation.scheduled_at)}`,
              time: 'Just now',
              read: false,
              priority: consultation.priority || 'high',
              appointmentData: consultation
            }
            
            addNewNotification(newNotification)
          }
        })
      }
    } catch (error) {
      console.error('Error checking for new appointments:', error)
      // Try the pending consultations endpoint as backup
      await checkPendingConsultationsForNew()
    }
  }

  const checkPendingConsultationsForNew = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const pendingData = await response.json()
        
        // Handle different response formats
        const pendingConsultations = Array.isArray(pendingData) ? pendingData : 
                                   pendingData.consultations ? pendingData.consultations :
                                   pendingData.pending_consultations ? pendingData.pending_consultations : []
        
        if (Array.isArray(pendingConsultations)) {
          pendingConsultations.forEach((consultation: any) => {
            const existingNotification = notifications.find(n => n.appointmentId === consultation._id)
            if (!existingNotification) {
              // Check if this is a recent consultation (within last 5 minutes)
              const createdTime = new Date(consultation.created_at)
              const fiveMinutesAgo = new Date(Date.now() - 300000)
              
              if (createdTime > fiveMinutesAgo) {
                const newNotification = {
                  id: Date.now() + Math.random(),
                  appointmentId: consultation._id,
                  type: 'consultation',
                  title: '🔔 New Consultation Request!',
                  message: `New consultation request: "${consultation.chief_complaint || consultation.reason || 'General consultation'}" - Priority: ${consultation.priority || 'Medium'}`,
                  time: 'Just now',
                  read: false,
                  priority: consultation.priority || 'medium',
                  appointmentData: consultation
                }
                
                addNewNotification(newNotification)
              }
            }
          })
        }
      }
    } catch (error) {
      console.error('Error checking pending consultations:', error)
    }
  }

  const formatAppointmentTime = (scheduledAt: string) => {
    try {
      const date = new Date(scheduledAt)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      
      if (date.toDateString() === today.toDateString()) {
        return `today at ${timeString}`
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return `tomorrow at ${timeString}`
      } else {
        return `${date.toLocaleDateString()} at ${timeString}`
      }
    } catch (error) {
      return scheduledAt
    }
  }

  const getRandomPatientName = () => {
    const names = ['Emma Johnson', 'Michael Smith', 'Sarah Davis', 'David Wilson', 'Lisa Brown', 'James Miller']
    return names[Math.floor(Math.random() * names.length)]
  }

  const getRandomTime = () => {
    const times = ['tomorrow at 10:00 AM', 'today at 3:00 PM', 'Monday at 2:30 PM', 'next week']
    return times[Math.floor(Math.random() * times.length)]
  }

  const addNewNotification = (notification: any) => {
    setNotifications(prev => [notification, ...prev])
    setUnreadCount(prev => prev + 1)
    
    // Play notification sound
    playNotificationSound()
    
    // Show browser notification if permission granted
    showBrowserNotification(notification)
  }

  const playNotificationSound = () => {
    if (notificationSound) {
      notificationSound.currentTime = 0
      notificationSound.play().catch(error => {
        console.log('Could not play notification sound, using fallback:', error)
        playFallbackSound()
      })
    } else {
      playFallbackSound()
    }
  }

  const playFallbackSound = () => {
    // Create a simple notification beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.log('Could not play fallback sound:', error)
    }
  }

  const showBrowserNotification = (notification: any) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      })
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico'
          })
        }
      })
    }
  }

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showNotifications && !target.closest('.notification-dropdown')) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifications])

  const generateMockNotifications = () => {
    const mockNotifications = [
      {
        id: 1,
        type: 'appointment',
        title: 'New Appointment Request',
        message: 'John Doe has requested an appointment for tomorrow at 2:00 PM',
        time: '5 minutes ago',
        read: false,
        priority: 'high'
      },
      {
        id: 2,
        type: 'consultation',
        title: 'Consultation Completed',
        message: 'Sarah Wilson consultation has been completed successfully',
        time: '15 minutes ago',
        read: false,
        priority: 'medium'
      },
      {
        id: 3,
        type: 'message',
        title: 'New Message',
        message: 'You have received a message from patient Mike Johnson',
        time: '1 hour ago',
        read: true,
        priority: 'low'
      },
      {
        id: 4,
        type: 'alert',
        title: 'System Alert',
        message: 'Your next appointment starts in 30 minutes',
        time: '2 hours ago',
        read: false,
        priority: 'high'
      },
      {
        id: 5,
        type: 'report',
        title: 'Weekly Report Ready',
        message: 'Your weekly performance report is now available',
        time: '1 day ago',
        read: true,
        priority: 'low'
      }
    ]
    
    setNotifications(mockNotifications)
    setUnreadCount(mockNotifications.filter(n => !n.read).length)
  }

  const markAsRead = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
    setUnreadCount(0)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <CalendarIcon className="h-5 w-5 text-blue-500" />
      case 'consultation':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'message':
        return <UserIcon className="h-5 w-5 text-purple-500" />
      case 'alert':
        return <BellIcon className="h-5 w-5 text-red-500" />
      case 'report':
        return <ChartBarIcon className="h-5 w-5 text-orange-500" />
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/analytics/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }

  const fetchConsultations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/my-consultations?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Backend returns array directly, not wrapped in consultations property
        const consultationData = Array.isArray(data) ? data : data.consultations || []
        setConsultations(consultationData)
        
        // Filter today's scheduled consultations
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD format
        
        const todaysConsultations = consultationData.filter(consultation => {
          const scheduledDate = new Date(consultation.scheduled_at).toISOString().split('T')[0]
          return scheduledDate === todayStr && 
                 (consultation.status === 'scheduled' || consultation.status === 'in_progress')
        })
        
        setTodaysSchedule(todaysConsultations)
      } else {
        // Mock data for testing when backend is not available
        const mockTodaysSchedule = [
          {
            _id: 'mock1',
            patient_name: 'John Doe',
            chief_complaint: 'Routine checkup',
            consultation_type: 'follow_up',
            scheduled_at: new Date().toISOString().replace('T', ' ').substring(0, 16) + ':00',
            status: 'scheduled'
          },
          {
            _id: 'mock2',
            patient_name: 'Sarah Johnson',
            chief_complaint: 'Headache and fever',
            consultation_type: 'initial',
            scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 16) + ':00',
            status: 'scheduled'
          }
        ]
        setTodaysSchedule(mockTodaysSchedule)
      }
    } catch (error) {
      console.error('Error fetching consultations:', error)
      // Fallback mock data for network errors
      const mockTodaysSchedule = [
        {
          _id: 'mock1',
          patient_name: 'Demo Patient',
          chief_complaint: 'Demo consultation',
          consultation_type: 'initial',
          scheduled_at: new Date().toISOString().replace('T', ' ').substring(0, 16) + ':00',
          status: 'scheduled'
        }
      ]
      setTodaysSchedule(mockTodaysSchedule)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPendingConsultations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPendingConsultations(data.consultations || [])
      }
    } catch (error) {
      console.error('Error fetching pending consultations:', error)
    }
  }

  // Button click handlers
  const handleViewAnalytics = () => {
    window.location.href = '/dashboard/doctor/analytics'
  }

  const handleManageSchedule = () => {
    window.location.href = '/dashboard/doctor/appointments'
  }

  const handleViewAllPatients = () => {
    window.location.href = '/dashboard/doctor/patients'
  }

  const handleManageAppointments = () => {
    window.location.href = '/dashboard/doctor/appointments'
  }

  const handlePracticeAnalytics = () => {
    window.location.href = '/dashboard/doctor/analytics'
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const handleViewAllConsultations = () => {
    window.location.href = '/dashboard/doctor/consultations'
  }

  const handleAcceptConsultation = async (consultationId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/${consultationId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Consultation accepted successfully!')
        // Refresh the pending consultations
        fetchPendingConsultations()
        fetchConsultations()
      } else {
        const errorData = await response.json()
        alert(`Error accepting consultation: ${errorData.detail}`)
      }
    } catch (error) {
      alert('Network error. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'scheduled': return 'text-yellow-600 bg-yellow-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <HeartIcon className="h-8 w-8 text-health-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900">Smart Health</span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Bell with Dropdown */}
              <div className="relative notification-dropdown">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors duration-200"
                >
                  <BellIcon className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => checkForNewAppointments()}
                          className="text-sm text-green-600 hover:text-green-800 font-medium"
                          title="Check for new notifications"
                        >
                          🔄 Refresh
                        </button>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-1">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm font-medium ${
                                    !notification.read ? 'text-gray-900' : 'text-gray-700'
                                  }`}>
                                    {notification.title}
                                  </p>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <BellIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No notifications</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                      <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <UserIcon className="h-8 w-8 text-gray-400 bg-gray-100 rounded-full p-1" />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {user?.full_name || 'Doctor'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Good morning, Dr. {user?.full_name?.split(' ')[1] || 'Doctor'}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's your practice overview and patient insights.
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="health-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-health-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.overview?.total_patients || 0}</p>
                </div>
              </div>
            </div>

            <div className="health-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-8 w-8 text-health-secondary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Consultations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.overview?.total_consultations || 0}</p>
                </div>
              </div>
            </div>

            <div className="health-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-health-accent" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.overview?.recent_consultations || 0}</p>
                </div>
              </div>
            </div>

            <div className="health-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.consultation_statuses?.completed || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Pending Consultation Requests */}
            {pendingConsultations.length > 0 && (
              <div className="health-card">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <BellIcon className="h-6 w-6 text-orange-500 mr-2" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      New Consultation Requests ({pendingConsultations.length})
                    </h3>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {pendingConsultations.map((consultation: any) => (
                    <div key={consultation._id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-2">
                              {consultation.consultation_type?.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              consultation.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              consultation.priority === 'high' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {consultation.priority?.toUpperCase()} PRIORITY
                            </span>
                          </div>
                          <p className="text-gray-900 font-medium mb-1">{consultation.chief_complaint}</p>
                          <p className="text-sm text-gray-600">
                            Scheduled: {new Date(consultation.scheduled_at).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Requested: {new Date(consultation.created_at).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAcceptConsultation(consultation._id)}
                          className="ml-4 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Consultations */}
            <div className="health-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Recent Consultations</h3>
                <button 
                  onClick={handleViewAllConsultations}
                  className="text-health-primary hover:text-blue-600 text-sm font-medium"
                >
                  View All
                </button>
              </div>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-health-primary mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading consultations...</p>
                </div>
              ) : consultations.length > 0 ? (
                <div className="space-y-4">
                  {consultations.slice(0, 5).map((consultation) => (
                    <div key={consultation._id || consultation.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {consultation.chief_complaint || 'General Consultation'}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Patient: {consultation.patient_name || 'Unknown Patient'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Type: {consultation.consultation_type?.replace('_', ' ') || 'General'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(consultation.scheduled_at)}
                          </p>
                        </div>
                        <div className="ml-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(consultation.status)}`}>
                            {consultation.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No recent consultations</p>
                </div>
              )}
            </div>

            {/* AI Insights */}
            <div className="health-card">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">AI-Powered Insights</h3>
              <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg p-6">
                <div className="flex items-start">
                  <ChartBarIcon className="h-8 w-8 text-health-primary flex-shrink-0 mt-1" />
                  <div className="ml-4">
                    <h4 className="font-medium text-gray-900 mb-2">Practice Analytics Available</h4>
                    <p className="text-gray-700 text-sm mb-4">
                      Get insights into patient trends, common conditions, and treatment effectiveness 
                      powered by our AI analytics engine.
                    </p>
                    <button 
                      onClick={handleViewAnalytics}
                      className="health-button-primary text-sm"
                    >
                      View Analytics Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today's Schedule */}
            <div className="health-card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
              {todaysSchedule.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No appointments today</p>
                  <button 
                    onClick={handleManageSchedule}
                    className="mt-3 health-button-secondary text-sm"
                  >
                    Manage Schedule
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysSchedule.slice(0, 4).map((appointment) => (
                    <div key={appointment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {appointment.patient_name || 'Unknown Patient'}
                        </p>
                        <p className="text-sm text-gray-600">{appointment.chief_complaint}</p>
                        <p className="text-xs text-blue-600 capitalize">
                          {appointment.consultation_type?.replace('_', ' ')} consultation
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatTime(appointment.scheduled_at)}
                        </p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          appointment.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {appointment.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={handleManageSchedule}
                    className="w-full mt-3 health-button-secondary text-sm"
                  >
                    View Full Schedule
                  </button>
                </div>
              )}
            </div>

            {/* Top Conditions */}
            {stats && stats.top_conditions && stats.top_conditions.length > 0 && (
              <div className="health-card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Conditions</h3>
                <div className="space-y-3">
                  {stats.top_conditions.slice(0, 5).map((condition, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{condition.condition}</span>
                      <span className="text-sm font-medium text-gray-900">{condition.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="health-card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={handleViewAllPatients}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-health-primary" />
                    <span className="ml-3 text-sm font-medium text-gray-900">View All Patients</span>
                  </div>
                </button>
                <button 
                  onClick={handleManageAppointments}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-health-secondary" />
                    <span className="ml-3 text-sm font-medium text-gray-900">Manage Appointments</span>
                  </div>
                </button>
                <button 
                  onClick={handlePracticeAnalytics}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <ChartBarIcon className="h-5 w-5 text-health-accent" />
                    <span className="ml-3 text-sm font-medium text-gray-900">Practice Analytics</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
