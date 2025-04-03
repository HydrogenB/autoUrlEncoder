/**
 * jwt-decoder.js - Implementation of JWT Decoder & Validator tool
 * Provides JWT token decoding, validation, and history management
 */

// Global variables
let tokenHistory = [];
let currentToken = '';
let decodedHeader = null;
let decodedPayload = null;
let tokenSignature = '';
let currentJwks = null;

// OIDC Claim descriptions
const OIDC_CLAIMS = {
    iss: "Issuer - identifies the principal that issued the JWT",
    sub: "Subject - identifies the principal that is the subject of the JWT",
    aud: "Audience - identifies the recipients that the JWT is intended for",
    exp: "Expiration Time - identifies the expiration time on or after which the JWT must not be accepted for processing",
    nbf: "Not Before - identifies the time before which the JWT must not be accepted for processing",
    iat: "Issued At - identifies the time at which the JWT was issued",
    jti: "JWT ID - provides a unique identifier for the JWT",
    auth_time: "Authentication Time - when the end-user authentication occurred",
    nonce: "Value used to associate a client session with an ID Token (mitigates replay attacks)",
    acr: "Authentication Context Class Reference - specifies the level of authentication assurance",
    amr: "Authentication Methods References - methods used in the authentication",
    azp: "Authorized Party - the party to which the ID Token was issued"
};

