// // API Base URL - update if backend runs on different host/port
// const API_BASE = 'http://localhost:8000/api';

// // Track current active tab globally so we can force it when needed
// let activeTabId = 'declaration';

// // ---------- Utility Helpers ----------
// function showStatus(element, message, type = 'success', timeout = 4000) {
//     if (!element) return;
//     element.textContent = message;
//     element.className = `status-message ${type}`;
//     if (timeout > 0) {
//         setTimeout(() => {
//             element.className = 'status-message';
//             element.textContent = '';
//         }, timeout);
//     }
// }

// async function safeFetch(url, options = {}) {
//     try {
//         const response = await fetch(url, options);
//         if (!response.ok) {
//             let detail = '';
//             try {
//                 const data = await response.json();
//                 detail = data.detail || data.error || response.statusText;
//             } catch (_) {
//                 detail = response.statusText;
//             }
//             throw new Error(detail || `Request failed with status ${response.status}`);
//         }
//         return response.json();
//     } catch (error) {
//         throw new Error(error.message || 'Network error');
//     }
// }

// function formatCurrency(value) {
//     const num = Number(value);
//     if (Number.isNaN(num)) return '₹0.00';
//     return `₹${num.toFixed(2)}`;
// }

// // ---------- Backend Health Check (safe no-op if unreachable) ----------
// async function checkBackendConnection() {
//     try {
//         await fetch(`${API_BASE.replace('/api', '')}/health`, { method: 'GET' });
//     } catch (_) {
//         // Silently ignore; UI can still work for selection before upload
//     }
// }

// // ---------- Tabs ----------
// function setupTabs() {
//     const buttons = document.querySelectorAll('.tab-btn');
//     const sections = document.querySelectorAll('.tab-content');
//     if (!buttons.length || !sections.length) return;

//     const initialButton = document.querySelector('.tab-btn.active');
//     if (initialButton?.dataset.tab) {
//         activeTabId = initialButton.dataset.tab;
//     }

//     function activateTab(tabId) {
//         const targetButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
//         const targetSection = document.getElementById(tabId);
//         if (!targetButton || !targetSection) return;

//         buttons.forEach((b) => b.classList.remove('active'));
//         sections.forEach((section) => section.classList.remove('active'));

//         targetButton.classList.add('active');
//         targetSection.classList.add('active');
//         activeTabId = tabId;
//     }

//     buttons.forEach((btn) => {
//         btn.addEventListener('click', (event) => {
//             event.preventDefault();
//             const targetId = btn.dataset.tab;
//             if (!targetId) return;
//             activateTab(targetId);
//         });
//     });

//     // expose helper for other modules
//     window.__activateTab = activateTab;

//     // ensure initial state matches markup
//     activateTab(activeTabId);
// }

// // ---------- Declaration Form ----------
// function setupDeclarationForm() {
//     const form = document.getElementById('declaration-form');
//     const loadBtn = document.getElementById('load-declaration');
//     const statusEl = document.getElementById('declaration-status');
//     if (!form || !loadBtn) return;

//     form.addEventListener('submit', async (event) => {
//         event.preventDefault();
//         const data = Object.fromEntries(new FormData(form).entries());
//         data.declared_fuel_amount = Number(data.declared_fuel_amount || 0);
//         data.declared_driver_salary = Number(data.declared_driver_salary || 0);

//         try {
//             await safeFetch(`${API_BASE}/declaration`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(data),
//             });
//             showStatus(statusEl, 'Declaration saved successfully!', 'success');
//         } catch (error) {
//             showStatus(statusEl, `Error saving declaration: ${error.message}`, 'error', 6000);
//         }
//     });

//     loadBtn.addEventListener('click', async () => {
//         try {
//             const result = await safeFetch(`${API_BASE}/declaration`);
//             const data = result.data || {};
//             form.elements.financial_year.value = data.financial_year || '';
//             form.elements.pan_number.value = data.pan_number || '';
//             form.elements.name.value = data.name || '';
//             form.elements.declared_fuel_amount.value = data.declared_fuel_amount ?? '';
//             form.elements.declared_driver_salary.value = data.declared_driver_salary ?? '';
//             form.elements.notes.value = data.notes || '';
//             showStatus(statusEl, 'Declaration loaded successfully!', 'success');
//         } catch (error) {
//             showStatus(statusEl, `Error loading declaration: ${error.message}`, 'error', 6000);
//         }
//     });
// }

// // ---------- Driver Salary ----------
// function setupDriverSalary() {
//     const form = document.getElementById('driver-salary-form');
//     if (!form) return;

//     const monthlyInput = document.getElementById('monthly-salary');
//     const monthsInput = document.getElementById('months-worked');
//     const totalInput = document.getElementById('total-salary');
//     const validateBtn = document.getElementById('validate-salary-btn');
//     const loadBtn = document.getElementById('load-salary');
//     const statusEl = document.getElementById('salary-status');
//     const resultEl = document.getElementById('salary-validation');

//     function updateTotal() {
//         const monthly = Number(monthlyInput.value || 0);
//         const months = Number(monthsInput.value || 0);
//         totalInput.value = (monthly * months).toFixed(2);
//     }

//     [monthlyInput, monthsInput].forEach((input) => {
//         input.addEventListener('input', updateTotal);
//     });

//     form.addEventListener('submit', async (event) => {
//         event.preventDefault();
//         const payload = {
//             driver_name: form.elements.driver_name.value,
//             monthly_salary: Number(form.elements.monthly_salary.value || 0),
//             months_worked: Number(form.elements.months_worked.value || 0),
//             total_salary: Number(totalInput.value || 0),
//             notes: form.elements.notes.value || '',
//         };

