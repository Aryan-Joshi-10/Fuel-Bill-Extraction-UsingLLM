// // import React, { useRef, useState } from 'react';

// // function formatCurrency(n) {
// //   const num = Number(n);
// //   if (!Number.isFinite(num)) return '₹0.00';
// //   return `₹${num.toFixed(2)}`;
// // }

// // function FuelBills({ apiBase }) {
// //   const fileInputRef = useRef(null);
// //   const [selected, setSelected] = useState([]);
// //   const [billsData, setBillsData] = useState([]);
// //   const [progress, setProgress] = useState(0);
// //   const [uploading, setUploading] = useState(false);

// //   const onPick = () => fileInputRef.current?.click();

// //   const onFiles = (files) => {
// //     const valid = Array.from(files).filter((f) => {
// //       const ext = f.name.split('.').pop().toLowerCase();
// //       return ['pdf', 'png', 'jpg', 'jpeg'].includes(ext);
// //     });
// //     setSelected(valid);
// //   };

// //   const onDrop = (e) => {
// //     e.preventDefault();
// //     onFiles(e.dataTransfer.files);
// //   };

// //   const onUpload = () => {
// //     if (!selected.length) return;
// //     const formData = new FormData();
// //     selected.forEach(f => formData.append('files', f));
// //     setUploading(true);
// //     setProgress(0);
// //     setBillsData([]);

// //     const xhr = new XMLHttpRequest();
// //     xhr.open('POST', `${apiBase}/fuel-bills/upload`, true);
// //     xhr.upload.onprogress = (event) => {
// //       if (event.lengthComputable) {
// //         const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
// //         setProgress(pct);
// //       }
// //     };
// //     xhr.onreadystatechange = () => {
// //       if (xhr.readyState === XMLHttpRequest.DONE) {
// //         setProgress(100);
// //         setUploading(false);
// //         if (xhr.status >= 200 && xhr.status < 300) {
// //           try {
// //             const result = JSON.parse(xhr.responseText || '{}');
// //             const data = result.bills_data || result.bills || [];
// //             setBillsData(data);
// //           } catch (e) {
// //             setBillsData([]);
// //           }
// //         }
// //       }
// //     };
// //     xhr.onerror = () => {
// //       setUploading(false);
// //       setBillsData([]);
// //     };
// //     xhr.send(formData);
// //   };

// //   const onExport = async () => {
// //     if (!billsData.length) return;
// //     const payload = billsData.map((bill, index) => ({
// //       file: bill.file_name || `Bill_${index + 1}`,
// //       data: bill
// //     }));
// //     const res = await fetch(`${apiBase}/fuel-bills/generate-excel`, {
// //       method: 'POST',
// //       headers: { 'Content-Type': 'application/json' },
// //       body: JSON.stringify(payload)
// //     });
// //     if (!res.ok) return;
// //     const blob = await res.blob();
// //     const url = window.URL.createObjectURL(blob);
// //     const a = document.createElement('a');
// //     a.href = url;
// //     a.download = `fuel_bills_${new Date().toISOString().slice(0, 10)}.csv`;
// //     document.body.appendChild(a);
// //     a.click();
// //     a.remove();
// //     window.URL.revokeObjectURL(url);
// //   };

// //   return (
// //     <section className="tab-content active">
// //       <div className="card">
// //         <h2>⛽ Fuel Bills Extraction</h2>
// //         <p className="card-description">Upload fuel bill images or PDFs to extract and calculate total fuel cost</p>

// //         <div className="upload-section">
// //           <div
// //             className="upload-area"
// //             onClick={onPick}
// //             onDragOver={(e) => { e.preventDefault(); }}
// //             onDrop={onDrop}
// //           >
// //             <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
// //               <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
// //               <polyline points="17 8 12 3 7 8"></polyline>
// //               <line x1="12" y1="3" x2="12" y2="15"></line>
// //             </svg>
// //             <p className="upload-text">Drag & drop fuel bills here or click to browse</p>
// //             <p className="upload-hint">Supports: PDF, PNG, JPG, JPEG</p>
// //             <input
// //               ref={fileInputRef}
// //               type="file"
// //               multiple
// //               accept=".pdf,.png,.jpg,.jpeg"
// //               className="visually-hidden"
// //               onChange={(e) => onFiles(e.target.files)}
// //             />
// //           </div>

