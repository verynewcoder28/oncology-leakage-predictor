import { useState, useEffect } from 'react'
import posthog from 'posthog-js'
import AgentPanel from './AgentPanel'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const RISK_CONFIG = {
  'High Risk': {
    badge: 'bg-red-600 text-white',
    border: 'border-red-800',
    glow: 'shadow-red-900/30',
  },
  'Medium Risk': {
    badge: 'bg-amber-500 text-black',
    border: 'border-amber-700',
    glow: 'shadow-amber-900/30',
  },
  'Low Risk': {
    badge: 'bg-emerald-700 text-white',
    border: 'border-emerald-800',
    glow: 'shadow-emerald-900/20',
  },
}

export default function PatientCard({ patient }) {
  const [risk, setRisk] = useState(null)
  const [riskLoading, setRiskLoading] = useState(true)
  const [riskError, setRiskError] = useState(null)
  const [agentState, setAgentState] = useState('idle') // idle | loading | done
  const [agentResult, setAgentResult] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/api/predict/${patient.patient_id}`, { method: 'POST' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setRisk(data)
        setRiskLoading(false)
      })
      .catch(err => {
        setRiskError(err.message)
        setRiskLoading(false)
      })
  }, [patient.patient_id])

  const activateAgent = async () => {
    posthog.capture('agent_activated', {
      patient_id: patient.patient_id,
      risk_label: risk?.risk_label,
      risk_score: risk?.risk_score,
    })
    setAgentState('loading')
    setAgentResult(null)
    try {
      const res = await fetch(
        `${API_URL}/api/agent/run/${patient.patient_id}`,
        { method: 'POST' }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setAgentResult(data)
    } catch (err) {
      setAgentResult({ error: err.message })
    } finally {
      setAgentState('done')
    }
  }

  const riskLabel = risk?.risk_label
  const config = riskLabel ? RISK_CONFIG[riskLabel] : null
  const canActivate = (riskLabel === 'High Risk' || riskLabel === 'Medium Risk') && agentState === 'idle'

  return (
    <div className={`rounded-xl border bg-gray-900 shadow-lg ${config?.border || 'border-gray-700'} ${config?.glow || ''} overflow-hidden transition-shadow`}>
      <div className="px-6 py-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-white font-mono">{patient.patient_id}</h2>
              <span className="text-sm text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                {patient.cancer_type}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              {riskLoading ? (
                <span className="text-xs text-gray-500 animate-pulse">Calling DataRobot API...</span>
              ) : riskError ? (
                <span className="text-xs text-red-400">Risk fetch failed: {riskError}</span>
              ) : riskLabel ? (
                <>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${config?.badge}`}>
                    {riskLabel}
                  </span>
                  <span className="text-sm text-gray-300">
                    {(risk.risk_score * 100).toFixed(1)}% leakage probability
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <button
            onClick={activateAgent}
            disabled={!canActivate}
            title={
              riskLabel === 'Low Risk'
                ? 'Agent only activates for High/Medium risk patients'
                : agentState !== 'idle'
                ? 'Agent already activated'
                : 'Run AI agent for this patient'
            }
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${canActivate
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 cursor-pointer'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
          >
            {agentState === 'loading'
              ? 'Running...'
              : agentState === 'done'
              ? 'Completed'
              : 'Activate Agent'}
          </button>
        </div>

        {/* Feature snapshot grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FeaturePill
            label="No-Shows"
            value={patient.previous_noshow_count}
            warn={parseInt(patient.previous_noshow_count) >= 2}
          />
          <FeaturePill
            label="Distance"
            value={`${patient.distance_from_hospital_km} km`}
            warn={parseFloat(patient.distance_from_hospital_km) > 30}
          />
          <FeaturePill
            label="Insurance Auth"
            value={patient.has_active_insurance_authorisation === '1' ? 'Active' : 'Inactive'}
            warn={patient.has_active_insurance_authorisation !== '1'}
          />
          <FeaturePill
            label="Days Since Appt"
            value={`${patient.days_since_last_appointment}d`}
            warn={parseInt(patient.days_since_last_appointment) > 14}
          />
        </div>

        {/* Additional context row */}
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
          <span>Appt type: <span className="text-gray-400">{patient.appointment_type}</span></span>
          <span>ECOG: <span className="text-gray-400">{patient.ecog_performance_status}</span></span>
          <span>Portal logins: <span className="text-gray-400">{patient.portal_logins_last_30_days}</span></span>
          <span>Call answered: <span className="text-gray-400">{patient.call_answered === '1' ? 'Yes' : 'No'}</span></span>
        </div>

        {/* Top risk drivers */}
        {risk?.drivers && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">Top Risk Drivers</p>
            {risk.drivers.map((driver, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  driver.impact === 'High' ? 'bg-red-500' :
                  driver.impact === 'Medium' ? 'bg-amber-400' : 'bg-gray-500'
                }`} />
                <span className="text-gray-300 min-w-0 truncate">{driver.feature}</span>
                <span className="text-gray-600 shrink-0">·</span>
                <span className="text-gray-400 shrink-0">{driver.value}</span>
                <span className={`ml-auto shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                  driver.impact === 'High' ? 'bg-red-950 text-red-400 border border-red-900' :
                  driver.impact === 'Medium' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                  'bg-gray-800 text-gray-500'
                }`}>
                  {driver.impact}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {agentState !== 'idle' && (
        <AgentPanel state={agentState} result={agentResult} />
      )}
    </div>
  )
}

function FeaturePill({ label, value, warn }) {
  return (
    <div className={`rounded-lg px-3 py-2.5 border ${
      warn
        ? 'bg-red-950/50 border-red-800/60'
        : 'bg-gray-800/60 border-gray-700/40'
    }`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${warn ? 'text-red-300' : 'text-gray-200'}`}>
        {value}
      </p>
    </div>
  )
}