//         try {
//             await safeFetch(`${API_BASE}/driver-salary`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(payload),
//             });
//             showStatus(statusEl, 'Driver salary saved successfully!', 'success');
//         } catch (error) {
//             showStatus(statusEl, `Error saving salary: ${error.message}`, 'error', 6000);
//         }
//     });

//     validateBtn.addEventListener('click', async () => {
//         try {
//             const result = await safeFetch(`${API_BASE}/driver-salary/validate`);
//             const { declared_amount, calculated_amount, difference, is_valid, message } = result;
//             resultEl.innerHTML = `
//                 <div class="validation-card ${is_valid ? 'valid' : 'invalid'}">
//                     <h4>${is_valid ? '✅ Valid' : '❌ Invalid'} Driver Salary</h4>
//                     <div class="validation-item"><span>Declared:</span><span>${formatCurrency(declared_amount)}</span></div>
//                     <div class="validation-item"><span>Calculated:</span><span>${formatCurrency(calculated_amount)}</span></div>
//                     <div class="validation-item"><span>Difference:</span><span>${formatCurrency(difference)}</span></div>
//                     <div class="validation-item"><span>Status:</span><span>${message}</span></div>
//                 </div>`;
//         } catch (error) {
//             resultEl.innerHTML = `<div class="status-message error">Error validating salary: ${error.message}</div>`;
//         }
//     });

//     loadBtn.addEventListener('click', async () => {
//         try {
//             const result = await safeFetch(`${API_BASE}/driver-salary`);
//             const data = result.data || {};
//             form.elements.driver_name.value = data.driver_name || '';
//             form.elements.monthly_salary.value = data.monthly_salary ?? '';
//             form.elements.months_worked.value = data.months_worked ?? '';
//             form.elements.notes.value = data.notes || '';
//             totalInput.value = (data.total_salary ?? 0).toFixed(2);
//             showStatus(statusEl, 'Driver salary loaded successfully!', 'success');
//         } catch (error) {
//             showStatus(statusEl, `Error loading salary: ${error.message}`, 'error', 6000);
//         }
//     });
// }

// // ---------- Fuel Bills Upload ----------
// // function setupFuelBills() {
// //     const uploadArea = document.getElementById('upload-area');
// //     const fileInput = document.getElementById('fuel-bills-input');
// //     const uploadBtn = document.getElementById('upload-btn');
// //     const excelBtn = document.getElementById('generate-excel-btn');
// //     const progressBar = document.getElementById('upload-progress');
// //     const progressFill = progressBar ? progressBar.querySelector('.progress-fill') : null;
// //     const resultsEl = document.getElementById('fuel-bills-results');

// //     if (!uploadArea || !fileInput || !uploadBtn || !resultsEl) return;

// //     const state = { selectedFiles: [], billsData: [] };

// //     function forceFuelTab() {
// //         if (window.__activateTab) {
// //             window.__activateTab('fuel-bills');
// //         }
// //         activeTabId = 'fuel-bills';
// //     }

// //     function renderSelectedFiles(files) {
// //         if (!files.length) {
// //             resultsEl.innerHTML = '';
// //             uploadBtn.disabled = true;
// //             uploadBtn.textContent = 'Select Files First';
// //             excelBtn.style.display = 'none';
// //             return;
// //         }

// //         const items = files
// //             .map((file, index) => {
// //                 const sizeKb = (file.size / 1024).toFixed(1);
// //                 return `<li>${index + 1}. ${file.name} <span>${sizeKb} KB</span></li>`;
// //             })
// //             .join('');

// //         resultsEl.innerHTML = `
// //             <div class="selected-files">
// //                 <h4>Selected Files (${files.length}):</h4>
// //                 <ul>${items}</ul>
// //                 <p>Click "Upload Files" to start extraction.</p>
// //             </div>`;

// //         uploadBtn.disabled = false;
// //         uploadBtn.textContent = `Upload ${files.length} File${files.length > 1 ? 's' : ''}`;
// //         excelBtn.style.display = 'none';
// //     }

// //     function handleFiles(files) {
// //         const valid = Array.from(files).filter((file) => {
// //             const ext = file.name.split('.').pop().toLowerCase();
// //             return ['pdf', 'png', 'jpg', 'jpeg'].includes(ext);
// //         });

// //         if (!valid.length) {
// //             alert('Please select valid files (PDF, PNG, JPG, JPEG).');
// //             return;
// //         }

// //         state.selectedFiles = valid;
// //         forceFuelTab();
// //         renderSelectedFiles(valid);
// //     }

// //     async function uploadSelectedFiles() {
// //         if (!state.selectedFiles.length) return;

// //         forceFuelTab();

// //         const formData = new FormData();
// //         state.selectedFiles.forEach((file) => {
// //             formData.append('files', file);
// //         });

// //         if (progressBar) progressBar.style.display = 'block';
// //         if (progressFill) progressFill.style.width = '0%';
// //         uploadBtn.disabled = true;
// //         uploadBtn.textContent = 'Uploading... 0%';
// //         resultsEl.innerHTML = '<div class="status-message">Uploading and processing files, please wait...</div>';

// //         // Use XMLHttpRequest to track upload progress
// //         const xhr = new XMLHttpRequest();
// //         xhr.open('POST', `${API_BASE}/fuel-bills/upload`, true);

// //         xhr.upload.onprogress = (event) => {
// //             if (event.lengthComputable && progressFill) {
// //                 const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
// //                 progressFill.style.width = `${percent}%`;
// //                 uploadBtn.textContent = `Uploading... ${percent}%`;
// //             }
// //         };

