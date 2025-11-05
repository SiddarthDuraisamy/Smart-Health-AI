'use client'

import { useState, useEffect } from 'react'
import { 
  HeartIcon, 
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  CalendarIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  ClockIcon,
  PlusIcon,
  XCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import RealTimeChatAssistant from '../../../components/RealTimeChatAssistant'
import NotificationBell from '../../../components/NotificationBell'

interface HealthMetrics {
  overall_health_score: number
  risk_predictions: {
    diabetes: { probability: number; risk_level: string }
    hypertension: { probability: number; risk_level: string }
    heart_disease: { probability: number; risk_level: string }
  }
  recommendations: string[]
}

interface Appointment {
  _id: string
  consultation_type: string
  priority: string
  scheduled_at: string
  chief_complaint: string
  status: string
  doctor_name?: string
}

export default function PatientDashboard() {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [bookingForm, setBookingForm] = useState({
    consultation_type: 'initial',
    priority: 'medium',
    scheduled_at: '',
    chief_complaint: '',
    symptoms: ''
  })

  useEffect(() => {
    fetchUserData()
    fetchHealthAssessment()
    fetchAppointments()
    
    // Auto-refresh appointments every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchAppointments()
    }, 30000)
    
    return () => clearInterval(interval)
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
        console.log('👤 User data loaded:', userData)
        
        // Handle both 'id' and '_id' field names from the API
        const userId = userData.id || userData._id
        console.log('👤 User ID for WebSocket:', userId)
        console.log('👤 Available fields:', Object.keys(userData))
        
        // Normalize the user data to always have 'id' field
        const normalizedUserData = {
          ...userData,
          id: userId
        }
        
        setUser(normalizedUserData)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const fetchHealthAssessment = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/ai/health-assessment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setHealthMetrics(data)
      }
    } catch (error) {
      console.error('Error fetching health assessment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/my-consultations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched appointments data:', data)
        // Backend now returns array directly, not wrapped in consultations property
        const consultations = Array.isArray(data) ? data : data.consultations || []
        console.log('Processed consultations:', consultations)
        // Filter for upcoming appointments (not completed or cancelled)
        const upcomingAppointments = consultations.filter((apt: Appointment) => 
          apt.status !== 'completed' && apt.status !== 'cancelled'
        )
        console.log('Upcoming appointments:', upcomingAppointments)
        setAppointments(upcomingAppointments)
      } else {
        console.error('Failed to fetch appointments:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'moderate': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Button click handlers
  const handleChatWithAI = () => {
    if (!user || !user.id) {
      console.error('❌ User data not loaded, cannot open chat')
      alert('Please wait for user data to load before opening chat')
      return
    }
    console.log('🎯 Opening chat for user:', user.id)
    setShowChatModal(true)
  }

  const handleBookConsultation = () => {
    setShowBookingModal(true)
  }

  const updateConsultationStatus = async (consultationId: string, newStatus: string) => {
    try {
      setUpdatingStatus(consultationId)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/${consultationId}/status?status=${newStatus}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ ${data.message}\n\n${data.notification}`)
        // Refresh appointments to show updated status
        fetchAppointments()
      } else {
        const errorData = await response.json()
        alert(`❌ Error: ${errorData.detail}`)
      }
    } catch (error) {
      console.error('Error updating consultation status:', error)
      alert('❌ Network error. Please try again.')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('token')
      const consultationData = {
        consultation_type: bookingForm.consultation_type,
        priority: bookingForm.priority,
        scheduled_at: new Date(bookingForm.scheduled_at).toISOString(),
        chief_complaint: bookingForm.chief_complaint,
        symptoms: bookingForm.symptoms ? [
          {
            name: bookingForm.symptoms,
            severity: 5,
            duration: "recent",
            description: bookingForm.symptoms
          }
        ] : []
      }

      console.log('Sending consultation data:', consultationData)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(consultationData)
      })

      if (response.ok) {
        alert('Consultation booked successfully! You will be notified when a doctor is assigned.')
        setShowBookingModal(false)
        // Reset form
        setBookingForm({
          consultation_type: 'initial',
          priority: 'medium',
          scheduled_at: '',
          chief_complaint: '',
          symptoms: ''
        })
        // Refresh appointments to show the new booking
        fetchAppointments()
      } else {
        const errorData = await response.json()
        console.error('Booking error:', errorData)
        alert(`Error booking consultation: ${JSON.stringify(errorData.detail || errorData)}`)
      }
    } catch (error) {
      alert('Network error. Please check your connection and try again.')
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setBookingForm({
      ...bookingForm,
      [e.target.name]: e.target.value
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
              <NotificationBell />
              <div className="flex items-center">
                <UserIcon className="h-8 w-8 text-gray-400 bg-gray-100 rounded-full p-1" />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {user?.full_name || 'Patient'}
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
            Welcome back, {user?.full_name?.split(' ')[0] || 'Patient'}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's your health overview and personalized recommendations.
          </p>
        </div>

        {/* Health Score Card */}
        {healthMetrics && (
          <div className="bg-gradient-to-r from-health-primary to-health-secondary rounded-lg p-6 text-white mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Overall Health Score</h2>
                <div className={`text-4xl font-bold ${getHealthScoreColor(healthMetrics.overall_health_score)}`}>
                  {healthMetrics.overall_health_score}/100
                </div>
                <p className="text-blue-100 mt-2">
                  {healthMetrics.overall_health_score >= 80 ? 'Excellent health!' : 
                   healthMetrics.overall_health_score >= 60 ? 'Good health with room for improvement' : 
                   'Consider consulting with a healthcare provider'}
                </p>
              </div>
              <div className="text-right">
                <ShieldCheckIcon className="h-16 w-16 text-white opacity-80" />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Risk Assessment */}
            {healthMetrics && (
              <div className="health-card">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Health Risk Assessment</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(healthMetrics.risk_predictions).map(([condition, risk]) => (
                    <div key={condition} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 capitalize mb-2">
                        {condition.replace('_', ' ')}
                      </h4>
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(risk.risk_level)}`}>
                        {risk.risk_level} Risk
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {Math.round(risk.probability * 100)}% probability
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            {healthMetrics && (
              <div className="health-card">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Personalized Recommendations</h3>
                <div className="space-y-3">
                  {healthMetrics.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-2 h-2 bg-health-primary rounded-full mt-2"></div>
                      <p className="ml-3 text-gray-700">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="health-card">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={handleChatWithAI}
                  className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-health-primary hover:bg-blue-50 transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-health-primary" />
                  <div className="ml-3 text-left">
                    <p className="font-medium text-gray-900">Chat with AI</p>
                    <p className="text-sm text-gray-600">Get instant health advice</p>
                  </div>
                </button>
                <button 
                  onClick={handleBookConsultation}
                  className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-health-secondary hover:bg-green-50 transition-colors"
                >
                  <CalendarIcon className="h-8 w-8 text-health-secondary" />
                  <div className="ml-3 text-left">
                    <p className="font-medium text-gray-900">Book Consultation</p>
                    <p className="text-sm text-gray-600">Schedule with a doctor</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Appointments */}
            <div className="health-card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointments</h3>
              {appointments.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No upcoming appointments</p>
                  <button 
                    onClick={handleBookConsultation}
                    className="mt-3 health-button-primary text-sm"
                  >
                    Schedule Appointment
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <div key={appointment._id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 capitalize">
                            {appointment.consultation_type.replace('_', ' ')} Consultation
                          </p>
                          <p className="text-sm text-gray-600">{appointment.chief_complaint}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(appointment.scheduled_at).toLocaleDateString()} at{' '}
                            {new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {appointment.doctor_name && (
                            <p className="text-xs text-blue-600 mt-1">
                              Doctor: {appointment.doctor_name}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          appointment.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          appointment.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {appointment.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-2">
                        {appointment.status === 'scheduled' && (
                          <button
                            onClick={() => updateConsultationStatus(appointment._id, 'completed')}
                            disabled={updatingStatus === appointment._id}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {updatingStatus === appointment._id ? 'Updating...' : 'Mark Completed'}
                          </button>
                        )}
                        {appointment.status === 'in_progress' && (
                          <button
                            onClick={() => updateConsultationStatus(appointment._id, 'completed')}
                            disabled={updatingStatus === appointment._id}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {updatingStatus === appointment._id ? 'Updating...' : 'Mark Completed'}
                          </button>
                        )}
                        {appointment.status === 'pending' && (
                          <button
                            onClick={() => updateConsultationStatus(appointment._id, 'cancelled')}
                            disabled={updatingStatus === appointment._id}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {updatingStatus === appointment._id ? 'Updating...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={handleBookConsultation}
                    className="w-full mt-3 health-button-primary text-sm"
                  >
                    Book Another Appointment
                  </button>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="health-card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="ml-3 text-gray-600">Health assessment completed</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="ml-3 text-gray-600">Profile updated</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="ml-3 text-gray-600">Account created</span>
                </div>
              </div>
            </div>

            {/* Health Tips */}
            <div className="health-card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Health Tip</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  💧 Stay hydrated! Aim for 8-10 glasses of water daily to maintain optimal health and energy levels.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Book Consultation</h3>
              <button 
                onClick={() => setShowBookingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consultation Type
                </label>
                <select
                  name="consultation_type"
                  value={bookingForm.consultation_type}
                  onChange={handleFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                  required
                >
                  <option value="initial">Initial Consultation</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="emergency">Emergency</option>
                  <option value="second_opinion">Second Opinion</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  value={bookingForm.priority}
                  onChange={handleFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Date & Time
                </label>
                <input
                  type="datetime-local"
                  name="scheduled_at"
                  value={bookingForm.scheduled_at}
                  onChange={handleFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chief Complaint *
                </label>
                <textarea
                  name="chief_complaint"
                  value={bookingForm.chief_complaint}
                  onChange={handleFormChange}
                  placeholder="Describe your main health concern..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symptoms (Optional)
                </label>
                <textarea
                  name="symptoms"
                  value={bookingForm.symptoms}
                  onChange={handleFormChange}
                  placeholder="List any symptoms you're experiencing..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                  rows={2}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-health-primary text-white rounded-md hover:bg-blue-600"
                >
                  Book Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real-Time AI Chat Assistant */}
      {user && user.id && (
        <RealTimeChatAssistant
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          userId={user.id}
          consultationId={undefined} // Can be set if within a consultation context
        />
      )}
    </div>
  )
}
