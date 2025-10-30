'use client'

import { useState, useEffect } from 'react'
import { 
  HeartIcon, 
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  CalendarIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

interface HealthMetrics {
  overall_health_score: number
  risk_predictions: {
    diabetes: { probability: number; risk_level: string }
    hypertension: { probability: number; risk_level: string }
    heart_disease: { probability: number; risk_level: string }
  }
  recommendations: string[]
}

export default function PatientDashboard() {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchUserData()
    fetchHealthAssessment()
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
              <BellIcon className="h-6 w-6 text-gray-400" />
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
                <button className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-health-primary hover:bg-blue-50 transition-colors">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-health-primary" />
                  <div className="ml-3 text-left">
                    <p className="font-medium text-gray-900">Chat with AI</p>
                    <p className="text-sm text-gray-600">Get instant health advice</p>
                  </div>
                </button>
                <button className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-health-secondary hover:bg-green-50 transition-colors">
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
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No upcoming appointments</p>
                <button className="mt-3 health-button-primary text-sm">
                  Schedule Appointment
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
          </div>
        </div>
      </div>
    </div>
  )
}
