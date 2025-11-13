import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { nanoid } from 'nanoid';

const app = express();
const port = process.env.PORT || 8080

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory stores (replace with DB as needed)
const store = {
  declaration: null,
  driverSalary: null,
  jobs: {}
};

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Declaration
app.post('/api/declaration', (req, res) => {
  store.declaration = { ...(req.body || {}) };
  res.json({ ok: true, data: store.declaration });
});

app.get('/api/declaration', (req, res) => {
  res.json({ ok: true, data: store.declaration || {} });
});

// Driver Salary
app.post('/api/driver-salary', (req, res) => {
  store.driverSalary = { ...(req.body || {}) };
  res.json({ ok: true, data: store.driverSalary });
});

app.get('/api/driver-salary', (req, res) => {
  res.json({ ok: true, data: store.driverSalary || {} });
});

app.get('/api/driver-salary/validate', (req, res) => {
  const declared = Number(store?.declaration?.declared_driver_salary || 0);
  const calculated = Number(store?.driverSalary?.total_salary || 0);
  const difference = +(calculated - declared).toFixed(2);
  const isValid = Math.abs(difference) < 1e-6 || difference <= 0;
  res.json({
    declared_amount: declared,
    calculated_amount: calculated,
    difference,
    is_valid: isValid,
    message: isValid ? 'Within declared amount' : 'Exceeds declared amount'
  });
});

// Fuel bills upload
const upload = multer({ dest: 'uploads/' });

app.post('/api/fuel-bills/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files || [];
    const jobId = nanoid();

    // 🔹 Create FormData for forwarding files to FastAPI
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', fs.createReadStream(file.path), file.originalname);
    });

    // 🔹 Call your FastAPI endpoint (change port if needed)
    const fastApiResponse = await axios.post(
      'http://127.0.0.1:8000/api/fuel-bills/upload',
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    // 🔹 Delete temp uploads after forwarding
    files.forEach(file => fs.unlinkSync(file.path));

    const result = fastApiResponse.data;

    // 🔹 Normalize response for your frontend (keeping your UI consistent)
    const response = {
      job_id: jobId,
      total_bills: result.total_bills,
      total_fuel_cost: result.total_fuel_cost,
      bills_data: result.bills_data,
      bills: result.results?.map(r => ({
        file_name: r.file,
        ...r.data
      })),
      success: result.success
    };

    // Store job (if needed)
    store.jobs[jobId] = { status: 'done', result: response };

    res.json(response);

  } catch (error) {
    // console.error('❌ Error while calling FastAPI:', error.message);
    // res.status(500).json({
    //   ok: false,
    //   error: 'Failed to process fuel bills',
    //   details: error.response?.data || error.message
    // });
    console.error('❌ Error while calling FastAPI:');
    console.error(error);

    res.status(500).json({
      ok: false,
      error: 'Failed to process fuel bills',
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
});

  }
  // try {
  //   const files = req.files || [];

  //   // ✅ Create a FormData object to send to FastAPI
  //   const formData = new FormData();
  //   files.forEach(file => {
  //     formData.append('files', fs.createReadStream(file.path), file.originalname);
  //   });

  //   // ✅ Forward request to your FastAPI backend
  //   const fastApiResponse = await axios.post(
  //     'http://127.0.0.1:8000/api/fuel-bills/upload', // 👈 your FastAPI endpoint
  //     formData,
  //     {
  //       headers: formData.getHeaders(),
  //       maxContentLength: Infinity,
  //       maxBodyLength: Infinity,
  //     }
  //   );

  //   // ✅ Relay the FastAPI response back to frontend
  //   res.json(fastApiResponse.data);

  // } catch (error) {
  //   console.error('Error forwarding to FastAPI:', error.message);
  //   res.status(500).json({ ok: false, error: 'Failed to process fuel bills' });
  // }
  // const files = req.files || [];
  // const jobId = nanoid();

  // // Mock extraction result
  // const billsData = files.map((f, idx) => {
  //   const amount = 100 + idx * 25;
  //   return {
  //     'Petrol Pump Name': 'Sample Station',
  //     Date: new Date().toISOString().slice(0, 10),
  //     Product: 'Petrol',
  //     'Volume(L)': (amount / 100).toFixed(2),
  //     'Rate per Litre': '100.00',
  //     'Total Amount (Rs)': amount.toFixed(2),
  //     file_name: f.originalname
  //   };
  // });

  // const totalFuelCost = billsData.reduce((sum, b) => {
  //   const val = Number(b['Total Amount (Rs)'] || 0);
  //   return sum + (Number.isFinite(val) ? val : 0);
  // }, 0);

  // const response = {
  //   // For current UI
  //   total_bills: billsData.length,
  //   total_fuel_cost: +totalFuelCost.toFixed(2),
  //   bills_data: billsData,
  //   // For alternate UI variant
  //   bills: billsData.map(b => ({
  //     file_name: b.file_name,
  //     date: b.Date,
  //     amount: b['Total Amount (Rs)'],
  //     fuel_type: b.Product,
  //     station_name: b['Petrol Pump Name']
  //   })),
  //   total_amount: +totalFuelCost.toFixed(2),
  //   job_id: jobId
  // };

  // store.jobs[jobId] = { status: 'done', result: response };
  // res.json(response);
});

// Generate "Excel" (CSV) from posted bills_data
app.post('/api/fuel-bills/generate-excel', (req, res) => {
  const payload = req.body;
  const rows = Array.isArray(payload) ? payload : [];

  const headers = [
    'file',
    'Petrol Pump Name',
    'Date',
    'Product',
    'Volume(L)',
    'Rate per Litre',
    'Total Amount (Rs)'
  ];

  const csv = [
    headers.join(','),
    ...rows.map((row, i) => {
      const data = row.data || {};
      const file = row.file || `Bill_${i + 1}`;
      return [
        file,
        (data['Petrol Pump Name'] ?? '').toString().replace(/,/g, ' '),
        (data['Date'] ?? data.Date ?? '').toString().replace(/,/g, ' '),
        (data['Product'] ?? '').toString().replace(/,/g, ' '),
        (data['Volume(L)'] ?? '').toString().replace(/,/g, ' '),
        (data['Rate per Litre'] ?? '').toString().replace(/,/g, ' '),
        (data['Total Amount (Rs)'] ?? '').toString().replace(/,/g, ' ')
      ].join(',');
    })
  ].join('\n');

  const filename = `fuel_bills_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// Simple aggregate validation endpoint
app.get('/api/validate', (req, res) => {
  const declaration = store.declaration || {};
  const validations = {};

  if (store.driverSalary && declaration) {
    const declared = Number(declaration.declared_driver_salary || 0);
    const calculated = Number(store.driverSalary.total_salary || 0);
    validations.driver_salary = {
      is_valid: calculated <= declared,
      declared,
      calculated,
      difference: +(calculated - declared).toFixed(2)
    };
  }

  res.json({ ok: true, data: { declaration, validations } });
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});


