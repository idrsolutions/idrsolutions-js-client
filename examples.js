/**
 * Examples demonstrating IDRCloudClient usage in Node.js
 * @module examples
 */

import IDRCloudClient, { INPUT, CONVERTER, ConversionError } from './idrcloudclient.js';
import { readFile } from 'fs/promises';

/**
 * Example 1: Simple async/await conversion with token authentication
 * Demonstrates basic PDF conversion with IDR cloud token
 * Note: File paths are streamed efficiently using fs.openAsBlob() - memory efficient even for large files
 */
async function simpleConversion() {
    const client = new IDRCloudClient(`https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`, {
        token: 'your-api-token'
    });

    try {
        const result = await client.convert({
            input: INPUT.UPLOAD,
            file: './example.pdf'
        });
        
        console.log('Conversion complete!', result);
        console.log('Download URL:', result.downloadUrl);
    } catch (error) {
        if (error instanceof ConversionError) {
            console.error('Conversion failed:', error);
            console.error('Status code:', error.statusCode);
        } else {
            console.error('Error:', error);
        }
    }
}

/**
 * Example 2: Self-hosted server with basic authentication
 * Shows username/password authentication for self-hosted microservices
 */
async function selfHostedConversion() {
    const client = new IDRCloudClient(`http://localhost:8080/${CONVERTER.BUILDVU}`, {
        username: 'your-username',
        password: 'your-password'
    });

    try {
        const result = await client.convert({
            input: INPUT.UPLOAD,
            file: './example.pdf'
        });
        
        console.log('Conversion complete!', result);
        console.log('Download URL:', result.downloadUrl);
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 3: Conversion with progress tracking
 * Shows how to monitor conversion progress with callbacks
 */
async function conversionWithProgress() {
    const client = new IDRCloudClient(`https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`, {
        token: 'your-api-token'
    });

    try {
        const result = await client.convert(
            {
                input: INPUT.UPLOAD,
                file: './example.pdf'
            },
            {
                onProgress: (progress) => {
                    console.log(`State: ${progress.state}`);

                    const otherFields = Object.keys(progress)
                        .filter(key => key !== 'state')
                        .map(key => `${key}: ${progress[key]}`)
                        .join(', ');
                    
                    if (otherFields) {
                        console.log(`  Additional info: ${otherFields}`);
                    }
                }
            }
        );
        console.log('Conversion complete!', result);
    } catch (error) {
        console.error('Conversion failed:', error);
    }
}

/**
 * Example 4: Download from URL
 * Demonstrates converting a PDF by downloading it from a URL
 */
async function downloadConversion() {
    const client = new IDRCloudClient(`https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`, {
        token: 'your-api-token'
    });

    try {
        const result = await client.convert({
            input: INPUT.DOWNLOAD,
            url: 'https://example.com/document.pdf'
        });
        
        console.log('Conversion complete!', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 5: With timeouts
 * Shows how to set custom timeout values for requests and conversions
 */
async function conversionWithTimeout() {
    const client = new IDRCloudClient(`https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`, {
        token: 'your-api-token'
    });

    try {
        const result = await client.convert(
            {
                input: INPUT.UPLOAD,
                file: './example.pdf'
            },
            {
                requestTimeout: 30000,      // 30 seconds for initial request
                conversionTimeout: 120000   // 2 minutes for conversion
            }
        );
        
        console.log('Conversion complete!', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 6: Using Buffer instead of file path
 * Demonstrates converting a PDF using a Buffer object
 */
async function bufferConversion() {
    const client = new IDRCloudClient(`https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`, {
        token: 'your-api-token'
    });
    
    // Warning: readFile() loads entire file into memory - prefer file paths for large files (they stream efficiently)
    const fileBuffer = await readFile('./example.pdf');
    
    try {
        const result = await client.convert({
            input: INPUT.UPLOAD,
            file: fileBuffer,
            filename: 'example.pdf'  // Required when using Buffer or Blob
        });
        
        console.log('Conversion complete!', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 7: Conversion with custom settings
 * Demonstrates passing converter-specific settings as a JSON string
 */
async function conversionWithSettings() {
    const client = new IDRCloudClient(`https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`, {
        token: 'your-api-token'
    });
    
    // Settings are converter-specific - see API documentation for available options
    const conversionSettings = JSON.stringify({
        // Example BuildVu settings (adjust based on converter documentation)
        // These are illustrative - refer to actual API docs for valid settings
    });
    
    try {
        const result = await client.convert({
            input: INPUT.UPLOAD,
            file: './example.pdf',
            settings: conversionSettings
        });
        
        console.log('Conversion complete!', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 8: Overriding filename
 * Demonstrates using the filename parameter to override auto-detected filenames
 * Useful for temporary files, buffers, or when you want a different name than the source
 */
async function filenameOverride() {
    const client = new IDRCloudClient(`https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`, {
        token: 'your-api-token'
    });
    
    try {
        // Override filename for a file path (e.g., temporary file with generated name)
        // File paths stream efficiently - no memory concerns
        const result1 = await client.convert({
            input: INPUT.UPLOAD,
            file: './temp-12345.pdf',
            filename: 'customer-report.pdf'  // Use a meaningful name instead
        });
        console.log('Conversion with override:', result1);
        
        // Buffer example - loads entire file into memory (use file paths for large files)
        const fileBuffer = await readFile('./example.pdf');
        const result2 = await client.convert({
            input: INPUT.UPLOAD,
            file: fileBuffer,
            filename: 'document.pdf'  // Required for Buffers don't have filenames
        });
        console.log('Buffer conversion:', result2);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 9: Fire-and-forget with callback URL
 * Demonstrates async pattern where client returns immediately and server notifies a webhook
 * Useful for long-running conversions or when processing in a queue system
 */
async function fireAndForgetConversion() {
    const client = new IDRCloudClient(`https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`, {
        token: 'your-api-token'
    });
    
    try {
        // Client returns immediately after upload, server notifies callbackUrl when done
        const response = await client.convert(
            {
                input: INPUT.UPLOAD,
                file: './example.pdf',
                callbackUrl: 'https://example.com/webhook'  // Server will POST result here
            },
            {
                poll: false  // Explicit: don't wait for completion
            }
        );
        
        console.log('Conversion started:', response.uuid);
        console.log('Server will notify webhook when complete');
        
    } catch (error) {
        console.error('Error starting conversion:', error);
    }
}

/**
 * Example 10: Poll with progress AND callback URL
 * Demonstrates using both client-side polling and server-side webhook notification
 * Useful when you want immediate feedback AND persistent notification
 */
async function pollWithCallback() {
    const client = new IDRCloudClient(`https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`, {
        token: 'your-api-token'
    });
    
    try {
        // Client polls for completion AND server notifies webhook
        const result = await client.convert(
            {
                input: INPUT.UPLOAD,
                file: './example.pdf',
                callbackUrl: 'https://example.com/webhook'
            },
            {
                poll: true,  // Client waits (this is the default)
                onProgress: (progress) => {
                    console.log('Progress:', progress.state);
                }
            }
        );
        
        console.log('Conversion complete!', result);
        console.log('Webhook also received notification');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example 11: Using streams for large files
 * Demonstrates converting from a stream by converting it to a Blob
 * Useful for processing data on-the-fly or streaming from external sources (e.g. HTTP responses)
 */
async function streamConversion() {
    const client = new IDRCloudClient(`https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`, {
        token: 'your-api-token'
    });
    
    try {
        // Using fs.createReadStream (Node.js)
        const { createReadStream } = await import('fs');
        const readStream = createReadStream('./example.pdf');
        
        // Convert stream to Blob using Response API (available in Node.js 18+)
        const blob = await new Response(readStream).blob();
        
        const result = await client.convert({
            input: INPUT.UPLOAD,
            file: blob,
            filename: 'document.pdf'  // Required for Blobs
        });
        
        console.log('Stream conversion complete!', result);
        
        // Note: For most use cases, file paths are simpler and equally efficient:
        // file: './example.pdf'  // This streams automatically via fs.openAsBlob()
        
    } catch (error) {
        console.error('Error:', error);
    }
}
