import React, { useState } from 'react';

function formatCurrency(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toFixed(2)}`;
}

function Validation({ apiBase }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runValidation = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${apiBase}/validate`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setResult(data?.data || {});
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const declaration = result?.declaration || {};
  const validations = result?.validations || {};

  return (
    <section className="tab-content active">
      <div className="card">
        <h2>✅ Overall Validation</h2>
        <p className="card-description">View and validate all declared amounts against calculated values</p>
        <div className="validation-section">
          <button type="button" className="btn btn-primary" onClick={runValidation} disabled={loading}>
            {loading ? 'Validating...' : 'Run Full Validation'}
          </button>
          <div className="validation-results">
            {result?.error && (
              <div className="status-message error" style={{ display: 'block' }}>
                Validation error: {result.error}
              </div>
            )}
            {!result?.error && result && (
              <>
                <div className="validation-card">
                  <h4>📋 Declaration Summary</h4>
                  <div className="validation-item"><span>Financial Year:</span><span>{declaration.financial_year || 'N/A'}</span></div>
                  <div className="validation-item"><span>PAN:</span><span>{declaration.pan_number || 'N/A'}</span></div>
                  <div className="validation-item"><span>Declared Fuel:</span><span>{formatCurrency(declaration.declared_fuel_amount || 0)}</span></div>
                  <div className="validation-item"><span>Declared Driver Salary:</span><span>{formatCurrency(declaration.declared_driver_salary || 0)}</span></div>
                </div>
                {validations.driver_salary && (
                  <div className={`validation-card ${validations.driver_salary.is_valid ? 'valid' : 'invalid'}`}>
                    <h4>{validations.driver_salary.is_valid ? '✅' : '❌'} Driver Salary Validation</h4>
                    <div className="validation-item"><span>Declared:</span><span>{formatCurrency(validations.driver_salary.declared)}</span></div>
                    <div className="validation-item"><span>Calculated:</span><span>{formatCurrency(validations.driver_salary.calculated)}</span></div>
                    <div className="validation-item"><span>Difference:</span><span>{formatCurrency(validations.driver_salary.difference)}</span></div>
                    <div className="validation-item"><span>Status:</span><span>{validations.driver_salary.is_valid ? 'Valid ✓' : 'Needs attention ✗'}</span></div>
                  </div>
                )}
                {validations.fuel_bills && (
                  <div className={`validation-card ${validations.fuel_bills.is_valid ? 'valid' : 'invalid'}`}>
                    <h4>{validations.fuel_bills.is_valid ? '✅' : '❌'} Fuel Bills Validation</h4>
                    <div className="validation-item"><span>Declared:</span><span>{formatCurrency(validations.fuel_bills.declared)}</span></div>
                    <div className="validation-item"><span>Calculated:</span><span>{formatCurrency(validations.fuel_bills.calculated)}</span></div>
                    <div className="validation-item"><span>Difference:</span><span>{formatCurrency(validations.fuel_bills.difference)}</span></div>
                    <div className="validation-item"><span>Status:</span><span>{validations.fuel_bills.is_valid ? 'Valid ✓' : 'Needs attention ✗'}</span></div>
                  </div>
                )}
                {!validations.driver_salary && !validations.fuel_bills && (
                  <p className="status-note">No validation data available. Please upload driver salary and/or fuel bills first.</p>
                )}
                {(validations.driver_salary || validations.fuel_bills) && (
                  <p className="status-note">Validation complete.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Validation;


