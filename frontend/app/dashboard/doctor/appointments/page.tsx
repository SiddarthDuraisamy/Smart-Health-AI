'use client'

import { useState, useEffect } from 'react'
import { 
  CalendarIcon, 
  ClockIcon,
  UserIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  HeartIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

interface Appointment {
  _id: string
  patient_id: string
  patient_name: string
  patient_email: string
  patient_phone?: string
  consultation_type: string
  priority: string
  scheduled_at: string
  status: string
  chief_complaint: string
  created_at: string
  duration?: number
}

export default function AppointmentManagement() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false)
  
  // New appointment form state
  const [newAppointment, setNewAppointment] = useState({
    patient_id: '',
    patient_name: '',
    patient_email: '',
    patient_phone: '',
    scheduled_date: '',
    scheduled_time: '',
    consultation_type: 'initial',
    priority: 'medium',
    chief_complaint: '',
    duration: 30
  })
  const [availablePatients, setAvailablePatients] = useState([])
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false)

  useEffect(() => {
    fetchAppointments()
    fetchAvailablePatients()
    
    // Auto-refresh appointments every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchAppointments()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let filtered = appointments

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(appointment =>
        appointment.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.patient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter)
    }

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.scheduled_at).toDateString()
        const filterDate = new Date(selectedDate).toDateString()
        return appointmentDate === filterDate
      })
    }

    setFilteredAppointments(filtered)
  }, [searchTerm, statusFilter, selectedDate, appointments])

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token')
      console.log('Fetching appointments from backend...')
      
      // Fetch all consultations for the doctor
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/my-consultations?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Appointments data received:', data)
        
        // Handle both array and object responses
        const consultations = Array.isArray(data) ? data : data.consultations || []
        
        // Format appointments with proper structure
        const formattedAppointments = consultations.map((consultation: any) => ({
          ...consultation,
          patient_id: consultation.patient_id || consultation._id,
          patient_name: consultation.patient_name || consultation.patient?.full_name || 'Unknown Patient',
          patient_email: consultation.patient_email || consultation.patient?.email || 'No email',
          patient_phone: consultation.patient_phone || consultation.patient?.phone || '',
          chief_complaint: consultation.chief_complaint || 'No complaint specified',
          consultation_type: consultation.consultation_type || 'general',
          priority: consultation.priority || 'medium',
          duration: consultation.duration || 30 // Default 30 minutes
        }))

        console.log('Formatted appointments:', formattedAppointments)
        setAppointments(formattedAppointments)
        setFilteredAppointments(formattedAppointments)
      } else {
        console.log('Backend response not OK, using mock data')
        // Mock data for testing
        const mockAppointments = [
          {
            _id: 'mock1',
            patient_id: 'patient1',
            patient_name: 'John Doe',
            patient_email: 'john.doe@example.com',
            patient_phone: '+1-555-0123',
            consultation_type: 'initial',
            priority: 'medium',
            scheduled_at: new Date().toISOString(),
            status: 'scheduled',
            chief_complaint: 'Regular checkup',
            created_at: new Date().toISOString()
          },
          {
            _id: 'mock2',
            patient_id: 'patient2',
            patient_name: 'Sarah Johnson',
            patient_email: 'sarah.j@example.com',
            patient_phone: '+1-555-0124',
            consultation_type: 'follow_up',
            priority: 'high',
            scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            chief_complaint: 'Follow-up on previous treatment',
            created_at: new Date().toISOString()
          },
          {
            _id: 'mock3',
            patient_id: 'patient3',
            patient_name: 'Mike Wilson',
            patient_email: 'mike.w@example.com',
            patient_phone: '+1-555-0125',
            consultation_type: 'urgent',
            priority: 'urgent',
            scheduled_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            status: 'in_progress',
            chief_complaint: 'Chest pain and shortness of breath',
            created_at: new Date().toISOString()
          }
        ]
        setAppointments(mockAppointments)
        setFilteredAppointments(mockAppointments)
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
      // Fallback mock data on network error
      const fallbackAppointments = [
        {
          _id: 'fallback1',
          patient_id: 'demo_patient',
          patient_name: 'Demo Patient',
          patient_email: 'demo@example.com',
          patient_phone: '+1-555-0000',
          consultation_type: 'initial',
          priority: 'medium',
          scheduled_at: new Date().toISOString(),
          status: 'scheduled',
          chief_complaint: 'Demo appointment',
          created_at: new Date().toISOString()
        }
      ]
      setAppointments(fallbackAppointments)
      setFilteredAppointments(fallbackAppointments)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailablePatients = async () => {
    try {
      console.log('Fetching available patients from MongoDB...')
      const token = localStorage.getItem('token')
      
      // Try patients endpoint first
      let response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      console.log('Patients API Response status:', response.status)
      
      // If patients endpoint fails, try users endpoint with patient role filter
      if (!response.ok) {
        console.log('Patients endpoint failed, trying users endpoint...')
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        console.log('Users API Response status:', response.status)
      }
      
      if (response.ok) {
        const data = await response.json()
        console.log('Raw API response:', data)
        console.log('Response type:', typeof data)
        console.log('Is array?', Array.isArray(data))
        
        // Handle different response formats from your MongoDB
        let patients = []
        
        if (Array.isArray(data)) {
          patients = data
        } else if (data.patients && Array.isArray(data.patients)) {
          patients = data.patients
        } else if (data.data && Array.isArray(data.data)) {
          patients = data.data
        } else {
          console.log('Unexpected data structure:', data)
          // Try to extract patients from any nested structure
          const possibleArrays = Object.values(data).filter(val => Array.isArray(val))
          if (possibleArrays.length > 0) {
            patients = possibleArrays[0]
          }
        }
        
        // If we got users, filter for patients only
        if (patients.length > 0 && patients[0].role) {
          console.log('Filtering users for patient role...')
          patients = patients.filter(user => user.role === 'patient' || user.role === 'PATIENT')
          console.log('Filtered patients:', patients)
        }
        
        console.log('Final patients array:', patients)
        console.log('Number of patients found:', patients.length)
        
        if (patients.length > 0) {
          // Log the structure of the first patient to understand the data format
          console.log('First patient structure:', patients[0])
          console.log('First patient keys:', Object.keys(patients[0]))
          
          // Check if patients have user_id (meaning they're from patients collection)
          if (patients[0].user_id) {
            console.log('✅ APPOINTMENT SCHEDULING: Fetching real patient names...')
            
            let allUsers = []
            try {
              const usersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/?role=patient`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              
              if (usersResponse.ok) {
                const usersData = await usersResponse.json()
                console.log('✅ Real users data for appointments:', usersData)
                allUsers = Array.isArray(usersData) ? usersData : []
              } else {
                console.log('⚠️ Failed to fetch users for appointments, status:', usersResponse.status)
              }
            } catch (error) {
              console.error('❌ Error fetching users for appointments:', error)
            }
            
            const formattedPatients = patients.map((patient, index) => {
              const mrn = patient.medical_record_number
              console.log(`Processing appointment patient: ${mrn} (user_id: ${patient.user_id})`)
              
              // Find matching user by user_id
              const matchingUser = allUsers.find(user => user._id === patient.user_id)
              
              let displayName, displayEmail, displayPhone
              
              if (matchingUser) {
                displayName = matchingUser.full_name || `Patient ${mrn?.replace('MRN', '') || index + 1}`
                displayEmail = matchingUser.email || `patient${index + 1}@hospital.local`
                displayPhone = matchingUser.phone || 'Phone not provided'
                console.log(`✅ Real appointment patient: ${displayName} (${displayEmail})`)
              } else {
                // Fallback to medical record number if user not found
                const patientNumber = mrn ? mrn.replace('MRN', '') : (index + 1).toString().padStart(8, '0')
                displayName = `Patient ${patientNumber}`
                displayEmail = `patient.${patientNumber.toLowerCase()}@hospital.local`
                displayPhone = 'Contact via medical record'
                console.log(`⚠️ Appointment user not found, using fallback: ${displayName}`)
              }
              
              return {
                _id: patient._id || Math.random().toString(),
                full_name: displayName,
                email: displayEmail,
                phone: displayPhone,
                // Store original data for backend integration
                user_id: patient.user_id,
                medical_record_number: patient.medical_record_number
              }
            })
            
            console.log('Formatted appointment patients with real names:', formattedPatients)
            setAvailablePatients(formattedPatients)
          } else {
            // Handle direct user data (if coming from users endpoint)
            const formattedPatients = patients.map(patient => {
              console.log('Processing direct user data:', patient)
              
              return {
                _id: patient._id || patient.id || Math.random().toString(),
                full_name: patient.full_name || patient.name || patient.username || 'Unknown Patient',
                email: patient.email || patient.username || 'No email',
                phone: patient.phone || patient.phone_number || ''
              }
            })
            
            console.log('Formatted direct user patients:', formattedPatients)
            setAvailablePatients(formattedPatients)
          }
        } else {
          console.warn('No patients found in API response, using mock data as fallback')
          loadMockPatients()
        }
      } else {
        const errorText = await response.text()
        console.error('API response not OK:', response.status, errorText)
        console.log('Using mock data due to API error')
        loadMockPatients()
      }
    } catch (error) {
      console.error('Network error fetching patients:', error)
      console.log('Using mock data due to network error')
      loadMockPatients()
    }
  }

  const loadMockPatients = () => {
    console.log('Loading mock patients...')
    const mockPatients = [
      { 
        _id: '1', 
        full_name: 'John Doe', 
        email: 'john.doe@example.com', 
        phone: '+1-555-0123' 
      },
      { 
        _id: '2', 
        full_name: 'Sarah Johnson', 
        email: 'sarah.j@example.com', 
        phone: '+1-555-0124' 
      },
      { 
        _id: '3', 
        full_name: 'Mike Wilson', 
        email: 'mike.w@example.com', 
        phone: '+1-555-0125' 
      },
      { 
        _id: '4', 
        full_name: 'Emily Davis', 
        email: 'emily.d@example.com', 
        phone: '+1-555-0126' 
      },
      { 
        _id: '5', 
        full_name: 'Robert Brown', 
        email: 'robert.b@example.com', 
        phone: '+1-555-0127' 
      }
    ]
    console.log('Mock patients loaded:', mockPatients)
    setAvailablePatients(mockPatients)
  }

  const handlePatientSelect = (patientId: string) => {
    const selectedPatient = availablePatients.find(p => p._id === patientId)
    if (selectedPatient) {
      setNewAppointment(prev => ({
        ...prev,
        patient_id: selectedPatient._id,
        patient_name: selectedPatient.full_name,
        patient_email: selectedPatient.email,
        patient_phone: selectedPatient.phone || ''
      }))
    }
  }

  const handleCreateAppointment = async () => {
    if (!newAppointment.patient_id || !newAppointment.scheduled_date || !newAppointment.scheduled_time || !newAppointment.chief_complaint) {
      alert('Please fill in all required fields')
      return
    }

    setIsCreatingAppointment(true)
    
    try {
      const token = localStorage.getItem('token')
      const scheduledAt = `${newAppointment.scheduled_date}T${newAppointment.scheduled_time}:00`
      
      const appointmentData = {
        patient_id: newAppointment.patient_id,
        consultation_type: newAppointment.consultation_type,
        priority: newAppointment.priority,
        scheduled_at: scheduledAt,
        chief_complaint: newAppointment.chief_complaint,
        duration: newAppointment.duration,
        status: 'scheduled'
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(appointmentData)
      })

      if (response.ok) {
        alert('✅ Appointment created successfully!')
        setShowNewAppointmentModal(false)
        resetNewAppointmentForm()
        fetchAppointments() // Refresh the appointments list
      } else {
        const errorData = await response.json()
        alert(`❌ Error creating appointment: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating appointment:', error)
      alert('❌ Network error. Please try again.')
    } finally {
      setIsCreatingAppointment(false)
    }
  }

  const resetNewAppointmentForm = () => {
    setNewAppointment({
      patient_id: '',
      patient_name: '',
      patient_email: '',
      patient_phone: '',
      scheduled_date: '',
      scheduled_time: '',
      consultation_type: 'initial',
      priority: 'medium',
      chief_complaint: '',
      duration: 30
    })
  }

  const handleAcceptAppointment = async (appointmentId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/${appointmentId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        alert('Appointment accepted successfully!')
        fetchAppointments()
      } else {
        alert('Error accepting appointment')
      }
    } catch (error) {
      alert('Network error. Please try again.')
    }
  }

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/${appointmentId}/status?status=${newStatus}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ ${data.message}\n\n${data.notification}`)
        fetchAppointments()
      } else {
        const errorData = await response.json()
        alert(`❌ Error: ${errorData.detail}`)
      }
    } catch (error) {
      console.error('Error updating appointment status:', error)
      alert('❌ Network error. Please try again.')
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-health-primary"></div>
      </div>
    )
  }

  return (
    <>
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        
        .animate-pulse-slow {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <HeartIcon className="h-8 w-8 text-health-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900">Smart Health</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Appointment Management</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="h-8 w-8 text-health-primary mr-3" />
            Appointment Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your appointments and consultations efficiently.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="group bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-200 hover:border-orange-300 cursor-pointer transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Pending</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">
                  {appointments.filter(apt => apt.status === 'pending').length}
                </p>
                <p className="text-xs text-orange-600 mt-1">Awaiting review</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full group-hover:bg-orange-300 transition-colors duration-300">
                <ClockIcon className="h-8 w-8 text-orange-700" />
              </div>
            </div>
          </div>
          
          <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-200 hover:border-blue-300 cursor-pointer transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Scheduled</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">
                  {appointments.filter(apt => apt.status === 'scheduled').length}
                </p>
                <p className="text-xs text-blue-600 mt-1">Ready to start</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full group-hover:bg-blue-300 transition-colors duration-300">
                <CalendarIcon className="h-8 w-8 text-blue-700" />
              </div>
            </div>
          </div>
          
          <div className="group bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-green-200 hover:border-green-300 cursor-pointer transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Completed</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {appointments.filter(apt => apt.status === 'completed').length}
                </p>
                <p className="text-xs text-green-600 mt-1">Successfully done</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full group-hover:bg-green-300 transition-colors duration-300">
                <CheckCircleIcon className="h-8 w-8 text-green-700" />
              </div>
            </div>
          </div>
          
          <div className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-200 hover:border-purple-300 cursor-pointer transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Total</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">
                  {appointments.length}
                </p>
                <p className="text-xs text-purple-600 mt-1">All appointments</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full group-hover:bg-purple-300 transition-colors duration-300">
                <UserIcon className="h-8 w-8 text-purple-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative group">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
              />
            </div>
            
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
              />
            </div>

            <button 
              onClick={() => {
                setShowNewAppointmentModal(true)
                // Ensure patients are loaded when modal opens
                if (availablePatients.length === 0) {
                  fetchAvailablePatients()
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center justify-center font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Appointment
            </button>
          </div>
        </div>

        {/* Appointments List */}
        <div className="space-y-6">
          {filteredAppointments.map((appointment, index) => (
            <div 
              key={appointment._id} 
              className="bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-200 hover:border-gray-300 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.5s ease-out forwards'
              }}
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{appointment.patient_name}</h3>
                            <p className="text-sm text-gray-500">Patient ID: {appointment.patient_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)} shadow-sm`}>
                            {appointment.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(appointment.priority)} shadow-sm`}>
                            {appointment.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="font-medium">
                          {new Date(appointment.scheduled_at).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <ClockIcon className="h-4 w-4 mr-2 text-green-500" />
                        <span className="font-medium">
                          {new Date(appointment.scheduled_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                        {appointment.duration && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({appointment.duration} min)
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <UserIcon className="h-4 w-4 mr-2 text-purple-500" />
                        <span className="truncate">{appointment.patient_email}</span>
                      </div>
                      {appointment.patient_phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <PhoneIcon className="h-4 w-4 mr-2 text-orange-500" />
                          <span>{appointment.patient_phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Chief Complaint
                        </p>
                        <p className="text-sm text-gray-700 line-clamp-2">{appointment.chief_complaint}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Type
                        </p>
                        <p className="text-sm text-gray-700 capitalize">
                          {appointment.consultation_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
                      {appointment.status === 'pending' && (
                        <button
                          onClick={() => handleAcceptAppointment(appointment._id)}
                          className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-green-800 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <CheckCircleIcon className="h-5 w-5 mr-2" />
                          Accept Appointment
                        </button>
                      )}
                      
                      {appointment.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(appointment._id, 'in_progress')}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <ClockIcon className="h-5 w-5 mr-2" />
                            Start Session
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(appointment._id, 'cancelled')}
                            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-medium rounded-lg hover:from-red-700 hover:to-red-800 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <XCircleIcon className="h-5 w-5 mr-2" />
                            Cancel
                          </button>
                        </>
                      )}
                      
                      {appointment.status === 'in_progress' && (
                        <button
                          onClick={() => handleUpdateStatus(appointment._id, 'completed')}
                          className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-green-800 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <CheckCircleIcon className="h-5 w-5 mr-2" />
                          Mark Complete
                        </button>
                      )}
                      
                      {appointment.status === 'completed' && (
                        <div className="px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 text-sm font-medium rounded-lg flex items-center justify-center">
                          <CheckCircleIcon className="h-5 w-5 mr-2" />
                          Completed
                        </div>
                      )}
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredAppointments.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No appointments found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* New Appointment Modal */}
      {showNewAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <CalendarIcon className="h-7 w-7 text-blue-600 mr-3" />
                Schedule New Appointment
              </h3>
              <button
                onClick={() => {
                  setShowNewAppointmentModal(false)
                  resetNewAppointmentForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <XCircleIcon className="h-8 w-8" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Patient Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Select Patient *
                  </label>
                  <button
                    onClick={() => {
                      console.log('Manual refresh patients clicked - trying real API first')
                      fetchAvailablePatients()
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Refresh Patients ({availablePatients.length})
                  </button>
                </div>
                <select
                  value={newAppointment.patient_id}
                  onChange={(e) => handlePatientSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  required
                >
                  <option value="">
                    {availablePatients.length === 0 
                      ? "Loading patients..." 
                      : "Choose a patient..."
                    }
                  </option>
                  {availablePatients.map((patient) => (
                    <option key={patient._id} value={patient._id}>
                      {patient.full_name} - {patient.email}
                    </option>
                  ))}
                </select>
                
                {availablePatients.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    No patients available. Click "Refresh Patients" to load sample data.
                  </p>
                )}
              </div>

              {/* Patient Info Display */}
              {newAppointment.patient_name && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Selected Patient:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">Name:</span> {newAppointment.patient_name}</div>
                    <div><span className="font-medium">Email:</span> {newAppointment.patient_email}</div>
                    {newAppointment.patient_phone && (
                      <div><span className="font-medium">Phone:</span> {newAppointment.patient_phone}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Appointment Date *
                  </label>
                  <input
                    type="date"
                    value={newAppointment.scheduled_date}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Appointment Time *
                  </label>
                  <input
                    type="time"
                    value={newAppointment.scheduled_time}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, scheduled_time: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Consultation Type and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Consultation Type
                  </label>
                  <select
                    value={newAppointment.consultation_type}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, consultation_type: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="initial">Initial Consultation</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="urgent">Urgent Care</option>
                    <option value="routine">Routine Checkup</option>
                    <option value="specialist">Specialist Referral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Priority Level
                  </label>
                  <select
                    value={newAppointment.priority}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <select
                  value={newAppointment.duration}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Chief Complaint / Reason for Visit *
                </label>
                <textarea
                  value={newAppointment.chief_complaint}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, chief_complaint: e.target.value }))}
                  placeholder="Describe the reason for this appointment..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                  required
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowNewAppointmentModal(false)
                  resetNewAppointmentForm()
                }}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-all duration-200"
                disabled={isCreatingAppointment}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAppointment}
                disabled={isCreatingAppointment || !newAppointment.patient_id || !newAppointment.scheduled_date || !newAppointment.scheduled_time || !newAppointment.chief_complaint}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
              >
                {isCreatingAppointment ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <CalendarIcon className="h-5 w-5 mr-2" />
                    Schedule Appointment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
