/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Input types for document conversion
 * @enum {string}
 */
export const INPUT = {
    /** Upload a file directly */
    UPLOAD: 'upload',
    /** Download a file from a provided URL */
    DOWNLOAD: 'download'
};

/**
 * Available converter types
 * @enum {string}
 */
export const CONVERTER = {
    /** JPedal converter for PDF to Image and Image/Text extraction */
    JPEDAL: 'jpedal',
    /** BuildVu converter for PDF to HTML or SVG */
    BUILDVU: 'buildvu',
    /** FormVu converter for PDF forms to HTML */
    FORMVU: 'formvu'
};

/**
 * Error thrown when a conversion fails due to API server response (HTTP failures)
 * Use this for any 4xx or 5xx HTTP responses from the API server.
 * Created by _createConversionError() helper method to include response details.
 * @extends Error
 */
export class ConversionError extends Error {
    /**
     * Create a ConversionError
     * @param {string} message - Error message
     * @param {number} [statusCode] - HTTP status code
     * @param {Object} [response] - Response data from the server (includes body and headers)
     */
    constructor(message, statusCode, response) {
        super(message);
        this.name = 'ConversionError';
        this.statusCode = statusCode;
        this.response = response;
    }
}

/**
 * Error thrown when any timeout occurs (request timeout, poll timeout, or conversion timeout)
 * Use this for all AbortController timeout scenarios.
 * @extends Error
 */
export class ConversionTimeoutError extends Error {
    /**
     * Create a ConversionTimeoutError
     * @param {number} duration - Timeout duration in milliseconds
     */
    constructor(duration) {
        super(`Conversion timeout after ${duration}ms`);
        this.name = 'ConversionTimeoutError';
    }
}

/**
 * Error thrown when authentication is incomplete (missing username or password for basic auth)
 * Use this for client-side authentication validation before making requests.
 * @extends Error
 */
export class AuthenticationError extends Error {
    /**
     * Create an AuthenticationError
     */
    constructor() {
        super('Authentication failed - username and password required');
        this.name = 'AuthenticationError';
    }
}

/**
 * IDRSolutions Cloud Client - Universal JavaScript API for document conversion
 * Works in both Node.js and browser environments
 * @class
 */
export class IDRCloudClient {
    // Polling configuration constants
    static POLL_INTERVAL_MS = 500; // Milliseconds between poll requests
    static MAX_POLL_RETRIES = 3; // Maximum retry attempts for transient poll failures
    static POLL_REQUEST_TIMEOUT_MS = 30000; // Timeout per individual poll request (30 seconds)
    
    /**
     * Create an IDRCloudClient instance
     * @param {string} endpoint - API endpoint URL
     * @param {Object} [credentials={}] - Authentication credentials
     * @param {string} [credentials.username] - Username for basic authentication
     * @param {string} [credentials.password] - Password for basic authentication
     * @param {string} [credentials.token] - Token for IDR cloud authentication (required for cloud.idrsolutions.com)
     * @example
     * // Without authentication
     * const client = new IDRCloudClient('https://api.example.com');
     * 
     * // With basic authentication (username/password) - for self-hosted
     * const client = new IDRCloudClient(`http://localhost:8080/${CONVERTER.BUILDVU}`, {
     *     username: 'user',
     *     password: 'pass'
     * });
     * 
     * // With token authentication - for IDR cloud
     * const client = new IDRCloudClient(`https://cloud.idrsolutions.com/cloud/${CONVERTER.BUILDVU}`, {
     *     token: 'your-api-token'
     * });
     */
    constructor(endpoint, credentials = {}) {
        this.endpoint = endpoint;
        this.credentials = credentials;
        // Detect if running in Node.js environment
        this.isNode = typeof process !== 'undefined' && process.versions?.node;
    }