// //           <div className="upload-actions">
// //             <button className="btn btn-primary" onClick={onUpload} disabled={!selected.length || uploading}>
// //               {uploading ? `Uploading... ${progress}%` : (selected.length ? `Upload ${selected.length} File${selected.length > 1 ? 's' : ''}` : 'Select Files First')}
// //             </button>
// //             {billsData.length > 0 && (
// //               <button type="button" className="btn btn-secondary" onClick={onExport}>
// //                 Generate Excel
// //               </button>
// //             )}
// //           </div>
// //         </div>

// //         {uploading && (
// //           <div className="progress-bar" style={{ display: 'block' }}>
// //             <div className="progress-fill" style={{ width: `${progress}%` }}></div>
// //           </div>
// //         )}

// //         <div className="results-section">
// //           {!selected.length && !billsData.length && null}
// //           {!!selected.length && !billsData.length && (
// //             <div className="selected-files">
// //               <h4>Selected Files ({selected.length}):</h4>
// //               <ul>
// //                 {selected.map((f, i) => (
// //                   <li key={i}>{i + 1}. {f.name} <span>{(f.size / 1024).toFixed(1)} KB</span></li>
// //                 ))}
// //               </ul>
// //               <p>Click "Upload Files" to start extraction.</p>
// //             </div>
// //           )}

// //           {!!billsData.length && (
// //             <>
// //               <div className="summary-card">
// //                 <h3>📊 Extraction Summary</h3>
// //                 <div className="summary-item"><span>Total Bills:</span><span>{billsData.length}</span></div>
// //                 <div className="summary-item">
// //                   <span>Total Cost:</span>
// //                   <span>{formatCurrency(billsData.reduce((s, b) => s + Number(b['Total Amount (Rs)'] || b.amount || 0), 0))}</span>
// //                 </div>
// //               </div>
// //               <table className="results-table">
// //                 <thead>
// //                   <tr>
// //                     <th>Petrol Pump</th>
// //                     <th>Date</th>
// //                     <th>Product</th>
// //                     <th>Volume (L)</th>
// //                     <th>Rate / Litre</th>
// //                     <th>Amount</th>
// //                   </tr>
// //                 </thead>
// //                 <tbody>
// //                   {billsData.map((bill, idx) => (
// //                     <tr key={idx}>
// //                       <td>{bill['Petrol Pump Name'] || bill.station_name || '-'}</td>
// //                       <td>{bill.Date || bill.date || '-'}</td>
// //                       <td>{bill.Product || bill.fuel_type || '-'}</td>
// //                       <td>{bill['Volume(L)'] || '-'}</td>
// //                       <td>{bill['Rate per Litre'] || '-'}</td>
// //                       <td>{formatCurrency(Number(bill['Total Amount (Rs)'] || bill.amount || 0))}</td>
// //                     </tr>
// //                   ))}
// //                 </tbody>
// //               </table>
// //             </>
// //           )}
// //         </div>
// //       </div>
// //     </section>
// //   );
// // }

// // export default FuelBills;




// import React, { useRef, useState } from 'react';
// import './FuelBills.css'; // optional styling file

// function formatCurrency(n) {
//   const num = Number(n);
//   if (!Number.isFinite(num)) return '₹0.00';
//   return `₹${num.toFixed(2)}`;
// }

// const FuelBills = ({ apiBase }) => {
//   const fileInputRef = useRef(null);
//   const [selected, setSelected] = useState([]);
//   const [billsData, setBillsData] = useState([]);
//   const [progress, setProgress] = useState(0);
//   const [uploading, setUploading] = useState(false);

//   const onPick = () => fileInputRef.current?.click();

//   const onFiles = (files) => {
//     const valid = Array.from(files).filter((f) => {
//       const ext = f.name.split('.').pop().toLowerCase();
//       return ['pdf', 'png', 'jpg', 'jpeg'].includes(ext);
//     });
//     setSelected(valid);
//   };