// //         xhr.onreadystatechange = () => {
// //             if (xhr.readyState === XMLHttpRequest.DONE) {
// //                 try {
// //                     if (progressFill) progressFill.style.width = '100%';
// //                     uploadBtn.textContent = 'Processing...';

// //                     console.log(result);

// //                     if (xhr.status >= 200 && xhr.status < 300) {
// //                         const result = JSON.parse(xhr.responseText || '{}');
// //                         forceFuelTab();
// //                         state.billsData = result.bills_data || [];
                        
// //                         excelBtn.style.display = state.billsData.length ? 'inline-block' : 'none';
// //                         renderFuelResults(result);
// //                         state.selectedFiles = [];
// //                         fileInput.value = '';
// //                     } else {
// //                         let errorMsg = 'Upload failed';
// //                         try {
// //                             const err = JSON.parse(xhr.responseText || '{}');
// //                             errorMsg = err.detail || err.error || errorMsg;
// //                         } catch (_) {}
// //                         forceFuelTab();
// //                         resultsEl.innerHTML = `<div class="status-message error">Upload failed: ${errorMsg}</div>`;
// //                     }
// //                 } catch (e) {
// //                     console.error('Upload handling error:', e);
// //                     resultsEl.innerHTML = `<div class="status-message error">Unexpected error handling response</div>`;
// //                 } finally {
// //                     forceFuelTab();
// //                     setTimeout(() => {
// //                         if (progressBar) progressBar.style.display = 'none';
// //                         if (progressFill) progressFill.style.width = '0%';
// //                         uploadBtn.disabled = false;
// //                         uploadBtn.textContent = 'Select Files First';
// //                     }, 300);
// //                 }
// //             }
// //         };

// //         xhr.onerror = () => {
// //             forceFuelTab();
// //             resultsEl.innerHTML = `<div class="status-message error">Network error during upload</div>`;
// //             if (progressBar) progressBar.style.display = 'none';
// //             if (progressFill) progressFill.style.width = '0%';
// //             uploadBtn.disabled = false;
// //             uploadBtn.textContent = 'Select Files First';
// //         };

// //         xhr.send(formData);
// //     }

// //     function renderFuelResults(result) {
// //         const { total_bills, total_fuel_cost, bills_data } = result;
// //         let html = `
// //             <div class="summary-card">
// //                 <h3>📊 Extraction Summary</h3>
// //                 <div class="summary-item"><span>Total Bills:</span><span>${total_bills}</span></div>
// //                 <div class="summary-item"><span>Total Cost:</span><span>${formatCurrency(total_fuel_cost)}</span></div>
// //             </div>`;

// //         if (Array.isArray(bills_data) && bills_data.length) {
// //             const rows = bills_data
// //                 .map((bill) => {
// //                     return `
// //                         <tr>
// //                             <td>${bill['Petrol Pump Name'] || '-'}</td>
// //                             <td>${bill.Date || '-'}</td>
// //                             <td>${bill.Product || '-'}</td>
// //                             <td>${bill['Volume(L)'] || '-'}</td>
// //                             <td>${bill['Rate per Litre'] || '-'}</td>
// //                             <td>${bill['Total Amount (Rs)'] ? formatCurrency(Number(bill['Total Amount (Rs)'])) : '-'}</td>
// //                         </tr>`;
// //                 })
// //                 .join('');

// //             html += `
// //                 <table class="results-table">
// //                     <thead>
// //                         <tr>
// //                             <th>Petrol Pump</th>
// //                             <th>Date</th>
// //                             <th>Product</th>
// //                             <th>Volume (L)</th>
// //                             <th>Rate / Litre</th>
// //                             <th>Amount</th>
// //                         </tr>
// //                     </thead>
// //                     <tbody>${rows}</tbody>
// //                 </table>`;
// //         }

// //         resultsEl.innerHTML = html;
// //         excelBtn.style.display = state.billsData.length ? 'inline-block' : 'none';
// //         if (state.billsData.length) {
// //             resultsEl.innerHTML += '<p class="status-note">Extraction complete.</p>';
// //         }
// //     }

// //     // Drag & drop / click handlers
// //     uploadArea.addEventListener('click', (event) => {
// //         // event.preventDefault();
// //         // event.stopPropagation();
// //         forceFuelTab();
// //         fileInput.click();
// //     });

// //     uploadArea.addEventListener('dragover', (event) => {
// //         event.preventDefault();
// //         uploadArea.classList.add('dragover');
// //     });

// //     uploadArea.addEventListener('dragleave', () => {
// //         uploadArea.classList.remove('dragover');
// //     });

// //     uploadArea.addEventListener('drop', (event) => {
// //         event.preventDefault();
// //         event.stopPropagation();
// //         uploadArea.classList.remove('dragover');
// //         if (event.dataTransfer?.files?.length) {
// //             handleFiles(event.dataTransfer.files);
// //         }
// //     });

// //     fileInput.addEventListener('change', (event) => {
// //         if (event.target.files?.length) {
// //             handleFiles(event.target.files);
// //         }
// //     });

// //     uploadBtn.addEventListener('click', (event) => {
// //         event.preventDefault();
// //         event.stopPropagation();
// //         forceFuelTab();
// //         if (!state.selectedFiles.length) {
// //             alert('Please select files before uploading.');
// //             return;
// //         }
// //         console.log('Uploading files:', state.selectedFiles.map((f) => f.name));
// //         uploadSelectedFiles();
// //     });