    /**
     * Convert a document
     * @param {Object} params - Conversion parameters (sent to API server)
     * @param {string} params.input - Input type: 'upload' or 'download'
     * @param {string|File|Blob|Buffer} [params.file] - File to convert (required if input='upload')
     *   - Node.js: Can be a file path string, Buffer, or Blob
     *   - Browser: Can be a File or Blob object
     * @param {string} [params.filename] - Filename with extension (e.g., 'document.pdf')
     *   - **Required** when file is a Blob or Buffer (they lack filename information)
     *   - **Optional** for file paths and File objects (filename is auto-detected)
     *   - Can be used to **override** the auto-detected filename if needed
     * @param {string} [params.url] - URL to download file from (required if input='download')
     * @param {string} [params.settings] - JSON string of conversion settings specific to the converter type
     * @param {string} [params.callbackUrl] - URL for server to send completion notification to
     *   - Independent of client polling behavior (controlled by `poll` option)
     *   - Server will POST conversion result to this URL when done
     * @param {Object} [options] - Client options (not sent to server)
     * @param {number} [options.requestTimeout] - Timeout for initial request in milliseconds
     * @param {number} [options.conversionTimeout] - Timeout for conversion process in milliseconds
     * @param {function(Object): void} [options.onProgress] - Progress callback receiving state data
     *   - Automatically forces `poll: true` (progress tracking requires polling)
     * @param {boolean} [options.poll=true] - Whether to poll for conversion completion
     *   - `true` (default): Client polls until conversion completes or times out
     *   - `false`: Return immediately after upload (fire-and-forget, use with `callbackUrl`)
     *   - Automatically set to `true` if `onProgress` is provided
     * @returns {Promise<Object>} Conversion result with downloadUrl and other metadata
     *   - When `poll: true`: Returns complete conversion result
     *   - When `poll: false`: Returns initial response with uuid only
     * @throws {Error} If required parameters are missing or invalid
     * @throws {ConversionError} If conversion fails
     * @throws {ConversionTimeoutError} If conversion times out
     * @throws {AuthenticationError} If authentication fails
     * @example
     * // Simple conversion (Node.js)
     * const result = await client.convert({
     *     input: INPUT.UPLOAD,
     *     file: './document.pdf'
     * });
     * 
     * @example
     * // Browser with File object
     * const fileInput = document.querySelector('input[type="file"]');
     * const result = await client.convert({
     *     input: INPUT.UPLOAD,
     *     file: fileInput.files[0]
     * });
     * 
     * @example
     * // Buffer with required filename (Node.js)
     * const buffer = await readFile('./document.pdf');
     * const result = await client.convert({
     *     input: INPUT.UPLOAD,
     *     file: buffer,
     *     filename: 'document.pdf'  // Required for Buffers
     * });
     * 
     * @example
     * // Blob with required filename (Browser)
     * const blob = new Blob([pdfData], { type: 'application/pdf' });
     * const result = await client.convert({
     *     input: INPUT.UPLOAD,
     *     file: blob,
     *     filename: 'document.pdf'  // Required for Blobs
     * });
     * 
     * @example
     * // Override filename for file path
     * const result = await client.convert({
     *     input: INPUT.UPLOAD,
     *     file: './temporary-file.pdf',
     *     filename: 'final-name.pdf'  // Override the auto-detected filename
     * });
     * 
     * @example
     * // With progress tracking
     * const result = await client.convert(
     *     {
     *         input: INPUT.UPLOAD,
     *         file: './document.pdf'
     *     },
     *     {
     *         onProgress: (progress) => {
     *             console.log('Progress:', JSON.stringify(progress));
     *         }
     *     }
     * );
     * 
     * @example
     * // Download from URL with timeout
     * const result = await client.convert(
     *     {
     *         input: INPUT.DOWNLOAD,
     *         url: 'https://example.com/document.pdf'
     *     },
     *     {
     *         conversionTimeout: 120000  // 2 minutes
     *     }
     * );
     * 
     * @example
     * // Fire-and-forget with callback URL (no polling)
     * const response = await client.convert(
     *     {
     *         input: INPUT.UPLOAD,
     *         file: './document.pdf',
     *         callbackUrl: 'https://example.com/webhook'
     *     },
     *     {
     *         poll: false  // Return immediately, server notifies callbackUrl when done
     *     }
     * );
     * console.log('Conversion started:', response.uuid);
     * 
     * @example
     * // Poll with progress AND use callback URL (both work together)
     * const result = await client.convert(
     *     {
     *         input: INPUT.UPLOAD,
     *         file: './document.pdf',
     *         callbackUrl: 'https://example.com/webhook'  // Server will notify this URL
     *     },
     *     {
     *         poll: true,  // Client also polls for completion (default)
     *         onProgress: (progress) => {
     *             console.log('State:', progress.state);
     *         }
     *     }
     * );
     * // Returns complete result; webhook also receives notification
     */
    async convert(params, options = {}) {
        return this._executeConversion(params, options);
    }

