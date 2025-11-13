import React, { useMemo, useState } from 'react';

function formatCurrency(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toFixed(2)}`;
}

function DriverSalary({ apiBase }) {
  const [form, setForm] = useState({
    driver_name: '',
    vehicle_number: '',
    driver_license_number: '',
    monthly_salary: '',
    months_worked: '',
    total_salary: '',
    notes: ''
  });
  const [status, setStatus] = useState(null);
  const [validation, setValidation] = useState(null);

  const total = useMemo(() => {
    const monthly = Number(form.monthly_salary || 0);
    const months = Number(form.months_worked || 0);
    return (monthly * months).toFixed(2);
  }, [form.monthly_salary, form.months_worked]);

  const showStatus = (message, type = 'success') => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 4000);
  };

  const formatVehicleNumber = (value) => {
    // Remove all non-alphanumeric characters except spaces and hyphens
    let cleaned = value.replace(/[^A-Z0-9\s-]/gi, '').toUpperCase();
    // Remove extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ');
    return cleaned;
  };

  const formatLicenseNumber = (value) => {
    // Remove all non-alphanumeric characters except spaces
    let cleaned = value.replace(/[^A-Z0-9\s]/gi, '').toUpperCase();
    // Remove extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ');
    return cleaned;
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Format vehicle number as user types
    if (name === 'vehicle_number') {
      formattedValue = formatVehicleNumber(value);
    }
    // Format license number as user types
    else if (name === 'driver_license_number') {
      formattedValue = formatLicenseNumber(value);
    }
    
    setForm(prev => ({ ...prev, [name]: formattedValue }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      monthly_salary: Number(form.monthly_salary || 0),
      months_worked: Number(form.months_worked || 0),
      total_salary: Number(total || 0)
    };
    try {
      const res = await fetch(`${apiBase}/driver-salary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed');
      showStatus('Driver salary saved successfully!', 'success');
    } catch (err) {
      showStatus(`Error saving salary: ${err.message}`, 'error');
    }
  };

  const onLoad = async () => {
    try {
      const res = await fetch(`${apiBase}/driver-salary`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const d = data.data || {};
      setForm({
        driver_name: d.driver_name || '',
        vehicle_number: d.vehicle_number || '',
        driver_license_number: d.driver_license_number || '',
        monthly_salary: d.monthly_salary ?? '',
        months_worked: d.months_worked ?? '',
        total_salary: d.total_salary ?? '',
        notes: d.notes || ''
      });
      showStatus('Driver salary loaded successfully!', 'success');
    } catch (err) {
      showStatus(`Error loading salary: ${err.message}`, 'error');
    }
  };

  const onValidate = async () => {
    try {
      const res = await fetch(`${apiBase}/driver-salary/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const v = await res.json();
      if (!res.ok) {
        setValidation({ error: v.detail || v.message || 'Validation failed' });
        return;
      }
      // Extract data from response if nested
      if (v.success !== undefined) {
        setValidation({
          declared_amount: v.declared_amount,
          calculated_amount: v.calculated_amount,
          difference: v.difference,
          is_valid: v.is_valid,
          message: v.message
        });
      } else {
        setValidation(v);
      }
    } catch (err) {
      setValidation({ error: err.message || 'Failed to validate' });
    }
  };

  return (
    <section className="tab-content active">
      <div className="card">
        <h2>👨‍💼 Driver Salary Calculation</h2>
        <p className="card-description">Calculate and validate driver salary against declared amount</p>
        <form className="form" onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="driver-name">Driver Name *</label>
              <input id="driver-name" name="driver_name" value={form.driver_name} onChange={onChange} placeholder="Enter driver name" required />
            </div>
            <div className="form-group">
              <label htmlFor="vehicle-number">Vehicle Number</label>
              <input 
                id="vehicle-number" 
                name="vehicle_number" 
                value={form.vehicle_number} 
                onChange={onChange} 
                placeholder="XX-XX XX XXXX" 
                pattern="[A-Z]{2}-[0-9]{1,2} [A-Z]{1,2} [0-9]{4}"
                title="Format: MH-15 JH 0144"
              />
            </div>
            <div className="form-group">
              <label htmlFor="driver-license-number">Driver's License Number</label>
              <input 
                id="driver-license-number" 
                name="driver_license_number" 
                value={form.driver_license_number} 
                onChange={onChange} 
                placeholder="XXXX XXXX XXXX XXX" 
                pattern="[A-Z]{2}[0-9]{2} [0-9]{11}"
                title="Format: MH15 20020124252"
              />
            </div>
            <div className="form-group">
              <label htmlFor="monthly-salary">Monthly Salary (₹) *</label>
              <input id="monthly-salary" name="monthly_salary" type="number" step="0.01" value={form.monthly_salary} onChange={onChange} placeholder="0.00" required />
            </div>
            <div className="form-group">
              <label htmlFor="months-worked">Months Worked *</label>
              <input id="months-worked" name="months_worked" type="number" min="1" value={form.months_worked} onChange={onChange} placeholder="12" required />
            </div>
            <div className="form-group">
              <label htmlFor="total-salary">Total Salary (₹)</label>
              <input id="total-salary" name="total_salary" value={total} readOnly placeholder="Auto-calculated" />
            </div>
            <div className="form-group full-width">
              <label htmlFor="salary-notes">Notes</label>
              <textarea id="salary-notes" name="notes" rows="3" value={form.notes} onChange={onChange} placeholder="Any additional notes..." />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Save Salary Details</button>
            <button type="button" className="btn btn-secondary" onClick={onValidate}>Validate Against Declaration</button>
            <button type="button" className="btn btn-secondary" onClick={onLoad}>Load Saved</button>
          </div>
        </form>
        {status && (
          <div className={`status-message ${status.type}`} style={{ display: 'block' }}>
            {status.message}
          </div>
        )}
        <div className="validation-result">
          {validation && !validation.error && (
            <div className={`validation-card ${validation.is_valid ? 'valid' : 'invalid'}`}>
              <h4>{validation.is_valid ? '✅ Valid' : '❌ Invalid'} Driver Salary</h4>
              <div className="validation-item"><span>Declared:</span><span>{formatCurrency(validation.declared_amount)}</span></div>
              <div className="validation-item"><span>Calculated:</span><span>{formatCurrency(validation.calculated_amount)}</span></div>
              <div className="validation-item"><span>Difference:</span><span>{formatCurrency(validation.difference)}</span></div>
              <div className="validation-item"><span>Status:</span><span>{validation.message}</span></div>
            </div>
          )}
          {validation && validation.error && (
            <div className="status-message error" style={{ display: 'block' }}>
              Error validating salary: {validation.error}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default DriverSalary;