// //     excelBtn.addEventListener('click', async () => {
// //         if (!state.billsData.length) {
// //             alert('No bills data available to export.');
// //             return;
// //         }

// //         const payload = state.billsData.map((bill, index) => ({
// //             file: `Bill_${index + 1}`,
// //             data: bill,
// //         }));

// //         try {
// //             const response = await fetch(`${API_BASE}/fuel-bills/generate-excel`, {
// //                 method: 'POST',
// //                 headers: { 'Content-Type': 'application/json' },
// //                 body: JSON.stringify(payload),
// //             });

// //             if (!response.ok) {
// //                 const errorData = await response.json().catch(() => ({}));
// //                 throw new Error(errorData.detail || 'Failed to generate Excel file');
// //             }

// //             const blob = await response.blob();
// //             const url = window.URL.createObjectURL(blob);
// //             const anchor = document.createElement('a');
// //             anchor.href = url;
// //             anchor.download = `fuel_bills_${new Date().toISOString().split('T')[0]}.xlsx`;
// //             document.body.appendChild(anchor);
// //             anchor.click();
// //             document.body.removeChild(anchor);
// //             window.URL.revokeObjectURL(url);
// //         } catch (error) {
// //             console.error('Excel generation error:', error);
// //             alert(`Error generating Excel: ${error.message}`);
// //         }
// //     });
// // }
// function setupFuelBills() {
//     const API_BASE = window.location.origin + '/api';

//     // DOM elements
//     const uploadArea = document.getElementById('upload-area');
//     const fileInput = document.getElementById('fuel-bills-input');
//     const uploadBtn = document.getElementById('upload-btn');
//     const excelBtn = document.getElementById('generate-excel-btn');
//     const progressBar = document.getElementById('upload-progress');
//     const progressFill = progressBar.querySelector('.progress-fill');
//     const resultsSection = document.getElementById('fuel-bills-results');

//     // ✅ Helper: enable or disable upload button based on file selection
//     function updateUploadButtonState() {
//         if (fileInput.files.length > 0) {
//             uploadBtn.disabled = false;
//             uploadBtn.textContent = 'Upload & Extract';
//         } else {
//             uploadBtn.disabled = true;
//             uploadBtn.textContent = 'Select Files First';
//         }
//     }

//     // // ✅ Enable upload button when files selected
//     // fileInput.addEventListener('change', () => {
//     //     if (fileInput.files.length > 0) {
//     //         uploadBtn.disabled = false;
//     //         uploadBtn.textContent = 'Upload & Extract';
//     //     } else {
//     //         uploadBtn.disabled = true;
//     //         uploadBtn.textContent = 'Select Files First';
//     //     }
//     // });
//     // ✅ Click upload area → open file picker
//     uploadArea.addEventListener('click', () => fileInput.click());

//     // ✅ File input selection
//     fileInput.addEventListener('change', updateUploadButtonState);

//     // ✅ Drag & drop support
//     uploadArea.addEventListener('dragover', (e) => {
//         e.preventDefault();
//         uploadArea.classList.add('dragging');
//     });

//     uploadArea.addEventListener('dragleave', (e) => {
//         e.preventDefault();
//         uploadArea.classList.remove('dragging');
//     });

//     uploadArea.addEventListener('drop', (e) => {
//         e.preventDefault();
//         uploadArea.classList.remove('dragging');

//         // Replace file input files with dropped files
//         const droppedFiles = e.dataTransfer.files;
//         if (droppedFiles.length > 0) {
//             fileInput.files = droppedFiles;
//             updateUploadButtonState();
//         }
//     });

//     // ✅ Upload handler
//     uploadBtn.addEventListener('click', async () => {
//         const files = fileInput.files;
//         if (!files.length) return;

//         const formData = new FormData();
//         for (const file of files) formData.append('files', file);

//         resultsSection.innerHTML = '';
//         progressBar.style.display = 'block';
//         progressFill.style.width = '0%';
//         uploadBtn.disabled = true;
//         uploadBtn.textContent = 'Uploading...';

//         try {
//             // Use XMLHttpRequest to show progress
//             const xhr = new XMLHttpRequest();
//             xhr.open('POST', `${API_BASE}/fuel-bills/upload`, true);

//             xhr.upload.onprogress = (event) => {
//                 if (event.lengthComputable) {
//                     const percent = (event.loaded / event.total) * 100;
//                     progressFill.style.width = `${percent}%`;
//                 }
//             };

//             xhr.onload = async () => {
//                 progressBar.style.display = 'none';
//                 uploadBtn.disabled = false;
//                 uploadBtn.textContent = 'Upload & Extract';

//                 if (xhr.status === 200) {
//                     try {
//                         const result = JSON.parse(xhr.responseText);
//                         renderFuelBillResults(result);
//                     } catch (err) {
//                         resultsSection.innerHTML = `<p style="color:red;">Failed to parse response</p>`;
//                     }
//                 } else {
//                     resultsSection.innerHTML = `<p style="color:red;">Upload failed (${xhr.status})</p>`;
//                 }
//             };

//             xhr.onerror = () => {
//                 progressBar.style.display = 'none';
//                 resultsSection.innerHTML = `<p style="color:red;">Network error during upload</p>`;
//                 uploadBtn.disabled = false;
//                 uploadBtn.textContent = 'Upload & Extract';
//             };

//             xhr.send(formData);
//         } catch (err) {
//             console.error(err);
//             resultsSection.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
//         }
//     });

//     // ✅ Excel generation handler
//     excelBtn.addEventListener('click', async () => {
//         excelBtn.disabled = true;
//         excelBtn.textContent = 'Generating...';

