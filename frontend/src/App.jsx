import { useState, useEffect } from 'react'
import PatientCard from './components/PatientCard'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function App() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/api/patients`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setPatients(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/60 backdrop-blur px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Oncology Pathway Leakage — Risk Dashboard
            </h1>
          </div>
          <p className="mt-1 ml-5 text-sm text-gray-400">
            Powered by DataRobot + GPT-4o Agent
          </p>
        </div>
      </header>

      <main className="px-8 py-8 max-w-5xl mx-auto">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
            <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Loading patient queue...</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-950/60 border border-red-800 px-6 py-4 text-red-300">
            <p className="font-medium">Failed to load patients</p>
            <p className="mt-1 text-sm text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && patients.length === 0 && (
          <p className="text-gray-500 text-center py-20">No patients returned from API.</p>
        )}

        <div className="space-y-6">
          {patients.map(patient => (
            <PatientCard key={patient.patient_id} patient={patient} />
          ))}
        </div>
      </main>
    </div>
  )
}
