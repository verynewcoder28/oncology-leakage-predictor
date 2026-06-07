import React from 'react'
import ReactDOM from 'react-dom/client'
import posthog from 'posthog-js'
import App from './App.jsx'
import './index.css'

posthog.init('phc_ktv8MhhHmrhnBDRt7da3nZVCM7WKG3r68XEYe6WYCf7D', {
  api_host: 'https://app.posthog.com',
  person_profiles: 'identified_only',
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