//         try {
//             const response = await fetch(`${API_BASE}/fuel-bills/excel`, {
//                 method: 'GET'
//             });

//             if (!response.ok) throw new Error('Failed to generate Excel file');

//             const blob = await response.blob();
//             const url = window.URL.createObjectURL(blob);
//             const a = document.createElement('a');
//             a.href = url;
//             a.download = 'fuel_bills_summary.xlsx';
//             document.body.appendChild(a);
//             a.click();
//             a.remove();
//             window.URL.revokeObjectURL(url);

//         } catch (err) {
//             resultsSection.innerHTML = `<p style="color:red;">${err.message}</p>`;
//         } finally {
//             excelBtn.disabled = false;
//             excelBtn.textContent = 'Generate Excel';
//         }
//     });

//     // ✅ Helper function to display backend results
//     function renderFuelBillResults(data) {
//         if (!data || Object.keys(data).length === 0) {
//             resultsSection.innerHTML = '<p>No data found in uploaded bills.</p>';
//             return;
//         }

//         let html = `
//             <h3>Extracted Fuel Bill Details</h3>
//             <table class="results-table">
//                 <thead>
//                     <tr>
//                         <th>File</th>
//                         <th>Date</th>
//                         <th>Amount (₹)</th>
//                         <th>Fuel Type</th>
//                         <th>Station Name</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//         `;

//         if (Array.isArray(data.bills)) {
//             for (const bill of data.bills) {
//                 html += `
//                     <tr>
//                         <td>${bill.file_name || '-'}</td>
//                         <td>${bill.date || '-'}</td>
//                         <td>${bill.amount || '-'}</td>
//                         <td>${bill.fuel_type || '-'}</td>
//                         <td>${bill.station_name || '-'}</td>
//                     </tr>
//                 `;
//             }
//         }

//         html += `
//                 </tbody>
//             </table>
//             <p class="summary">Total Fuel Expense: <strong>₹${data.total_amount || 0}</strong></p>
//         `;

//         resultsSection.innerHTML = html;

//         // Show Excel button now that data exists
//         excelBtn.style.display = 'inline-block';
//     }
// }


// // ---------- Overall Validation ----------
// function setupValidation() {
//     const validateBtn = document.getElementById('validate-all-btn');
//     const resultsEl = document.getElementById('validation-results');
//     if (!validateBtn || !resultsEl) return;

//     validateBtn.addEventListener('click', async () => {
//         if (window.__activateTab) {
//             window.__activateTab('validation');
//         }
//         resultsEl.innerHTML = '<div class="status-message">Validating...</div>';
//         try {
//             const result = await safeFetch(`${API_BASE}/validate`);
//             const { declaration = {}, validations = {} } = result.data || {};

//             let html = `
//                 <div class="validation-card">
//                     <h4>📋 Declaration Summary</h4>
//                     <div class="validation-item"><span>Financial Year:</span><span>${declaration.financial_year || 'N/A'}</span></div>
//                     <div class="validation-item"><span>PAN:</span><span>${declaration.pan_number || 'N/A'}</span></div>
//                     <div class="validation-item"><span>Declared Fuel:</span><span>${formatCurrency(declaration.declared_fuel_amount || 0)}</span></div>
//                     <div class="validation-item"><span>Declared Driver Salary:</span><span>${formatCurrency(declaration.declared_driver_salary || 0)}</span></div>
//                 </div>`;

//             if (validations.driver_salary) {
//                 const vs = validations.driver_salary;
//                 html += `
//                     <div class="validation-card ${vs.is_valid ? 'valid' : 'invalid'}">
//                         <h4>${vs.is_valid ? '✅' : '❌'} Driver Salary Validation</h4>
//                         <div class="validation-item"><span>Declared:</span><span>${formatCurrency(vs.declared)}</span></div>
//                         <div class="validation-item"><span>Calculated:</span><span>${formatCurrency(vs.calculated)}</span></div>
//                         <div class="validation-item"><span>Difference:</span><span>${formatCurrency(vs.difference)}</span></div>
//                         <div class="validation-item"><span>Status:</span><span>${vs.is_valid ? 'Valid ✓' : 'Needs attention ✗'}</span></div>
//                     </div>`;
//             }

//             resultsEl.innerHTML = html;
//             resultsEl.innerHTML += '<p class="status-note">Validation complete.</p>';
//         } catch (error) {
//             console.error('Validation error:', error);
//             resultsEl.innerHTML = `<div class="status-message error">Validation error: ${error.message}</div>`;
//         }
//     });
// }

// // ---------- Initialization ----------
// document.addEventListener('DOMContentLoaded', () => {
//     setupTabs();
//     setupDeclarationForm();
//     setupDriverSalary();
//     setupFuelBills();
//     setupValidation();
//     // Guarded, non-blocking backend check to avoid any side effects
//     try {
//         const sameOrigin = API_BASE.startsWith(window.location.origin);
//         const isHttp = /^https?:\/\//i.test(API_BASE);
//         if (sameOrigin && isHttp && typeof fetch === 'function') {
//             const schedule = window.requestIdleCallback || ((fn) => setTimeout(fn, 0));
//             schedule(() => { checkBackendConnection(); });
//         }
//     } catch (_) {
//         // ignore
//     }
//     if (activeTabId) {
//         window.__activateTab?.(activeTabId);
//     }
// });

// API Base URL - update if backend runs on different host/port
const API_BASE = 'http://localhost:8000/api';

// Track current active tab globally so we can force it when needed
let activeTabId = 'declaration';

