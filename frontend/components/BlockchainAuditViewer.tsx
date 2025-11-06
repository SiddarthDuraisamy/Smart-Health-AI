'use client'

import React, { useState, useEffect } from 'react'
import { ShieldCheckIcon, ClockIcon, UserIcon, DocumentTextIcon, EyeIcon } from '@heroicons/react/24/outline'

interface AuditRecord {
  _id: string
  index: number
  timestamp: string
  hash: string
  data: {
    action_type: string
    patient_id?: string
    accessed_by?: string
    modified_by?: string
    doctor_id?: string
    access_type?: string
    data_type?: string
    field_changed?: string
    old_value?: string
    new_value?: string
    interaction_type?: string
    ai_model?: string
    event_type?: string
    consultation_id?: string
    additional_info?: any
    details?: any
  }
}

interface BlockchainStats {
  total_blocks: number
  transaction_types: { [key: string]: number }
  recent_activity: number
  blockchain_integrity: boolean
}

interface BlockchainAuditViewerProps {
  patientId?: string
  isOpen: boolean
  onClose: () => void
}

export default function BlockchainAuditViewer({ patientId, isOpen, onClose }: BlockchainAuditViewerProps) {
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([])
  const [blockchainStats, setBlockchainStats] = useState<BlockchainStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'audit' | 'stats'>('audit')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchBlockchainData()
    }
  }, [isOpen, patientId])

  const fetchBlockchainData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      
      // Fetch audit trail
      if (patientId) {
        const auditResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/blockchain/audit-trail/${patientId}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        )
        
        if (auditResponse.ok) {
          const auditData = await auditResponse.json()
          setAuditRecords(auditData.audit_trail || [])
        }
      }
      
      // Fetch blockchain stats
      const statsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/blockchain/stats`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setBlockchainStats(statsData.blockchain_stats)
      }
      
    } catch (error) {
      console.error('Error fetching blockchain data:', error)
      setError('Failed to load blockchain data')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'data_access':
        return <EyeIcon className="h-4 w-4 text-blue-500" />
      case 'data_modification':
        return <DocumentTextIcon className="h-4 w-4 text-yellow-500" />
      case 'consultation_event':
        return <UserIcon className="h-4 w-4 text-green-500" />
      case 'ai_interaction':
        return <ShieldCheckIcon className="h-4 w-4 text-purple-500" />
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'data_access':
        return 'bg-blue-50 border-blue-200'
      case 'data_modification':
        return 'bg-yellow-50 border-yellow-200'
      case 'consultation_event':
        return 'bg-green-50 border-green-200'
      case 'ai_interaction':
        return 'bg-purple-50 border-purple-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Blockchain Audit Trail</h2>
              <p className="text-sm text-gray-600">
                {patientId ? `Patient ID: ${patientId}` : 'System-wide audit trail'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'audit'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Audit Records
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Blockchain Stats
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 p-8">
              <p>{error}</p>
              <button
                onClick={fetchBlockchainData}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : activeTab === 'audit' ? (
            <div className="space-y-4">
              {auditRecords.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p>No audit records found</p>
                </div>
              ) : (
                auditRecords.map((record) => (
                  <div
                    key={record._id}
                    className={`border rounded-lg p-4 ${getActionColor(record.data.action_type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getActionIcon(record.data.action_type)}
                        <div>
                          <h4 className="font-medium text-gray-900 capitalize">
                            {record.data.action_type.replace('_', ' ')}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {formatTimestamp(record.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Block #{record.index}</p>
                        <p className="text-xs text-gray-400 font-mono">
                          {record.hash.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      {record.data.access_type && (
                        <div>
                          <span className="font-medium">Access Type:</span> {record.data.access_type}
                        </div>
                      )}
                      {record.data.data_type && (
                        <div>
                          <span className="font-medium">Data Type:</span> {record.data.data_type}
                        </div>
                      )}
                      {record.data.accessed_by && (
                        <div>
                          <span className="font-medium">Accessed By:</span> {record.data.accessed_by}
                        </div>
                      )}
                      {record.data.modified_by && (
                        <div>
                          <span className="font-medium">Modified By:</span> {record.data.modified_by}
                        </div>
                      )}
                      {record.data.field_changed && (
                        <div>
                          <span className="font-medium">Field Changed:</span> {record.data.field_changed}
                        </div>
                      )}
                      {record.data.ai_model && (
                        <div>
                          <span className="font-medium">AI Model:</span> {record.data.ai_model}
                        </div>
                      )}
                      {record.data.event_type && (
                        <div>
                          <span className="font-medium">Event Type:</span> {record.data.event_type}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {blockchainStats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-medium text-blue-900">Total Blocks</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        {blockchainStats.total_blocks}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="font-medium text-green-900">Recent Activity</h3>
                      <p className="text-2xl font-bold text-green-600">
                        {blockchainStats.recent_activity}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h3 className="font-medium text-purple-900">Integrity Status</h3>
                      <p className={`text-2xl font-bold ${
                        blockchainStats.blockchain_integrity ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {blockchainStats.blockchain_integrity ? '✓ Valid' : '✗ Invalid'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Transaction Types</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(blockchainStats.transaction_types).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span className="capitalize">{type.replace('_', ' ')}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No blockchain statistics available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