// Initialize tool when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Define DOM elements
    const jwtInput = document.getElementById('jwtInput');
    const decodeBtn = document.getElementById('decodeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const saveBtn = document.getElementById('saveBtn');
    const resultContainer = document.getElementById('resultContainer');
    const headerJson = document.getElementById('headerJson');
    const payloadJson = document.getElementById('payloadJson');
    const signatureData = document.getElementById('signatureData');
    const claimTable = document.getElementById('claimTable');
    const tokenTiming = document.getElementById('tokenTiming');
    const tokenTimingInfo = document.getElementById('tokenTimingInfo');
    const timingBar = document.getElementById('timingBar');
    const issuedLabel = document.getElementById('issuedLabel');
    const expiresLabel = document.getElementById('expiresLabel');
    const secretKeyInput = document.getElementById('secretKeyInput');
    const publicKeyInput = document.getElementById('publicKeyInput');
    const jwksInput = document.getElementById('jwksInput');
    const discoveryInput = document.getElementById('discoveryInput');
    const discoveredJwksUrl = document.getElementById('discoveredJwksUrl');
    const verifySecretBtn = document.getElementById('verifySecretBtn');
    const verifyPublicBtn = document.getElementById('verifyPublicBtn');
    const verifyJwksBtn = document.getElementById('verifyJwksBtn');
    const fetchDiscoveryBtn = document.getElementById('fetchDiscoveryBtn');
    const verifyDiscoveryBtn = document.getElementById('verifyDiscoveryBtn');
    const verificationResult = document.getElementById('verificationResult');
    const verifyIcon = document.getElementById('verifyIcon');
    const verifyMessage = document.getElementById('verifyMessage');
    const tokensList = document.getElementById('tokensList');
    const tokensCount = document.getElementById('tokensCount');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const copyBtns = document.querySelectorAll('.copy-btn');
    
    // Load history from storage
    tokenHistory = window.toolStorage.get('jwt-decoder', 'tokenHistory', []);
    
    // Handle JWT decoding
    decodeBtn.addEventListener('click', decodeToken);
    
    // Option to decode on input paste
    jwtInput.addEventListener('paste', () => {
        setTimeout(decodeToken, 100);
    });
    
    // Clear input
    clearBtn.addEventListener('click', () => {
        jwtInput.value = '';
        resultContainer.style.display = 'none';
    });
    
    // Save token to history
    saveBtn.addEventListener('click', () => {
        saveToHistory(true);
    });
    
    // Verification buttons
    verifySecretBtn.addEventListener('click', () => {
        verifyWithSecret(secretKeyInput.value);
    });
    
    verifyPublicBtn.addEventListener('click', () => {
        verifyWithPublicKey(publicKeyInput.value);
    });
    
    verifyJwksBtn.addEventListener('click', () => {
        try {
            const jwks = JSON.parse(jwksInput.value);
            verifyWithJwks(jwks);
        } catch (e) {
            showVerificationError("Invalid JWKS format: " + e.message);
        }
    });
    
    fetchDiscoveryBtn.addEventListener('click', fetchOidcDiscovery);
    
    verifyDiscoveryBtn.addEventListener('click', () => {
        verifyWithDiscovery(discoveredJwksUrl.value);
    });
    
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabContent = document.getElementById(tab.dataset.tab);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
    
    // Copy buttons
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                const textToCopy = targetElement.textContent;
                copyToClipboard(textToCopy);
            }
        });
    });
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        renderTokensList(searchTerm);
        
        if (searchTerm) {
            clearSearch.classList.add('visible');
        } else {
            clearSearch.classList.remove('visible');
        }
    });
    
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.classList.remove('visible');
        renderTokensList();
    });
    
    // Function to decode JWT token
    function decodeToken() {
        const token = jwtInput.value.trim();
        if (!token) {
            window.myDebugger.showStatusMessage('Please enter a JWT token', true);
            return;
        }
        
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                window.myDebugger.showStatusMessage('Invalid JWT format', true);
                return;
            }
            
            // Decode header and payload
            decodedHeader = JSON.parse(base64UrlDecode(parts[0]));
            decodedPayload = JSON.parse(base64UrlDecode(parts[1]));
            tokenSignature = parts[2];
            currentToken = token;
            
            // Display results
            displayDecodedToken();
            resultContainer.style.display = 'block';
            
            // Record this token in analytics
            if (window.toolAnalytics) {
                window.toolAnalytics.recordToolUsage('jwt-decoder', 'decode');
            }
        } catch (e) {
            window.myDebugger.logger.error("Error decoding token:", e);
            window.myDebugger.showStatusMessage('Error decoding token: ' + e.message, true);
        }
    }
    
    // Display the decoded token
    function displayDecodedToken() {
        // Format and display header
        headerJson.innerHTML = formatJson(decodedHeader);
        
        // Format and display payload
        payloadJson.innerHTML = formatJson(decodedPayload);
        
        // Display signature
        signatureData.textContent = tokenSignature;
        
        // Display OIDC claims
        displayOidcClaims();
        
        // Display token timing information
        displayTokenTiming();
    }
    
    // Display OIDC claims in table
    function displayOidcClaims() {
        const tbody = claimTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        // Standard OIDC claims to check for
        const claimsToCheck = [
            'iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti',
            'auth_time', 'nonce', 'acr', 'amr', 'azp'
        ];
        
        // Add rows for existing claims
        for (const claim of claimsToCheck) {
            if (claim in decodedPayload) {
                const row = document.createElement('tr');
                
                let valueDisplay = decodedPayload[claim];
                // Format timestamps
                if (['exp', 'nbf', 'iat', 'auth_time'].includes(claim) && typeof valueDisplay === 'number') {
                    const date = new Date(valueDisplay * 1000);
                    valueDisplay = formatDate(date);
                    
                    // Add expired label for exp claim
                    if (claim === 'exp') {
                        const now = new Date();
                        if (date < now) {
                            valueDisplay += ' <span class="expired-label">EXPIRED</span>';
                        } else {
                            valueDisplay += ' <span class="valid-label">VALID</span>';
                        }
                    }
                }
                
                // Format arrays
                if (Array.isArray(valueDisplay)) {
                    valueDisplay = valueDisplay.join(', ');
                }
                
                row.innerHTML = `
                    <td>${claim}</td>
                    <td>${valueDisplay}</td>
                    <td>${OIDC_CLAIMS[claim] || ''}</td>
                `;
                
                tbody.appendChild(row);
            }
        }
        
        // Add algorithm info from header
        if (decodedHeader && decodedHeader.alg) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>alg</td>
                <td>${decodedHeader.alg}</td>
                <td>Signature algorithm</td>
            `;
            tbody.appendChild(row);
        }
        
        // If no standard claims found
        if (tbody.children.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" style="text-align: center;">No standard OIDC claims found</td>';
            tbody.appendChild(row);
        }
    }
    
    // Display token timing information
    function displayTokenTiming() {
        const now = Math.floor(Date.now() / 1000);
        let iat = decodedPayload.iat;
        let exp = decodedPayload.exp;
        let nbf = decodedPayload.nbf;
        
        if (!iat && !exp) {
            tokenTiming.style.display = 'none';
            return;
        }
        
        tokenTiming.style.display = 'block';
        
        // Default to now if iat not present
        if (!iat) {
            iat = now;
        }
        
        // Info text
        let infoText = '';
        if (exp) {
            const expiresIn = exp - now;
            if (expiresIn < 0) {
                infoText = `Token expired ${formatTimeAgo(-expiresIn)} ago`;
            } else {
                infoText = `Token expires in ${formatTimeAgo(expiresIn)}`;
            }
        }
        
        if (nbf && nbf > now) {
            infoText += ` (Not valid for ${formatTimeAgo(nbf - now)})`;
        }
        
        tokenTimingInfo.textContent = infoText;
        
        // Progress bar
        if (iat && exp) {
            const totalLifetime = exp - iat;
            const elapsed = now - iat;
            let percentage = (elapsed / totalLifetime) * 100;
            
            // Clamp percentage between 0 and 100
            percentage = Math.min(100, Math.max(0, percentage));
            
            timingBar.style.width = `${percentage}%`;
            
            // Show timestamps
            issuedLabel.textContent = formatDate(new Date(iat * 1000));
            expiresLabel.textContent = formatDate(new Date(exp * 1000));
        }
    }
    
    // Verify token with HMAC secret
    function verifyWithSecret(secret) {
        if (!currentToken || !secret) {
            showVerificationError("Please enter both a token and a secret key");
            return;
        }
        
        try {
            const alg = decodedHeader.alg;
            
            // Check if algorithm is HMAC
            if (!alg.startsWith('HS')) {
                showVerificationError(`Cannot verify algorithm ${alg} with a secret key. Use public key instead.`);
                return;
            }
            
            // Use jsrsasign to verify
            const isValid = KJUR.jws.JWS.verify(currentToken, secret, [alg]);
            
            if (isValid) {
                showVerificationSuccess("Signature verified successfully!");
            } else {
                showVerificationError("Invalid signature");
            }
        } catch (e) {
            window.myDebugger.logger.error("Error verifying with secret:", e);
            showVerificationError("Verification error: " + e.message);
        }
    }
    
    // Verify token with public key
    function verifyWithPublicKey(publicKey) {
        if (!currentToken || !publicKey) {
            showVerificationError("Please enter both a token and a public key");
            return;
        }
        
        try {
            const alg = decodedHeader.alg;
            
            // Check if algorithm is RSA or ECDSA
            if (!alg.startsWith('RS') && !alg.startsWith('ES') && !alg.startsWith('PS')) {
                showVerificationError(`Cannot verify algorithm ${alg} with a public key. Use secret key instead.`);
                return;
            }
            
            // Use jsrsasign to verify
            const isValid = KJUR.jws.JWS.verify(currentToken, publicKey, [alg]);
            
            if (isValid) {
                showVerificationSuccess("Signature verified successfully!");
            } else {
                showVerificationError("Invalid signature");
            }
        } catch (e) {
            window.myDebugger.logger.error("Error verifying with public key:", e);
            showVerificationError("Verification error: " + e.message);
        }
    }
    
    // Verify with JWKS
    function verifyWithJwks(jwks) {
        if (!currentToken || !jwks || !jwks.keys || jwks.keys.length === 0) {
            showVerificationError("Please enter both a token and valid JWKS");
            return;
        }
        
        try {
            const kid = decodedHeader.kid;
            let key = null;
            
            // Find matching key in JWKS
            if (kid) {
                key = jwks.keys.find(k => k.kid === kid);
            }
            
            // If no kid or no matching key, try all keys
            if (!key) {
                for (const k of jwks.keys) {
                    try {
                        const pem = jwkToPem(k);
                        const isValid = KJUR.jws.JWS.verify(currentToken, pem, [decodedHeader.alg]);
                        if (isValid) {
                            showVerificationSuccess("Signature verified successfully!");
                            return;
                        }
                    } catch (e) {
                        // Skip this key and try the next one
                        continue;
                    }
                }
                showVerificationError("No matching key found in JWKS");
                return;
            }
            
            // Convert JWK to PEM
            const pem = jwkToPem(key);
            
            // Verify with PEM
            const isValid = KJUR.jws.JWS.verify(currentToken, pem, [decodedHeader.alg]);
            
            if (isValid) {
                showVerificationSuccess("Signature verified successfully!");
            } else {
                showVerificationError("Invalid signature");
            }
        } catch (e) {
            window.myDebugger.logger.error("Error verifying with JWKS:", e);
            showVerificationError("Verification error: " + e.message);
        }
    }
    
    // Fetch OIDC discovery document
    function fetchOidcDiscovery() {
        const url = discoveryInput.value.trim();
        if (!url) {
            window.myDebugger.showStatusMessage('Please enter a discovery URL', true);
            return;
        }
        
        // Show loading state
        discoveredJwksUrl.value = 'Loading...';
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.jwks_uri) {
                    throw new Error('No jwks_uri found in discovery document');
                }
                
                // Store the JWKS URL
                discoveredJwksUrl.value = data.jwks_uri;
                window.myDebugger.showStatusMessage('Discovery document fetched successfully');
            })
            .catch(error => {
                window.myDebugger.logger.error('Error fetching discovery document:', error);
                discoveredJwksUrl.value = '';
                window.myDebugger.showStatusMessage('Error fetching discovery document: ' + error.message, true);
            });
    }
    
    // Verify with discovery JWKS URL
    function verifyWithDiscovery(jwksUrl) {
        if (!currentToken || !jwksUrl) {
            showVerificationError("Please enter a token and fetch a discovery document");
            return;
        }
        
        // Show loading state
        showVerificationLoading("Fetching JWKS...");
        
        fetch(jwksUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response.json();
            })
            .then(jwks => {
                // Verify with the fetched JWKS
                verifyWithJwks(jwks);
            })
            .catch(error => {
                window.myDebugger.logger.error('Error fetching JWKS:', error);
                showVerificationError('Error fetching JWKS: ' + error.message);
            });
    }
    
    // Convert JWK to PEM format
    function jwkToPem(jwk) {
        try {
            // Use jsrsasign to convert JWK to PEM
            const keyObj = KEYUTIL.getKey(jwk);
            return KEYUTIL.getPEM(keyObj);
        } catch (e) {
            throw new Error('Error converting JWK to PEM: ' + e.message);
        }
    }
    
    // Show verification success message
    function showVerificationSuccess(message) {
        verificationResult.style.display = 'flex';
        verificationResult.className = 'verification-result success';
        verifyIcon.className = 'fas fa-check-circle';
        verifyMessage.innerHTML = message;
    }
    
    // Show verification error message
    function showVerificationError(message) {
        verificationResult.style.display = 'flex';
        verificationResult.className = 'verification-result error';
        verifyIcon.className = 'fas fa-times-circle';
        verifyMessage.innerHTML = message;
    }
    
    // Show verification loading message
    function showVerificationLoading(message) {
        verificationResult.style.display = 'flex';
        verificationResult.className = 'verification-result';
        verifyIcon.className = 'fas fa-spinner fa-spin';
        verifyMessage.innerHTML = message;
    }
    
    // Save token to history
    function saveToHistory(showNotification = true) {
        const token = jwtInput.value.trim();
        
        if (!token || !decodedPayload) {
            return;
        }
        
        try {
            const now = new Date();
            const timestamp = now.toISOString();
            const displayDate = now.toLocaleString(undefined, { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            // Generate a unique ID for this token
            const tokenId = btoa(token.substring(0, 100)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
            
            // Extract useful info from token
            const issuer = decodedPayload.iss || 'Unknown Issuer';
            const subject = decodedPayload.sub || '';
            const algorithm = decodedHeader.alg || 'Unknown';
            
            // Check if token already exists
            const existingIndex = tokenHistory.findIndex(item => item.id === tokenId);
            
            if (existingIndex !== -1) {
                // Update existing entry
                tokenHistory[existingIndex] = {
                    ...tokenHistory[existingIndex],
                    timestamp,
                    displayDate,
                    lastUsed: now.getTime()
                };
            } else {
                // Add new entry
                const entry = {
                    id: tokenId,
                    token,
                    issuer,
                    subject,
                    algorithm,
                    timestamp,
                    displayDate,
                    starred: false,
                    lastUsed: now.getTime(),
                    nickname: ''
                };
                
                tokenHistory.unshift(entry);
                
                // Limit history size to 50 items
                if (tokenHistory.length > 50) {
                    // Remove oldest non-starred items first
                    const nonStarredIndex = tokenHistory.findIndex(item => !item.starred);
                    if (nonStarredIndex !== -1) {
                        tokenHistory.splice(nonStarredIndex, 1);
                    } else {
                        tokenHistory.pop(); // If all are starred, remove the oldest
                    }
                }
            }
            
            // Save to storage
            window.toolStorage.set('jwt-decoder', 'tokenHistory', tokenHistory);
            
            // Update UI
            renderTokensList();
            updateTokensCount();
            
            if (showNotification) {
                window.myDebugger.showStatusMessage('Token saved to history');
            }
            
            // Log history save
            window.myDebugger.logger.log("Token saved to history", { 
                id: tokenId,
                issuer
            });
            
            return true;
        } catch (e) {
            window.myDebugger.logger.error("Error saving to history:", e);
            if (showNotification) {
                window.myDebugger.showStatusMessage('Error saving token', true);
            }
            return false;
        }
    }
    
    // Toggle star status for a token
    function toggleStar(id) {
        try {
            const itemIndex = tokenHistory.findIndex(entry => entry.id === id);
            
            if (itemIndex !== -1) {
                tokenHistory[itemIndex].starred = !tokenHistory[itemIndex].starred;
                window.toolStorage.set('jwt-decoder', 'tokenHistory', tokenHistory);
                
                renderTokensList();
                updateTokensCount();
                
                window.myDebugger.showStatusMessage(
                    tokenHistory[itemIndex].starred 
                        ? 'Added to starred tokens' 
                        : 'Removed from starred tokens'
                );
                
                // Log star toggle
                window.myDebugger.logger.log("Star toggled", { 
                    id: id,
                    starred: tokenHistory[itemIndex].starred
                });
            }
        } catch (e) {
            window.myDebugger.logger.error("Error toggling star:", e);
            window.myDebugger.showStatusMessage('Error updating star status', true);
        }
    }
    
    // Load token into decoder
    function loadToken(id) {
        try {
            const item = tokenHistory.find(entry => entry.id === id);
            
            if (item) {
                jwtInput.value = item.token;
                
                // Update item's "last used" timestamp
                item.lastUsed = Date.now();
                window.toolStorage.set('jwt-decoder', 'tokenHistory', tokenHistory);
                
                // Decode token
                decodeToken();
                
                // Scroll to top on mobile
                if (window.innerWidth < 1024) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                
                window.myDebugger.showStatusMessage('Token loaded to decoder');
                
                // Log token load
                window.myDebugger.logger.log("Token loaded to decoder", { 
                    id: id
                });
            }
        } catch (e) {
            window.myDebugger.logger.error("Error loading token:", e);
            window.myDebugger.showStatusMessage('Error loading token', true);
        }
    }
    
    // Delete history item
    function deleteHistoryItem(id) {
        try {
            tokenHistory = tokenHistory.filter(entry => entry.id !== id);
            window.toolStorage.set('jwt-decoder', 'tokenHistory', tokenHistory);
            
            renderTokensList();
            updateTokensCount();
            
            window.myDebugger.showStatusMessage('Item deleted');
            
            // Log delete
            window.myDebugger.logger.log("History item deleted", { 
                id: id
            });
        } catch (e) {
            window.myDebugger.logger.error("Error deleting history item:", e);
            window.myDebugger.showStatusMessage('Error deleting item', true);
        }
    }
    
    // Update tokens count
    function updateTokensCount() {
        if (tokensCount) {
            tokensCount.textContent = tokenHistory.length;
        }
    }
    
    // Render tokens list with starred items at the top
    function renderTokensList(searchTerm = '') {
        try {
            if (tokenHistory.length === 0) {
                tokensList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-history"></i>
                        <p>No token history yet</p>
                    </div>
                `;
                return;
            }
            
            const normalizedSearch = searchTerm.toLowerCase();
            
            // Filter by search term if provided
            const filteredHistory = normalizedSearch ? 
                tokenHistory.filter(entry => 
                    (entry.token.toLowerCase().includes(normalizedSearch) || 
                    entry.issuer.toLowerCase().includes(normalizedSearch) ||
                    (entry.subject && entry.subject.toLowerCase().includes(normalizedSearch)) ||
                    (entry.nickname && entry.nickname.toLowerCase().includes(normalizedSearch)))) : 
                tokenHistory;
            
            if (filteredHistory.length === 0) {
                tokensList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>No matching tokens found</p>
                    </div>
                `;
                return;
            }
            
            // Separate starred and non-starred items
            const starredItems = filteredHistory.filter(item => item.starred);
            const regularItems = filteredHistory.filter(item => !item.starred);
            
            // Sort each group by last used time, most recent first
            starredItems.sort((a, b) => b.lastUsed - a.lastUsed);
            regularItems.sort((a, b) => b.lastUsed - a.lastUsed);
            
            // Combine with starred items first
            const sortedHistory = [...starredItems, ...regularItems];
            
            tokensList.innerHTML = sortedHistory.map(entry => {
                return `
                    <div class="token-item ${entry.starred ? 'starred' : ''}" onclick="loadToken('${entry.id}')">
                        <button class="star-btn ${entry.starred ? 'active' : ''}" onclick="toggleStar('${entry.id}'); event.stopPropagation();">
                            <i class="fas fa-star"></i>
                        </button>
                        
                        <div class="token-text">${window.myDebugger.escapeHtml(entry.token)}</div>
                        
                        <div class="token-subject">
                            <span class="token-issuer">${window.myDebugger.escapeHtml(entry.issuer)}</span>
                            ${entry.subject ? ` • ${window.myDebugger.escapeHtml(entry.subject)}` : ''}
                        </div>
                        
                        <div class="token-meta">
                            <span>
                                ${window.myDebugger.escapeHtml(entry.displayDate)} 
                                <span class="algorithm-badge">${entry.algorithm}</span>
                            </span>
                            <div class="list-actions">
                                <button class="action-icon tooltip" data-tooltip="Copy" onclick="copyToken('${entry.id}'); event.stopPropagation();">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button class="action-icon tooltip" data-tooltip="Delete" onclick="deleteHistoryItem('${entry.id}'); event.stopPropagation();">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            window.myDebugger.logger.error("Error rendering tokens list:", e);
            tokensList.innerHTML = `<div class="empty-state">Error loading tokens</div>`;
        }
    }
    
    // Copy token to clipboard
    function copyToken(id) {
        try {
            const item = tokenHistory.find(entry => entry.id === id);
            if (item) {
                copyToClipboard(item.token);
                window.myDebugger.showStatusMessage('Token copied to clipboard');
            }
        } catch (e) {
            window.myDebugger.logger.error("Error copying token:", e);
            window.myDebugger.showStatusMessage('Error copying token', true);
        }
    }
    
    // Copy text to clipboard
    function copyToClipboard(text) {
        try {
            navigator.clipboard.writeText(text)
                .then(() => {
                    window.myDebugger.showStatusMessage('Copied to clipboard');
                })
                .catch(err => {
                    window.myDebugger.logger.error('Failed to copy text:', err);
                    window.myDebugger.showStatusMessage('Failed to copy', true);
                });
        } catch (e) {
            window.myDebugger.logger.error("Error copying to clipboard:", e);
            window.myDebugger.showStatusMessage('Error copying to clipboard', true);
        }
    }
    
    // Format JSON with syntax highlighting
    function formatJson(obj) {
        try {
            const jsonString = JSON.stringify(obj, null, 2);
            return jsonString.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                        // Remove quotes and colon from key
                        match = match.replace(/"/g, '').replace(/:$/, ':');
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        } catch (e) {
            window.myDebugger.logger.error("Error formatting JSON:", e);
            return String(obj);
        }
    }
    
    // Base64Url decode
    function base64UrlDecode(str) {
        // Convert Base64Url to Base64
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        
        // Add padding if needed
        while (str.length % 4) {
            str += '=';
        }
        
        // Decode
        return atob(str);
    }
    
    // Format date
    function formatDate(date) {
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    // Format time ago
    function formatTimeAgo(seconds) {
        if (seconds < 60) {
            return `${Math.floor(seconds)} second${seconds !== 1 ? 's' : ''}`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else if (seconds < 86400) {
            const hours = Math.floor(seconds / 3600);
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
            const days = Math.floor(seconds / 86400);
            return `${days} day${days !== 1 ? 's' : ''}`;
        }
    }
    
    // Initial renders
    renderTokensList();
    updateTokensCount();
    
    // Record analytics for tool usage
    if (window.toolAnalytics) {
        window.toolAnalytics.recordToolUsage('jwt-decoder', 'view');
    }
    
    // Expose functions to global scope for event handlers
    window.toggleStar = toggleStar;
    window.loadToken = loadToken;
    window.deleteHistoryItem = deleteHistoryItem;
    window.copyToken = copyToken;
    
    // Log tool initialization
    window.myDebugger.logger.log("JWT Decoder tool initialized");
});