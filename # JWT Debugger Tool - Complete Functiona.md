# JWT Debugger Tool - Complete Functional Requirements

## Document Information
**Version:** 1.0  
**Last Updated:** April 4, 2025  
**Status:** Final  

## Table of Contents
1. [Tool Overview](#1-tool-overview)
2. [Core Functionality](#2-core-functionality)
3. [UI Components](#3-ui-components)
4. [JWT Processing](#4-jwt-processing)
5. [Verification System](#5-verification-system)
6. [History Management](#6-history-management)
7. [Export and Sharing](#7-export-and-sharing)
8. [Help and Documentation](#8-help-and-documentation)
9. [Integration with Platform](#9-integration-with-platform)
10. [Performance Requirements](#10-performance-requirements)
11. [Testing Requirements](#11-testing-requirements)

---

## 1. Tool Overview

### 1.1 Tool Definition
1.1.1. Create a JWT Debugger tool with the following metadata:
```javascript
{
  id: "jwt-debugger",
  name: "JWT Debugger",
  description: "Decode, verify and inspect JSON Web Tokens",
  icon: "key",
  category: "security-tools",
  version: "1.0.0"
}
```

1.1.2. Register the tool with the platform's Tool Registry system.  
1.1.3. Add entry point at `/tools/jwt-debugger.html`.  
1.1.4. Add to platform navigation under "Security Tools" category.  

### 1.2 Purpose and Use Cases
1.2.1. Enable developers to inspect JWT token contents without exposing secrets.  
1.2.2. Allow verification of JWT signatures with different algorithms.  
1.2.3. Provide insights into JWT claims and validate expiration/validity.  
1.2.4. Help troubleshoot JWT-related authentication issues.  
1.2.5. Support educational use for understanding JWT structure.  

### 1.3 Tool-Specific Architecture
1.3.1. Implement as a fully client-side tool with no server dependencies.  
1.3.2. Create with the following component structure:
```
/tools/jwt-debugger.html        # Main tool HTML
/css/tools/jwt-debugger.css     # Tool-specific styles
/js/tools/jwt-debugger.js       # Tool functionality
```

1.3.3. Use the shared platform logging, storage, and UI components.  
1.3.4. External dependencies:
   - JSRSASIGN (jsrsasign-all-min.js) for cryptographic operations
   - Highlight.js for JSON syntax highlighting

---

## 2. Core Functionality

### 2.1 JWT Input and Parsing

#### 2.1.1 Input Methods
2.1.1.1. Create a textarea for JWT input with the following properties:
   - ID: `jwtInput`
   - Placeholder: "Paste your JWT token here"
   - Min height: 100px
   - Font: monospace for better token readability
   - Word-wrap: break-word for long tokens

2.1.1.2. Implement automatic JWT detection:
   - Parse input on change/paste
   - Support for tokens with or without "Bearer " prefix
   - Automatic whitespace and newline trimming
   - Error handling for malformed tokens

2.1.1.3. Add direct paste from clipboard button:
   - ID: `pasteFromClipboard`
   - Use navigator.clipboard API with fallbacks
   - Show error message if clipboard access is denied

2.1.1.4. Add sample JWT tokens for quick testing:
   - Include 3-5 sample tokens with different algorithms
   - Labeled by algorithm (HS256, RS256, etc.)
   - Include expired and valid samples

#### 2.1.2 JWT Parsing Function
2.1.2.1. Implement `parseJWT` function with the following signature:
```javascript
function parseJWT(token) {
  // Parameters:
  //   token: string - The JWT token to parse
  
  // Returns object with:
  //   valid: boolean - Whether the token could be parsed
  //   header: object - Decoded header segment
  //   payload: object - Decoded payload segment
  //   signature: string - Raw signature segment
  //   rawSegments: array - Original base64-encoded segments
  //   error: string|null - Error message if parsing failed
}
```

2.1.2.2. Handle the following JWT parsing requirements:
   - Split token into three segments (header, payload, signature)
   - Base64URL decode header and payload
   - Parse JSON from decoded segments
   - Validate proper JWT structure
   - Handle malformed JSON and base64 content

2.1.2.3. Include special parsing for common JWT claims:
   - Expiration time (exp)
   - Issued at (iat)
   - Not before (nbf)
   - Subject (sub)
   - Issuer (iss)
   - Audience (aud)

2.1.2.4. Detect and display token expiration status.  
2.1.2.5. Calculate and display token lifetime and validity period.  

### 2.2 JWT Verification

#### 2.2.1 Verification Options
2.2.1.1. Create input for signature verification key:
   - Textarea for secret key or public key
   - ID: `verificationKey`
   - Placeholder based on algorithm (secret for HMAC, public key for RSA/ECDSA)
   - Toggle for key visibility (show/hide)

2.2.1.2. Implement algorithm detection and selection:
   - Automatically detect algorithm from header
   - Dropdown for manual algorithm selection
   - Support for HS256, HS384, HS512, RS256, RS384, RS512, ES256, ES384, ES512
   - Display appropriate key instructions based on algorithm

2.2.1.3. Add verification options:
   - Checkbox to verify expiration (exp claim)
   - Checkbox to verify not before (nbf claim)
   - Input for audience validation (aud claim)
   - Input for issuer validation (iss claim)

#### 2.2.2 Verification Process
2.2.2.1. Implement `verifyJWT` function:
```javascript
function verifyJWT(token, key, options) {
  // Parameters:
  //   token: string - The JWT token to verify
  //   key: string - Secret or public key for verification
  //   options: object - Verification options including:
  //     algorithm: string - The algorithm to use
  //     checkExpiration: boolean - Whether to check exp claim
  //     checkNotBefore: boolean - Whether to check nbf claim
  //     audience: string - Expected audience
  //     issuer: string - Expected issuer
  
  // Returns object with:
  //   verified: boolean - Whether signature is valid
  //   validClaims: boolean - Whether all claims (exp, nbf, etc.) are valid
  //   errors: array - Error messages for failed verifications
  //   expirationStatus: string - Token expiration status
}
```

2.2.2.2. Use JSRSASIGN library for cryptographic operations:
   - HMAC verification for HS256/HS384/HS512
   - RSA verification for RS256/RS384/RS512
   - ECDSA verification for ES256/ES384/ES512

2.2.2.3. Implement proper error handling for verification failures:
   - Invalid signature
   - Key format issues
   - Algorithm mismatches
   - Expired tokens
   - Future tokens (nbf)
   - Audience mismatch
   - Issuer mismatch

2.2.2.4. Display verification results with clear visual indicators.  
2.2.2.5. Add detailed explanation for verification failures.  

### 2.3 JWT Creation and Editing

#### 2.3.1 Token Editor
2.3.1.1. Create editable JSON views for header and payload:
   - ID: `headerEditor` - For header JSON
   - ID: `payloadEditor` - For payload JSON
   - Syntax highlighting for JSON
   - Validation as you type
   - Error highlighting for invalid JSON

2.3.1.2. Implement common claim helpers:
   - Button to add/update exp claim (with duration selector)
   - Button to add/update iat claim (current time)
   - Button to add/update nbf claim (with delay selector)
   - Input helpers for sub, iss, aud claims

2.3.1.3. Add validation for critical claims:
   - Validate time-based claims (exp, iat, nbf) are numeric
   - Validate 'alg' in header matches selected algorithm
   - Highlight potential security issues (e.g., "none" algorithm)

#### 2.3.2 Token Generation
2.3.2.1. Implement `generateJWT` function:
```javascript
function generateJWT(header, payload, key, algorithm) {
  // Parameters:
  //   header: object - JWT header
  //   payload: object - JWT payload
  //   key: string - Secret key or private key
  //   algorithm: string - Signing algorithm
  
  // Returns object with:
  //   token: string - Generated JWT token
  //   error: string|null - Error message if generation failed
}
```

2.3.2.2. Support same algorithms as verification:
   - HS256, HS384, HS512, RS256, RS384, RS512, ES256, ES384, ES512
   - Show appropriate key input based on algorithm

2.3.2.3. Create token generation options:
   - Toggle for compact/readable display
   - Copy to clipboard button
   - Option to automatically save to history

2.3.2.4. Implement security warnings:
   - Alert for weak secrets (HMAC)
   - Warning for missing critical claims
   - Notice about client-side key usage

---

## 3. UI Components

### 3.1 Main Layout
3.1.1. Create three-panel layout for the JWT debugger:
   - Left panel: JWT input and verification options
   - Center panel: Decoded JWT with header and payload
   - Right panel: Verification results and token info

3.1.2. Make layout responsive:
   - Stack panels vertically on mobile
   - Side-by-side on tablet and desktop
   - Collapsible sections for better space utilization

3.1.3. Implement tab system for smaller screens:
   - Input tab
   - Decoded tab
   - Verification tab

### 3.2 Token Display Components

#### 3.2.1 Segmented Display
3.2.1.1. Create visual representation of JWT segments:
   - Color-coded segments (header, payload, signature)
   - Hover highlights with tooltips
   - Click to jump to respective section

3.2.1.2. Example HTML structure:
```html
<div class="jwt-segments">
  <div class="segment header" data-tooltip="Header">
    <span class="segment-text">eyJhbGciOiJIUzI1...</span>
  </div>
  <div class="segment-separator">.</div>
  <div class="segment payload" data-tooltip="Payload">
    <span class="segment-text">eyJzdWIiOiIxMjM0...</span>
  </div>
  <div class="segment-separator">.</div>
  <div class="segment signature" data-tooltip="Signature">
    <span class="segment-text">A1F4Ypm1WXT6Qws9...</span>
  </div>
</div>
```

3.2.1.3. Style segments distinctly:
   - Header: Blue
   - Payload: Purple
   - Signature: Green
   - Use opacity variations to indicate validity

#### 3.2.2 JSON Viewers
3.2.2.1. Create collapsible JSON viewers for header and payload:
   - Syntax highlighting
   - Collapsible objects and arrays
   - Line numbers
   - Copy button for each section

3.2.2.2. Include special formatting for common claims:
   - Format timestamps as human-readable dates
   - Show time remaining for expiration
   - Highlight critical security claims

3.2.2.3. Toggle between editable and view-only modes.  
3.2.2.4. Add JSON validation with error highlighting.  

### 3.3 Verification Results Display

#### 3.3.1 Status Indicators
3.3.1.1. Create clear verification status indicators:
   - Signature verification status
   - Expiration status
   - Claim validation status
   - Overall token validity

3.3.1.2. Use consistent status styles:
   - Valid: Green checkmark
   - Invalid: Red X
   - Warning: Yellow exclamation
   - Info: Blue info icon

3.3.1.3. Include detailed status explanations.  

#### 3.3.2 Verification Details
3.3.2.1. Display detailed verification results:
   - Verification time
   - Algorithm used
   - Verified claims
   - Verification errors
   - Token lifetime information

3.3.2.2. Implement collapsible sections for detailed information.  
3.3.2.3. Add troubleshooting suggestions for common verification errors.  

### 3.4 Action Buttons
3.4.1. Implement primary action buttons:
   - Verify: Run verification with current settings
   - Decode: Parse without verification
   - Generate: Create new token from current header/payload
   - Clear: Reset all inputs

3.4.2. Add secondary actions:
   - Copy: Copy token, header, payload, or verification results
   - Save: Save token to history
   - Share: Generate shareable link (without secrets)
   - Export: Download token information

3.4.3. Include tooltips and keyboard shortcuts for common actions.  

---

## 4. JWT Processing

### 4.1 Base64URL Encoding/Decoding

#### 4.1.1 Decoding Functions
4.1.1.1. Implement `base64UrlDecode` function:
```javascript
function base64UrlDecode(input) {
  // Convert base64url to base64
  // Handle padding
  // Decode base64 to string
  // Return decoded string or error
}
```

4.1.1.2. Handle base64url specific requirements:
   - Replace "-" with "+"
   - Replace "_" with "/"
   - Add padding if necessary
   - Handle invalid base64 input

4.1.1.3. Implement proper error handling for decoding failures.  

#### 4.1.2 Encoding Functions
4.1.2.1. Implement `base64UrlEncode` function:
```javascript
function base64UrlEncode(input) {
  // Convert string to base64
  // Convert base64 to base64url
  // Remove padding
  // Return encoded string
}
```

4.1.2.2. Handle base64url specific requirements:
   - Replace "+" with "-"
   - Replace "/" with "_"
   - Remove padding "="
   - Handle various input types (string, JSON, etc.)

### 4.2 JWT Parsing and Assembly

#### 4.2.1 Token Parsing
4.2.1.1. Split token into segments:
```javascript
function splitToken(token) {
  const segments = token.split('.');
  if (segments.length !== 3) {
    throw new Error('Invalid token format');
  }
  return segments;
}
```

4.2.1.2. Decode header and payload segments:
```javascript
function decodeSegments(segments) {
  try {
    const header = JSON.parse(base64UrlDecode(segments[0]));
    const payload = JSON.parse(base64UrlDecode(segments[1]));
    return { header, payload, signature: segments[2] };
  } catch (e) {
    throw new Error(`Failed to decode segments: ${e.message}`);
  }
}
```

4.2.1.3. Support special handling for "Bearer" prefix:
```javascript
function normalizeToken(input) {
  // Remove "Bearer " prefix if present
  // Trim whitespace
  // Remove line breaks
  return input.replace(/^Bearer\s+/i, '').trim().replace(/\n/g, '');
}
```

#### 4.2.2 Token Assembly
4.2.2.1. Create function to assemble JWT from components:
```javascript
function assembleToken(header, payload, signature) {
  const headerSegment = base64UrlEncode(JSON.stringify(header));
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  return `${headerSegment}.${payloadSegment}.${signature}`;
}
```

4.2.2.2. Implement signing function for token generation:
```javascript
function signToken(headerSegment, payloadSegment, key, algorithm) {
  // Create signing input from segments
  // Apply appropriate algorithm
  // Return base64url encoded signature
}
```

### 4.3 Claim Processing

#### 4.3.1 Time-Based Claims
4.3.1.1. Process expiration (exp) claim:
```javascript
function processExpClaim(exp) {
  if (!exp) return { valid: false, message: 'No expiration' };
  
  const now = Math.floor(Date.now() / 1000);
  const expDate = new Date(exp * 1000);
  const remaining = exp - now;
  
  return {
    valid: now < exp,
    date: expDate,
    remaining: remaining,
    message: remaining > 0 ? 
      `Expires in ${formatDuration(remaining)}` : 
      `Expired ${formatDuration(-remaining)} ago`
  };
}
```

4.3.1.2. Process issued at (iat) claim:
```javascript
function processIatClaim(iat) {
  if (!iat) return { valid: true, message: 'No issued at time' };
  
  const iatDate = new Date(iat * 1000);
  const age = Math.floor(Date.now() / 1000) - iat;
  
  return {
    valid: true,
    date: iatDate,
    age: age,
    message: `Issued ${formatDuration(age)} ago`
  };
}
```

4.3.1.3. Process not before (nbf) claim:
```javascript
function processNbfClaim(nbf) {
  if (!nbf) return { valid: true, message: 'No not-before time' };
  
  const now = Math.floor(Date.now() / 1000);
  const nbfDate = new Date(nbf * 1000);
  const delta = nbf - now;
  
  return {
    valid: now >= nbf,
    date: nbfDate,
    delta: delta,
    message: delta > 0 ? 
      `Valid in ${formatDuration(delta)}` : 
      `Valid since ${formatDuration(-delta)} ago`
  };
}
```

4.3.1.4. Implement human-readable duration formatting:
```javascript
function formatDuration(seconds) {
  // Format seconds into days, hours, minutes, seconds
  // Return human-readable string
}
```

#### 4.3.2 Other Common Claims
4.3.2.1. Process audience (aud) claim:
   - Handle both string and array formats
   - Compare with expected audience
   - Generate descriptive validation message

4.3.2.2. Process issuer (iss) claim:
   - Compare with expected issuer
   - Format as URL when appropriate
   - Include issuer verification status

4.3.2.3. Process subject (sub) claim:
   - Display subject information
   - Format based on common patterns (email, UUID, etc.)

4.3.2.4. Process JWT ID (jti) claim:
   - Display as unique identifier
   - Format based on common patterns

---

## 5. Verification System

### 5.1 Signature Verification

#### 5.1.1 HMAC Verification
5.1.1.1. Implement HMAC verification:
```javascript
function verifyHMAC(token, secret, algorithm) {
  const segments = token.split('.');
  const signatureBase = segments[0] + '.' + segments[1];
  const providedSignature = segments[2];
  
  // Use JSRSASIGN to create HMAC signature
  const alg = {
    'HS256': 'HmacSHA256',
    'HS384': 'HmacSHA384',
    'HS512': 'HmacSHA512'
  }[algorithm];
  
  const sig = new KJUR.crypto.Mac({alg, prov: 'cryptojs', pass: secret})
                  .doFinal(signatureBase);
  const calculatedSignature = hextob64u(sig);
  
  return {
    verified: providedSignature === calculatedSignature,
    providedSignature,
    calculatedSignature
  };
}
```

5.1.1.2. Handle different key formats:
   - Plain text secrets
   - Base64 encoded secrets
   - Hex encoded secrets

5.1.1.3. Add key strength warnings for weak HMAC secrets.  

#### 5.1.2 RSA Verification
5.1.2.1. Implement RSA verification:
```javascript
function verifyRSA(token, publicKey, algorithm) {
  try {
    const segments = token.split('.');
    const signatureBase = segments[0] + '.' + segments[1];
    const providedSignature = b64utohex(segments[2]);
    
    // Use JSRSASIGN to verify RSA signature
    const alg = {
      'RS256': 'SHA256withRSA',
      'RS384': 'SHA384withRSA',
      'RS512': 'SHA512withRSA'
    }[algorithm];
    
    const sig = new KJUR.crypto.Signature({alg});
    sig.init(publicKey);
    sig.updateString(signatureBase);
    const isValid = sig.verify(providedSignature);
    
    return { verified: isValid };
  } catch (e) {
    return { verified: false, error: e.message };
  }
}
```

5.1.2.2. Accept various public key formats:
   - PEM format
   - X.509 certificates
   - JWK format
   - Auto-detect format when possible

5.1.2.3. Include helpful error messages for common key format issues.  

#### 5.1.3 ECDSA Verification
5.1.3.1. Implement ECDSA verification:
```javascript
function verifyECDSA(token, publicKey, algorithm) {
  try {
    const segments = token.split('.');
    const signatureBase = segments[0] + '.' + segments[1];
    const providedSignature = b64utohex(segments[2]);
    
    // Use JSRSASIGN to verify ECDSA signature
    const alg = {
      'ES256': 'SHA256withECDSA',
      'ES384': 'SHA384withECDSA',
      'ES512': 'SHA512withECDSA'
    }[algorithm];
    
    const sig = new KJUR.crypto.Signature({alg});
    sig.init(publicKey);
    sig.updateString(signatureBase);
    const isValid = sig.verify(providedSignature);
    
    return { verified: isValid };
  } catch (e) {
    return { verified: false, error: e.message };
  }
}
```

5.1.3.2. Support EC curve detection:
   - P-256 curve for ES256
   - P-384 curve for ES384
   - P-521 curve for ES512

5.1.3.3. Provide helpful guidance for curve selection.  

### 5.2 Claim Verification

#### 5.2.1 Time-Based Verification
5.2.1.1. Implement expiration verification:
```javascript
function verifyExpiration(payload, options) {
  if (!payload.exp) {
    return { 
      valid: !options.requireExp, 
      message: options.requireExp ? 
        'Missing required exp claim' : 
        'No expiration specified'
    };
  }
  
  const now = Math.floor(Date.now() / 1000);
  const valid = now < payload.exp;
  
  return {
    valid,
    expiry: new Date(payload.exp * 1000),
    remaining: payload.exp - now,
    message: valid ? 
      `Valid for ${formatDuration(payload.exp - now)}` : 
      `Expired ${formatDuration(now - payload.exp)} ago`
  };
}
```

5.2.1.2. Implement not-before verification:
```javascript
function verifyNotBefore(payload) {
  if (!payload.nbf) return { valid: true, message: 'No nbf claim' };
  
  const now = Math.floor(Date.now() / 1000);
  const valid = now >= payload.nbf;
  
  return {
    valid,
    activeDate: new Date(payload.nbf * 1000),
    delta: payload.nbf - now,
    message: valid ? 
      `Active since ${formatDuration(now - payload.nbf)} ago` : 
      `Will be active in ${formatDuration(payload.nbf - now)}`
  };
}
```

5.2.1.3. Add clock skew tolerance option:
```javascript
function verifyTimeClaimsWithTolerance(payload, options) {
  const { clockSkewTolerance = 0 } = options;
  const now = Math.floor(Date.now() / 1000);
  
  // Check exp with tolerance
  const expValid = !payload.exp || 
                   (now - clockSkewTolerance) < payload.exp;
  
  // Check nbf with tolerance
  const nbfValid = !payload.nbf || 
                   (now + clockSkewTolerance) >= payload.nbf;
  
  return {
    expValid,
    nbfValid,
    valid: expValid && nbfValid,
    clockSkewTolerance
  };
}
```

#### 5.2.2 Audience and Issuer Verification
5.2.2.1. Implement audience verification:
```javascript
function verifyAudience(payload, expectedAudience) {
  if (!payload.aud) return { valid: !expectedAudience, message: 'No audience claim' };
  
  if (Array.isArray(payload.aud)) {
    const valid = payload.aud.includes(expectedAudience);
    return {
      valid: expectedAudience ? valid : true,
      message: valid ? 
        `Audience "${expectedAudience}" matched` : 
        `Expected audience "${expectedAudience}" not found in ${JSON.stringify(payload.aud)}`
    };
  } else {
    const valid = payload.aud === expectedAudience;
    return {
      valid: expectedAudience ? valid : true,
      message: valid ? 
        `Audience "${expectedAudience}" matched` : 
        `Expected audience "${expectedAudience}" but found "${payload.aud}"`
    };
  }
}
```

5.2.2.2. Implement issuer verification:
```javascript
function verifyIssuer(payload, expectedIssuer) {
  if (!payload.iss) return { valid: !expectedIssuer, message: 'No issuer claim' };
  
  const valid = payload.iss === expectedIssuer;
  return {
    valid: expectedIssuer ? valid : true,
    message: valid ? 
      `Issuer "${expectedIssuer}" matched` : 
      `Expected issuer "${expectedIssuer}" but found "${payload.iss}"`
  };
}
```

### 5.3 Token Generation

#### 5.3.1 HMAC Signing
5.3.1.1. Implement HMAC signing:
```javascript
function signHMAC(header, payload, secret, algorithm) {
  // Prepare header with algorithm
  const tokenHeader = { ...header, alg: algorithm, typ: 'JWT' };
  
  // Encode segments
  const headerSegment = base64UrlEncode(JSON.stringify(tokenHeader));
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const signatureBase = `${headerSegment}.${payloadSegment}`;
  
  // Sign using JSRSASIGN
  const alg = {
    'HS256': 'HmacSHA256',
    'HS384': 'HmacSHA384',
    'HS512': 'HmacSHA512'
  }[algorithm];
  
  const sig = new KJUR.crypto.Mac({alg, prov: 'cryptojs', pass: secret})
                  .doFinal(signatureBase);
  const signature = hextob64u(sig);
  
  return `${headerSegment}.${payloadSegment}.${signature}`;
}
```

5.3.1.2. Validate secret strength:
   - Check minimum length based on algorithm
   - Warn about weak secrets
   - Suggest stronger alternatives

#### 5.3.2 RSA Signing
5.3.2.1. Implement RSA signing:
```javascript
function signRSA(header, payload, privateKey, algorithm) {
  try {
    // Prepare header with algorithm
    const tokenHeader = { ...header, alg: algorithm, typ: 'JWT' };
    
    // Encode segments
    const headerSegment = base64UrlEncode(JSON.stringify(tokenHeader));
    const payloadSegment = base64UrlEncode(JSON.stringify(payload));
    const signatureBase = `${headerSegment}.${payloadSegment}`;
    
    // Sign using JSRSASIGN
    const alg = {
      'RS256': 'SHA256withRSA',
      'RS384': 'SHA384withRSA',
      'RS512': 'SHA512withRSA'
    }[algorithm];
    
    const sig = new KJUR.crypto.Signature({alg});
    sig.init(privateKey);
    sig.updateString(signatureBase);
    const signature = hextob64u(sig.sign());
    
    return `${headerSegment}.${payloadSegment}.${signature}`;
  } catch (e) {
    throw new Error(`RSA signing failed: ${e.message}`);
  }
}
```

5.3.2.2. Support various private key formats:
   - PEM format
   - PKCS#8
   - JWK format
   - Auto-detect format when possible

#### 5.3.3 ECDSA Signing
5.3.3.1. Implement ECDSA signing:
```javascript
function signECDSA(header, payload, privateKey, algorithm) {
  try {
    // Prepare header with algorithm
    const tokenHeader = { ...header, alg: algorithm, typ: 'JWT' };
    
    // Encode segments
    const headerSegment = base64UrlEncode(JSON.stringify(tokenHeader));
    const payloadSegment = base64UrlEncode(JSON.stringify(payload));
    const signatureBase = `${headerSegment}.${payloadSegment}`;
    
    // Sign using JSRSASIGN
    const alg = {
      'ES256': 'SHA256withECDSA',
      'ES384': 'SHA384withECDSA',
      'ES512': 'SHA512withECDSA'
    }[algorithm];
    
    const sig = new KJUR.crypto.Signature({alg});
    sig.init(privateKey);
    sig.updateString(signatureBase);
    const signature = hextob64u(sig.sign());
    
    return `${headerSegment}.${payloadSegment}.${signature}`;
  } catch (e) {
    throw new Error(`ECDSA signing failed: ${e.message}`);
  }
}
```

5.3.3.2. Validate curve compatibility:
- Ensure key uses correct curve for algorithm
   - ES256: P-256 curve
   - ES384: P-384 curve
   - ES512: P-521 curve

---

## 6. History Management

### 6.1 Token History Storage

#### 6.1.1 History Data Structure
6.1.1.1. Store JWT history in localStorage under the key "jwtHistory" with the following schema:
```javascript
{
  id: "uniqueId",           // Generated from token content
  token: "jwt",             // The JWT token
  header: {},               // Decoded header
  payload: {},              // Decoded payload
  timestamp: "ISO date",    // Creation timestamp
  displayDate: "formatted", // Formatted date for display
  starred: false,           // Starred status
  lastUsed: 1234567890,     // Timestamp of last usage
  nickname: "",             // Optional nickname
  algorithm: "RS256",       // Algorithm used
  notes: ""                 // User notes about this token
}
```

6.1.1.2. Implement auto-save functionality:
   - Save after successful verification
   - Save when user clicks "Save" button
   - Do not save on simple decoding operations

6.1.1.3. Store up to 50 tokens:
   - Remove oldest non-starred tokens first when limit is reached
   - Count unique tokens only (updating existing entries)

6.1.1.4. Generate unique IDs using token signature or content.

#### 6.1.2 History Operations
6.1.2.1. Implement `saveToHistory` function:
```javascript
function saveToHistory(token, decodedData, options = {}) {
  const { nickname = '', notes = '', starred = false } = options;
  
  // Generate ID based on token content
  const id = generateTokenId(token);
  
  // Check if token already exists
  const existingIndex = jwtHistory.findIndex(item => item.id === id);
  const now = new Date();
  
  const historyEntry = {
    id,
    token,
    header: decodedData.header,
    payload: decodedData.payload,
    timestamp: now.toISOString(),
    displayDate: formatDate(now),
    starred,
    lastUsed: now.getTime(),
    nickname,
    algorithm: decodedData.header.alg,
    notes
  };
  
  if (existingIndex !== -1) {
    // Update existing entry
    jwtHistory[existingIndex] = {
      ...jwtHistory[existingIndex],
      lastUsed: now.getTime(),
      nickname: nickname || jwtHistory[existingIndex].nickname,
      notes: notes || jwtHistory[existingIndex].notes,
      starred: starred || jwtHistory[existingIndex].starred
    };
  } else {
    // Add new entry
    jwtHistory.unshift(historyEntry);
    
    // Limit history size
    if (jwtHistory.length > 50) {
      // Find first non-starred item
      const removeIndex = jwtHistory.findIndex(item => !item.starred);
      if (removeIndex !== -1) {
        jwtHistory.splice(removeIndex, 1);
      } else {
        // If all are starred, remove the oldest
        jwtHistory.pop();
      }
    }
  }
  
  // Save to storage
  StorageManager.set('jwtHistory', jwtHistory);
  return historyEntry;
}
```

6.1.2.2. Implement `loadFromHistory` function:
```javascript
function loadFromHistory(id) {
  const item = jwtHistory.find(entry => entry.id === id);
  
  if (item) {
    // Update last used timestamp
    item.lastUsed = Date.now();
    StorageManager.set('jwtHistory', jwtHistory);
    
    return {
      token: item.token,
      header: item.header,
      payload: item.payload,
      algorithm: item.algorithm,
      nickname: item.nickname,
      notes: item.notes
    };
  }
  
  return null;
}
```

6.1.2.3. Implement `deleteFromHistory` function:
```javascript
function deleteFromHistory(id) {
  const initialLength = jwtHistory.length;
  jwtHistory = jwtHistory.filter(item => item.id !== id);
  
  if (jwtHistory.length !== initialLength) {
    StorageManager.set('jwtHistory', jwtHistory);
    return true;
  }
  
  return false;
}
```

6.1.2.4. Implement batch operations:
   - Clear all non-starred items
   - Clear all items
   - Star/unstar multiple items
   - Export/import history

### 6.2 History Display

#### 6.2.1 History List
6.2.1.1. Create a history list component (ID: `historyList`):
   - List container with vertical scrolling
   - Item template with token info and actions
   - Empty state message

6.2.1.2. Each history item should display:
   - First few characters of token (preview)
   - Nickname (if available)
   - Star indicator
   - Issuer and subject (if available in payload)
   - Expiration status
   - Last used date

6.2.1.3. Sort history:
   - Starred items first
   - Then by last used date (most recent first)

6.2.1.4. Add visual distinction for:
   - Starred items (yellow background)
   - Expired tokens (red border/indicator)
   - Different algorithm types (color-coded)

#### 6.2.2 History Search
6.2.2.1. Implement history search (ID: `historySearch`):
   - Search input with clear button
   - Real-time filtering as you type
   - Search across token, payload, header, and nickname

6.2.2.2. Support advanced search filters:
   - `alg:RS256` - Search by algorithm
   - `exp:<timestamp>` - Search by expiration
   - `iss:example.com` - Search by issuer
   - `sub:username` - Search by subject
   - `is:starred` - Show only starred tokens
   - `is:valid` - Show only valid (non-expired) tokens

6.2.2.3. Display appropriate empty state for no search results.

#### 6.2.3 History Item Actions
6.2.3.1. Implement item actions:
   - Load: Load token into decoder
   - Star: Toggle starred status
   - Copy: Copy token to clipboard
   - Delete: Remove from history
   - Edit nickname/notes: Add or modify metadata

6.2.3.2. Add batch action toolbar:
   - Clear all button (with confirmation)
   - Export selected
   - Import tokens
   - Star/unstar selected

6.2.3.3. Include context menu for additional actions:
   - Compare with current token
   - View differences
   - Create similar token

### 6.3 Nickname and Notes Management

#### 6.3.1 Nickname System
6.3.1.1. Create nickname management interface:
   - Input field for nickname (max 50 chars)
   - Save button
   - Auto-save on blur

6.3.1.2. Display nickname:
   - In history list
   - In token details when loaded
   - In exported files

6.3.1.3. Use nickname in file names when exporting.

#### 6.3.2 Notes System
6.3.2.1. Add notes field for each token:
   - Multi-line text area
   - Markdown support (optional)
   - Character counter
   - Auto-save functionality

6.3.2.2. Display notes:
   - Collapsible section in token details
   - Expandable preview in history item
   - Include in exports

---

## 7. Export and Sharing

### 7.1 Token Export

#### 7.1.1 Export Formats
7.1.1.1. Support multiple export formats:
   - Plain JWT token (text file)
   - JSON format with decoded segments
   - HTML report with verification results
   - PDF report (optional, using jsPDF)

7.1.1.2. Example JSON export format:
```javascript
{
  "jwt": "header.payload.signature",
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "1234567890",
    "name": "John Doe",
    "iat": 1516239022,
    "exp": 1516239122
  },
  "verification": {
    "verified": true,
    "algorithm": "RS256",
    "expirationStatus": "expired"
  },
  "metadata": {
    "exportDate": "2025-04-04T12:34:56Z",
    "exportedBy": "JWT Debugger",
    "version": "1.0.0"
  }
}
```

7.1.1.3. Include metadata in exports:
   - Export timestamp
   - Tool version
   - Verification results (if performed)
   - User notes (if available)

#### 7.1.2 Export Process
7.1.2.1. Implement export functionality:
```javascript
function exportToken(token, decodedData, format, options = {}) {
  const { includeVerification = false, includeNotes = true } = options;
  
  // Create export content based on format
  let content;
  let filename;
  let mimeType;
  
  switch(format) {
    case 'token':
      content = token;
      filename = `jwt-token-${generateShortId()}.txt`;
      mimeType = 'text/plain';
      break;
      
    case 'json':
      const exportData = {
        jwt: token,
        header: decodedData.header,
        payload: decodedData.payload
      };
      
      if (includeVerification && decodedData.verification) {
        exportData.verification = decodedData.verification;
      }
      
      if (includeNotes && decodedData.notes) {
        exportData.notes = decodedData.notes;
      }
      
      content = JSON.stringify(exportData, null, 2);
      filename = `jwt-data-${generateShortId()}.json`;
      mimeType = 'application/json';
      break;
      
    case 'html':
      // Generate HTML report
      content = generateHtmlReport(token, decodedData, options);
      filename = `jwt-report-${generateShortId()}.html`;
      mimeType = 'text/html';
      break;
  }
  
  // Create download
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

7.1.2.2. Create HTML report generator:
```javascript
function generateHtmlReport(token, decodedData, options) {
  // Generate HTML with styling and content
  // Include token, decoded data, verification results
  // Format based on options
}
```

7.1.2.3. Support batch export for multiple tokens.

### 7.2 Sharing Functionality

#### 7.2.1 Shareable Links
7.2.1.1. Generate shareable links for tokens:
```javascript
function generateShareableLink(token, options = {}) {
  const { includeHeader = true, includePayload = true } = options;
  
  // Base URL
  const baseUrl = window.location.origin + window.location.pathname;
  
  // Create query parameters
  const params = new URLSearchParams();
  
  // Add token if not too large (URL length limits)
  if (token.length < 2000) {
    params.set('token', token);
  } else if (includeHeader || includePayload) {
    // If token is too large, include segments separately
    const segments = token.split('.');
    
    if (includeHeader) {
      params.set('header', segments[0]);
    }
    
    if (includePayload) {
      params.set('payload', segments[1]);
    }
    
    // Never include signature in shareable links for security
  }
  
  return `${baseUrl}?${params.toString()}`;
}
```

7.2.1.2. Handle privacy concerns:
   - Option to exclude payload (for sensitive data)
   - Never include verification keys in links
   - Warning about sharing sensitive tokens

7.2.1.3. Support loading from URL parameters:
```javascript
function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  
  // Check for full token
  if (params.has('token')) {
    return params.get('token');
  }
  
  // Check for segments
  if (params.has('header') && params.has('payload')) {
    return `${params.get('header')}.${params.get('payload')}.`;
  }
  
  return null;
}
```

#### 7.2.2 Copy Options
7.2.2.1. Implement copy functionality with options:
   - Copy token: Just the JWT string
   - Copy header: JSON formatted header
   - Copy payload: JSON formatted payload
   - Copy as curl: Generate curl command with token

7.2.2.2. Example curl command generator:
```javascript
function generateCurlCommand(token, endpoint = 'https://api.example.com') {
  return `curl -X GET \\
  "${endpoint}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json"`;
}
```

7.2.2.3. Add copy confirmation and success indicators.

### 7.3 Import Options

#### 7.3.1 Token Import
7.3.1.1. Support multiple import methods:
   - Paste JWT string
   - Upload token file
   - Import from URL
   - Scan QR code (if camera API available)

7.3.1.2. Implement file upload handling:
```javascript
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    
    // Try to parse as JSON first
    try {
      const jsonData = JSON.parse(content);
      
      // Check if this is our export format
      if (jsonData.jwt) {
        // Process exported JWT
        processToken(jsonData.jwt);
        
        // Import notes and metadata if available
        if (jsonData.notes) {
          setTokenNotes(jsonData.notes);
        }
        
        return;
      }
    } catch (e) {
      // Not JSON, assume plain text token
      processToken(content.trim());
    }
  };
  
  reader.readAsText(file);
}
```

7.3.1.3. Add JOSE/JWS/JWE format support:
   - Parse compact serialization
   - Extract JWT from JOSE objects
   - Support for encrypted tokens (JWE)

#### 7.3.2 Batch Import
7.3.2.1. Support batch import of multiple tokens:
   - JSON array of tokens
   - Text file with one token per line
   - Export files from other JWT tools

7.3.2.2. Implement batch processing:
```javascript
function processBatchImport(tokens) {
  const results = {
    success: 0,
    failed: 0,
    duplicates: 0,
    tokens: []
  };
  
  // Process each token
  tokens.forEach(token => {
    try {
      const decoded = parseJWT(token);
      if (decoded.valid) {
        // Save to history
        const saved = saveToHistory(token, decoded);
        if (saved) {
          results.success++;
          results.tokens.push({
            token: token.substring(0, 20) + '...',
            status: 'success'
          });
        } else {
          results.duplicates++;
          results.tokens.push({
            token: token.substring(0, 20) + '...',
            status: 'duplicate'
          });
        }
      } else {
        results.failed++;
        results.tokens.push({
          token: token.substring(0, 20) + '...',
          status: 'invalid',
          error: decoded.error
        });
      }
    } catch (e) {
      results.failed++;
      results.tokens.push({
        token: token.substring(0, 20) + '...',
        status: 'error',
        error: e.message
      });
    }
  });
  
  return results;
}
```

7.3.2.3. Display import results summary.

---

## 8. Help and Documentation

### 8.1 Contextual Help

#### 8.1.1 Field-Level Help
8.1.1.1. Add tooltips to all major UI elements:
   - Input fields
   - Buttons
   - Settings
   - Verification options

8.1.1.2. Implementation with HTML data attributes:
```html
<div class="form-group">
  <label for="secretKey">
    Secret Key
    <i class="help-icon" data-tooltip="Enter the secret key used to sign the JWT"></i>
  </label>
  <input type="password" id="secretKey" />
</div>
```

8.1.1.3. Add detailed help for algorithm selection:
   - When to use each algorithm
   - Key format requirements
   - Security considerations

#### 8.1.2 Claim Documentation
8.1.2.1. Add explanations for standard JWT claims:
   - Show information icon next to common claims
   - Display explanation when clicked
   - Link to specifications for more info

8.1.2.2. Example claim documentation:
```javascript
const claimDocs = {
  'iss': {
    name: 'Issuer',
    description: 'Identifies the principal that issued the JWT',
    spec: 'RFC 7519',
    link: 'https://tools.ietf.org/html/rfc7519#section-4.1.1'
  },
  'sub': {
    name: 'Subject',
    description: 'Identifies the principal that is the subject of the JWT',
    spec: 'RFC 7519',
    link: 'https://tools.ietf.org/html/rfc7519#section-4.1.2'
  },
  // Additional claims
};
```

8.1.2.3. Highlight security-critical claims with warnings/best practices.

### 8.2 Error Guidance

#### 8.2.1 Validation Errors
8.2.1.1. Provide detailed error messages for validation failures:
   - Signature verification failures
   - Expiration issues
   - Malformed token structure
   - Invalid claim values

8.2.1.2. Include troubleshooting steps for common errors:
```javascript
const errorGuidance = {
  'invalid_signature': {
    message: 'Invalid signature',
    possible_causes: [
      'Incorrect secret key',
      'Wrong algorithm selected',
      'Token has been tampered with',
      'Key format issues (PEM headers, whitespace)'
    ],
    troubleshooting: [
      'Verify you are using the correct secret/key',
      'Ensure the algorithm matches the one used to create the token',
      'Check for whitespace in the key',
      'Ensure the token hasn\'t been modified'
    ]
  },
  // Additional error types
};
```

8.2.1.3. Add severity levels for issues:
   - Critical: Security issues (weak algorithm, none algorithm)
   - Error: Token cannot be verified or used
   - Warning: Potential issues (near expiration)
   - Info: Informational messages

#### 8.2.2 Input Validation
8.2.2.1. Validate all user inputs:
   - JWT format
   - Key format
   - JSON syntax in editors
   - Algorithm selection

8.2.2.2. Display validation errors inline:
   - Highlight problem areas
   - Show error messages near the input
   - Suggest corrections when possible

8.2.2.3. Add preemptive warnings:
   - Weak keys
   - Insecure algorithms
   - Missing critical claims
   - Soon-to-expire tokens

### 8.3 Guided Tutorials

#### 8.3.1 Interactive Guide
8.3.1.1. Create step-by-step tutorials for common tasks:
   - Decoding your first JWT
   - Verifying a token signature
   - Creating a new JWT
   - Working with different algorithms

8.3.1.2. Implement as an interactive overlay:
```javascript
const tutorials = {
  'decode': [
    {
      element: '#jwtInput',
      title: 'Enter Your JWT',
      content: 'Paste your JWT token here or click one of the sample tokens below.',
      position: 'bottom'
    },
    {
      element: '#decodeButton',
      title: 'Decode the Token',
      content: 'Click this button to decode your JWT without verification.',
      position: 'right'
    },
    // Additional steps
  ],
  // Additional tutorials
};
```

8.3.1.3. Track tutorial progress in localStorage.

#### 8.3.2 Sample Tokens
8.3.2.1. Provide a library of sample tokens:
   - Different algorithms (HS256, RS256, etc.)
   - Various claim combinations
   - Valid and invalid examples
   - Complex nested structures

8.3.2.2. Include context for each sample:
   - Purpose/use case
   - Key requirements
   - Expected verification results
   - Educational notes

8.3.2.3. Implement as a dropdown or panel:
```html
<div class="sample-tokens">
  <h3>Sample Tokens</h3>
  <ul>
    <li>
      <button class="sample-token-btn" data-token="eyJhbGciOiJIUzI1...">
        HS256 Simple Token
      </button>
      <span class="sample-info">Basic token with standard claims</span>
    </li>
    <!-- Additional samples -->
  </ul>
</div>
```

---

## 9. Integration with Platform

### 9.1 Platform Registration

#### 9.1.1 Tool Registry Integration
9.1.1.1. Register with the platform's Tool Registry:
```javascript
// In js/tools-registry.js
registerTool({
  id: "jwt-debugger",
  name: "JWT Debugger",
  description: "Decode, verify and inspect JSON Web Tokens",
  icon: "key",
  category: "security-tools",
  version: "1.0.0",
  path: "tools/jwt-debugger.html"
});
```

9.1.1.2. Define tool relationships:
   - Related tools: URL Parameter Encoder, Base64 Decoder
   - Suggested tools: JSON Formatter, Crypto Hash Generator
   - Tool chain support: Connect with other tools

9.1.1.3. Add tool to home page tiles and navigation.

#### 9.1.2 Platform Services Usage
9.1.2.1. Use the platform's Storage Service:
```javascript
// Save JWT history
StorageManager.set('jwtHistory', jwtHistory);

// Retrieve JWT history
const jwtHistory = StorageManager.get('jwtHistory', []);

// Use namespaced storage for tool-specific settings
const toolStorage = StorageManager.namespace('jwt-debugger');
toolStorage.set('settings', userSettings);
```

9.1.2.2. Use the platform's Logging System:
```javascript
// Log token decoding
logger.log("JWT decoded", { 
  algorithm: decodedToken.header.alg,
  hasExp: !!decodedToken.payload.exp
});

// Log errors
logger.error("Verification failed", error);
```

9.1.2.3. Use platform UI components:
   - Card containers
   - Notification system
   - Modal dialogs
   - Form inputs
   - Tooltips

### 9.2 Cross-Tool Communication

#### 9.2.1 URL Parameter Handling
9.2.1.1. Support loading JWT from URL:
```javascript
function initFromUrlParams() {
  const params = new URLSearchParams(window.location.search);
  
  if (params.has('token')) {
    const token = params.get('token');
    jwtInput.value = token;
    decodeJWT(token);
  }
  
  if (params.has('verify') && params.get('verify') === 'true') {
    // Auto-trigger verification if requested
    verifyJWT();
  }
}
```

9.2.1.2. Generate links to other tools:
   - Send encoded payload to JSON Formatter
   - Send header/payload to Base64 Decoder
   - Send token as URL parameter to URL Encoder

9.2.1.3. Example URL generation:
```javascript
function generateToolLink(toolId, data) {
  const baseUrl = window.location.origin;
  const toolPath = getToolPath(toolId);
  
  switch (toolId) {
    case 'json-formatter':
      return `${baseUrl}/${toolPath}?json=${encodeURIComponent(JSON.stringify(data))}`;
      
    case 'base64-decoder':
      return `${baseUrl}/${toolPath}?input=${encodeURIComponent(data)}`;
      
    // Other tools
  }
}
```

#### 9.2.2 Clipboard Integration
9.2.2.1. Implement shared clipboard formats:
   - Plain text for simple tokens
   - JSON for structured data
   - Custom format for cross-tool data

9.2.2.2. Use platform clipboard utilities:
```javascript
// Copy to clipboard
platformUtils.clipboard.copy(token, {
  success: () => showStatusMessage('Token copied to clipboard'),
  error: () => showStatusMessage('Failed to copy token', true)
});

// Parse clipboard content
platformUtils.clipboard.paste({
  success: (content) => processClipboardContent(content),
  error: () => showStatusMessage('Failed to read clipboard', true)
});
```

### 9.3 Theme Integration

#### 9.3.1 Platform Styling
9.3.1.1. Use platform CSS variables:
```css
.jwt-header {
  background-color: var(--primary);
  color: var(--white);
}

.jwt-payload {
  background-color: var(--secondary);
  color: var(--white);
}

.verification-success {
  color: var(--success);
}

.verification-error {
  color: var(--danger);
}
```

9.3.1.2. Implement responsive layouts:
   - Use platform grid system
   - Follow breakpoint standards
   - Support mobile, tablet, and desktop layouts

9.3.1.3. Support light/dark mode:
```css
/* Light mode (default) */
.json-view {
  background-color: var(--light);
  color: var(--dark);
}

/* Dark mode */
[data-theme="dark"] .json-view {
  background-color: var(--dark);
  color: var(--light);
}
```

#### 9.3.2 Accessibility Compliance
9.3.2.1. Follow platform accessibility standards:
   - Proper ARIA attributes
   - Keyboard navigation
   - Focus management
   - Screen reader compatibility

9.3.2.2. Implement specific JWT tool accessibility:
   - Descriptive labels for all inputs
   - Alternative text for verification status icons
   - Keyboard shortcuts for common actions
   - High contrast mode support

9.3.2.3. Example accessibility additions:
```html
<button 
  id="verifyButton" 
  aria-label="Verify JWT signature"
  aria-controls="verificationResults"
  data-tooltip="Validate the JWT signature using the specified key">
  <i class="icon" aria-hidden="true"></i>
  Verify
</button>

<div 
  id="verificationResults" 
  aria-live="polite" 
  role="status">
  <!-- Verification results will be inserted here -->
</div>
```

---

## 10. Performance Requirements

### 10.1 Processing Efficiency

#### 10.1.1 Token Handling Performance
10.1.1.1. Optimize token parsing and decoding:
   - Process tokens under 10ms for typical JWTs
   - Handle tokens up to 1MB in size
   - Implement chunked processing for large tokens

10.1.1.2. Optimize cryptographic operations:
   - Async verification for long operations
   - Progress indicator for complex operations
   - Cancellable verification for large keys

10.1.1.3. Implement performance monitoring:
```javascript
function measurePerformance(operation, callback) {
  const start = performance.now();
  const result = callback();
  const duration = performance.now() - start;
  
  logger.log(`Performance: ${operation}`, { 
    duration: `${duration.toFixed(2)}ms`,
    timestamp: new Date().toISOString()
  });
  
  return result;
}

// Usage
const decodedToken = measurePerformance('JWT Decoding', () => {
  return parseJWT(token);
});
```

#### 10.1.2 UI Responsiveness
10.1.2.1. Ensure UI remains responsive:
   - Debounce input events (validation, auto-save)
   - Use requestAnimationFrame for UI updates
   - Implement Web Workers for heavy operations

10.1.2.2. Example debouncing implementation:
```javascript
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Usage
const debouncedProcessInput = debounce(function() {
  processJWTInput(jwtInput.value);
}, 300);

jwtInput.addEventListener('input', debouncedProcessInput);
```

10.1.2.3. Implement lazy loading for non-critical components:
   - History panel
   - Help documentation
   - Advanced options

### 10.2 Resource Utilization

#### 10.2.1 Memory Management
10.2.1.1. Optimize memory usage:
   - Limit history storage size
   - Clean up unused objects
   - Implement pagination for large data sets

10.2.1.2. Handle large tokens efficiently:
   - Stream processing for very large tokens
   - Virtualized rendering for large JSON
   - Collapse nested objects by default

10.2.1.3. Monitor memory usage:
```javascript
function checkMemoryUsage() {
  if (window.performance && window.performance.memory) {
    const memoryInfo = window.performance.memory;
    const usedHeapSizeMB = Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024));
    const heapLimitMB = Math.round(memoryInfo.jsHeapSizeLimit / (1024 * 1024));
    
    logger.log("Memory usage", { 
      used: `${usedHeapSizeMB}MB`,
      limit: `${heapLimitMB}MB`,
      percentage: `${Math.round(usedHeapSizeMB / heapLimitMB * 100)}%`
    });
    
    // Warn if memory usage is high
    if (usedHeapSizeMB / heapLimitMB > 0.8) {
      logger.warn("High memory usage", { usedHeapSizeMB, heapLimitMB });
    }
  }
}
```

#### 10.2.2 Network Usage
10.2.2.1. Minimize external requests:
   - Bundle all required libraries
   - Use inline SVG for icons
   - Cache external resources

10.2.2.2. Optimize library usage:
- Load JSRSASIGN library on demand
   - Use code splitting for different algorithms
   - Implement progressive enhancement

10.2.2.3. Support offline functionality:
   - Work without internet connection
   - Cache resources using Service Worker
   - Provide offline message for unavailable features

### 10.3 Startup Performance

#### 10.3.1 Initial Load
10.3.1.1. Optimize initial load time:
   - First meaningful paint under 1 second
   - Interactive time under 2 seconds
   - Full load under 3 seconds on broadband

10.3.1.2. Implement progressive loading:
   - Load core functionality first
   - Defer non-critical resources
   - Show loading indicators for delayed content

10.3.1.3. Optimize asset loading:
   - Minify all CSS and JavaScript
   - Optimize images and icons
   - Use HTTP/2 for parallel loading

#### 10.3.2 State Restoration
10.3.2.1. Restore previous state on load:
   - Remember last used token
   - Restore verification settings
   - Preserve UI state (expanded sections, etc.)

10.3.2.2. Implement state serialization:
```javascript
function saveState() {
  const state = {
    token: jwtInput.value,
    algorithm: algorithmSelect.value,
    verificationSettings: {
      checkExpiration: checkExpirationToggle.checked,
      checkNotBefore: checkNotBeforeToggle.checked,
      audience: audienceInput.value,
      issuer: issuerInput.value
    },
    uiState: {
      activeTab: getActiveTab(),
      expandedSections: getExpandedSections()
    },
    timestamp: Date.now()
  };
  
  localStorage.setItem('jwt_debugger_state', JSON.stringify(state));
}
```

10.3.2.3. Add state expiration (clear after 24 hours).

---

## 11. Testing Requirements

### 11.1 Unit Testing

#### 11.1.1 Core Functions
11.1.1.1. Write tests for all core functions:
   - JWT parsing
   - Base64URL encoding/decoding
   - Token verification
   - Claim processing

11.1.1.2. Example test cases:
```javascript
// Test base64URL decoding
test('base64UrlDecode should correctly decode values', () => {
  // Test cases
  const testCases = [
    { input: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', expected: '{"alg":"HS256","typ":"JWT"}' },
    { input: 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', expected: '{"sub":"1234567890"}' },
    { input: 'eyJuYW1lIjoiSm9obiBEb2UifQ', expected: '{"name":"John Doe"}' }
  ];
  
  testCases.forEach(({ input, expected }) => {
    expect(base64UrlDecode(input)).toBe(expected);
  });
});

// Test token parsing
test('parseJWT should correctly parse valid tokens', () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  
  const result = parseJWT(token);
  
  expect(result.valid).toBe(true);
  expect(result.header).toEqual({
    alg: 'HS256',
    typ: 'JWT'
  });
  expect(result.payload).toEqual({
    sub: '1234567890',
    name: 'John Doe',
    iat: 1516239022
  });
  expect(result.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
});
```

11.1.1.3. Test edge cases:
   - Malformed tokens
   - Empty segments
   - Invalid JSON
   - Different algorithms
   - Special characters in tokens

#### 11.1.2 Verification Testing
11.1.2.1. Test verification with different algorithms:
   - HS256, HS384, HS512
   - RS256, RS384, RS512
   - ES256, ES384, ES512

11.1.2.2. Test claim verification:
   - Expired tokens
   - Future tokens (nbf)
   - Audience mismatch
   - Issuer mismatch

11.1.2.3. Test key format handling:
   - PEM formatted keys
   - Raw keys
   - JWK format
   - Different key sizes

### 11.2 Integration Testing

#### 11.2.1 UI Integration
11.2.1.1. Test UI components integration:
   - Input and output synchronization
   - Form submission and event handling
   - Component state management
   - Error handling and display

11.2.1.2. Test UI flows:
   - Token input → decoding → verification
   - History saving and loading
   - Settings changes → verification results
   - Error states and recovery

11.2.1.3. Example UI test:
```javascript
test('Entering a token updates the decoded display', async () => {
  // Set up test DOM
  document.body.innerHTML = `
    <textarea id="jwtInput"></textarea>
    <div id="headerOutput"></div>
    <div id="payloadOutput"></div>
  `;
  
  // Initialize handlers
  initJwtHandler();
  
  // Simulate input
  const input = document.getElementById('jwtInput');
  input.value = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.qHdYIFbZKKJKlLHAYFLqnU_2RNntXJC9K5QmGvz0fDM';
  input.dispatchEvent(new Event('input'));
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Check outputs
  const headerOutput = document.getElementById('headerOutput');
  const payloadOutput = document.getElementById('payloadOutput');
  
  expect(headerOutput.textContent).toContain('"alg": "HS256"');
  expect(payloadOutput.textContent).toContain('"sub": "1234"');
});
```

#### 11.2.2 Platform Integration
11.2.2.1. Test integration with platform services:
   - Storage service
   - Logging system
   - UI component library
   - Navigation and routing

11.2.2.2. Test cross-tool communication:
   - URL parameter handling
   - Data passing between tools
   - Shared storage access

11.2.2.3. Test theme and style integration:
   - Light/dark mode
   - Responsive layouts
   - CSS variable usage

### 11.3 Cross-Browser Testing

#### 11.3.1 Browser Compatibility
11.3.1.1. Test on target browsers:
   - Chrome (latest 2 versions)
   - Firefox (latest 2 versions)
   - Safari (latest 2 versions)
   - Edge (latest 2 versions)

11.3.1.2. Test responsive behavior:
   - Mobile viewport (320px - 480px)
   - Tablet viewport (481px - 1024px)
   - Desktop viewport (1025px+)

11.3.1.3. Test in various contexts:
   - Normal browsing mode
   - Incognito/private mode
   - With localStorage disabled
   - With JavaScript restrictions

#### 11.3.2 Performance Testing
11.3.2.1. Measure and optimize load times:
   - First contentful paint
   - Time to interactive
   - Total page load

11.3.2.2. Test with different token sizes:
   - Small tokens (< 1KB)
   - Medium tokens (1-10KB)
   - Large tokens (> 10KB)

11.3.2.3. Test with different network conditions:
   - Fast connection (Fiber/Cable)
   - Medium connection (DSL)
   - Slow connection (3G)
   - Offline mode

#### 11.3.3 Accessibility Testing
11.3.3.1. Verify WCAG 2.1 AA compliance:
   - Run automated accessibility tools
   - Test keyboard navigation
   - Test with screen readers
   - Check color contrast

11.3.3.2. Test assistive technology compatibility:
   - NVDA
   - JAWS
   - VoiceOver
   - TalkBack

11.3.3.3. Test user preferences:
   - High contrast mode
   - Font size adjustments
   - Reduced motion settings
   - Color vision deficiency simulations

---

## Appendix: Implementation Guidelines

### A.1 Code Quality Standards

#### A.1.1 JavaScript Guidelines
- Use ES6+ features with appropriate polyfills
- Follow functional programming principles where appropriate
- Implement proper error handling for all operations
- Document all functions, parameters, and return values
- Write defensive code that handles edge cases

#### A.1.2 HTML Guidelines
- Use semantic HTML5 elements
- Implement proper ARIA attributes for accessibility
- Keep markup clean and minimal
- Use valid HTML5 structure
- Implement microdata for SEO when relevant

#### A.1.3 CSS Guidelines
- Follow BEM or similar naming convention
- Use CSS variables for theming
- Implement mobile-first responsive design
- Minimize CSS specificity issues
- Optimize for performance and reuse

### A.2 Security Considerations

#### A.2.1 Client-Side Limitations
- Never store sensitive keys in localStorage
- Warn users about client-side verification limitations
- Implement secure defaults for all operations
- Add warnings for insecure practices

#### A.2.2 Key Handling
- Implement secure handling of verification keys
- Add option to hide sensitive key input
- Clear keys from memory when no longer needed
- Warn about weak keys or insecure algorithms

#### A.2.3 Data Privacy
- Process all data client-side only
- Don't send tokens or keys to any server
- Implement proper XSS protections
- Use secure defaults for all operations

### A.3 Documentation Standards

#### A.3.1 Code Documentation
- Document all functions with JSDoc format
- Include examples for complex functions
- Document parameters and return values
- Add warnings for security-sensitive operations

#### A.3.2 User Documentation
- Create clear, concise user instructions
- Document all features and options
- Include use cases and examples
- Add troubleshooting guide for common issues

#### A.3.3 API Documentation
- Document exposed functions for platform integration
- Define clear interfaces for cross-tool communication
- Specify data formats for import/export
- Include version information and change logs

### A.4 Version Control Guidelines

#### A.4.1 Git Workflow
- Use feature branches for development
- Implement semantic versioning
- Write clear commit messages
- Use pull requests for code review

#### A.4.2 Release Process
- Create tagged releases for each version
- Generate change logs automatically
- Include test results with releases
- Document breaking changes

#### A.4.3 Deployment Process
- Implement continuous integration
- Automate testing before deployment
- Use staging environment for verification
- Implement rollback procedures