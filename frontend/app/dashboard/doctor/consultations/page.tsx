'use client'

import { useState, useEffect } from 'react'
import { 
  HeartIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface Consultation {
  _id: string
  patient_name: string
  patient_id: string
  doctor_name?: string
  consultation_type: string
  priority: string
  scheduled_at: string
  chief_complaint: string
  status: string
  created_at: string
  symptoms?: Array<{
    name: string
    severity: number
    duration: string
    description: string
  }>
}

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [filteredConsultations, setFilteredConsultations] = useState<Consultation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchConsultations()
    
    // Auto-refresh consultations every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchConsultations()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let filtered = consultations

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(consultation =>
        consultation.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consultation.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consultation.consultation_type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(consultation => consultation.status === statusFilter)
    }

    setFilteredConsultations(filtered)
  }, [searchTerm, statusFilter, consultations])

  const fetchConsultations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/my-consultations?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setConsultations(Array.isArray(data) ? data : [])
        setFilteredConsultations(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching consultations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'scheduled': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-orange-100 text-orange-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleViewDetails = (consultation: Consultation) => {
    setSelectedConsultation(consultation)
    setShowDetailModal(true)
  }

  const handleUpdateStatus = async (consultationId: string, newStatus: string) => {
    try {
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
        fetchConsultations()
      } else {
        const errorData = await response.json()
        alert(`❌ Error: ${errorData.detail}`)
      }
    } catch (error) {
      console.error('Error updating consultation status:', error)
      alert('❌ Network error. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-health-primary"></div>
      </div>
    )
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
              <span className="text-sm text-gray-600">All Consultations</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="h-8 w-8 text-health-primary mr-3" />
            All Consultations
          </h1>
          <p className="text-gray-600 mt-2">
            View and manage all your consultations and patient interactions.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search consultations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            Total: {filteredConsultations.length} consultations
          </div>
        </div>

        {/* Consultations List */}
        <div className="space-y-4">
          {filteredConsultations.map((consultation) => (
            <div key={consultation._id} className="health-card hover:shadow-lg transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">{consultation.patient_name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(consultation.status)}`}>
                        {consultation.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(consultation.priority)}`}>
                        {consultation.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700">Chief Complaint:</p>
                      <p className="text-sm text-gray-600">{consultation.chief_complaint}</p>
                      <p className="text-xs text-gray-500">
                        Type: {consultation.consultation_type.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700">Scheduled:</p>
                      <p className="text-sm text-gray-600">{formatDate(consultation.scheduled_at)}</p>
                      <p className="text-xs text-gray-500">
                        Created: {formatDate(consultation.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-4 lg:mt-0">
                  <button
                    onClick={() => handleViewDetails(consultation)}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex items-center"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Details
                  </button>
                  
                  {consultation.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(consultation._id, 'in_progress')}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
                      >
                        <ClockIcon className="h-4 w-4 mr-1" />
                        Start
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(consultation._id, 'cancelled')}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center"
                      >
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Cancel
                      </button>
                    </>
                  )}
                  
                  {consultation.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus(consultation._id, 'completed')}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredConsultations.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No consultations found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Consultation Details</h2>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Patient Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Patient Name</label>
                      <p className="text-sm text-gray-900">{selectedConsultation.patient_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedConsultation.status)}`}>
                        {selectedConsultation.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Consultation Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Chief Complaint</label>
                      <p className="text-sm text-gray-900">{selectedConsultation.chief_complaint}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <p className="text-sm text-gray-900 capitalize">{selectedConsultation.consultation_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${getPriorityColor(selectedConsultation.priority)}`}>
                        {selectedConsultation.priority.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Scheduled Time</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedConsultation.scheduled_at)}</p>
                    </div>
                  </div>
                </div>

                {selectedConsultation.symptoms && selectedConsultation.symptoms.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Symptoms</h3>
                    <div className="space-y-2">
                      {selectedConsultation.symptoms.map((symptom, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{symptom.name}</p>
                              <p className="text-sm text-gray-600">{symptom.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Severity: {symptom.severity}/10</p>
                              <p className="text-sm text-gray-500">Duration: {symptom.duration}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedConsultation.status === 'scheduled' && (
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedConsultation._id, 'in_progress')
                      setShowDetailModal(false)
                    }}
                    className="px-4 py-2 bg-health-primary text-white rounded-md hover:bg-blue-600"
                  >
                    Start Consultation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
