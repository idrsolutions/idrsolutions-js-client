# Migration Guide: v4.x → v5.0

This guide helps you migrate from the callback-based v4.x API to the modern async/await v5.0 API.

## Quick Migration Checklist

1. **Choose module approach** - Either convert to ES modules OR use dynamic imports
2. **Create client instance** - Move credentials to constructor
3. **Update API calls** - Replace callbacks with async/await

## Breaking Changes

### 1. Module System Changes

The v5.x library is published as an ES module. You have **two options** for consuming it:

#### Option A: Convert Your Project to ES Modules (Recommended)

**Old (v4.x):**
```javascript
const Converter = require('@idrsolutions/idrcloudclient');
```

**New (v5.x):**
```javascript
import IDRCloudClient, { INPUT, CONVERTER } from '@idrsolutions/idrcloudclient';
```

**Required:** Add to your `package.json`:
```json
{
  "type": "module"
}
```

#### Option B: Keep CommonJS and Use Dynamic Imports

If you prefer to keep your project as CommonJS, you can use dynamic imports:

**New (v5.x) with CommonJS:**
```javascript
async function convertDocument() {
    const { default: IDRCloudClient, INPUT, CONVERTER } = await import('@idrsolutions/idrcloudclient');
    
    const client = new IDRCloudClient(
        `https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`,
        { token: 'your-api-token' }
    );
    
    return await client.convert({ input: INPUT.UPLOAD, file: './doc.pdf' });
}
```

**No changes needed** to your `package.json` with this approach.

### 2. Constructor-Based Authentication

**Old (v4.x):**
```javascript
// Auth passed with each request
Converter.convert({
    endpoint: 'https://cloud.idrsolutions.com/cloud/buildvu',
    parameters: {
        token: 'your-api-token',  // or username/password
        input: Converter.UPLOAD,
        file: './doc.pdf'
    }
});
```

**New (v5.x):**
```javascript
// Auth passed once to constructor
const client = new IDRCloudClient(endpoint, { token: 'your-api-token' });
await client.convert({ input: INPUT.UPLOAD, file: './doc.pdf' });
```

### 3. Async/Await Instead of Callbacks

**Old (v4.x):**
```javascript
Converter.convert({
    endpoint: '...',
    parameters: { ... },
    success: (data) => {
        console.log('Success!', data);
    },
    failure: (error) => {
        console.error('Error:', error);
    },
    progress: (data) => {
        console.log('Progress:', data.state);
    }
});
```

**New (v5.x):**
```javascript
try {
    const result = await client.convert(
        { input: INPUT.UPLOAD, file: './doc.pdf' },
        { onProgress: (data) => console.log('Progress:', data.state) }
    );
    console.log('Success!', result);
} catch (error) {
    console.error('Error:', error);
}
```

### 4. Parameters vs Options Separation

A key architectural change in v5.x is how **conversion parameters** (sent to API) and **client options** (used locally) are passed.

**Old (v4.x):**
```javascript
Converter.convert({
    parameters: {
        input: Converter.UPLOAD,
        file: './doc.pdf',
        token: 'xxx'            // Auth mixed with API params
    },
    requestTimeout: 30000,
});
```

**New (v5.x):**
```javascript
const client = new IDRCloudClient(endpoint, { token: 'xxx' }); // Auth in constructor

await client.convert(
    {
        // Parameters sent to API server
        input: INPUT.UPLOAD,
        file: './doc.pdf',
        settings: JSON.stringify({ /* converter settings */ }),
        callbackUrl: 'https://example.com/webhook'
    },
    {
        // Client options (not sent to server)
        requestTimeout: 30000,
        conversionTimeout: 120000,
        onProgress: (data) => console.log(data.state),
        poll: true
    }
);
```

### 5. Explicit Polling Control

**Old behavior (v4.x):** Polling was implicit and tied to `callbackUrl`

**New behavior (v5.x):** Use the `poll` option to explicitly control polling:

```javascript
// Fire-and-forget (return immediately)
const response = await client.convert(
    { input: INPUT.UPLOAD, file: './doc.pdf', callbackUrl: 'webhook-url' },
    { poll: false }
);
console.log('Started:', response.uuid);

// Poll for completion (default behavior)
const result = await client.convert(
    { input: INPUT.UPLOAD, file: './doc.pdf' },
    { poll: true, onProgress: (data) => console.log(data.state) }
);
console.log('Completed:', result.downloadUrl);
```

## Full Migration Examples

### Before (v4.x):
```javascript
const Converter = require('@idrsolutions/idrcloudclient');

Converter.convert({
    endpoint: 'https://cloud.idrsolutions.com/cloud/buildvu',
    parameters: {
        input: Converter.UPLOAD,
        file: './document.pdf',
        token: 'your-api-token'
    },
    requestTimeout: 30000,
    success: (data) => {
        console.log('Conversion successful:', data.downloadUrl);
    },
    failure: (error) => {
        console.error('Conversion failed:', error);
    },
    progress: (data) => {
        console.log(`Progress: ${data.state}`);
    }
});
```

### After (v5.x):
```javascript
// Option A: ES Modules (requires "type": "module" in package.json)
import IDRCloudClient, { INPUT, CONVERTER } from '@idrsolutions/idrcloudclient';

// Option B: CommonJS with dynamic import (no package.json changes needed)
// const { default: IDRCloudClient, INPUT, CONVERTER } = await import('@idrsolutions/idrcloudclient');

const client = new IDRCloudClient(
    `https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`,
    { token: 'your-api-token' }
);

try {
    const result = await client.convert(
        {
            input: INPUT.UPLOAD,
            file: './document.pdf'
        },
        {
            requestTimeout: 30000,
            onProgress: (data) => {
                console.log(`Progress: ${data.state}`);
            }
        }
    );
    console.log('Conversion successful:', result.downloadUrl);
} catch (error) {
    console.error('Conversion failed:', error);
}
```

## Requirements

- **Node.js:** 20.0.0 or higher (for `fs.openAsBlob()` streaming)
- **Module System:** Either ES modules (`"type": "module"`) OR CommonJS with dynamic imports (Node.js 12.20.0+)
