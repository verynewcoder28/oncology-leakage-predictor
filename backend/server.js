const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const axios = require('axios');
const OpenAI = require('openai');

const app = express();
const PORT = 3001;

app.use(cors({ origin: ['http://localhost:5173', 'https://oncology-leakage-predictor.netlify.app'] }));
app.use(express.json());

// ── Constants ─────────────────────────────────────────────────────────────────

//const DR_URL = 'https://app.datarobot.com/api/v2/deployments/6a247cf27e20a7c354ac5475/predictions';
const DR_URL = 'https://app.datarobot.com/api/v2/deployments/6a250f0a89ec1ac9379b97f8/predictions';
const HARDCODED_PATIENTS = [
  {
    patient_id: 'PAT-050158',
    age: '55',
    cancer_type: 'oral_head_neck',
    cancer_stage: '2',
    biomarker_status: 'unknown',
    days_since_diagnosis: '365',
    insurance_type: 'private',
    preferred_language: 'english',
    distance_from_hospital_km: '162.2',
    has_active_insurance_authorisation: 'False',
    outstanding_balance: '0',
    ecog_performance_status: '2',
    pathway_step: '2',
    appointment_type: 'in_person',
    booking_lead_time_days: '30',
    days_since_last_appointment: '13',
    days_since_last_clinical_note: '14',
    days_since_last_portal_login: '5',
    portal_logins_last_30_days: '2',
    call_answered: '1',
    outbound_call_attempts: '1',
    previous_noshow_count: '10',
    previous_reschedule_count: '0',
    previous_intervention_count: '0',
    previous_leakage_flag: 'False',
    historical_attendance_rate: '0.7',
    care_coordinator_assigned: 'False',
    appointment_day_of_week: 'Monday',
    appointment_time_slot: 'morning',
    comorbidity_count: '1',
    days_since_last_clinical_contact: '14',
    gender: 'male',
    nationality_region: 'local',
    outstanding_balance_usd: '0',
    patient_education_material_sent: 'True',
    previous_cancellation_count: '0',
    previous_intervention_outcome: 'none',
    previous_intervention_type: 'none',
    referring_clinician_specialty: 'oncology',
    sms_reminder_responded: 'True',
    sms_reminder_sent: 'True',
    treatment_phase: 'active',
    whatsapp_message_responded: 'False',
    whatsapp_message_sent: 'True',
  },
  {
    patient_id: 'PAT-050017',
    age: '55',
    cancer_type: 'oral_head_neck',
    cancer_stage: '2',
    biomarker_status: 'unknown',
    days_since_diagnosis: '365',
    insurance_type: 'private',
    preferred_language: 'english',
    distance_from_hospital_km: '12.4',
    has_active_insurance_authorisation: 'False',
    outstanding_balance: '0',
    ecog_performance_status: '1',
    pathway_step: '2',
    appointment_type: 'in_person',
    booking_lead_time_days: '30',
    days_since_last_appointment: '135',
    days_since_last_clinical_note: '14',
    days_since_last_portal_login: '5',
    portal_logins_last_30_days: '3',
    call_answered: '1',
    outbound_call_attempts: '1',
    previous_noshow_count: '3',
    previous_reschedule_count: '0',
    previous_intervention_count: '0',
    previous_leakage_flag: 'False',
    historical_attendance_rate: '0.4',
    care_coordinator_assigned: 'False',
    appointment_day_of_week: 'Monday',
    appointment_time_slot: 'morning',
    comorbidity_count: '1',
    days_since_last_clinical_contact: '60',
    gender: 'male',
    nationality_region: 'local',
    outstanding_balance_usd: '0',
    patient_education_material_sent: 'True',
    previous_cancellation_count: '0',
    previous_intervention_outcome: 'missed',
    previous_intervention_type: 'none',
    referring_clinician_specialty: 'oncology',
    sms_reminder_responded: 'True',
    sms_reminder_sent: 'True',
    treatment_phase: 'active',
    whatsapp_message_responded: 'False',
    whatsapp_message_sent: 'True',
  },
  {
    patient_id: 'PAT-050111',
    age: '55',
    cancer_type: 'breast',
    cancer_stage: '2',
    biomarker_status: 'unknown',
    days_since_diagnosis: '365',
    insurance_type: 'private',
    preferred_language: 'english',
    distance_from_hospital_km: '3.7',
    has_active_insurance_authorisation: 'True',
    outstanding_balance: '0',
    ecog_performance_status: '0',
    pathway_step: '2',
    appointment_type: 'in_person',
    booking_lead_time_days: '30',
    days_since_last_appointment: '18',
    days_since_last_clinical_note: '14',
    days_since_last_portal_login: '5',
    portal_logins_last_30_days: '18',
    call_answered: '0',
    outbound_call_attempts: '1',
    previous_noshow_count: '0',
    previous_reschedule_count: '0',
    previous_intervention_count: '0',
    previous_leakage_flag: 'False',
    historical_attendance_rate: '0.7',
    care_coordinator_assigned: 'False',
    appointment_day_of_week: 'Monday',
    appointment_time_slot: 'morning',
    comorbidity_count: '1',
    days_since_last_clinical_contact: '14',
    gender: 'male',
    nationality_region: 'local',
    outstanding_balance_usd: '0',
    patient_education_material_sent: 'True',
    previous_cancellation_count: '0',
    previous_intervention_outcome: 'none',
    previous_intervention_type: 'none',
    referring_clinician_specialty: 'oncology',
    sms_reminder_responded: 'True',
    sms_reminder_sent: 'True',
    treatment_phase: 'active',
    whatsapp_message_responded: 'False',
    whatsapp_message_sent: 'True',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadCSV() {
  return HARDCODED_PATIENTS;
}

function rowToCSV(patient) {
  const headers = Object.keys(patient);
  const values = headers.map(h => {
    const v = String(patient[h]);
    return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
  });
  return headers.join(',') + '\n' + values.join(',');
}

async function callDataRobot(patient) {
  const csvString = rowToCSV(patient);
  console.log('[DataRobot] Sending CSV:\n', csvString);
  const response = await axios.post(DR_URL, csvString, {
    headers: {
      Authorization: `Bearer ${process.env.DATAROBOT_API_KEY}`,
      'Content-Type': 'text/csv; charset=UTF-8',
      Accept: 'text/csv',
    },
  });
  const rows = parse(response.data, { columns: true, skip_empty_lines: true });
  return parseFloat(rows[0]['missed_pathway_milestone_1_PREDICTION']);
}

function getRiskLabel(score) {
  if (score > 0.6) return 'High Risk';
  if (score > 0.3) return 'Medium Risk';
  return 'Low Risk';
}

function computeDrivers(patient) {
  const noshow  = parseFloat(patient.previous_noshow_count);
  const dist    = parseFloat(patient.distance_from_hospital_km);
  const auth    = patient.has_active_insurance_authorisation === 'True' || patient.has_active_insurance_authorisation === '1' || patient.has_active_insurance_authorisation === 1 ? 1 : 0;
  const portal  = parseInt(patient.portal_logins_last_30_days || 0);
  const ecog    = parseInt(patient.ecog_performance_status);
  const balance = parseFloat(patient.outstanding_balance_usd || 0);
  const call    = parseInt(patient.call_answered || 0);
  const lead    = parseInt(patient.booking_lead_time_days || 0);

  const candidates = [
    { feature: 'Previous No-Shows',        value: `${noshow} missed appointments`, weight: noshow * 0.35 },
    { feature: 'Insurance Authorization',  value: auth === 0 ? 'Not authorized' : 'Active', weight: auth === 0 ? 0.90 : -0.50 },
    { feature: 'Distance to Hospital',     value: `${dist} km`,                    weight: dist > 30 ? 0.80 : 0.10 },
    { feature: 'Portal & Call Engagement', value: `${portal} logins, ${call ? 'call answered' : 'no call'}`, weight: (portal <= 2 && call === 0) ? 0.70 : 0.10 },
    { feature: 'ECOG Performance Status',  value: `ECOG ${ecog}`,                  weight: ecog >= 3 ? 0.60 : ecog >= 2 ? 0.20 : -0.10 },
    { feature: 'Outstanding Balance',      value: `$${balance.toFixed(2)}`,        weight: balance > 500 ? 0.40 : 0.05 },
    { feature: 'Booking Lead Time',        value: `${lead} days`,                  weight: lead > 21 ? 0.40 : 0.05 },
  ];

  return candidates
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(({ feature, value, weight }) => ({
      feature,
      value,
      impact: weight > 0.6 ? 'High' : weight > 0.3 ? 'Medium' : 'Low',
    }));
}

function appendInterventionLog(entry) {
  const logPath = path.join(__dirname, '../intervention_log.json');
  let log = [];
  if (fs.existsSync(logPath)) {
    try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch { log = []; }
  }
  log.push(entry);
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
}

// ── OpenAI tool definitions ───────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'check_appointment_status',
      description: 'Check whether the patient has a confirmed upcoming appointment',
      parameters: {
        type: 'object',
        properties: { patient_id: { type: 'string' } },
        required: ['patient_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_transport_barrier',
      description: 'Assess whether the patient faces transport barriers to attending their appointment',
      parameters: {
        type: 'object',
        properties: { patient_id: { type: 'string' } },
        required: ['patient_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_transport_voucher',
      description: 'Send a transport voucher to the patient via SMS',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'string' },
          voucher_type: { type: 'string', enum: ['taxi', 'rideshare'] },
        },
        required: ['patient_id', 'voucher_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_care_coordinator',
      description: 'Assign a care coordinator to the patient and send notification',
      parameters: {
        type: 'object',
        properties: { patient_id: { type: 'string' } },
        required: ['patient_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_intervention_outcome',
      description: 'Log the intervention outcome to the RWE registry',
      parameters: {
        type: 'object',
        properties: {
          patient_id:        { type: 'string' },
          action_taken:      { type: 'string' },
          predicted_outcome: { type: 'string' },
        },
        required: ['patient_id', 'action_taken', 'predicted_outcome'],
      },
    },
  },
];

function executeTool(toolName, toolInput, patient, riskScore) {
  const days  = parseInt(patient.days_since_last_appointment || 0);
  const dist  = parseFloat(patient.distance_from_hospital_km);
  const auth  = patient.has_active_insurance_authorisation === 'True' || patient.has_active_insurance_authorisation === '1' || patient.has_active_insurance_authorisation === 1 ? 1 : 0;

  switch (toolName) {
    case 'check_appointment_status':
      return days > 14
        ? 'No upcoming appointment confirmed'
        : 'Appointment confirmed';

    case 'check_transport_barrier':
      return (dist > 30 && auth === 0)
        ? 'Transport barrier likely - distance exceeds 30km, no active insurance'
        : 'No transport barrier identified';

    case 'send_transport_voucher':
      console.log(`[Agent] Transport voucher (${toolInput.voucher_type}) → ${toolInput.patient_id}`);
      return 'Transport voucher sent to patient via SMS';

    case 'assign_care_coordinator':
      console.log(`[Agent] Care coordinator assigned → ${toolInput.patient_id}`);
      return 'Care coordinator assigned and notified';

    case 'log_intervention_outcome':
      appendInterventionLog({
        timestamp:         new Date().toISOString(),
        patient_id:        toolInput.patient_id,
        risk_score:        riskScore,
        action_taken:      toolInput.action_taken,
        predicted_outcome: toolInput.predicted_outcome,
      });
      return 'Outcome logged to RWE registry';

    default:
      return `Unknown tool: ${toolName}`;
  }
}

async function runAgentLoop(patient, riskScore, riskLabel) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages = [
    {
      role: 'system',
      content:
        'You are a clinical care coordination agent. A patient has been flagged as high risk for missing their oncology treatment milestone. Investigate the barriers and take the most appropriate action. Always check appointment status first, then check for transport barriers, then act. Always log the outcome. Be concise.',
    },
    {
      role: 'user',
      content: `Patient ${patient.patient_id} has been flagged as ${riskLabel}. Risk score: ${(riskScore * 100).toFixed(1)}%. Cancer type: ${patient.cancer_type}. Please investigate and take the most appropriate action.`,
    },
  ];

  const trace = [];

  while (true) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    });

    const msg = response.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const actionSteps = trace.filter(t =>
        ['send_transport_voucher', 'assign_care_coordinator'].includes(t.tool_called)
      );
      const final_action = actionSteps.length > 0
        ? actionSteps.map(t => t.tool_output).join(' · ')
        : 'No direct intervention required';

      return { trace, final_action, final_message: msg.content };
    }

    for (const toolCall of msg.tool_calls) {
      const toolName  = toolCall.function.name;
      const toolInput = JSON.parse(toolCall.function.arguments);
      const toolOutput = executeTool(toolName, toolInput, patient, riskScore);

      trace.push({ tool_called: toolName, tool_input: toolInput, tool_output: toolOutput });

      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolOutput });
    }
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/patients', (req, res) => {
  res.json(HARDCODED_PATIENTS);
});

app.post('/api/predict/:patientId', async (req, res) => {
  try {
    const records = loadCSV();
    const patient = records.find(r => r.patient_id === req.params.patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const riskScore = await callDataRobot(patient);
    const riskLabel = getRiskLabel(riskScore);
    const drivers   = computeDrivers(patient);

    res.json({ risk_score: riskScore, risk_label: riskLabel, drivers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agent/run/:patientId', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not set in .env' });
    }
    const records = loadCSV();
    const patient = records.find(r => r.patient_id === req.params.patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const riskScore = await callDataRobot(patient);
    const riskLabel = getRiskLabel(riskScore);
    const result    = await runAgentLoop(patient, riskScore, riskLabel);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