// ---------- Utility Helpers ----------
function showStatus(element, message, type = 'success', timeout = 4000) {
    if (!element) return;
    element.textContent = message;
    element.className = `status-message ${type}`;
    if (timeout > 0) {
        setTimeout(() => {
            element.className = 'status-message';
            element.textContent = '';
        }, timeout);
    }
}

async function safeFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            let detail = '';
            try {
                const data = await response.json();
                detail = data.detail || data.error || response.statusText;
            } catch (_) {
                detail = response.statusText;
            }
            throw new Error(detail || `Request failed with status ${response.status}`);
        }
        return response.json();
    } catch (error) {
        throw new Error(error.message || 'Network error');
    }
}

function formatCurrency(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return '₹0.00';
    return `₹${num.toFixed(2)}`;
}

// ---------- Backend Health Check (safe no-op if unreachable) ----------
async function checkBackendConnection() {
    try {
        await fetch(`${API_BASE.replace('/api', '')}/health`, { method: 'GET' });
    } catch (_) {
        // Silently ignore; UI can still work for selection before upload
    }
}

// ---------- Tabs ----------
function setupTabs() {
    const buttons = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.tab-content');
    if (!buttons.length || !sections.length) return;

    const initialButton = document.querySelector('.tab-btn.active');
    if (initialButton?.dataset.tab) {
        activeTabId = initialButton.dataset.tab;
    }

    function activateTab(tabId) {
        const targetButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        const targetSection = document.getElementById(tabId);
        if (!targetButton || !targetSection) return;

        buttons.forEach((b) => b.classList.remove('active'));
        sections.forEach((section) => section.classList.remove('active'));

        targetButton.classList.add('active');
        targetSection.classList.add('active');
        activeTabId = tabId;
    }

    buttons.forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            const targetId = btn.dataset.tab;
            if (!targetId) return;
            activateTab(targetId);
        });
    });

    // expose helper for other modules
    window.__activateTab = activateTab;

    // ensure initial state matches markup
    activateTab(activeTabId);
}

// ---------- Declaration Form ----------
function setupDeclarationForm() {
    const form = document.getElementById('declaration-form');
    const loadBtn = document.getElementById('load-declaration');
    const statusEl = document.getElementById('declaration-status');
    if (!form || !loadBtn) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        data.declared_fuel_amount = Number(data.declared_fuel_amount || 0);
        data.declared_driver_salary = Number(data.declared_driver_salary || 0);

        try {
            await safeFetch(`${API_BASE}/declaration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            showStatus(statusEl, 'Declaration saved successfully!', 'success');
        } catch (error) {
            showStatus(statusEl, `Error saving declaration: ${error.message}`, 'error', 6000);
        }
    });

    loadBtn.addEventListener('click', async () => {
        try {
            const result = await safeFetch(`${API_BASE}/declaration`);
            const data = result.data || {};
            form.elements.financial_year.value = data.financial_year || '';
            form.elements.pan_number.value = data.pan_number || '';
            form.elements.name.value = data.name || '';
            form.elements.declared_fuel_amount.value = data.declared_fuel_amount ?? '';
            form.elements.declared_driver_salary.value = data.declared_driver_salary ?? '';
            form.elements.notes.value = data.notes || '';
            showStatus(statusEl, 'Declaration loaded successfully!', 'success');
        } catch (error) {
            showStatus(statusEl, `Error loading declaration: ${error.message}`, 'error', 6000);
        }
    });
}

// ---------- Driver Salary ----------
function setupDriverSalary() {
    const form = document.getElementById('driver-salary-form');
    if (!form) return;

    const monthlyInput = document.getElementById('monthly-salary');
    const monthsInput = document.getElementById('months-worked');
    const totalInput = document.getElementById('total-salary');
    const validateBtn = document.getElementById('validate-salary-btn');
    const loadBtn = document.getElementById('load-salary');
    const statusEl = document.getElementById('salary-status');
    const resultEl = document.getElementById('salary-validation');

    function updateTotal() {
        const monthly = Number(monthlyInput.value || 0);
        const months = Number(monthsInput.value || 0);
        totalInput.value = (monthly * months).toFixed(2);
    }

    [monthlyInput, monthsInput].forEach((input) => {
        input.addEventListener('input', updateTotal);
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            driver_name: form.elements.driver_name.value,
            monthly_salary: Number(form.elements.monthly_salary.value || 0),
            months_worked: Number(form.elements.months_worked.value || 0),
            total_salary: Number(totalInput.value || 0),
            notes: form.elements.notes.value || '',
        };

        try {
            await safeFetch(`${API_BASE}/driver-salary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            showStatus(statusEl, 'Driver salary saved successfully!', 'success');
        } catch (error) {
            showStatus(statusEl, `Error saving salary: ${error.message}`, 'error', 6000);
        }
    });

    validateBtn.addEventListener('click', async () => {
        try {
            const result = await safeFetch(`${API_BASE}/driver-salary/validate`);
            const { declared_amount, calculated_amount, difference, is_valid, message } = result;
            resultEl.innerHTML = `
                <div class="validation-card ${is_valid ? 'valid' : 'invalid'}">
                    <h4>${is_valid ? '✅ Valid' : '❌ Invalid'} Driver Salary</h4>
                    <div class="validation-item"><span>Declared:</span><span>${formatCurrency(declared_amount)}</span></div>
                    <div class="validation-item"><span>Calculated:</span><span>${formatCurrency(calculated_amount)}</span></div>
                    <div class="validation-item"><span>Difference:</span><span>${formatCurrency(difference)}</span></div>
                    <div class="validation-item"><span>Status:</span><span>${message}</span></div>
                </div>`;
        } catch (error) {
            resultEl.innerHTML = `<div class="status-message error">Error validating salary: ${error.message}</div>`;
        }
    });

    loadBtn.addEventListener('click', async () => {
        try {
            const result = await safeFetch(`${API_BASE}/driver-salary`);
            const data = result.data || {};
            form.elements.driver_name.value = data.driver_name || '';
            form.elements.monthly_salary.value = data.monthly_salary ?? '';
            form.elements.months_worked.value = data.months_worked ?? '';
            form.elements.notes.value = data.notes || '';
            totalInput.value = (data.total_salary ?? 0).toFixed(2);
            showStatus(statusEl, 'Driver salary loaded successfully!', 'success');
        } catch (error) {
            showStatus(statusEl, `Error loading salary: ${error.message}`, 'error', 6000);
        }
    });
}

