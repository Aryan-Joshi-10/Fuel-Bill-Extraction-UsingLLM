import React, { useMemo, useState } from 'react';
import Tabs from './components/Tabs.jsx';
import DeclarationForm from './components/DeclarationForm.jsx';
import FuelBills from './components/FuelBills.jsx';
import DriverSalary from './components/DriverSalary.jsx';
import TaxCalculator from './components/TaxCalculator.jsx';
import Validation from './components/Validation.jsx';

function App() {
  const [active, setActive] = useState('declaration');
  const apiBase = useMemo(() => {
    // Prefer same-origin proxy in dev or reverse-proxy in prod; allow env override
    return import.meta.env.VITE_API_BASE || '/api';
  }, []);

  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          {/* <h1>📊 Income Tax Filing Automation</h1> */}
          <h1>🧮 Income Tax Filing Automation</h1>
          <p className="subtitle">Streamline your tax documentation and validation process</p>
        </div>
      </header>

      <Tabs
        tabs={[
          { id: 'declaration', label: 'Tax Declaration' },
          { id: 'fuel-bills', label: 'Fuel Bills' },
          { id: 'driver-salary', label: 'Driver Salary' },
          { id: 'additional', label: 'TAX Calculator' },
          { id: 'validation', label: 'Validation' }
        ]}
        active={active}
        onChange={setActive}
      />

      <main className="content">
        {active === 'declaration' && <DeclarationForm apiBase={apiBase} />}
        {active === 'fuel-bills' && <FuelBills apiBase={apiBase} />}
        {active === 'driver-salary' && <DriverSalary apiBase={apiBase} />}
        {active === 'additional' && <TaxCalculator apiBase={apiBase} />}
        {active === 'validation' && <Validation apiBase={apiBase} />}
      </main>
    </div>
  );
}

export default App;


