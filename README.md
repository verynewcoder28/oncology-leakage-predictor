# Oncology Pathway Leakage — Clinical AI Demo

A full-stack clinical risk dashboard powered by DataRobot predictions and a GPT-4o agentic care coordinator.

## Architecture

```
datarobot_demo/
├── backend/          Node.js Express server (port 3001)
│   └── server.js     REST API + OpenAI agent loop
├── frontend/         React Vite app (port 5173)
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── PatientCard.jsx
│           └── AgentPanel.jsx
├── predict_leakage.py   Original Python prediction script
├── scoring_data.csv     Patient feature data
└── .env                 API keys
```

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

### 1. Configure API keys

Add both keys to `.env` in the project root:

```
DATAROBOT_API_KEY=your_datarobot_key_here
OPENAI_API_KEY=sk-...your_openai_key_here
```

### 2. Install all dependencies

```bash
npm run install:all
```

This installs concurrently at the root, plus all backend and frontend packages.

### 3. Start both servers

```bash
npm run dev
```

This starts:
- **Backend** on `http://localhost:3001`
- **Frontend** on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/patients` | Returns the 3 hardcoded patient rows from `scoring_data.csv` |
| POST | `/api/predict/:patientId` | Calls DataRobot API, returns risk score + top 3 drivers |
| POST | `/api/agent/run/:patientId` | Runs the GPT-4o agent loop, returns full reasoning trace |

## Agent Tools

The GPT-4o agent has 5 deterministic tools:

1. **check_appointment_status** — confirms upcoming appointment based on `days_since_last_appointment`
2. **check_transport_barrier** — detects distance/insurance barriers
3. **send_transport_voucher** — simulated SMS voucher dispatch (taxi or rideshare)
4. **assign_care_coordinator** — assigns and notifies a coordinator
5. **log_intervention_outcome** — appends to `intervention_log.json`

## Intervention Log

Every agent run logs to `intervention_log.json` in the project root with:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "patient_id": "PT-XXXXX",
  "risk_score": 0.87,
  "action_taken": "Transport voucher sent",
  "predicted_outcome": "Patient will attend appointment"
}
```
