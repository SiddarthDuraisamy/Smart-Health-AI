'use client'

import { useState, useEffect } from 'react'
import { 
  XMarkIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline'

interface MedicationManagerProps {
  onClose: () => void
}

interface Medication {
  id?: string
  name: string
  dosage: string
  frequency: string
  instructions?: string
  start_date: string
  end_date?: string
  reminder_times: string[]
  status: string
  notes?: string
  prescribing_doctor?: string
}

interface MedicationReminder {
  medication_id: string
  medication_name: string
  dosage: string
  instructions?: string
  reminder_time: string
  is_taken: boolean
  is_due: boolean
  status: string
}

const FREQUENCY_OPTIONS = [
  { value: 'once_daily', label: 'Once Daily' },
  { value: 'twice_daily', label: 'Twice Daily' },
  { value: 'three_times_daily', label: 'Three Times Daily' },
  { value: 'four_times_daily', label: 'Four Times Daily' },
  { value: 'as_needed', label: 'As Needed' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' }
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'text-green-600 bg-green-100' },
  { value: 'paused', label: 'Paused', color: 'text-yellow-600 bg-yellow-100' },
  { value: 'completed', label: 'Completed', color: 'text-blue-600 bg-blue-100' },
  { value: 'discontinued', label: 'Discontinued', color: 'text-red-600 bg-red-100' }
]

export default function MedicationManager({ onClose }: MedicationManagerProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'reminders' | 'add'>('list')
  const [medications, setMedications] = useState<Medication[]>([])
  const [reminders, setReminders] = useState<MedicationReminder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<Medication>({
    name: '',
    dosage: '',
    frequency: 'once_daily',
    instructions: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    reminder_times: [],
    status: 'active',
    notes: '',
    prescribing_doctor: ''
  })

  useEffect(() => {
    fetchMedications()
    fetchReminders()
  }, [])

  const fetchMedications = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/medications/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMedications(data)
      }
    } catch (error) {
      console.error('Error fetching medications:', error)
    }
  }

  const fetchReminders = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/medications/reminders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setReminders(data.reminders || [])
      }
    } catch (error) {
      console.error('Error fetching reminders:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      const url = editingMedication 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/medications/${editingMedication.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/medications/`
      
      const response = await fetch(url, {
        method: editingMedication ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          start_date: new Date(formData.start_date).toISOString(),
          end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
        })
      })
      
      if (response.ok) {
        await fetchMedications()
        await fetchReminders()
        resetForm()
        setActiveTab('list')
      } else {
        throw new Error('Failed to save medication')
      }
    } catch (error) {
      console.error('Error saving medication:', error)
      alert('Failed to save medication. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (medicationId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/medications/${medicationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        await fetchMedications()
        await fetchReminders()
        setShowDeleteConfirm(null)
      } else {
        throw new Error('Failed to delete medication')
      }
    } catch (error) {
      console.error('Error deleting medication:', error)
      alert('Failed to delete medication. Please try again.')
    }
  }

  const handleStatusChange = async (medicationId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/medications/${medicationId}/status?status=${newStatus}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        await fetchMedications()
        await fetchReminders()
      }
    } catch (error) {
      console.error('Error updating medication status:', error)
    }
  }

  const markAsTaken = async (medicationId: string, scheduledTime: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/medications/${medicationId}/mark-taken`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduled_time: scheduledTime
        })
      })
      
      if (response.ok) {
        await fetchReminders()
      }
    } catch (error) {
      console.error('Error marking medication as taken:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      frequency: 'once_daily',
      instructions: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      reminder_times: [],
      status: 'active',
      notes: '',
      prescribing_doctor: ''
    })
    setEditingMedication(null)
  }

  const startEdit = (medication: Medication) => {
    setFormData({
      ...medication,
      start_date: medication.start_date.split('T')[0],
      end_date: medication.end_date ? medication.end_date.split('T')[0] : ''
    })
    setEditingMedication(medication)
    setActiveTab('add')
  }

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status)
    return statusOption?.color || 'text-gray-600 bg-gray-100'
  }

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    } catch {
      return timeStr
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-semibold text-gray-900">Medication Manager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'list' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Medications ({medications.length})
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'reminders' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Today's Reminders ({reminders.filter(r => r.is_due && !r.is_taken).length})
          </button>
          <button
            onClick={() => { setActiveTab('add'); resetForm(); }}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'add' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <PlusIcon className="h-4 w-4 inline mr-1" />
            Add Medication
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Medications List */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {medications.length === 0 ? (
                <div className="text-center py-12">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No medications added</h3>
                  <p className="text-gray-600 mb-4">Start by adding your first medication</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add Medication
                  </button>
                </div>
              ) : (
                medications.map((medication) => (
                  <div key={medication.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{medication.name}</h3>
                        <p className="text-gray-600">{medication.dosage} • {FREQUENCY_OPTIONS.find(f => f.value === medication.frequency)?.label}</p>
                        {medication.instructions && (
                          <p className="text-sm text-gray-500 mt-1">{medication.instructions}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(medication.status)}`}>
                          {STATUS_OPTIONS.find(s => s.value === medication.status)?.label}
                        </span>
                        <button
                          onClick={() => startEdit(medication)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(medication.id!)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {medication.reminder_times.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Reminder Times:</p>
                        <div className="flex flex-wrap gap-2">
                          {medication.reminder_times.map((time, index) => (
                            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {formatTime(time)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {medication.status === 'active' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusChange(medication.id!, 'paused')}
                          className="flex items-center px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                        >
                          <PauseIcon className="h-3 w-3 mr-1" />
                          Pause
                        </button>
                        <button
                          onClick={() => handleStatusChange(medication.id!, 'completed')}
                          className="flex items-center px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                        >
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Complete
                        </button>
                        <button
                          onClick={() => handleStatusChange(medication.id!, 'discontinued')}
                          className="flex items-center px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                        >
                          <StopIcon className="h-3 w-3 mr-1" />
                          Discontinue
                        </button>
                      </div>
                    )}
                    
                    {medication.status === 'paused' && (
                      <button
                        onClick={() => handleStatusChange(medication.id!, 'active')}
                        className="flex items-center px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                      >
                        <PlayIcon className="h-3 w-3 mr-1" />
                        Resume
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Today's Reminders */}
          {activeTab === 'reminders' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Today's Medication Schedule</h3>
              {reminders.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders for today</h3>
                  <p className="text-gray-600">All caught up!</p>
                </div>
              ) : (
                reminders.map((reminder, index) => (
                  <div 
                    key={`${reminder.medication_id}_${reminder.reminder_time}`}
                    className={`border rounded-lg p-4 ${
                      reminder.is_taken ? 'bg-green-50 border-green-200' :
                      reminder.is_due ? 'bg-yellow-50 border-yellow-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {reminder.is_taken ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          ) : reminder.is_due ? (
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                          ) : (
                            <ClockIcon className="h-5 w-5 text-gray-400" />
                          )}
                          <h4 className="font-semibold text-gray-900">{reminder.medication_name}</h4>
                          <span className="text-sm text-gray-600">{reminder.dosage}</span>
                        </div>
                        {reminder.instructions && (
                          <p className="text-sm text-gray-600 mb-2">{reminder.instructions}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="font-medium">Time: {formatTime(reminder.reminder_time)}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            reminder.is_taken ? 'bg-green-100 text-green-800' :
                            reminder.is_due ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {reminder.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {!reminder.is_taken && (
                        <button
                          onClick={() => markAsTaken(reminder.medication_id, reminder.reminder_time)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          Mark as Taken
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Add/Edit Medication Form */}
          {activeTab === 'add' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingMedication ? 'Edit Medication' : 'Add New Medication'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Aspirin, Metformin"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    value={formData.dosage}
                    onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 500mg, 1 tablet"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {FREQUENCY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prescribing Doctor
                  </label>
                  <input
                    type="text"
                    value={formData.prescribing_doctor}
                    onChange={(e) => setFormData({...formData, prescribing_doctor: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Dr. Smith"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions
                </label>
                <input
                  type="text"
                  value={formData.instructions}
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Take with food, Before bedtime"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional notes about this medication..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { resetForm(); setActiveTab('list'); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : editingMedication ? 'Update Medication' : 'Add Medication'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Medication</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this medication? This action cannot be undone and will also delete all related logs.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
