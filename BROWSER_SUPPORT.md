# Browser Support Guide

The JavaScript IDRSolutions Cloud Client now works in **both Node.js and browsers**!

> ## ⚠️ Security Notice
> 
> **Never hardcode API credentials in client-side code for production applications!** 
> 
> Browsers expose all JavaScript source code to users. For production:
> - Use a backend proxy to handle API authentication
> - Store credentials server-side only
> 
> The examples below use direct authentication for development/demonstration purposes only.

## Quick Start

### 1. Include the library

```html
<script type="module">
import IDRCloudClient, { INPUT } from './idrcloudclient.js';
// Your code here
</script>
```

### 2. Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
    <title>PDF Converter</title>
</head>
<body>
    <input type="file" id="fileInput" accept=".pdf">
    <button id="convertBtn">Convert</button>
    
    <script type="module">
        import IDRCloudClient, { INPUT, CONVERTER } from './idrcloudclient.js';

        // Use token authentication for IDR cloud
        const client = new IDRCloudClient(`https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`, {
            token: 'your-api-token'
        });

        document.getElementById('convertBtn').addEventListener('click', async () => {
            const file = document.getElementById('fileInput').files[0];
            
            if (!file) {
                alert('Please select a file');
                return;
            }

            try {
                const result = await client.convert({
                    input: INPUT.UPLOAD,
                    file: file  // Browser File object
                });
                
                console.log('Success!', result);
                window.open(result.downloadUrl);
            } catch (error) {
                console.error('Error:', error);
            }
        });
    </script>
</body>
</html>
```

### 3. With Progress Tracking

```javascript
const result = await client.convert(
    {
        input: INPUT.UPLOAD,
        file: file
    },
    (progress) => {
        console.log('Progress:', progress.state);
        // Update UI with progress
        document.getElementById('status').textContent = progress.state;
    }
);
```

## Complete Example

See `examples-browser.html` for a complete working example with:
- File upload UI
- Progress tracking
- Error handling
- Result display

To run:
```bash
# Start a simple HTTP server
npx http-server .

# Or with Python
python -m http.server 8000

# Then open http://localhost:8000/examples-browser.html
```

## Using with Module Bundlers

### Webpack / Vite / Rollup

If you're using a bundler in a Node.js project, first install the package:

```bash
npm install @idrsolutions/idrcloudclient
```

Then import it:

```javascript
import IDRCloudClient, { INPUT } from '@idrsolutions/idrcloudclient';

const client = new IDRCloudClient('https://api.example.com');
```

The library will automatically detect the environment and use the appropriate APIs.

## CDN Usage

The client is also available to import from a CDN:

### jsDelivr
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@idrsolutions/idrcloudclient@latest/idrcloudclient.js"></script>
<!-- or -->
<script type="module">
    import IDRCloudClient, { INPUT } from 'https://cdn.jsdelivr.net/npm/@idrsolutions/idrcloudclient@latest/idrcloudclient.js';
    // Use as normal
</script>
```

### unpkg
```html
<script type="module" src="https://unpkg.com/@idrsolutions/idrcloudclient@latest/idrcloudclient.js"></script>
<!-- or -->
<script type="module">
    import IDRCloudClient, { INPUT } from 'https://unpkg.com/@idrsolutions/idrcloudclient@latest/idrcloudclient.js';
    // Use as normal
</script>
```

>**Tip:** Replace `@latest` with `@5` to pin to major version 5, or use `@5.0.0` for exact version pinning.

## Framework Examples

### React

```jsx
import { useState } from 'react';
import IDRCloudClient, { INPUT } from '@idrsolutions/idrcloudclient';

function PDFConverter() {
    const [progress, setProgress] = useState('');
    const [result, setResult] = useState(null);

    const handleConvert = async (file) => {
        const client = new IDRCloudClient('https://api.example.com');
        
        try {
            const result = await client.convert(
                { input: INPUT.UPLOAD, file },
                (prog) => setProgress(prog.state)
            );
            setResult(result);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div>
            <input 
                type="file" 
                onChange={(e) => handleConvert(e.target.files[0])} 
            />
            {progress && <p>Status: {progress}</p>}
            {result && <a href={result.downloadUrl}>Download</a>}
        </div>
    );
}
```

### Vue

```vue
<template>
  <div>
    <input type="file" @change="handleFile" />
    <p v-if="progress">{{ progress }}</p>
    <a v-if="result" :href="result.downloadUrl">Download</a>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import IDRCloudClient, { INPUT } from '@idrsolutions/idrcloudclient';

const progress = ref('');
const result = ref(null);

const handleFile = async (event) => {
  const file = event.target.files[0];
  const client = new IDRCloudClient('https://api.example.com');
  
  try {
    result.value = await client.convert(
      { input: INPUT.UPLOAD, file },
      (prog) => progress.value = prog.state
    );
  } catch (error) {
    console.error(error);
  }
};
</script>
```