// ---------- Fuel Bills Upload ----------
function setupFuelBills() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('fuel-bills-input');
    const uploadBtn = document.getElementById('upload-btn');
    const excelBtn = document.getElementById('generate-excel-btn');
    const progressBar = document.getElementById('upload-progress');
    const progressFill = progressBar ? progressBar.querySelector('.progress-fill') : null;
    const resultsEl = document.getElementById('fuel-bills-results');

    if (!uploadArea || !fileInput || !uploadBtn || !resultsEl) return;

    const state = { selectedFiles: [], billsData: [] };

    function forceFuelTab() {
        if (window.__activateTab) {
            window.__activateTab('fuel-bills');
        }
        activeTabId = 'fuel-bills';
    }

    function renderSelectedFiles(files) {
        if (!files.length) {
            resultsEl.innerHTML = '';
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Select Files First';
            excelBtn.style.display = 'none';
            return;
        }

        const items = files
            .map((file, index) => {
                const sizeKb = (file.size / 1024).toFixed(1);
                return `<li>${index + 1}. ${file.name} <span>${sizeKb} KB</span></li>`;
            })
            .join('');

        resultsEl.innerHTML = `
            <div class="selected-files">
                <h4>Selected Files (${files.length}):</h4>
                <ul>${items}</ul>
                <p>Click "Upload Files" to start extraction.</p>
            </div>`;

        uploadBtn.disabled = false;
        uploadBtn.textContent = `Upload ${files.length} File${files.length > 1 ? 's' : ''}`;
        excelBtn.style.display = 'none';
    }

    function handleFiles(files) {
        const valid = Array.from(files).filter((file) => {
            const ext = file.name.split('.').pop().toLowerCase();
            return ['pdf', 'png', 'jpg', 'jpeg'].includes(ext);
        });

        if (!valid.length) {
            alert('Please select valid files (PDF, PNG, JPG, JPEG).');
            return;
        }

        state.selectedFiles = valid;
        forceFuelTab();
        renderSelectedFiles(valid);
    }

    async function uploadSelectedFiles() {
        if (!state.selectedFiles.length) return;

        forceFuelTab();

        const formData = new FormData();
        state.selectedFiles.forEach((file) => {
            formData.append('files', file);
        });

        if (progressBar) progressBar.style.display = 'block';
        if (progressFill) progressFill.style.width = '0%';
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading... 0%';
        resultsEl.innerHTML = '<div class="status-message">Uploading and processing files, please wait...</div>';

        // Use XMLHttpRequest to track upload progress
        const xhr = new XMLHttpRequest();
        const responseMain = xhr.open('POST', `${API_BASE}/fuel-bills/upload`, true);
        console.log(responseMain);
        

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && progressFill) {
                const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
                progressFill.style.width = `${percent}%`;
                uploadBtn.textContent = `Uploading... ${percent}%`;
            }
        };

        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                try {
                    if (progressFill) progressFill.style.width = '100%';
                    uploadBtn.textContent = 'Processing...';


                    if (xhr.status >= 200 && xhr.status < 300) {
                        const result = JSON.parse(xhr.responseText || '{}');
                        console.log(result);
                        forceFuelTab();
                        state.billsData = result.bills_data || [];
                        excelBtn.style.display = state.billsData.length ? 'inline-block' : 'none';
                        renderFuelResults(result);
                        state.selectedFiles = [];
                        fileInput.value = '';
                    } else {
                        let errorMsg = 'Upload failed';
                        try {
                            const err = JSON.parse(xhr.responseText || '{}');
                            errorMsg = err.detail || err.error || errorMsg;
                        } catch (_) {}
                        forceFuelTab();
                        resultsEl.innerHTML = `<div class="status-message error">Upload failed: ${errorMsg}</div>`;
                    }
                } catch (e) {
                    console.error('Upload handling error:', e);
                    resultsEl.innerHTML = `<div class="status-message error">Unexpected error handling response</div>`;
                } finally {
                    forceFuelTab();
                    setTimeout(() => {
                        if (progressBar) progressBar.style.display = 'none';
                        if (progressFill) progressFill.style.width = '0%';
                        uploadBtn.disabled = false;
                        uploadBtn.textContent = 'Select Files First';
                    }, 300);
                }
            }
        };

        xhr.onerror = () => {
            forceFuelTab();
            resultsEl.innerHTML = `<div class="status-message error">Network error during upload</div>`;
            if (progressBar) progressBar.style.display = 'none';
            if (progressFill) progressFill.style.width = '0%';
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Select Files First';
        };

        xhr.send(formData);
    }

    function renderFuelResults(result) {
        const { total_bills, total_fuel_cost, bills_data } = result;
        let html = `
            <div class="summary-card">
                <h3>📊 Extraction Summary</h3>
                <div class="summary-item"><span>Total Bills:</span><span>${total_bills}</span></div>
                <div class="summary-item"><span>Total Cost:</span><span>${formatCurrency(total_fuel_cost)}</span></div>
            </div>`;

        if (Array.isArray(bills_data) && bills_data.length) {
            const rows = bills_data
                .map((bill) => {
                    return `
                        <tr>
                            <td>${bill['Petrol Pump Name'] || '-'}</td>
                            <td>${bill.Date || '-'}</td>
                            <td>${bill.Product || '-'}</td>
                            <td>${bill['Volume(L)'] || '-'}</td>
                            <td>${bill['Rate per Litre'] || '-'}</td>
                            <td>${bill['Total Amount (Rs)'] ? formatCurrency(Number(bill['Total Amount (Rs)'])) : '-'}</td>
                        </tr>`;
                })
                .join('');

            html += `
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Petrol Pump</th>
                            <th>Date</th>
                            <th>Product</th>
                            <th>Volume (L)</th>
                            <th>Rate / Litre</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>`;
        }

        resultsEl.innerHTML = html;
        excelBtn.style.display = state.billsData.length ? 'inline-block' : 'none';
        if (state.billsData.length) {
            resultsEl.innerHTML += '<p class="status-note">Extraction complete.</p>';
        }
    }

    // Drag & drop / click handlers
    uploadArea.addEventListener('click', (event) => {
        // event.preventDefault();
        // event.stopPropagation();
        forceFuelTab();
        fileInput.click();
    });

    uploadArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (event) => {
        event.preventDefault();
        event.stopPropagation();
        uploadArea.classList.remove('dragover');
        if (event.dataTransfer?.files?.length) {
            handleFiles(event.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (event) => {
        if (event.target.files?.length) {
            handleFiles(event.target.files);
        }
    });

    uploadBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        forceFuelTab();
        if (!state.selectedFiles.length) {
            alert('Please select files before uploading.');
            return;
        }
        console.log('Uploading files:', state.selectedFiles.map((f) => f.name));
        uploadSelectedFiles();
    });

    excelBtn.addEventListener('click', async () => {
        if (!state.billsData.length) {
            alert('No bills data available to export.');
            return;
        }

        const payload = state.billsData.map((bill, index) => ({
            file: `Bill_${index + 1}`,
            data: bill,
        }));

        try {
            const response = await fetch(`${API_BASE}/fuel-bills/generate-excel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to generate Excel file');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `fuel_bills_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Excel generation error:', error);
            alert(`Error generating Excel: ${error.message}`);
        }
    });
}