    /**
     * Get authentication headers for basic auth
     * @private
     * @returns {Object} Headers object with Authorization header
     */
    _getAuthHeaders() {
        const { username, password } = this.credentials;
        
        if (!username || !password) return {};
        
        const credentials = `${username}:${password}`;
        // Use Buffer in Node.js, btoa in browser
        const auth = this.isNode
            ? Buffer.from(credentials).toString('base64')
            : btoa(credentials);
        return { 'Authorization': `Basic ${auth}` };
    }

    /**
     * Sleep for specified milliseconds
     * @private
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create a ConversionError from a failed HTTP response
     * 
     * This is the ONLY way ConversionError should be created - it extracts response
     * details (body, headers, status code) for debugging. Use this helper whenever
     * the API server returns a non-2xx HTTP response.
     * 
     * Error Handling Strategy:
     * - ConversionError: API HTTP failures (use this helper)
     * - ConversionTimeoutError: Any timeout (direct instantiation)
     * - AuthenticationError: Missing credentials (direct instantiation)
     * - Generic Error: Client-side validation/config issues (direct instantiation)
     * 
     * @private
     * @param {Response} response - Fetch response object with failed status
     * @param {string} context - Error context message (e.g., "Poll request failed")
     * @returns {Promise<ConversionError>} ConversionError with response details
     */
    async _createConversionError(response, context) {
        const body = await response.text();
        return new ConversionError(
            `${context}: ${body}`,
            response.status,
            { body, headers: Object.fromEntries(response.headers) }
        );
    }

