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
  ExclamationTriangleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import RealTimeChatAssistant from '../../../components/RealTimeChatAssistant'
import NotificationBell from '../../../components/NotificationBell'
import HealthRecordsForm from '../../../components/HealthRecordsForm'
import MedicationManager from '../../../components/MedicationManager'

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
  const [consultationHistory, setConsultationHistory] = useState<Appointment[]>([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [showHealthRecordsForm, setShowHealthRecordsForm] = useState(false)
  const [healthRecordsLoading, setHealthRecordsLoading] = useState(false)
  const [dynamicHealthScore, setDynamicHealthScore] = useState<number | null>(null)
  const [latestHealthRecord, setLatestHealthRecord] = useState<any>(null)
  const [showMedicationManager, setShowMedicationManager] = useState(false)
  const [medicationReminders, setMedicationReminders] = useState<any[]>([])
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'recent' | 'older'>('all')
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
    fetchMedicationReminders()
    fetchLatestHealthRecord()
    // Auto-refresh appointments every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchAppointments()
      fetchMedicationReminders()
      fetchLatestHealthRecord()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchLatestHealthRecord = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/health-records/latest`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setLatestHealthRecord(data)
        // Use the same record for health score to ensure consistency
        if (data && data.health_score !== null) {
          setDynamicHealthScore(data.health_score)
        }
        console.log('📊 Latest health record:', data)
      } else {
        // No health records found
        setLatestHealthRecord(null)
        setDynamicHealthScore(null)
      }
    } catch (error) {
      console.error('Error fetching latest health record:', error)
      setLatestHealthRecord(null)
      setDynamicHealthScore(null)
    }
  }

  const fetchMedicationReminders = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/medications/reminders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMedicationReminders(data.reminders || [])
      }
    } catch (error) {
      console.error('Error fetching medication reminders:', error)
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
        
        // Filter for consultation history (completed consultations)
        const completedConsultations = consultations.filter((apt: Appointment) => 
          apt.status === 'completed'
        )
        console.log('Consultation history:', completedConsultations)
        setConsultationHistory(completedConsultations)
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
            duration: "1 week",
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

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    // Redirect to login page
    window.location.href = '/auth/login'
  }

  const handleHealthRecordsSubmit = async (healthData: any) => {
    setHealthRecordsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/health-records/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(healthData)
      })
      
      if (response.ok) {
        const data = await response.json()
        setDynamicHealthScore(data.health_score)
        setShowHealthRecordsForm(false)
        
        // Show success message
        alert(`Health score updated! Your new score is ${data.health_score}/100`)
        
        // Refresh health assessment and health record to get updated metrics
        await fetchHealthAssessment()
        await fetchLatestHealthRecord()
      } else {
        throw new Error('Failed to submit health records')
      }
    } catch (error) {
      console.error('Error submitting health records:', error)
      alert('Failed to update health records. Please try again.')
    } finally {
      setHealthRecordsLoading(false)
    }
  }

  const getFilteredHistory = () => {
    if (historyFilter === 'recent') {
      // Last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return consultationHistory.filter(consultation => 
        new Date(consultation.scheduled_at) >= thirtyDaysAgo
      )
    } else if (historyFilter === 'older') {
      // Older than 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return consultationHistory.filter(consultation => 
        new Date(consultation.scheduled_at) < thirtyDaysAgo
      )
    }
    return consultationHistory
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
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <UserIcon className="h-8 w-8 text-gray-400 bg-gray-100 rounded-full p-1" />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {user?.full_name || 'Patient'}
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
            Welcome back, {user?.full_name?.split(' ')[0] || 'Patient'}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's your health overview and personalized recommendations.
          </p>
        </div>

        {/* Health Score Card */}
        <div className="bg-gradient-to-r from-health-primary to-health-secondary rounded-lg p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Overall Health Score</h2>
              <div className={`text-4xl font-bold text-white`}>
                {dynamicHealthScore !== null ? `${dynamicHealthScore}/100` : '--/100'}
              </div>
              <p className="text-blue-100 mt-2">
                {dynamicHealthScore !== null ? (
                  dynamicHealthScore >= 80 ? 'Excellent health!' : 
                  dynamicHealthScore >= 60 ? 'Good health with room for improvement' : 
                  'Consider consulting with a healthcare provider'
                ) : 'Add your health records to get a personalized score'}
              </p>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end space-y-2">
                <ShieldCheckIcon className="h-16 w-16 text-white opacity-80" />
                <button
                  onClick={() => setShowHealthRecordsForm(true)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    dynamicHealthScore !== null 
                      ? 'bg-white bg-opacity-20 hover:bg-opacity-30' 
                      : 'bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-semibold animate-pulse'
                  }`}
                >
                  {dynamicHealthScore !== null ? 'Update Records' : 'Add Health Data'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Risk Assessment */}
            <div className="health-card">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Health Risk Assessment</h3>
              {dynamicHealthScore !== null ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 capitalize mb-2">Diabetes</h4>
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      dynamicHealthScore >= 80 ? 'bg-green-100 text-green-800' :
                      dynamicHealthScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {dynamicHealthScore >= 80 ? 'Low' : dynamicHealthScore >= 60 ? 'Medium' : 'High'} Risk
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Based on your health data
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 capitalize mb-2">Hypertension</h4>
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      dynamicHealthScore >= 80 ? 'bg-green-100 text-green-800' :
                      dynamicHealthScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {dynamicHealthScore >= 80 ? 'Low' : dynamicHealthScore >= 60 ? 'Medium' : 'High'} Risk
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Based on your health data
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 capitalize mb-2">Heart Disease</h4>
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      dynamicHealthScore >= 80 ? 'bg-green-100 text-green-800' :
                      dynamicHealthScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {dynamicHealthScore >= 80 ? 'Low' : dynamicHealthScore >= 60 ? 'Medium' : 'High'} Risk
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Based on your health data
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-gray-400 text-2xl">📊</span>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Risk Assessment Available</h4>
                  <p className="text-gray-600 mb-4">Add your health records to get a personalized risk assessment</p>
                  <button
                    onClick={() => setShowHealthRecordsForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Health Data
                  </button>
                </div>
              )}
            </div>

            {/* AI Recommendations */}
            <div className="health-card">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Personalized Recommendations</h3>
              {dynamicHealthScore !== null ? (
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-2 h-2 bg-health-primary rounded-full mt-2"></div>
                    <p className="ml-3 text-gray-700">
                      {dynamicHealthScore >= 80 
                        ? "Maintain your excellent health habits! Continue regular exercise and balanced nutrition."
                        : dynamicHealthScore >= 60
                        ? "Focus on improving your lifestyle habits. Consider increasing physical activity and monitoring your diet."
                        : "Consult with a healthcare provider to develop a comprehensive health improvement plan."
                      }
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-2 h-2 bg-health-primary rounded-full mt-2"></div>
                    <p className="ml-3 text-gray-700">
                      Regular health monitoring and check-ups are important for maintaining optimal health.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-2 h-2 bg-health-primary rounded-full mt-2"></div>
                    <p className="ml-3 text-gray-700">
                      Keep your health records updated to receive more accurate recommendations.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-gray-400 text-xl">💡</span>
                  </div>
                  <p className="text-gray-600 mb-4">Add your health data to get personalized AI recommendations</p>
                  <button
                    onClick={() => setShowHealthRecordsForm(true)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Add Health Data →
                  </button>
                </div>
              )}
            </div>

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

            {/* Health Metrics Overview */}
            <div className="health-card">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Health Metrics</h3>
              {latestHealthRecord ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <HeartIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Heart Rate</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {latestHealthRecord.heart_rate ? `${latestHealthRecord.heart_rate} BPM` : '--'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <ChartBarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Blood Pressure</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {latestHealthRecord.blood_pressure_systolic && latestHealthRecord.blood_pressure_diastolic 
                        ? `${latestHealthRecord.blood_pressure_systolic}/${latestHealthRecord.blood_pressure_diastolic}` 
                        : '--'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <ClockIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Sleep</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {latestHealthRecord.sleep_hours_per_night ? `${latestHealthRecord.sleep_hours_per_night} hrs` : '--'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <UserIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">BMI</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {latestHealthRecord.calculated_bmi ? latestHealthRecord.calculated_bmi.toFixed(1) : '--'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-gray-400 text-2xl">📊</span>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Health Metrics Available</h4>
                  <p className="text-gray-600 mb-4">Add your health records to see your vital signs and metrics</p>
                  <button
                    onClick={() => setShowHealthRecordsForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Health Data
                  </button>
                </div>
              )}
            </div>

            {/* Wellness Tips */}
            <div className="health-card">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Daily Wellness Tips</h3>
              <div className="space-y-4">
                <div className="flex items-start p-4 bg-blue-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">💧</span>
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Stay Hydrated</p>
                    <p className="text-sm text-gray-600">Aim for 8-10 glasses of water daily to maintain optimal health and energy levels.</p>
                  </div>
                </div>
                <div className="flex items-start p-4 bg-green-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold text-sm">🚶</span>
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Daily Exercise</p>
                    <p className="text-sm text-gray-600">Take a 30-minute walk or do light exercises to boost your cardiovascular health.</p>
                  </div>
                </div>
                <div className="flex items-start p-4 bg-purple-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">😴</span>
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Quality Sleep</p>
                    <p className="text-sm text-gray-600">Maintain a regular sleep schedule with 7-9 hours of quality rest each night.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="health-card">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Emergency Contacts</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-bold">🚨</span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Emergency Services</p>
                      <p className="text-sm text-gray-600">For life-threatening emergencies</p>
                    </div>
                  </div>
                  <button className="text-red-600 font-semibold">911</button>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">🏥</span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Primary Care</p>
                      <p className="text-sm text-gray-600">Your assigned doctor</p>
                    </div>
                  </div>
                  <button className="text-blue-600 font-semibold">Call</button>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold">💊</span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Pharmacy</p>
                      <p className="text-sm text-gray-600">24/7 medication support</p>
                    </div>
                  </div>
                  <button className="text-green-600 font-semibold">Call</button>
                </div>
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

            {/* Consultation History */}
            <div className="health-card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultation History</h3>
              <div className="text-center py-8">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">View your consultation history</p>
                <button 
                  onClick={() => window.location.href = '/dashboard/patient/history'}
                  className="mt-3 health-button-primary text-sm"
                >
                  View All History
                </button>
              </div>
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

            {/* Quick Health Stats */}
            <div className="health-card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Consultations</p>
                      <p className="text-xs text-gray-600">This month</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-green-600">{consultationHistory.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <CalendarIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Appointments</p>
                      <p className="text-xs text-gray-600">Upcoming</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{appointments.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <HeartIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Health Score</p>
                      <p className="text-xs text-gray-600">Current</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-purple-600">{dynamicHealthScore || '--'}/100</span>
                </div>
              </div>
            </div>

            {/* Medication Reminders */}
            <div className="health-card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Medication Reminders</h3>
              <div className="space-y-3">
                {medicationReminders.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-gray-400 text-xl">💊</span>
                    </div>
                    <p className="text-gray-600 text-sm">No medications added</p>
                    <p className="text-xs text-gray-500 mt-1">Add your medications to get reminders</p>
                  </div>
                ) : (
                  medicationReminders.slice(0, 3).map((reminder, index) => (
                    <div 
                      key={`${reminder.medication_id}_${reminder.reminder_time}`}
                      className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                        reminder.is_taken 
                          ? 'bg-green-50 border-green-400' 
                          : reminder.is_due 
                          ? 'bg-yellow-50 border-yellow-400' 
                          : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          reminder.is_taken 
                            ? 'bg-green-100' 
                            : reminder.is_due 
                            ? 'bg-yellow-100' 
                            : 'bg-gray-100'
                        }`}>
                          {reminder.is_taken ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          ) : (
                            <span className={`font-bold text-sm ${
                              reminder.is_due ? 'text-yellow-600' : 'text-gray-400'
                            }`}>💊</span>
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{reminder.medication_name}</p>
                          <p className="text-xs text-gray-600">
                            {reminder.instructions || `${reminder.dosage} at ${reminder.reminder_time}`}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${
                        reminder.is_taken 
                          ? 'text-green-600' 
                          : reminder.is_due 
                          ? 'text-yellow-600' 
                          : 'text-gray-500'
                      }`}>
                        {reminder.is_taken ? 'Done' : reminder.is_due ? 'Due' : 'Upcoming'}
                      </span>
                    </div>
                  ))
                )}
                <button 
                  onClick={() => setShowMedicationManager(true)}
                  className="w-full mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg py-2 hover:bg-blue-50"
                >
                  Manage Medications
                </button>
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

      {/* Health Records Form */}
      {showHealthRecordsForm && (
        <HealthRecordsForm
          onClose={() => setShowHealthRecordsForm(false)}
          onSubmit={handleHealthRecordsSubmit}
          isLoading={healthRecordsLoading}
        />
      )}

      {/* Medication Manager */}
      {showMedicationManager && (
        <MedicationManager
          onClose={() => {
            setShowMedicationManager(false)
            fetchMedicationReminders() // Refresh reminders when closing
          }}
        />
      )}
    </div>
  )
}
