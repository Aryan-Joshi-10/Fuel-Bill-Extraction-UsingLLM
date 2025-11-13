import React, { useState } from 'react';

function DeclarationForm({ apiBase }) {
  const [form, setForm] = useState({
    financial_year: '',
    pan_number: '',
    name: '',
    declared_fuel_amount: '',
    declared_driver_salary: '',
    notes: ''
  });
  const [status, setStatus] = useState(null);

  const showStatus = (message, type = 'success') => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 4000);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      declared_fuel_amount: Number(form.declared_fuel_amount || 0),
      declared_driver_salary: Number(form.declared_driver_salary || 0)
    };
    try {
      const res = await fetch(`${apiBase}/declaration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed');
      showStatus('Declaration saved successfully!', 'success');
    } catch (err) {
      showStatus(`Error saving declaration: ${err.message}`, 'error');
    }
  };

  const onLoad = async () => {
    try {
      const res = await fetch(`${apiBase}/declaration`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const d = data.data || {};
      setForm({
        financial_year: d.financial_year || '',
        pan_number: d.pan_number || '',
        name: d.name || '',
        declared_fuel_amount: d.declared_fuel_amount ?? '',
        declared_driver_salary: d.declared_driver_salary ?? '',
        notes: d.notes || ''
      });
      showStatus('Declaration loaded successfully!', 'success');
    } catch (err) {
      showStatus(`Error loading declaration: ${err.message}`, 'error');
    }
  };

  return (
    <section className="tab-content active">
      <div className="card">
        <h2>📋 Income Tax Declaration Details</h2>
        <p className="card-description">Enter the details you declared during income tax filing</p>
        <form className="form" onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="financial-year">Financial Year *</label>
              <input id="financial-year" name="financial_year" value={form.financial_year} onChange={onChange} placeholder="e.g., 2023-24" required />
            </div>
            <div className="form-group">
              <label htmlFor="pan-number">PAN Number *</label>
              <input id="pan-number" name="pan_number" value={form.pan_number} onChange={onChange} placeholder="ABCDE1234F" required maxLength={10} />
            </div>
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input id="name" name="name" value={form.name} onChange={onChange} placeholder="Enter your full name" required />
            </div>
            <div className="form-group">
              <label htmlFor="declared-fuel">Declared Fuel Amount (₹) *</label>
              <input id="declared-fuel" type="number" step="0.01" name="declared_fuel_amount" value={form.declared_fuel_amount} onChange={onChange} placeholder="0.00" required />
            </div>
            <div className="form-group">
              <label htmlFor="declared-driver-salary">Declared Driver Salary (₹) *</label>
              <input id="declared-driver-salary" type="number" step="0.01" name="declared_driver_salary" value={form.declared_driver_salary} onChange={onChange} placeholder="0.00" required />
            </div>
            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" rows="3" name="notes" value={form.notes} onChange={onChange} placeholder="Any additional notes..." />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Save Declaration</button>
            <button type="button" className="btn btn-secondary" onClick={onLoad}>Load Saved</button>
          </div>
        </form>
        {status && (
          <div className={`status-message ${status.type}`} style={{ display: 'block' }}>
            {status.message}
          </div>
        )}
      </div>
    </section>
  );
}

export default DeclarationForm;