//   const onDrop = (e) => {
//     e.preventDefault();
//     onFiles(e.dataTransfer.files);
//   };

//   const onUpload = () => {
//     if (!selected.length) return;

//     const formData = new FormData();
//     selected.forEach(f => formData.append('files', f));

//     setUploading(true);
//     setProgress(0);
//     setBillsData([]);

//     const xhr = new XMLHttpRequest();
//     xhr.open('POST', `${apiBase}/fuel-bills/upload`, true);

//     xhr.upload.onprogress = (event) => {
//       if (event.lengthComputable) {
//         const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
//         setProgress(pct);
//       }
//     };

//     xhr.onreadystatechange = () => {
//       if (xhr.readyState === XMLHttpRequest.DONE) {
//         setProgress(100);
//         setUploading(false);
//         if (xhr.status >= 200 && xhr.status < 300) {
//           try {
//             const result = JSON.parse(xhr.responseText || '{}');
//             const data = result.bills_data || result.bills || [];
//             setBillsData(data);
//           } catch (e) {
//             setBillsData([]);
//           }
//         } else {
//           setBillsData([]);
//         }
//       }
//     };

//     xhr.onerror = () => {
//       setUploading(false);
//       setBillsData([]);
//     };

//     xhr.send(formData);
//   };

//   const onExport = async () => {
//     if (!billsData.length) return;
//     const payload = billsData.map((bill, index) => ({
//       file: bill.file_name || `Bill_${index + 1}`,
//       data: bill
//     }));

//     const res = await fetch(`${apiBase}/fuel-bills/generate-excel`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload)
//     });

//     if (!res.ok) return;

//     const blob = await res.blob();
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `fuel_bills_${new Date().toISOString().slice(0, 10)}.csv`;
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//     window.URL.revokeObjectURL(url);
//   };

//   return (
//     <section className="tab-content active">
//       <div className="card">
//         <h2>⛽ Fuel Bills Extraction</h2>
//         <p className="card-description">Upload fuel bill images or PDFs to extract and calculate total fuel cost</p>

//         <div className="upload-section">
//           <div
//             className="upload-area"
//             onClick={onPick}
//             onDragOver={(e) => e.preventDefault()}
//             onDrop={onDrop}
//           >
//             <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
//               <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
//               <polyline points="17 8 12 3 7 8"></polyline>
//               <line x1="12" y1="3" x2="12" y2="15"></line>
//             </svg>
//             <p className="upload-text">Drag & drop fuel bills here or click to browse</p>
//             <p className="upload-hint">Supports: PDF, PNG, JPG, JPEG</p>
//             <input
//               ref={fileInputRef}
//               type="file"
//               multiple
//               accept=".pdf,.png,.jpg,.jpeg"
//               className="visually-hidden"
//               onChange={(e) => onFiles(e.target.files)}
//             />
//           </div>

//           <div className="upload-actions">
//             <button
//               className="btn btn-primary"
//               onClick={onUpload}
//               disabled={!selected.length || uploading}
//             >
//               {uploading
//                 ? `Uploading... ${progress}%`
//                 : selected.length
//                 ? `Upload ${selected.length} File${selected.length > 1 ? 's' : ''}`
//                 : 'Select Files First'}
//             </button>

//             {billsData.length > 0 && (
//               <button type="button" className="btn btn-secondary" onClick={onExport}>
//                 Generate Excel
//               </button>
//             )}
//           </div>
//         </div>

//         {uploading && (
//           <div className="progress-bar" style={{ display: 'block' }}>
//             <div className="progress-fill" style={{ width: `${progress}%` }}></div>
//           </div>
//         )}

//         <div className="results-section">
//           {!!selected.length && !billsData.length && (
//             <div className="selected-files">
//               <h4>Selected Files ({selected.length}):</h4>
//               <ul>
//                 {selected.map((f, i) => (
//                   <li key={i}>
//                     {i + 1}. {f.name} <span>{(f.size / 1024).toFixed(1)} KB</span>
//                   </li>
//                 ))}
//               </ul>
//               <p>Click "Upload Files" to start extraction.</p>
//             </div>
//           )}

