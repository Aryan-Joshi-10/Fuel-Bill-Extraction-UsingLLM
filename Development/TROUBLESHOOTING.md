# Troubleshooting Guide

## Fuel Bills Upload Not Working

If you're experiencing issues with fuel bills upload, follow these steps:

### 1. Check Backend Server is Running

Make sure the FastAPI server is running:
```bash
cd Development/backend
python main.py
```

You should see:
```
🚀 FastAPI server started successfully.
🌐 API available at: http://localhost:8000
```

### 2. Check Backend Health

Visit `http://localhost:8000/health` in your browser. You should see a JSON response with status "healthy".

### 3. Check Browser Console

Open browser developer tools (F12) and check the Console tab for any errors when uploading files.

Common errors:
- **CORS errors**: Make sure CORS is enabled in the backend (it should be by default)
- **Network errors**: Check if the backend is running on the correct port
- **404 errors**: Check if the API endpoint is correct (`/api/fuel-bills/upload`)

### 4. Check API Base URL

In `frontend/script.js`, make sure the `API_BASE` constant is correct:
```javascript
const API_BASE = 'http://localhost:8000/api';
```

If your backend is running on a different port, update this.

### 5. Check File Permissions

Make sure the `uploads` directory exists and is writable:
```bash
cd Development/backend
mkdir -p uploads
chmod 755 uploads
```

### 6. Check Google API Key

Make sure your `.env` file in the `backend` directory contains a valid Google API key:
```
GOOGLE_API_KEY=your_actual_api_key_here
```

### 7. Common Issues

#### Issue: Files upload but page reloads
**Solution**: Make sure all buttons have `type="button"` to prevent form submission.

#### Issue: "Cannot connect to backend" error
**Solution**: 
- Check if backend is running
- Check if port 8000 is not already in use
- Check firewall settings
- Try accessing `http://localhost:8000/docs` in browser

#### Issue: Files selected but upload button doesn't work
**Solution**: 
- Check browser console for JavaScript errors
- Make sure files are valid (PDF, PNG, JPG, JPEG)
- Check file size (max 50MB per file)

#### Issue: Upload succeeds but no results shown
**Solution**:
- Check browser console for errors
- Check backend logs in `logs/app.log`
- Verify Google API key is valid and has quota

### 8. Debug Mode

Enable detailed logging by checking:
- Browser console (F12 → Console tab)
- Backend logs: `Development/backend/logs/app.log`
- Network tab in browser dev tools to see API requests/responses

### 9. Test Backend Directly

Test the upload endpoint directly using curl:
```bash
curl -X POST "http://localhost:8000/api/fuel-bills/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@/path/to/your/image.png"
```

### 10. Check File Formats

Supported formats:
- PDF (.pdf)
- PNG (.png)
- JPG/JPEG (.jpg, .jpeg)

Make sure your files are in one of these formats.

## Still Having Issues?

1. Check the backend logs: `Development/backend/logs/app.log`
2. Check browser console for JavaScript errors
3. Verify all dependencies are installed: `pip install -r requirements.txt`
4. Make sure Python version is 3.8 or higher
5. Check if Google Gemini API is accessible and has quota

