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
  CheckCircleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import NotificationBell from '../../../components/NotificationBell'
import BlockchainAuditViewer from '../../../components/BlockchainAuditViewer'

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
  const [showBlockchainAudit, setShowBlockchainAudit] = useState(false)

  useEffect(() => {
    fetchUserData()
    fetchDashboardStats()
    fetchConsultations()
    fetchPendingConsultations()
  }, [])

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
        
        // Filter this week's scheduled consultations (more practical than just today)
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD format
        
        // Get start and end of current week
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay()) // Sunday
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
        
        const startOfWeekStr = startOfWeek.toISOString().split('T')[0]
        const endOfWeekStr = endOfWeek.toISOString().split('T')[0]
        
        console.log('🗓️ Week range for filtering:', startOfWeekStr, 'to', endOfWeekStr)
        console.log('📊 All consultations:', consultationData.map(c => ({
          id: c._id,
          scheduled_at: c.scheduled_at,
          status: c.status,
          doctor_id: c.doctor_id,
          patient_name: c.patient_name
        })))
        
        const todaysConsultations = consultationData.filter(consultation => {
          // Handle different date formats
          let scheduledDate
          try {
            scheduledDate = new Date(consultation.scheduled_at).toISOString().split('T')[0]
          } catch (error) {
            console.error('Error parsing date:', consultation.scheduled_at)
            return false
          }
          
          const isThisWeek = scheduledDate >= startOfWeekStr && scheduledDate <= endOfWeekStr
          const hasValidStatus = consultation.status === 'scheduled' || consultation.status === 'in_progress'
          const hasDoctor = consultation.doctor_id
          
          console.log('📅 Filtering consultation:', {
            id: consultation._id,
            scheduled_at: consultation.scheduled_at,
            scheduledDate,
            weekRange: `${startOfWeekStr} to ${endOfWeekStr}`,
            isThisWeek,
            status: consultation.status,
            hasValidStatus,
            hasDoctor,
            doctor_id: consultation.doctor_id,
            patient_name: consultation.patient_name
          })
          
          return isThisWeek && hasValidStatus && hasDoctor
        })
        
        console.log('📋 Today\'s consultations found:', todaysConsultations.length, todaysConsultations)
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
        // Refresh all data to update today's schedule
        await fetchPendingConsultations()
        await fetchConsultations()
        // Force a small delay to ensure backend is updated
        setTimeout(() => {
          fetchConsultations()
        }, 1000)
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

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    // Redirect to login page
    window.location.href = '/auth/login'
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
              <button
                onClick={() => setShowBlockchainAudit(true)}
                className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                title="View Blockchain Audit Trail"
              >
                <ShieldCheckIcon className="h-5 w-5 mr-1" />
                Audit Trail
              </button>
              <NotificationBell />
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <UserIcon className="h-8 w-8 text-gray-400 bg-gray-100 rounded-full p-1" />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {user?.full_name || 'Doctor'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
                  Logout
                </button>
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
            {/* This Week's Schedule */}
            <div className="health-card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">This Week's Schedule</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={fetchConsultations}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    title="Refresh schedule"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
              {todaysSchedule.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No appointments this week</p>
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
      
      {/* Blockchain Audit Viewer */}
      <BlockchainAuditViewer
        isOpen={showBlockchainAudit}
        onClose={() => setShowBlockchainAudit(false)}
      />
    </div>
  )
}
