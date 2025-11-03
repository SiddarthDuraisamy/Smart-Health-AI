'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  ChartBarIcon, 
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  HeartIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  FireIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface AnalyticsData {
  overview: {
    total_patients: number
    total_doctors: number
    total_consultations: number
    recent_consultations: number
    completion_rate: number
    avg_consultation_duration: number
    patient_satisfaction: number
    monthly_revenue: number
    growth_rate: number
    active_patients: number
    pending_appointments: number
    cancelled_rate: number
  }
  consultation_statuses: { [key: string]: number }
  top_conditions: Array<{ _id: string; count: number }>
  charts: {
    consultation_trends: Array<{ month: string; consultations: number; revenue: number }>
    condition_distribution: Array<{ condition: string; count: number; percentage: number }>
    hourly_distribution: Array<{ hour: number; count: number }>
    weekly_trends: Array<{ day: string; consultations: number; revenue: number }>
    patient_demographics: Array<{ age_group: string; count: number; percentage: number }>
    satisfaction_trends: Array<{ month: string; rating: number }>
  }
  realtime: {
    active_consultations: number
    waiting_patients: number
    today_appointments: number
    today_revenue: number
  }
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('consultations')
  const [showFilters, setShowFilters] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const refreshInterval = useRef<NodeJS.Timeout>()

  const fetchAnalyticsCallback = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      
      const token = localStorage.getItem('token')
      
      // Always use mock data for now since the API endpoint doesn't exist yet
      console.log('📊 Loading mock analytics data...')
      setAnalytics(generateMockAnalytics())
      setLastUpdated(new Date())
      
      // Uncomment this when the backend API is ready:
      /*
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/analytics/dashboard?timeRange=${selectedTimeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
        setLastUpdated(new Date())
      } else {
        setAnalytics(generateMockAnalytics())
        setLastUpdated(new Date())
      }
      */
    } catch (error) {
      console.error('Error fetching analytics:', error)
      // Generate mock data for development
      setAnalytics(generateMockAnalytics())
      setLastUpdated(new Date())
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [selectedTimeRange])

  useEffect(() => {
    fetchAnalyticsCallback()
  }, [fetchAnalyticsCallback])

  // Immediate initialization with mock data
  useEffect(() => {
    if (!analytics) {
      console.log('🚀 Initializing with mock data immediately...')
      setAnalytics(generateMockAnalytics())
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Set up auto-refresh every 30 seconds
    if (autoRefresh) {
      refreshInterval.current = setInterval(() => {
        fetchAnalyticsCallback(true) // Silent refresh
      }, 30000)
    } else {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
    }
  }, [autoRefresh, fetchAnalyticsCallback])


  const generateMockAnalytics = (): AnalyticsData => {
    return {
      overview: {
        total_patients: 1247,
        total_doctors: 1,
        total_consultations: 3456,
        recent_consultations: 89,
        completion_rate: 94.2,
        avg_consultation_duration: 28,
        patient_satisfaction: 4.7,
        monthly_revenue: 45280,
        growth_rate: 12.5,
        active_patients: 892,
        pending_appointments: 23,
        cancelled_rate: 5.8
      },
      consultation_statuses: {
        completed: 3245,
        scheduled: 156,
        in_progress: 12,
        cancelled: 43
      },
      top_conditions: [
        { _id: 'Hypertension', count: 234 },
        { _id: 'Diabetes', count: 189 },
        { _id: 'Anxiety', count: 167 },
        { _id: 'Depression', count: 145 },
        { _id: 'Migraine', count: 123 }
      ],
      charts: {
        consultation_trends: [
          { month: 'Jan', consultations: 245, revenue: 12250 },
          { month: 'Feb', consultations: 289, revenue: 14450 },
          { month: 'Mar', consultations: 312, revenue: 15600 },
          { month: 'Apr', consultations: 298, revenue: 14900 },
          { month: 'May', consultations: 356, revenue: 17800 },
          { month: 'Jun', consultations: 389, revenue: 19450 }
        ],
        condition_distribution: [
          { condition: 'Hypertension', count: 234, percentage: 22.1 },
          { condition: 'Diabetes', count: 189, percentage: 17.8 },
          { condition: 'Anxiety', count: 167, percentage: 15.7 },
          { condition: 'Depression', count: 145, percentage: 13.7 },
          { condition: 'Migraine', count: 123, percentage: 11.6 }
        ],
        hourly_distribution: [
          { hour: 9, count: 45 }, { hour: 10, count: 67 }, { hour: 11, count: 89 },
          { hour: 12, count: 56 }, { hour: 13, count: 34 }, { hour: 14, count: 78 },
          { hour: 15, count: 92 }, { hour: 16, count: 87 }, { hour: 17, count: 65 }
        ],
        weekly_trends: [
          { day: 'Mon', consultations: 67, revenue: 3350 },
          { day: 'Tue', consultations: 89, revenue: 4450 },
          { day: 'Wed', consultations: 76, revenue: 3800 },
          { day: 'Thu', consultations: 92, revenue: 4600 },
          { day: 'Fri', consultations: 84, revenue: 4200 },
          { day: 'Sat', consultations: 45, revenue: 2250 },
          { day: 'Sun', consultations: 23, revenue: 1150 }
        ],
        patient_demographics: [
          { age_group: '18-30', count: 234, percentage: 18.8 },
          { age_group: '31-45', count: 456, percentage: 36.6 },
          { age_group: '46-60', count: 389, percentage: 31.2 },
          { age_group: '60+', count: 168, percentage: 13.5 }
        ],
        satisfaction_trends: [
          { month: 'Jan', rating: 4.5 }, { month: 'Feb', rating: 4.6 },
          { month: 'Mar', rating: 4.7 }, { month: 'Apr', rating: 4.6 },
          { month: 'May', rating: 4.8 }, { month: 'Jun', rating: 4.7 }
        ]
      },
      realtime: {
        active_consultations: 3,
        waiting_patients: 7,
        today_appointments: 24,
        today_revenue: 1200
      }
    }
  }

  const exportData = () => {
    if (!analytics) return
    
    const dataStr = JSON.stringify(analytics, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Analytics Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    console.log('⚠️ Analytics data is null, showing retry screen')
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">No analytics data available</p>
          <button 
            onClick={() => fetchAnalyticsCallback()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  console.log('✅ Analytics data loaded:', analytics)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="relative">
                <HeartIcon className="h-8 w-8 text-red-500" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Smart Health Analytics
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Real-time indicator */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">Live</span>
              </div>
              
              {/* Time range selector */}
              <select 
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
                <option value="1y">Last year</option>
              </select>

              {/* Action buttons */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
              >
                <FunnelIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={exportData}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Page Title with Real-time Stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center">
                <div className="relative mr-4">
                  <ChartBarIcon className="h-10 w-10 text-blue-600" />
                  <SparklesIcon className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
                </div>
                Practice Analytics
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Real-time insights into your practice performance • Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
            
            {/* Auto-refresh toggle */}
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Auto-refresh</span>
              </label>
            </div>
          </div>
        </div>

        {analytics && (
          <>
            {/* Real-time Status Bar */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 mb-8 text-white shadow-xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BoltIcon className="h-6 w-6 text-yellow-300 animate-pulse" />
                  </div>
                  <p className="text-2xl font-bold">{analytics.realtime.active_consultations}</p>
                  <p className="text-sm opacity-90">Active Now</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <ClockIcon className="h-6 w-6 text-orange-300" />
                  </div>
                  <p className="text-2xl font-bold">{analytics.realtime.waiting_patients}</p>
                  <p className="text-sm opacity-90">Waiting</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CalendarIcon className="h-6 w-6 text-green-300" />
                  </div>
                  <p className="text-2xl font-bold">{analytics.realtime.today_appointments}</p>
                  <p className="text-sm opacity-90">Today's Appointments</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CurrencyDollarIcon className="h-6 w-6 text-emerald-300" />
                  </div>
                  <p className="text-2xl font-bold">${analytics.realtime.today_revenue}</p>
                  <p className="text-sm opacity-90">Today's Revenue</p>
                </div>
              </div>
            </div>

            {/* Enhanced Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Patients Card */}
              <div className="group relative bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors duration-300">
                      <UserGroupIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex items-center space-x-1 text-green-600">
                      <ArrowTrendingUpIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">+{analytics.overview.growth_rate}%</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Patients</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.overview.total_patients.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-2">{analytics.overview.active_patients} active</p>
                </div>
              </div>

              {/* Total Consultations Card */}
              <div className="group relative bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors duration-300">
                      <CalendarIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="flex items-center space-x-1 text-blue-600">
                      <EyeIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{analytics.overview.recent_consultations}</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Consultations</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.overview.total_consultations.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-2">Last 30 days: {analytics.overview.recent_consultations}</p>
                </div>
              </div>

              {/* Completion Rate Card */}
              <div className="group relative bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors duration-300">
                      <CheckCircleIcon className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="flex items-center space-x-1 text-red-600">
                      <XCircleIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{analytics.overview.cancelled_rate}%</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Completion Rate</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.overview.completion_rate}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${analytics.overview.completion_rate}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Monthly Revenue Card */}
              <div className="group relative bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors duration-300">
                      <CurrencyDollarIcon className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div className="flex items-center space-x-1 text-orange-600">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{analytics.overview.pending_appointments}</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">${analytics.overview.monthly_revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-2">Avg: ${Math.round(analytics.overview.monthly_revenue / analytics.overview.recent_consultations)}/consultation</p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <ClockIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Industry avg: 35 min</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Avg. Consultation Time</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.overview.avg_consultation_duration} min</p>
                <div className="mt-3 flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${(analytics.overview.avg_consultation_duration / 60) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <StarIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className={`h-4 w-4 ${
                        i < Math.floor(analytics.overview.patient_satisfaction) 
                          ? 'text-yellow-500 fill-current' 
                          : 'text-gray-300'
                      }`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Patient Satisfaction</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.overview.patient_satisfaction}/5.0</p>
                <p className="text-xs text-green-600 mt-2">+0.3 from last month</p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <FireIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-green-600">
                    <ArrowTrendingUpIcon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Recent Activity</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.overview.recent_consultations}</p>
                <p className="text-xs text-gray-500 mt-2">Last 30 days • +{analytics.overview.growth_rate}% growth</p>
              </div>
            </div>

            {/* Interactive Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Enhanced Consultation Trends */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
                    Monthly Trends
                  </h3>
                  <select className="text-sm border border-gray-300 rounded-lg px-3 py-1">
                    <option>Consultations</option>
                    <option>Revenue</option>
                    <option>Both</option>
                  </select>
                </div>
                <div className="space-y-4">
                  {analytics.charts.consultation_trends.map((trend, index) => {
                    const maxConsultations = Math.max(...analytics.charts.consultation_trends.map(t => t.consultations))
                    const maxRevenue = Math.max(...analytics.charts.consultation_trends.map(t => t.revenue))
                    return (
                      <div key={index} className="group hover:bg-blue-50 p-3 rounded-lg transition-all duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-700">{trend.month}</span>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-blue-600 font-medium">{trend.consultations}</span>
                            <span className="text-sm text-green-600 font-medium">${trend.revenue.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-blue-100 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000" 
                                style={{ width: `${(trend.consultations / maxConsultations) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-blue-600 w-16">Consults</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-green-100 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-1000" 
                                style={{ width: `${(trend.revenue / maxRevenue) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-green-600 w-16">Revenue</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Enhanced Conditions Chart */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <HeartIcon className="h-6 w-6 text-red-500 mr-2" />
                    Top Conditions
                  </h3>
                  <div className="text-sm text-gray-500">
                    Total: {analytics.charts.condition_distribution.reduce((sum, c) => sum + c.count, 0)}
                  </div>
                </div>
                <div className="space-y-4">
                  {analytics.charts.condition_distribution.map((condition, index) => {
                    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500']
                    const bgColors = ['bg-red-100', 'bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100']
                    return (
                      <div key={index} className="group hover:bg-gray-50 p-3 rounded-lg transition-all duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
                            <span className="font-medium text-gray-700">{condition.condition}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{condition.count}</span>
                            <span className="text-xs text-gray-500">({condition.percentage}%)</span>
                          </div>
                        </div>
                        <div className="ml-7">
                          <div className={`w-full ${bgColors[index % bgColors.length]} rounded-full h-3`}>
                            <div 
                              className={`${colors[index % colors.length]} h-3 rounded-full transition-all duration-1000 flex items-center justify-end pr-2`} 
                              style={{ width: `${condition.percentage}%` }}
                            >
                              <span className="text-xs text-white font-medium">{condition.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Enhanced Consultation Status */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <UsersIcon className="h-6 w-6 text-indigo-600 mr-2" />
                Consultation Status Overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analytics.consultation_statuses).map(([status, count], index) => {
                  const statusColors = {
                    completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircleIcon },
                    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CalendarIcon },
                    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: BoltIcon },
                    cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircleIcon }
                  }
                  const config = statusColors[status as keyof typeof statusColors] || statusColors.completed
                  const IconComponent = config.icon
                  return (
                    <div key={status} className={`${config.bg} rounded-xl p-4 hover:scale-105 transition-transform duration-200`}>
                      <div className="flex items-center justify-between mb-2">
                        <IconComponent className={`h-6 w-6 ${config.text}`} />
                        <span className={`text-xs font-medium ${config.text} uppercase tracking-wide`}>
                          {status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{count.toLocaleString()}</p>
                      <p className={`text-sm ${config.text} mt-1`}>
                        {((count / Object.values(analytics.consultation_statuses).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Additional Analytics Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Weekly Trends */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <CalendarIcon className="h-5 w-5 text-purple-600 mr-2" />
                  Weekly Pattern
                </h4>
                <div className="space-y-3">
                  {analytics.charts.weekly_trends.map((day, index) => {
                    const maxConsultations = Math.max(...analytics.charts.weekly_trends.map(d => d.consultations))
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 w-12">{day.day}</span>
                        <div className="flex-1 mx-3">
                          <div className="bg-purple-100 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000" 
                              style={{ width: `${(day.consultations / maxConsultations) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-700 w-8 text-right">{day.consultations}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Hourly Distribution */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <ClockIcon className="h-5 w-5 text-orange-600 mr-2" />
                  Peak Hours
                </h4>
                <div className="space-y-2">
                  {analytics.charts.hourly_distribution.map((hour, index) => {
                    const maxCount = Math.max(...analytics.charts.hourly_distribution.map(h => h.count))
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <span className="text-xs font-medium text-gray-600 w-8">{hour.hour}:00</span>
                        <div className="flex-1">
                          <div className="bg-orange-100 rounded-full h-1.5">
                            <div 
                              className="bg-gradient-to-r from-orange-400 to-red-500 h-1.5 rounded-full transition-all duration-1000" 
                              style={{ width: `${(hour.count / maxCount) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-700 w-6 text-right">{hour.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Patient Demographics */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <UserGroupIcon className="h-5 w-5 text-teal-600 mr-2" />
                  Demographics
                </h4>
                <div className="space-y-3">
                  {analytics.charts.patient_demographics.map((demo, index) => {
                    const colors = ['bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500']
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                          <span className="text-sm font-medium text-gray-700">{demo.age_group}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`${colors[index % colors.length]} h-2 rounded-full transition-all duration-1000`} 
                              style={{ width: `${demo.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{demo.percentage}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer Stats */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                <div>
                  <p className="text-3xl font-bold">{analytics.overview.total_patients.toLocaleString()}</p>
                  <p className="text-sm opacity-90">Total Patients Served</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{analytics.overview.total_consultations.toLocaleString()}</p>
                  <p className="text-sm opacity-90">Consultations Completed</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{analytics.overview.patient_satisfaction}</p>
                  <p className="text-sm opacity-90">Average Rating</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">${analytics.overview.monthly_revenue.toLocaleString()}</p>
                  <p className="text-sm opacity-90">Monthly Revenue</p>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-sm opacity-75">
                  🎉 Congratulations on maintaining excellent patient care standards! 
                  Your practice is performing {analytics.overview.growth_rate}% above average.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
