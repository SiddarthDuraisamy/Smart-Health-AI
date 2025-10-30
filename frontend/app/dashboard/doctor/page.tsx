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
}

export default function DoctorDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [consultations, setConsultations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchUserData()
    fetchDashboardStats()
    fetchConsultations()
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
        setConsultations(data)
      }
    } catch (error) {
      console.error('Error fetching consultations:', error)
    } finally {
      setIsLoading(false)
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
              <BellIcon className="h-6 w-6 text-gray-400" />
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
            {/* Recent Consultations */}
            <div className="health-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Recent Consultations</h3>
                <button className="text-health-primary hover:text-blue-600 text-sm font-medium">
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
                    <div key={consultation.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {consultation.chief_complaint || 'General Consultation'}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Patient ID: {consultation.patient_id}
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
                    <button className="health-button-primary text-sm">
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
              <div className="text-center py-8">
                <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No appointments today</p>
                <button className="mt-3 health-button-secondary text-sm">
                  Manage Schedule
                </button>
              </div>
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
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-health-primary" />
                    <span className="ml-3 text-sm font-medium text-gray-900">View All Patients</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-health-secondary" />
                    <span className="ml-3 text-sm font-medium text-gray-900">Manage Appointments</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
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