//           {!!billsData.length && (
//             <>
//               <div className="summary-card">
//                 <h3>📊 Extraction Summary</h3>
//                 <div className="summary-item">
//                   <span>Total Bills:</span><span>{billsData.length}</span>
//                 </div>
//                 <div className="summary-item">
//                   <span>Total Cost:</span>
//                   <span>
//                     {formatCurrency(
//                       billsData.reduce(
//                         (s, b) => s + Number(b['Total Amount (Rs)'] || b.amount || 0),
//                         0
//                       )
//                     )}
//                   </span>
//                 </div>
//               </div>

//               <table className="results-table">
//                 <thead>
//                   <tr>
//                     <th>Petrol Pump</th>
//                     <th>Date</th>
//                     <th>Product</th>
//                     <th>Volume (L)</th>
//                     <th>Rate / Litre</th>
//                     <th>Amount</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {billsData.map((bill, idx) => (
//                     <tr key={idx}>
//                       <td>{bill['Petrol Pump Name'] || bill.station_name || '-'}</td>
//                       <td>{bill.Date || bill.date || '-'}</td>
//                       <td>{bill.Product || bill.fuel_type || '-'}</td>
//                       <td>{bill['Volume(L)'] || '-'}</td>
//                       <td>{bill['Rate per Litre'] || '-'}</td>
//                       <td>{formatCurrency(Number(bill['Total Amount (Rs)'] || bill.amount || 0))}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </>
//           )}
//         </div>
//       </div>
//     </section>
//   );
// };

// export default FuelBills;

import React, { useRef, useState } from 'react';
import axios from 'axios';
import './FuelBills.css';

