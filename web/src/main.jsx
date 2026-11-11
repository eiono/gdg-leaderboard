import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)



/*import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import MaintenancePage from './pages/MaintenancePage.jsx'
import './index.css'

// Maintenance switch.
//   true  -> every visitor sees the maintenance page
//   false -> the normal site
// Change it and push to switch (the site updates about 2 minutes later).
const MAINTENANCE = true

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {MAINTENANCE ? (
      <MaintenancePage />
    ) : (
      <HashRouter>
        <App />
      </HashRouter>
    )}
  </React.StrictMode>
)*/