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
  PlusIcon
} from '@heroicons/react/24/outline'

interface Patient {
  _id: string
  full_name: string
  email: string
  phone?: string
  date_of_birth: string
  gender: string
  blood_type?: string
  allergies?: string[]
  medical_history?: string[]
  emergency_contact?: {
    name: string
    phone: string
    relationship: string
  }
  created_at: string
  last_consultation?: string
}

export default function PatientManagement() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showPatientModal, setShowPatientModal] = useState(false)

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    const filtered = patients.filter(patient =>
      (patient.full_name && patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredPatients(filtered)
  }, [searchTerm, patients])

  const fetchPatients = async () => {
    try {
      console.log('Fetching real patient data from MongoDB users collection...')
      const token = localStorage.getItem('token')
      
      // Try patients endpoint first
      let response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      console.log('Patients API Response status:', response.status)
      
      // If patients endpoint fails, try users endpoint
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
        console.log('Is array:', Array.isArray(data))
        
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
          const possibleArrays = Object.values(data).filter(val => Array.isArray(val))
          if (possibleArrays.length > 0) {
            patients = possibleArrays[0]
          }
        }
        
        // Filter for patients only if we got users
        if (patients.length > 0 && patients[0].role) {
          console.log('Filtering users for patient role...')
          patients = patients.filter(user => user.role === 'patient' || user.role === 'PATIENT')
          console.log('Filtered patients:', patients)
        }
        
        console.log('Final patients array:', patients)
        console.log('Number of patients found:', patients.length)
        
        if (patients.length > 0) {
          console.log('First patient structure:', patients[0])
          console.log('First patient keys:', Object.keys(patients[0]))
          
          // Fetch real user data now that backend endpoint exists
          console.log('✅ Fetching real patient names from users collection...')
          
          let allUsers = []
          try {
            const usersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/?role=patient`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            
            if (usersResponse.ok) {
              const usersData = await usersResponse.json()
              console.log('✅ Real users data received:', usersData)
              allUsers = Array.isArray(usersData) ? usersData : []
            } else {
              console.log('⚠️ Failed to fetch users, status:', usersResponse.status)
            }
          } catch (error) {
            console.error('❌ Error fetching users:', error)
          }
          
          const formattedPatients = patients.map((patient, index) => {
            const mrn = patient.medical_record_number
            console.log(`Processing patient: ${mrn} (user_id: ${patient.user_id})`)
            
            // Find matching user by user_id
            const matchingUser = allUsers.find(user => user._id === patient.user_id)
            
            let displayName, displayEmail, displayPhone
            
            if (matchingUser) {
              displayName = matchingUser.full_name || `Patient ${mrn?.replace('MRN', '') || index + 1}`
              displayEmail = matchingUser.email || `patient${index + 1}@hospital.local`
              displayPhone = matchingUser.phone || 'Phone not provided'
              console.log(`✅ Real patient data: ${displayName} (${displayEmail})`)
            } else {
              // Fallback to medical record number if user not found
              const patientNumber = mrn ? mrn.replace('MRN', '') : (index + 1).toString().padStart(8, '0')
              displayName = `Patient ${patientNumber}`
              displayEmail = `patient.${patientNumber.toLowerCase()}@hospital.local`
              displayPhone = 'Contact via medical record'
              console.log(`⚠️ User not found, using fallback: ${displayName}`)
            }
            
            return {
              _id: patient._id || Math.random().toString(),
              full_name: displayName,
              email: displayEmail,
              phone: displayPhone,
              date_of_birth: patient.date_of_birth || '1990-01-01',
              gender: patient.gender || 'Not specified',
              blood_type: patient.blood_type || 'Not specified',
              allergies: patient.allergies || [],
              medical_history: patient.medical_history || [],
              emergency_contact: patient.emergency_contacts?.[0] || {
                name: 'Emergency contact not provided',
                phone: 'Contact hospital administration',
                relationship: 'Unknown'
              },
              created_at: patient.created_at || new Date().toISOString(),
              // Store original data
              user_id: patient.user_id,
              medical_record_number: patient.medical_record_number
            }
          })
          
          console.log('Final formatted patients with user details:', formattedPatients)
          setPatients(formattedPatients)
          setFilteredPatients(formattedPatients)
        } else {
          console.warn('No patients found in API response')
          setPatients([])
          setFilteredPatients([])
        }
      } else {
        const errorText = await response.text()
        console.error('API response not OK:', response.status, errorText)
        setPatients([])
        setFilteredPatients([])
      }
    } catch (error) {
      console.error('Network error fetching patients:', error)
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
    alert('🚀 Add New Patient feature coming soon!\n\nFor now, you can see the mock patient data.')
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
              <span className="text-sm text-gray-600">Patient Management</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <UserGroupIcon className="h-8 w-8 text-health-primary mr-3" />
            Patient Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage and view detailed information about your patients.
          </p>
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
          <button className="px-4 py-2 bg-health-primary text-white rounded-md hover:bg-blue-600 flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add New Patient
          </button>
        </div>

        {/* Patients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div key={patient._id} className="health-card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{patient.full_name}</h3>
                  <p className="text-sm text-gray-600">Age: {calculateAge(patient.date_of_birth)}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  patient.gender === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                }`}>
                  {patient.gender}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  {patient.email}
                </div>
                {patient.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    {patient.phone}
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
            <p className="text-gray-600">No patients found matching your search.</p>
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
                      <p className="text-sm text-gray-900">{selectedPatient.full_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Age</label>
                      <p className="text-sm text-gray-900">{calculateAge(selectedPatient.date_of_birth)} years</p>
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
                      <p className="text-sm text-gray-900">{selectedPatient.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-sm text-gray-900">{selectedPatient.phone || 'Not provided'}</p>
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
                {selectedPatient.emergency_contact && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Emergency Contact</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm"><strong>Name:</strong> {selectedPatient.emergency_contact.name}</p>
                      <p className="text-sm"><strong>Phone:</strong> {selectedPatient.emergency_contact.phone}</p>
                      <p className="text-sm"><strong>Relationship:</strong> {selectedPatient.emergency_contact.relationship}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowPatientModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-health-primary text-white rounded-md hover:bg-blue-600">
                  Schedule Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