function formatCurrency(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toFixed(2)}`;
}

const FuelBills = ({ apiBase }) => {
  const fileInputRef = useRef(null);
  const [selected, setSelected] = useState([]);
  const [billsData, setBillsData] = useState([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const serverlessApi = import.meta.env.VITE_SERVERLESS_API || '';

  const onPick = () => fileInputRef.current?.click();

  const onFiles = (files) => {
    const valid = Array.from(files).filter((f) => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ['pdf', 'png', 'jpg', 'jpeg'].includes(ext);
    });
    setSelected(valid);
  };

  const onDrop = (e) => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  };

  const uploadViaServerless = async () => {
    const total = selected.length || 1;
    const results = [];

    for (let index = 0; index < selected.length; index += 1) {
      const file = selected[index];
      const progressBase = (index / total) * 100;

      const resp = await fetch(`${serverlessApi}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream'
        })
      });
      if (!resp.ok) throw new Error('Failed to get upload URL');
      const { upload, file_key } = await resp.json();

      const formData = new FormData();
      Object.entries(upload.fields || {}).forEach(([k, v]) => formData.append(k, v));
      formData.append('file', file);

      await axios.post(upload.url, formData, {
        onUploadProgress: (e) => {
          if (e.total) {
            const ratio = e.loaded / e.total;
            const pct = Math.min(99, Math.round(progressBase + ratio * (100 / total)));
            setProgress(pct);
          }
        }
      });

      const poll = async (attempt = 0) => {
        const r = await fetch(`${serverlessApi}/job?key=${encodeURIComponent(file_key)}`);
        if (r.status === 404) {
          if (attempt > 60) throw new Error('Timeout waiting for job');
          await new Promise(res => setTimeout(res, Math.min(5000, 1500 + attempt * 250)));
          return poll(attempt + 1);
        }
        const data = await r.json();
        if (data?.item?.job_status === 'COMPLETED') return data.item;
        if (data?.item?.job_status === 'FAILED') throw new Error(data?.item?.error || 'Extraction failed');
        if (attempt > 60) throw new Error('Timeout waiting for job');
        await new Promise(res => setTimeout(res, Math.min(5000, 1500 + attempt * 250)));
        return poll(attempt + 1);
      };

      const item = await poll();

      const out = await fetch(`${serverlessApi}/output-url?file_key=${encodeURIComponent(file_key)}`);
      const outData = await out.json();

      results.push({
        file_key,
        item,
        outputUrl: outData?.url
      });

      const pctComplete = Math.round(((index + 1) / total) * 100);
      setProgress(pctComplete);
    }

    return results;
  };

  const onUpload = async () => {
    if (!selected.length) return;

    setUploading(true);
    setProgress(0);
    setBillsData([]);

    try {
      if (serverlessApi) {
        const results = await uploadViaServerless();
        const rows = results.map(({ item, outputUrl }) => {
          const normalized = item?.data || {};
          return {
            file_key: item?.file_key,
            outputUrl,
            ...normalized
          };
        });
        setBillsData(rows);
        setProgress(100);
      } else {
        const formData = new FormData();
        selected.forEach((f) => formData.append('files', f));
        const response = await axios.post(`${apiBase}/fuel-bills/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setProgress(pct);
            }
          },
        });
        const data = response.data?.bills_data || response.data?.bills || [];
        setBillsData(data);
        setProgress(100);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setBillsData([]);
    } finally {
      setUploading(false);
    }
  };

  const onExport = async () => {
    if (!billsData.length) return;

    const payload = billsData.map((bill, index) => ({
      file: bill.file_name || `Bill_${index + 1}`,
      data: bill,
    }));

    try {
      const res = await fetch(`${apiBase}/fuel-bills/generate-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to generate file.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fuel_bills_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting file:', err);
    }
  };

  return (
    <section className="tab-content active">
      <div className="card">
        <h2>⛽ Fuel Bills Extraction</h2>
        <p className="card-description">
          Upload fuel bill images or PDFs to extract and calculate total fuel cost
        </p>

        <div className="upload-section">
          <div
            className="upload-area"
            onClick={onPick}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p className="upload-text">Drag & drop fuel bills here or click to browse</p>
            <p className="upload-hint">Supports: PDF, PNG, JPG, JPEG</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              className="visually-hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>

          <div className="upload-actions">
            <button
              className="btn btn-primary"
              onClick={onUpload}
              disabled={!selected.length || uploading}
            >
              {uploading
                ? `Uploading... ${progress}%`
                : selected.length
                ? `Upload ${selected.length} File${selected.length > 1 ? 's' : ''}`
                : 'Select Files First'}
            </button>

            {billsData.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={onExport}>
                Generate Excel
              </button>
            )}
          </div>
        </div>

        {uploading && (
          <div className="progress-bar" style={{ display: 'block' }}>
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        <div className="results-section">
          {!!selected.length && !billsData.length && (
            <div className="selected-files">
              <h4>Selected Files ({selected.length}):</h4>
              <ul>
                {selected.map((f, i) => (
                  <li key={i}>
                    {i + 1}. {f.name} <span>{(f.size / 1024).toFixed(1)} KB</span>
                  </li>
                ))}
              </ul>
              <p>Click "Upload Files" to start extraction.</p>
            </div>
          )}

          {!!billsData.length && (
            <>
              <div className="summary-card">
                <h3>📊 Extraction Summary</h3>
                <div className="summary-item">
                  <span>Total Bills:</span><span>{billsData.length}</span>
                </div>
                <div className="summary-item">
                  <span>Total Cost:</span>
                  <span>
                    {formatCurrency(
                      billsData.reduce(
                        (s, b) => s + Number(b['Total Amount (Rs)'] || b.amount || 0),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>

              <table className="results-table">
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
                <tbody>
                  {billsData.map((bill, idx) => (
                    <tr key={idx}>
                      <td>{bill['Petrol Pump Name'] || bill.station_name || '-'}</td>
                      <td>{bill.Date || bill.date || '-'}</td>
                      <td>{bill.Product || bill.fuel_type || '-'}</td>
                      <td>{bill['Volume(L)'] || '-'}</td>
                      <td>{bill['Rate per Litre'] || '-'}</td>
                      <td>
                        {formatCurrency(Number(bill['Total Amount (Rs)'] || bill.amount || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default FuelBills;