    /**
     * Execute a single poll request with timeout
     * @private
     * @param {string} uuid - Conversion UUID
     * @returns {Promise<Object>} Poll response data
     * @throws {Error} If poll request times out
     * @throws {ConversionError} If poll request fails
     */
    async _executePollRequest(uuid) {
        const abortController = new AbortController();
        const timeoutId = setTimeout(
            () => abortController.abort(),
            IDRCloudClient.POLL_REQUEST_TIMEOUT_MS
        );
        
        try {
            const response = await fetch(`${this.endpoint}?uuid=${uuid}`, {
                method: 'GET',
                headers: this._getAuthHeaders(),
                signal: abortController.signal
            });
            
            if (response.status === 200) {
                return await response.json();
            }
            
            throw await this._createConversionError(response, 'Poll request failed');
            
        } catch (error) {
            // AbortError indicates timeout - convert to ConversionTimeoutError
            if (error.name === 'AbortError') {
                throw new ConversionTimeoutError(IDRCloudClient.POLL_REQUEST_TIMEOUT_MS);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Poll for conversion status with retry logic and exponential backoff
     * @private
     * @param {string} uuid - Conversion UUID
     * @param {number} conversionTimeout - Maximum time to wait for conversion
     * @param {function(Object): void} [onProgress] - Progress callback function
     * @returns {Promise<Object>} Final conversion result
     * @throws {ConversionTimeoutError} If conversion exceeds timeout
     * @throws {ConversionError} If conversion fails or polling fails
     */
    async _poll(uuid, conversionTimeout, onProgress) {
        let pollRetries = 0;
        const startTime = Date.now();
        
        while (true) {
            // Check if conversion timeout has been exceeded
            if (conversionTimeout) {
                const elapsed = Date.now() - startTime;
                if (elapsed > conversionTimeout) {
                    throw new ConversionTimeoutError(conversionTimeout);
                }
            }
            
            try {
                const data = await this._executePollRequest(uuid);
                
                if (data.state === 'processed') {
                    return data;
                }
                
                if (data.state === 'error') {
                    throw new ConversionError(
                        `Conversion failed: ${JSON.stringify(data)}`,
                        data.errorCode,
                        data
                    );
                }
                
                // In-progress state - notify and continue polling
                onProgress?.(data);
                pollRetries = 0; // Reset retry counter on successful poll
                
            } catch (error) {
                // Don't retry ConversionError or ConversionTimeoutError - these are final
                if (error instanceof ConversionError || error instanceof ConversionTimeoutError) {
                    throw error;
                }
                
                // Retry transient errors (network issues, temporary server problems)
                if (pollRetries >= IDRCloudClient.MAX_POLL_RETRIES) {
                    throw error;
                }
                
                pollRetries++;
                // Exponential backoff: e.g. 500ms, 1000ms, 2000ms
                await this._sleep(IDRCloudClient.POLL_INTERVAL_MS * Math.pow(2, pollRetries - 1));
            }
            
            await this._sleep(IDRCloudClient.POLL_INTERVAL_MS);
        }
    }

    /**
     * Prepare file for upload - handles different file types across environments
     * @private
     * @param {string|File|Blob|Buffer} file - File to prepare
     * @param {string} [explicitFilename] - Optional filename to use (required for Blob/Buffer)
     * @returns {Promise<{blob: Blob|File, filename: string}>} Prepared file as Blob or File with filename
     * @throws {Error} If file path is used in browser environment
     * @throws {Error} If Blob or Buffer provided without filename
     */
    async _prepareFile(file, explicitFilename) {
        // String path - Node.js only
        if (typeof file === 'string') {
            if (!this.isNode) {
                throw new Error(
                    'File paths are not supported in browsers. ' +
                    'Please provide a File or Blob object instead.'
                );
            }
            // Dynamic import for Node.js
            const { openAsBlob } = await import('fs');
            const { basename: pathBasename } = await import('path');
            const blob = await openAsBlob(file);
            const filename = explicitFilename || pathBasename(file);
            return { blob, filename };
        }
        
        // File object - has name property
        if (file instanceof File) {
            const filename = explicitFilename || file.name;
            return { blob: file, filename };
        }
        
        // Buffer - Node.js only, requires explicit filename
        if (this.isNode && file instanceof Buffer) {
            if (!explicitFilename) {
                throw new Error(
                    'Buffer uploads require a filename parameter. ' +
                    'Please provide params.filename with a file extension (e.g., "document.pdf").'
                );
            }
            return { blob: new Blob([file]), filename: explicitFilename };
        }
        
        // Blob - requires explicit filename
        if (!explicitFilename) {
            throw new Error(
                'Blob uploads require a filename parameter. ' +
                'Please provide params.filename with a file extension (e.g., "document.pdf").'
            );
        }
        return { blob: file, filename: explicitFilename };
    }

    /**
     * Execute the conversion request and poll for results
     * @private
     * @param {Object} params - Conversion parameters (to be sent to API)
     * @param {Object} [options={}] - Client options
     * @param {number} [options.requestTimeout] - Timeout for initial request
     * @param {number} [options.conversionTimeout] - Timeout for conversion process
     * @param {function(Object): void} [options.onProgress] - Progress callback
     * @param {boolean} [options.poll] - Whether to poll for completion
     * @returns {Promise<Object>} Conversion result
     * @throws {Error} If required parameters are missing or invalid
     * @throws {ConversionError} If conversion request fails
     * @throws {AuthenticationError} If authentication is incomplete
     */
    async _executeConversion(params, options = {}) {
        const { requestTimeout, conversionTimeout, onProgress, poll } = options;
        
        // Allowlist of parameters that should be sent to the API server
        const allowedParams = ['input', 'file', 'url', 'settings', 'callbackUrl', 'filename'];
        const parameters = {};
        
        for (const key of allowedParams) {
            if (params[key] !== undefined) {
                parameters[key] = params[key];
            }
        }
        
        // Validate that only allowed parameters were provided
        const providedParams = Object.keys(params);
        const unknownParams = providedParams.filter(key => !allowedParams.includes(key));
        if (unknownParams.length > 0) {
            throw new Error(`Unknown parameters: ${unknownParams.join(', ')}. Valid parameters are: ${allowedParams.join(', ')}`);
        }

        // Validate required fields
        if (!parameters.input) {
            throw new Error("Parameter 'input' must be provided");
        }

        // Validate input type
        if (![INPUT.UPLOAD, INPUT.DOWNLOAD].includes(parameters.input)) {
            throw new Error(`Invalid input type: ${parameters.input}. Must be '${INPUT.UPLOAD}' or '${INPUT.DOWNLOAD}'`);
        }

        // Validate required parameters based on input type
        if (parameters.input === INPUT.UPLOAD && !parameters.file) {
            throw new Error("Parameter 'file' must be provided when using input=upload");
        }

        if (parameters.input === INPUT.DOWNLOAD && !parameters.url) {
            throw new Error("Parameter 'url' must be provided when using input=download");
        }

        // Validate timeout values if provided
        if (requestTimeout !== undefined && (typeof requestTimeout !== 'number' || requestTimeout <= 0)) {
            throw new Error('requestTimeout must be a positive number');
        }

        if (conversionTimeout !== undefined && (typeof conversionTimeout !== 'number' || conversionTimeout <= 0)) {
            throw new Error('conversionTimeout must be a positive number');
        }

        let fileInfo = null;
        if (parameters.file) {
            fileInfo = await this._prepareFile(parameters.file, parameters.filename);
            parameters.file = fileInfo.blob;
            // Remove filename from parameters - it will be added to FormData separately
            delete parameters.filename;
        }

        const formData = new FormData();
        
        // Add token for IDR cloud authentication if provided
        if (this.credentials.token) {
            formData.append('token', this.credentials.token);
        }
        
        // Add conversion parameters
        for (const [key, value] of Object.entries(parameters)) {
            if (value !== undefined && value !== null) {
                // For file uploads, always include filename (required by API)
                if (key === 'file') {
                    formData.append(key, value, fileInfo.filename);
                } else {
                    formData.append(key, value);
                }
            }
        }

        const fetchOptions = {
            method: 'POST',
            body: formData
        };

        // Add basic auth header for self-hosted servers
        const { username, password } = this.credentials;
        if (username || password) {
            if (!username || !password) {
                throw new AuthenticationError();
            }
            fetchOptions.headers = this._getAuthHeaders();
        }

        const abortController = new AbortController();
        fetchOptions.signal = abortController.signal;
        
        let timeoutId;
        if (requestTimeout) {
            timeoutId = setTimeout(() => abortController.abort(), requestTimeout);
        }

        try {
            const response = await fetch(this.endpoint, fetchOptions);
            
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (!response.ok) {
                throw await this._createConversionError(response, 'Conversion request failed');
            }

            const result = await response.json();
            
            // Determine whether to poll for completion
            // onProgress requires polling, so it forces poll to true
            const shouldPoll = onProgress || (poll !== false);
            
            if (!shouldPoll) {
                return result;
            }

            return await this._poll(
                result.uuid,
                conversionTimeout,
                onProgress
            );

        } catch (error) {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            // AbortError indicates timeout - convert to ConversionTimeoutError
            if (error.name === 'AbortError') {
                throw new ConversionTimeoutError(requestTimeout);
            }
            
            throw error;
        }
    }
}

export default IDRCloudClient;
