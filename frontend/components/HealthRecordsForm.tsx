'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface HealthRecordsFormProps {
  onClose: () => void
  onSubmit: (data: HealthRecord) => void
  isLoading?: boolean
}

interface HealthRecord {
  // Basic vitals
  weight?: number
  height?: number
  blood_pressure_systolic?: number
  blood_pressure_diastolic?: number
  heart_rate?: number
  
  // Lifestyle factors
  exercise_hours_per_week?: number
  sleep_hours_per_night?: number
  water_intake_glasses?: number
  smoking_status?: string
  alcohol_consumption?: string
  
  // Medical history
  diabetes?: boolean
  hypertension?: boolean
  heart_disease?: boolean
  
  // Lab values
  cholesterol_total?: number
  blood_sugar_fasting?: number
  
  // Subjective measures
  stress_level?: number
  energy_level?: number
}

export default function HealthRecordsForm({ onClose, onSubmit, isLoading = false }: HealthRecordsFormProps) {
  const [formData, setFormData] = useState<HealthRecord>({
    smoking_status: 'never',
    alcohol_consumption: 'none',
    diabetes: false,
    hypertension: false,
    heart_disease: false,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : undefined }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Update Health Records</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Vitals */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Vitals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight || ''}
                  onChange={handleInputChange}
                  step="0.1"
                  min="20"
                  max="300"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 70.5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height || ''}
                  onChange={handleInputChange}
                  min="100"
                  max="250"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 175"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heart Rate (BPM)
                </label>
                <input
                  type="number"
                  name="heart_rate"
                  value={formData.heart_rate || ''}
                  onChange={handleInputChange}
                  min="40"
                  max="200"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 72"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Systolic BP (mmHg)
                </label>
                <input
                  type="number"
                  name="blood_pressure_systolic"
                  value={formData.blood_pressure_systolic || ''}
                  onChange={handleInputChange}
                  min="70"
                  max="250"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 120"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diastolic BP (mmHg)
                </label>
                <input
                  type="number"
                  name="blood_pressure_diastolic"
                  value={formData.blood_pressure_diastolic || ''}
                  onChange={handleInputChange}
                  min="40"
                  max="150"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 80"
                />
              </div>
            </div>
          </div>

          {/* Lifestyle Factors */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Lifestyle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exercise (hours/week)
                </label>
                <input
                  type="number"
                  name="exercise_hours_per_week"
                  value={formData.exercise_hours_per_week || ''}
                  onChange={handleInputChange}
                  step="0.5"
                  min="0"
                  max="50"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 3.5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sleep (hours/night)
                </label>
                <input
                  type="number"
                  name="sleep_hours_per_night"
                  value={formData.sleep_hours_per_night || ''}
                  onChange={handleInputChange}
                  step="0.5"
                  min="3"
                  max="15"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 7.5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Water Intake (glasses/day)
                </label>
                <input
                  type="number"
                  name="water_intake_glasses"
                  value={formData.water_intake_glasses || ''}
                  onChange={handleInputChange}
                  min="0"
                  max="20"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 8"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Smoking Status
                </label>
                <select
                  name="smoking_status"
                  value={formData.smoking_status || 'never'}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="never">Never</option>
                  <option value="former">Former</option>
                  <option value="current">Current</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alcohol Consumption
                </label>
                <select
                  name="alcohol_consumption"
                  value={formData.alcohol_consumption || 'none'}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="none">None</option>
                  <option value="light">Light (1-2 drinks/week)</option>
                  <option value="moderate">Moderate (3-7 drinks/week)</option>
                  <option value="heavy">Heavy (8+ drinks/week)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Subjective Measures */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Wellbeing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stress Level (1-10)
                </label>
                <input
                  type="range"
                  name="stress_level"
                  value={formData.stress_level || 5}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low (1)</span>
                  <span className="font-medium">{formData.stress_level || 5}</span>
                  <span>High (10)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Energy Level (1-10)
                </label>
                <input
                  type="range"
                  name="energy_level"
                  value={formData.energy_level || 5}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low (1)</span>
                  <span className="font-medium">{formData.energy_level || 5}</span>
                  <span>High (10)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Medical History</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="diabetes"
                  checked={formData.diabetes || false}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Diabetes</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="hypertension"
                  checked={formData.hypertension || false}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Hypertension</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="heart_disease"
                  checked={formData.heart_disease || false}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Heart Disease</span>
              </label>
            </div>
          </div>

          {/* Lab Values */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Lab Values (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Cholesterol (mg/dL)
                </label>
                <input
                  type="number"
                  name="cholesterol_total"
                  value={formData.cholesterol_total || ''}
                  onChange={handleInputChange}
                  min="100"
                  max="500"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 180"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fasting Blood Sugar (mg/dL)
                </label>
                <input
                  type="number"
                  name="blood_sugar_fasting"
                  value={formData.blood_sugar_fasting || ''}
                  onChange={handleInputChange}
                  min="50"
                  max="400"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 95"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Calculating...' : 'Calculate Health Score'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
