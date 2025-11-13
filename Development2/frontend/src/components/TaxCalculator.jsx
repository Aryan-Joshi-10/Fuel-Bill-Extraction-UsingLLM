import React, { useState, useMemo } from 'react';

function formatCurrency(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function TaxCalculator({ apiBase }) {
  const [taxRegime, setTaxRegime] = useState('old'); // 'old' or 'new'
  const [financialYear, setFinancialYear] = useState('2024-25');
  const [income, setIncome] = useState({
    salary: '',
    business: '',
    capital_gains: '',
    other: ''
  });
  const [deductions, setDeductions] = useState({
    section_80c: '', // Max 1.5L
    section_80d: '', // Max 1L (self+family) or 1.5L (senior citizen)
    hra: '',
    home_loan_interest_24b: '', // Max 2L
    section_80g: '',
    section_80e: '', // Education loan interest
    section_80tta: '', // Savings interest (Max 10k)
    standard_deduction: '50000', // Standard deduction for salaried
    other_deductions: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const totalIncome = useMemo(() => {
    return (
      (Number(income.salary || 0)) +
      (Number(income.business || 0)) +
      (Number(income.capital_gains || 0)) +
      (Number(income.other || 0))
    );
  }, [income]);

  const totalDeductions = useMemo(() => {
    return (
      (Number(deductions.section_80c || 0)) +
      (Number(deductions.section_80d || 0)) +
      (Number(deductions.hra || 0)) +
      (Number(deductions.home_loan_interest_24b || 0)) +
      (Number(deductions.section_80g || 0)) +
      (Number(deductions.section_80e || 0)) +
      (Number(deductions.section_80tta || 0)) +
      (Number(deductions.standard_deduction || 0)) +
      (Number(deductions.other_deductions || 0))
    );
  }, [deductions]);

  const handleIncomeChange = (field, value) => {
    setIncome(prev => ({ ...prev, [field]: value }));
  };

  const handleDeductionChange = (field, value) => {
    setDeductions(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        tax_regime: taxRegime,
        financial_year: financialYear,
        income: {
          salary: Number(income.salary || 0),
          business: Number(income.business || 0),
          capital_gains: Number(income.capital_gains || 0),
          other: Number(income.other || 0)
        },
        deductions: {
          section_80c: Number(deductions.section_80c || 0),
          section_80d: Number(deductions.section_80d || 0),
          hra: Number(deductions.hra || 0),
          home_loan_interest_24b: Number(deductions.home_loan_interest_24b || 0),
          section_80g: Number(deductions.section_80g || 0),
          section_80e: Number(deductions.section_80e || 0),
          section_80tta: Number(deductions.section_80tta || 0),
          standard_deduction: Number(deductions.standard_deduction || 0),
          other_deductions: Number(deductions.other_deductions || 0)
        }
      };

      const res = await fetch(`${apiBase}/tax-calculator/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Calculation failed');
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to calculate tax');
    } finally {
      setLoading(false);
    }
  };

  const handleCompareWithDeclaration = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/tax-calculator/compare-declaration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tax_regime: taxRegime,
          financial_year: financialYear,
          income: {
            salary: Number(income.salary || 0),
            business: Number(income.business || 0),
            capital_gains: Number(income.capital_gains || 0),
            other: Number(income.other || 0)
          },
          deductions: {
            section_80c: Number(deductions.section_80c || 0),
            section_80d: Number(deductions.section_80d || 0),
            hra: Number(deductions.hra || 0),
            home_loan_interest_24b: Number(deductions.home_loan_interest_24b || 0),
            section_80g: Number(deductions.section_80g || 0),
            section_80e: Number(deductions.section_80e || 0),
            section_80tta: Number(deductions.section_80tta || 0),
            standard_deduction: Number(deductions.standard_deduction || 0),
            other_deductions: Number(deductions.other_deductions || 0)
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Comparison failed');
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to compare with declaration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="tab-content active">
      <div className="card">
        <h2>💰 Tax Calculator</h2>
        <p className="card-description">
          Calculate your estimated tax liability based on income and deductions. Compare with your declared amounts.
        </p>

        {/* Tax Regime Selection */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label>Tax Regime</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="taxRegime"
                value="old"
                checked={taxRegime === 'old'}
                onChange={(e) => setTaxRegime(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              Old Tax Regime (with deductions)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="taxRegime"
                value="new"
                checked={taxRegime === 'new'}
                onChange={(e) => setTaxRegime(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              New Tax Regime (simplified)
            </label>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="financial-year">Financial Year</label>
          <select
            id="financial-year"
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="2024-25">2024-25 (AY 2025-26)</option>
            <option value="2023-24">2023-24 (AY 2024-25)</option>
          </select>
        </div>

        {/* Income Section */}
        <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
          <h3 style={{ marginTop: 0 }}>📊 Income Sources</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="salary-income">Salary Income (₹)</label>
              <input
                id="salary-income"
                type="number"
                value={income.salary}
                onChange={(e) => handleIncomeChange('salary', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label htmlFor="business-income">Business/Professional Income (₹)</label>
              <input
                id="business-income"
                type="number"
                value={income.business}
                onChange={(e) => handleIncomeChange('business', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label htmlFor="capital-gains">Capital Gains (₹)</label>
              <input
                id="capital-gains"
                type="number"
                value={income.capital_gains}
                onChange={(e) => handleIncomeChange('capital_gains', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label htmlFor="other-income">Other Income (₹)</label>
              <input
                id="other-income"
                type="number"
                value={income.other}
                onChange={(e) => handleIncomeChange('other', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(76, 175, 80, 0.2)', borderRadius: '4px' }}>
            <strong>Total Income: {formatCurrency(totalIncome)}</strong>
          </div>
        </div>

        {/* Deductions Section */}
        {taxRegime === 'old' && (
          <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <h3 style={{ marginTop: 0 }}>📝 Deductions (Old Regime Only)</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="80c">Section 80C (Max ₹1,50,000)</label>
                <input
                  id="80c"
                  type="number"
                  value={deductions.section_80c}
                  onChange={(e) => handleDeductionChange('section_80c', e.target.value)}
                  placeholder="0"
                  max="150000"
                />
                <small style={{ color: '#aaa' }}>ELSS, PPF, NSC, Life Insurance, etc.</small>
              </div>
              <div className="form-group">
                <label htmlFor="80d">Section 80D - Health Insurance (Max ₹1,00,000)</label>
                <input
                  id="80d"
                  type="number"
                  value={deductions.section_80d}
                  onChange={(e) => handleDeductionChange('section_80d', e.target.value)}
                  placeholder="0"
                  max="100000"
                />
                <small style={{ color: '#aaa' }}>Self + Family: ₹25k, Parents: ₹25k, Senior: ₹50k</small>
              </div>
              <div className="form-group">
                <label htmlFor="hra">HRA (House Rent Allowance)</label>
                <input
                  id="hra"
                  type="number"
                  value={deductions.hra}
                  onChange={(e) => handleDeductionChange('hra', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="home-loan">Section 24(b) - Home Loan Interest (Max ₹2,00,000)</label>
                <input
                  id="home-loan"
                  type="number"
                  value={deductions.home_loan_interest_24b}
                  onChange={(e) => handleDeductionChange('home_loan_interest_24b', e.target.value)}
                  placeholder="0"
                  max="200000"
                />
              </div>
              <div className="form-group">
                <label htmlFor="80g">Section 80G - Donations</label>
                <input
                  id="80g"
                  type="number"
                  value={deductions.section_80g}
                  onChange={(e) => handleDeductionChange('section_80g', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="80e">Section 80E - Education Loan Interest</label>
                <input
                  id="80e"
                  type="number"
                  value={deductions.section_80e}
                  onChange={(e) => handleDeductionChange('section_80e', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="80tta">Section 80TTA - Savings Interest (Max ₹10,000)</label>
                <input
                  id="80tta"
                  type="number"
                  value={deductions.section_80tta}
                  onChange={(e) => handleDeductionChange('section_80tta', e.target.value)}
                  placeholder="0"
                  max="10000"
                />
              </div>
              <div className="form-group">
                <label htmlFor="standard-deduction">Standard Deduction (₹)</label>
                <input
                  id="standard-deduction"
                  type="number"
                  value={deductions.standard_deduction}
                  onChange={(e) => handleDeductionChange('standard_deduction', e.target.value)}
                  placeholder="50000"
                />
                <small style={{ color: '#aaa' }}>Default: ₹50,000 for salaried individuals</small>
              </div>
              <div className="form-group">
                <label htmlFor="other-deductions">Other Deductions (₹)</label>
                <input
                  id="other-deductions"
                  type="number"
                  value={deductions.other_deductions}
                  onChange={(e) => handleDeductionChange('other_deductions', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(33, 150, 243, 0.2)', borderRadius: '4px' }}>
              <strong>Total Deductions: {formatCurrency(totalDeductions)}</strong>
            </div>
          </div>
        )}

        {taxRegime === 'new' && (
          <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: 'rgba(255, 193, 7, 0.2)', padding: '1rem', borderRadius: '4px' }}>
            <p><strong>Note:</strong> New Tax Regime has simplified structure with no major deductions except standard deduction of ₹50,000 for salaried individuals.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="form-actions" style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCalculate}
            disabled={loading || totalIncome === 0}
          >
            {loading ? 'Calculating...' : 'Calculate Tax'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCompareWithDeclaration}
            disabled={loading || totalIncome === 0}
          >
            Compare with Declaration
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="status-message error" style={{ display: 'block', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="card" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <h3>📊 Tax Calculation Results</h3>
            
            {result.comparison && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(255, 193, 7, 0.2)', borderRadius: '4px' }}>
                <h4 style={{ marginTop: 0 }}>📋 Comparison with Declaration</h4>
                <div className="validation-item">
                  <span>Declared Total Income:</span>
                  <span>{formatCurrency(result.comparison.declared_total_income || 0)}</span>
                </div>
                <div className="validation-item">
                  <span>Calculated Total Income:</span>
                  <span>{formatCurrency(result.comparison.calculated_total_income || 0)}</span>
                </div>
                <div className="validation-item">
                  <span>Difference:</span>
                  <span style={{ color: result.comparison.difference >= 0 ? '#4caf50' : '#f44336' }}>
                    {formatCurrency(result.comparison.difference || 0)}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(76, 175, 80, 0.2)', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.5rem' }}>Gross Total Income</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(result.gross_total_income || 0)}</div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(33, 150, 243, 0.2)', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.5rem' }}>Total Deductions</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(result.total_deductions || 0)}</div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(156, 39, 176, 0.2)', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.5rem' }}>Taxable Income</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(result.taxable_income || 0)}</div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(244, 67, 54, 0.2)', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.5rem' }}>Total Tax Liability</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(result.total_tax || 0)}</div>
              </div>
            </div>

            {result.tax_breakdown && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4>Tax Breakdown by Slabs</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {result.tax_breakdown.map((slab, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>
                      <span>{slab.range}</span>
                      <span>{formatCurrency(slab.tax)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.tax_savings_suggestions && result.tax_savings_suggestions.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(76, 175, 80, 0.2)', borderRadius: '4px' }}>
                <h4 style={{ marginTop: 0 }}>💡 Tax Savings Suggestions</h4>
                <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                  {result.tax_savings_suggestions.map((suggestion, idx) => (
                    <li key={idx} style={{ marginBottom: '0.5rem' }}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.cess && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255, 193, 7, 0.2)', borderRadius: '4px' }}>
                <div className="validation-item">
                  <span>Health & Education Cess (4%):</span>
                  <span>{formatCurrency(result.cess || 0)}</span>
                </div>
                <div className="validation-item" style={{ marginTop: '0.5rem' }}>
                  <span><strong>Final Tax Payable:</strong></span>
                  <span><strong>{formatCurrency((result.total_tax || 0) + (result.cess || 0))}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default TaxCalculator;

