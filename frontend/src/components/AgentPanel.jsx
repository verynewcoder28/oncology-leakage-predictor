import { useState, useEffect } from 'react'

const TOOL_META = {
  check_appointment_status: {
    label: 'Check Appointment Status',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  check_transport_barrier: {
    label: 'Check Transport Barrier',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  send_transport_voucher: {
    label: 'Send Transport Voucher',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  assign_care_coordinator: {
    label: 'Assign Care Coordinator',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  log_intervention_outcome: {
    label: 'Log Intervention Outcome',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
}

export default function AgentPanel({ state, result }) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (state !== 'done' || !result?.trace?.length) return
    setVisibleCount(0)
    const total = result.trace.length
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setVisibleCount(i)
      if (i >= total) clearInterval(timer)
    }, 550)
    return () => clearInterval(timer)
  }, [state, result])

  const allStepsVisible = visibleCount >= (result?.trace?.length ?? 0)

  return (
    <div className="border-t border-gray-800 bg-gray-950/80 px-6 py-5">
      {/* Panel header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse [animation-delay:200ms]" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse [animation-delay:400ms]" />
        </div>
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
          GPT-4o Agent Reasoning Trace
        </p>
      </div>

      {/* Loading state */}
      {state === 'loading' && (
        <div className="flex items-center gap-3 text-gray-400 py-4">
          <svg className="animate-spin h-5 w-5 text-blue-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Agent investigating — checking appointment and transport barriers...</span>
        </div>
      )}

      {/* Error state */}
      {state === 'done' && result?.error && (
        <div className="rounded-lg bg-red-950/60 border border-red-800 px-4 py-3">
          <p className="text-sm text-red-300">{result.error}</p>
        </div>
      )}

      {/* Trace steps */}
      {state === 'done' && result?.trace && (
        <div className="space-y-0">
          {result.trace.slice(0, visibleCount).map((step, i) => {
            const meta = TOOL_META[step.tool_called] || { label: step.tool_called, icon: null }
            const isLast = i === result.trace.length - 1
            const extraArgs = Object.entries(step.tool_input)
              .filter(([k]) => k !== 'patient_id')
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')

            return (
              <div
                key={i}
                className="flex gap-3 animate-fadeSlideIn"
                style={{ animationFillMode: 'both' }}
              >
                {/* Timeline spine */}
                <div className="flex flex-col items-center pt-0.5 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-blue-900 border border-blue-600 flex items-center justify-center text-blue-300">
                    {meta.icon || <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-gray-800 mt-1 mb-0" />}
                </div>

                {/* Step content */}
                <div className={`flex-1 min-w-0 ${!isLast ? 'pb-4' : 'pb-2'}`}>
                  <p className="text-xs font-semibold text-blue-300">{meta.label}</p>
                  {extraArgs && (
                    <p className="text-xs text-gray-600 font-mono mt-0.5">{extraArgs}</p>
                  )}
                  <div className="mt-1.5 text-sm text-gray-300 bg-gray-800/70 border border-gray-700/50 rounded-lg px-3 py-2">
                    {step.tool_output}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Final results — appear after all steps are shown */}
          {allStepsVisible && (
            <div className="mt-4 space-y-3 animate-fadeSlideIn" style={{ animationFillMode: 'both' }}>
              {/* Final action */}
              <div className="rounded-xl bg-emerald-950/70 border border-emerald-700/60 px-4 py-3">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1.5">
                  Final Action Taken
                </p>
                <p className="text-sm text-emerald-200">{result.final_action}</p>
              </div>

              {/* Agent summary */}
              {result.final_message && (
                <div className="rounded-lg bg-gray-800/60 border border-gray-700/40 px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">Agent Summary</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{result.final_message}</p>
                </div>
              )}

              {/* RWE log confirmation */}
              {result.trace.some(t => t.tool_called === 'log_intervention_outcome') && (
                <div className="flex items-center gap-2 text-sm text-emerald-400 pt-1">
                  <div className="w-4 h-4 rounded-full bg-emerald-900 border border-emerald-600 flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-medium">Intervention logged to RWE Registry</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