// ---------- Overall Validation ----------
function setupValidation() {
    const validateBtn = document.getElementById('validate-all-btn');
    const resultsEl = document.getElementById('validation-results');
    if (!validateBtn || !resultsEl) return;

    validateBtn.addEventListener('click', async () => {
        if (window.__activateTab) {
            window.__activateTab('validation');
        }
        resultsEl.innerHTML = '<div class="status-message">Validating...</div>';
        try {
            const result = await safeFetch(`${API_BASE}/validate`);
            const { declaration = {}, validations = {} } = result.data || {};

            let html = `
                <div class="validation-card">
                    <h4>📋 Declaration Summary</h4>
                    <div class="validation-item"><span>Financial Year:</span><span>${declaration.financial_year || 'N/A'}</span></div>
                    <div class="validation-item"><span>PAN:</span><span>${declaration.pan_number || 'N/A'}</span></div>
                    <div class="validation-item"><span>Declared Fuel:</span><span>${formatCurrency(declaration.declared_fuel_amount || 0)}</span></div>
                    <div class="validation-item"><span>Declared Driver Salary:</span><span>${formatCurrency(declaration.declared_driver_salary || 0)}</span></div>
                </div>`;

            if (validations.driver_salary) {
                const vs = validations.driver_salary;
                html += `
                    <div class="validation-card ${vs.is_valid ? 'valid' : 'invalid'}">
                        <h4>${vs.is_valid ? '✅' : '❌'} Driver Salary Validation</h4>
                        <div class="validation-item"><span>Declared:</span><span>${formatCurrency(vs.declared)}</span></div>
                        <div class="validation-item"><span>Calculated:</span><span>${formatCurrency(vs.calculated)}</span></div>
                        <div class="validation-item"><span>Difference:</span><span>${formatCurrency(vs.difference)}</span></div>
                        <div class="validation-item"><span>Status:</span><span>${vs.is_valid ? 'Valid ✓' : 'Needs attention ✗'}</span></div>
                    </div>`;
            }

            resultsEl.innerHTML = html;
            resultsEl.innerHTML += '<p class="status-note">Validation complete.</p>';
        } catch (error) {
            console.error('Validation error:', error);
            resultsEl.innerHTML = `<div class="status-message error">Validation error: ${error.message}</div>`;
        }
    });
}

// ---------- Initialization ----------
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupDeclarationForm();
    setupDriverSalary();
    setupFuelBills();
    setupValidation();
    // Guarded, non-blocking backend check to avoid any side effects
    try {
        const sameOrigin = API_BASE.startsWith(window.location.origin);
        const isHttp = /^https?:\/\//i.test(API_BASE);
        if (sameOrigin && isHttp && typeof fetch === 'function') {
            const schedule = window.requestIdleCallback || ((fn) => setTimeout(fn, 0));
            schedule(() => { checkBackendConnection(); });
        }
    } catch (_) {
        // ignore
    }
    if (activeTabId) {
        window.__activateTab?.(activeTabId);
    }
});
