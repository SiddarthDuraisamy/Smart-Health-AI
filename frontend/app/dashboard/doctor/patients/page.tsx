'use client'

import { useState, useEffect } from 'react'
import { 
  UserGroupIcon, 
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  HeartIcon,
  EyeIcon,
  PlusIcon,
  ArrowLeftIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface Patient {
  _id: string
  user_id: string
  medical_record_number: string
  gender: string
  blood_type?: string
  allergies?: string[]
  medical_history?: string[]
  emergency_contacts?: {
    name: string
    phone: string
    relationship: string
  }[]
  created_at: string
  updated_at: string
  user_info?: {
    full_name: string
    email: string
    phone?: string
    date_of_birth?: string
    address?: string
  }
}

export default function PatientManagement() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [isCreatingPatient, setIsCreatingPatient] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [isSchedulingConsultation, setIsSchedulingConsultation] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [newPatientForm, setNewPatientForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '',
    gender: 'male',
    blood_type: '',
    address: '',
    allergies: '',
    medical_history: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: ''
  })
  const [consultationForm, setConsultationForm] = useState({
    consultation_type: 'initial',
    scheduled_at: '',
    chief_complaint: '',
    priority: 'medium',
    symptoms: '',
    notes: ''
  })

  useEffect(() => {
    fetchUserData()
    fetchPatients()
  }, [])

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('❌ No token for user data fetch')
        return
      }
      
      console.log('👤 Fetching user data...')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('👤 User data response status:', response.status)
      
      if (response.ok) {
        const userData = await response.json()
        console.log('✅ User data received:', userData)
        console.log('👨‍⚕️ User role:', userData.role)
        setUser(userData)
        
        // Check if user is a doctor
        if (userData.role !== 'doctor') {
          console.warn('⚠️ User is not a doctor:', userData.role)
          alert(`Warning: You are logged in as '${userData.role}', but this page requires doctor privileges.`)
        }
      } else {
        console.error('❌ Failed to fetch user data:', response.status)
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error)
    }
  }

  useEffect(() => {
    if (!searchTerm.trim()) {
      // If no search term, show all patients
      setFilteredPatients(patients)
    } else {
      // If there's a search term, filter patients
      const filtered = patients.filter(patient =>
        (patient.user_info?.full_name && patient.user_info.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (patient.user_info?.email && patient.user_info.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (patient.medical_record_number && patient.medical_record_number.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredPatients(filtered)
    }
  }, [searchTerm, patients])

  const fetchPatients = async () => {
    try {
      console.log('🔍 Fetching enriched patient data...')
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.error('❌ No authentication token found')
        alert('No authentication token found. Please login again.')
        window.location.href = '/auth/login'
        return
      }
      
      console.log('🔑 Using token:', token.substring(0, 20) + '...')
      console.log('🌐 API URL:', process.env.NEXT_PUBLIC_API_URL)
      
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/?limit=100`
      console.log('📡 Full API URL:', apiUrl)
      
      const response = await fetch(apiUrl, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('📊 Response status:', response.status)
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        const patients = await response.json()
        console.log('✅ Patients received:', patients)
        console.log('📈 Number of patients:', Array.isArray(patients) ? patients.length : 'Not an array')
        
        if (Array.isArray(patients)) {
          setPatients(patients)
          setFilteredPatients(patients)
          console.log('✅ Patients state updated successfully')
        } else {
          console.error('❌ Response is not an array:', typeof patients, patients)
          setPatients([])
          setFilteredPatients([])
        }
      } else if (response.status === 401) {
        console.error('❌ Authentication failed - 401')
        alert('Authentication failed. Please login again.')
        localStorage.removeItem('token')
        window.location.href = '/auth/login'
      } else if (response.status === 403) {
        console.error('❌ Access forbidden - 403')
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
        alert('Access denied. You may not have doctor privileges.')
      } else {
        console.error('❌ Failed to fetch patients:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
        alert(`Failed to fetch patients: ${response.status} ${response.statusText}`)
        setPatients([])
        setFilteredPatients([])
      }
    } catch (error) {
      console.error('❌ Network error fetching patients:', error)
      alert(`Network error: ${error.message}`)
      setPatients([])
      setFilteredPatients([])
    } finally {
      setIsLoading(false)
    }
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setShowPatientModal(true)
  }

  const handleAddNewPatient = () => {
    setShowAddPatientModal(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setNewPatientForm({
      ...newPatientForm,
      [e.target.name]: e.target.value
    })
  }

  const handleConsultationInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setConsultationForm({
      ...consultationForm,
      [e.target.name]: e.target.value
    })
  }

  const handleBackToDashboard = () => {
    window.location.href = '/dashboard/doctor'
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/auth/login'
  }


  const handleScheduleConsultation = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSchedulingConsultation(true)

    try {
      const token = localStorage.getItem('token')
      if (!token || !selectedPatient) {
        alert('Authentication required or no patient selected')
        return
      }

      // Prepare consultation data
      const consultationData = {
        patient_id: selectedPatient._id,
        consultation_type: consultationForm.consultation_type,
        scheduled_at: new Date(consultationForm.scheduled_at).toISOString(),
        chief_complaint: consultationForm.chief_complaint,
        priority: consultationForm.priority,
        symptoms: consultationForm.symptoms ? consultationForm.symptoms.split(',').map(s => ({
          name: s.trim(),
          severity: 5,
          duration: "Unknown",
          description: ""
        })) : [],
        vital_signs: null
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/consultations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(consultationData)
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Consultation scheduled successfully for ${result.patient_name}!`)
        setShowScheduleModal(false)
        setShowPatientModal(false)
        // Reset form
        setConsultationForm({
          consultation_type: 'initial',
          scheduled_at: '',
          chief_complaint: '',
          priority: 'medium',
          symptoms: '',
          notes: ''
        })
      } else {
        const errorData = await response.json()
        console.error('Consultation scheduling error:', errorData)
        alert(`Error scheduling consultation: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error scheduling consultation:', error)
      alert('Network error. Please check your connection and try again.')
    } finally {
      setIsSchedulingConsultation(false)
    }
  }

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingPatient(true)

    try {
      const token = localStorage.getItem('token')
      
      // Create the user account with patient role
      const userData = {
        email: newPatientForm.email,
        password: newPatientForm.password,
        full_name: newPatientForm.full_name,
        role: 'patient',
        phone: newPatientForm.phone || null,
        date_of_birth: newPatientForm.date_of_birth ? new Date(newPatientForm.date_of_birth).toISOString() : null,
        address: newPatientForm.address || null
      }

      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      if (userResponse.ok) {
        const createdUser = await userResponse.json()
        console.log('User created:', createdUser)
        alert('Patient created successfully!')
        setShowAddPatientModal(false)
        // Reset form
        setNewPatientForm({
          full_name: '',
          email: '',
          password: '',
          phone: '',
          date_of_birth: '',
          gender: '',
          address: '',
          blood_type: '',
          allergies: '',
          medical_history: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_relationship: ''
        })
        // Refresh the patients list
        await fetchPatients()
      } else {
        const userError = await userResponse.json()
        console.error('User creation error:', userError)
        
        if (userError.detail === 'Email already registered') {
          alert('Error: A user with this email already exists. Please use a different email address.')
        } else {
          alert(`Error creating patient: ${userError.detail || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Error creating patient:', error)
      alert('Network error. Please check your connection and try again.')
    } finally {
      setIsCreatingPatient(false)
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
              <button
                onClick={handleBackToDashboard}
                className="mr-4 p-2 text-gray-600 hover:text-health-primary hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <HeartIcon className="h-8 w-8 text-health-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900">Smart Health</span>
              <span className="ml-4 text-sm text-gray-600">/ Patient Management</span>
            </div>
            <div className="flex items-center space-x-4">
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
        {/* Page Title and Stats */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <UserGroupIcon className="h-8 w-8 text-health-primary mr-3" />
                Patient Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage and view detailed information about your patients.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 min-w-[200px]">
              <div className="text-center">
                <div className="text-2xl font-bold text-health-primary">{patients.length}</div>
                <div className="text-sm text-gray-600">Total Patients</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={fetchPatients}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center disabled:opacity-50"
              title="Refresh patients list"
            >
              🔄 Refresh
            </button>
            <button 
              onClick={handleAddNewPatient}
              className="px-4 py-2 bg-health-primary text-white rounded-md hover:bg-blue-600 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add New Patient
            </button>
          </div>
        </div>

        {/* Patients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div key={patient._id} className="health-card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {patient.user_info?.full_name || `Patient ${patient.medical_record_number || patient._id}`}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Age: {patient.user_info?.date_of_birth ? calculateAge(patient.user_info.date_of_birth) : 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">
                    MRN: {patient.medical_record_number || 'N/A'}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  patient.gender === 'male' ? 'bg-blue-100 text-blue-800' : 
                  patient.gender === 'female' ? 'bg-pink-100 text-pink-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {patient.gender || 'other'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  {patient.user_info?.email || 'No email'}
                </div>
                {patient.user_info?.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    {patient.user_info.phone}
                  </div>
                )}
                {patient.blood_type && (
                  <div className="flex items-center text-sm text-gray-600">
                    <HeartIcon className="h-4 w-4 mr-2" />
                    Blood Type: {patient.blood_type}
                  </div>
                )}
              </div>

              {patient.allergies && patient.allergies.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-700 mb-1">Allergies:</p>
                  <div className="flex flex-wrap gap-1">
                    {patient.allergies.slice(0, 3).map((allergy, index) => (
                      <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                        {allergy}
                      </span>
                    ))}
                    {patient.allergies.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{patient.allergies.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-gray-500">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Registered: {new Date(patient.created_at).toLocaleDateString()}
                </div>
                <button
                  onClick={() => handleViewPatient(patient)}
                  className="px-3 py-1 bg-health-primary text-white text-sm rounded hover:bg-blue-600 flex items-center"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPatients.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No patients found' : 'No patients yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms or clear the search to see all patients.'
                : 'Start by adding your first patient to begin managing their healthcare.'
              }
            </p>
            {!searchTerm && (
              <button 
                onClick={handleAddNewPatient}
                className="health-button-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2 inline" />
                Add Your First Patient
              </button>
            )}
          </div>
        )}
      </div>

      {/* Patient Detail Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Patient Details</h2>
                <button 
                  onClick={() => setShowPatientModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <p className="text-sm text-gray-900">{selectedPatient.user_info?.full_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Age</label>
                      <p className="text-sm text-gray-900">{selectedPatient.user_info?.date_of_birth ? calculateAge(selectedPatient.user_info.date_of_birth) : 'Unknown'} years</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Gender</label>
                      <p className="text-sm text-gray-900 capitalize">{selectedPatient.gender}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Blood Type</label>
                      <p className="text-sm text-gray-900">{selectedPatient.blood_type || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900">{selectedPatient.user_info?.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-sm text-gray-900">{selectedPatient.user_info?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Medical Info */}
                {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Allergies</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPatient.allergies.map((allergy, index) => (
                        <span key={index} className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPatient.medical_history && selectedPatient.medical_history.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Medical History</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedPatient.medical_history.map((condition, index) => (
                        <li key={index} className="text-sm text-gray-700">{condition}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Emergency Contact */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Emergency Contact</h3>
                  {selectedPatient.emergency_contacts && selectedPatient.emergency_contacts.length > 0 ? (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm"><strong>Name:</strong> {selectedPatient.emergency_contacts[0].name}</p>
                      <p className="text-sm"><strong>Phone:</strong> {selectedPatient.emergency_contacts[0].phone}</p>
                      <p className="text-sm"><strong>Relationship:</strong> {selectedPatient.emergency_contacts[0].relationship}</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm"><strong>Name:</strong> Emergency contact not provided</p>
                      <p className="text-sm"><strong>Phone:</strong> Contact hospital administration</p>
                      <p className="text-sm"><strong>Relationship:</strong> Unknown</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowPatientModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button 
                  onClick={() => setShowScheduleModal(true)}
                  className="px-4 py-2 bg-health-primary text-white rounded-md hover:bg-blue-600"
                >
                  Schedule Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Patient</h2>
                <button 
                  onClick={() => setShowAddPatientModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreatePatient} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        name="full_name"
                        value={newPatientForm.full_name}
                        onChange={handleInputChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                        placeholder="Enter patient's full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={newPatientForm.email}
                        onChange={handleInputChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                      <input
                        type="password"
                        name="password"
                        value={newPatientForm.password}
                        onChange={handleInputChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                        placeholder="Create password for patient"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={newPatientForm.phone}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={newPatientForm.date_of_birth}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select
                        name="gender"
                        value={newPatientForm.gender}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                      <select
                        name="blood_type"
                        value={newPatientForm.blood_type}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                      >
                        <option value="">Select blood type</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        name="address"
                        value={newPatientForm.address}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                        placeholder="Enter address"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                      <textarea
                        name="allergies"
                        value={newPatientForm.allergies}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                        placeholder="Enter allergies separated by commas"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medical History</label>
                      <textarea
                        name="medical_history"
                        value={newPatientForm.medical_history}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                        placeholder="Enter medical history separated by commas"
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        name="emergency_contact_name"
                        value={newPatientForm.emergency_contact_name}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                        placeholder="Emergency contact name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        name="emergency_contact_phone"
                        value={newPatientForm.emergency_contact_phone}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                        placeholder="Emergency contact phone"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                      <select
                        name="emergency_contact_relationship"
                        value={newPatientForm.emergency_contact_relationship}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                      >
                        <option value="">Select relationship</option>
                        <option value="spouse">Spouse</option>
                        <option value="parent">Parent</option>
                        <option value="child">Child</option>
                        <option value="sibling">Sibling</option>
                        <option value="friend">Friend</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddPatientModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    disabled={isCreatingPatient}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingPatient}
                    className="px-4 py-2 bg-health-primary text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingPatient ? 'Creating Patient...' : 'Create Patient'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Consultation Modal */}
      {showScheduleModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Schedule Consultation</h2>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900">Patient: {selectedPatient.user_info?.full_name}</h3>
                <p className="text-blue-700 text-sm">Email: {selectedPatient.user_info?.email}</p>
                <p className="text-blue-700 text-sm">Phone: {selectedPatient.user_info?.phone || 'Not provided'}</p>
              </div>

              <form onSubmit={handleScheduleConsultation} className="space-y-6">
                {/* Consultation Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultation Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Type *</label>
                      <select
                        name="consultation_type"
                        value={consultationForm.consultation_type}
                        onChange={handleConsultationInputChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                      >
                        <option value="initial">Initial Consultation</option>
                        <option value="follow_up">Follow-up</option>
                        <option value="emergency">Emergency</option>
                        <option value="ai_assisted">AI Assisted</option>
                        <option value="second_opinion">Second Opinion</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        name="priority"
                        value={consultationForm.priority}
                        onChange={handleConsultationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date & Time *</label>
                      <input
                        type="datetime-local"
                        name="scheduled_at"
                        value={consultationForm.scheduled_at}
                        onChange={handleConsultationInputChange}
                        required
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Clinical Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint *</label>
                      <textarea
                        name="chief_complaint"
                        value={consultationForm.chief_complaint}
                        onChange={handleConsultationInputChange}
                        required
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                        placeholder="Describe the main reason for this consultation"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms</label>
                      <textarea
                        name="symptoms"
                        value={consultationForm.symptoms}
                        onChange={handleConsultationInputChange}
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                        placeholder="List symptoms separated by commas (e.g., headache, fever, nausea)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                      <textarea
                        name="notes"
                        value={consultationForm.notes}
                        onChange={handleConsultationInputChange}
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-health-primary focus:border-health-primary"
                        placeholder="Any additional notes or special instructions"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSchedulingConsultation}
                    className="px-4 py-2 bg-health-primary text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSchedulingConsultation ? 'Scheduling...' : 'Schedule Consultation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
