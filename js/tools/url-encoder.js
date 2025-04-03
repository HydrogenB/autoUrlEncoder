/**
 * url-encoder.js - URL Parameter Encoder tool
 */

// Global variables
let urlHistory = [];
let lastProcessedUrl = '';
let lastProcessedResult = null;
let autoSaveTimer = null;
let lastInputTime = 0;
let currentMode = 'get';
let isEditingParams = false;
let currentQrCodeData = '';
let lastParamState = '';

// Initialize tool when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Define DOM elements
    const inputUrl = document.getElementById('inputUrl');
    const postParams = document.getElementById('postParams');
    const validationMessage = document.getElementById('validationMessage');
    const resultContainer = document.getElementById('resultContainer');
    const processedUrl = document.getElementById('processedUrl');
    const paramTable = document.getElementById('paramTable');
    const paramEditBtn = document.getElementById('paramEditBtn');
    const paramEditActions = document.getElementById('paramEditActions');
    const paramSaveBtn = document.getElementById('paramSaveBtn');
    const paramCancelBtn = document.getElementById('paramCancelBtn');
    const copyBtn = document.getElementById('copyBtn');
    const runBtn = document.getElementById('runBtn');
    const clearBtn = document.getElementById('clearBtn');
    const saveQrBtn = document.getElementById('saveQrBtn');
    const qrContainer = document.getElementById('qrContainer');
    const qrCode = document.getElementById('qrCode');
    const qrOverlay = document.getElementById('qrOverlay');
    const qrOverlayClose = document.getElementById('qrOverlayClose');
    const qrOverlayImage = document.getElementById('qrOverlayImage');
    const qrOverlayUrl = document.getElementById('qrOverlayUrl');
    const qrOverlaySave = document.getElementById('qrOverlaySave');
    const linksList = document.getElementById('linksList');
    const searchInput = document.getElementById('searchInput');
    const linksCount = document.getElementById('linksCount');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const postParamsContent = document.getElementById('postParamsContent');
    
    // Load history from storage
    urlHistory = window.toolStorage.get('url-encoder', 'urlHistory', []);
    
    // Update links count
    updateCounts();
    
    // Initialize URL processing on input
    if (inputUrl) {
        inputUrl.addEventListener('input', processUrl);
    }
    
    if (postParams) {
        postParams.addEventListener('input', processUrl);
    }
    
    // Action buttons
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            copyUrl(processedUrl.textContent);
        });
    }
    
    if (runBtn) {
        runBtn.addEventListener('click', () => {
            runUrl(processedUrl.textContent);
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            inputUrl.value = '';
            postParams.value = '';
            processUrl();
        });
    }
    
    if (saveQrBtn) {
        saveQrBtn.addEventListener('click', () => {
            saveQrCode(qrCode, 'qrcode.png');
        });
    }
    
    // QR code overlay
    if (qrContainer) {
        qrContainer.addEventListener('click', () => {
            showQrOverlay(lastProcessedUrl);
        });
    }
    
    if (qrOverlayClose) {
        qrOverlayClose.addEventListener('click', () => {
            qrOverlay.style.display = 'none';
        });
    }
    
    if (qrOverlay) {
        qrOverlay.addEventListener('click', (e) => {
            if (e.target === qrOverlay) {
                qrOverlay.style.display = 'none';
            }
        });
    }
    
    // Close overlay with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && qrOverlay.style.display === 'block') {
            qrOverlay.style.display = 'none';
        }
    });
    
    if (qrOverlaySave) {
        qrOverlaySave.addEventListener('click', () => {
            saveQrCode(qrOverlayImage, 'qrcode.png');
        });
    }
    
    // Parameter editing
    if (paramEditBtn) {
        paramEditBtn.addEventListener('click', enableParamEditing);
    }
    
    if (paramSaveBtn) {
        paramSaveBtn.addEventListener('click', saveEditedParams);
    }
    
    if (paramCancelBtn) {
        paramCancelBtn.addEventListener('click', disableParamEditing);
    }
    
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            renderLinksList(searchTerm);
        });
    }
    
    // Request mode buttons
    if (modeBtns.length > 0) {
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                setRequestMode(btn.dataset.mode);
            });
        });
    }
    
    // Initial renders
    renderLinksList();
    
    // Process URL and update UI
    function processUrl() {
        const url = inputUrl.value.trim();
        
        if (!url) {
            validationMessage.textContent = '';
            resultContainer.style.display = 'none';
            return;
        }
        
        const result = encodeUrlParamsInUrl(url, null); // Auto-detect all URLs
        lastProcessedUrl = result.result;
        lastProcessedResult = result;
        
        // Update UI
        validationMessage.textContent = result.message;
        processedUrl.textContent = result.result;
        resultContainer.style.display = 'block';
        
        // Update parameter breakdown table
        updateParamTable(result.params);
        
        // Generate parameter state signature
        const currentParamState = generateParamState(result.params);
        lastParamState = currentParamState;
        
        // Update QR code
        updateQRCode(result.result);
        
        // Auto-save to history
        saveToHistory(false);
    }
    
    // Main URL encoding function
    function encodeUrlParamsInUrl(url, paramNames) {
        try {
            if (!url || typeof url !== "string") return { result: url, valid: false, message: "Invalid URL format" };
            
            if (!url.includes("://")) {
                return { result: url, valid: false, message: "Missing protocol (http:// or https://)" };
            }
            
            let paramsToEncode = null;
            if (paramNames) {
                paramsToEncode = paramNames.split(",").map(p => p.trim()).filter(p => p.length > 0);
            }
            
            const queryIndex = url.indexOf("?");
            if (queryIndex === -1) {
                return { 
                    result: url, 
                    valid: true, 
                    message: "No parameters to encode",
                    params: [] 
                };
            }
            
            const baseUrl = url.substring(0, queryIndex);
            const queryString = url.substring(queryIndex + 1);
            
            const params = queryString.split("&");
            let encodedCount = 0;
            let paramDetails = [];
            
            for (let i = 0; i < params.length; i++) {
                const eqIndex = params[i].indexOf("=");
                if (eqIndex !== -1) {
                    const name = params[i].substring(0, eqIndex);
                    const value = params[i].substring(eqIndex + 1);
                    let encodedValue = value;
                    let wasEncoded = false;
                    let paramNote = "";
                    
                    if (
                        (paramsToEncode === null && value.match(/^https?:\/\//)) || 
                        (paramsToEncode !== null && paramsToEncode.includes(name)) 
                    ) {
                        const originalValue = value;
                        encodedValue = encodeURIComponent(value);
                        
                        if (originalValue !== encodedValue) {
                            encodedCount++;
                            wasEncoded = true;
                        }
                        
                        params[i] = name + "=" + encodedValue;
                    }
                    
                    if (name.toLowerCase().startsWith('utm_')) {
                        paramNote = "UTM tracking parameter for analytics";
                    } else if (name.toLowerCase() === 'url' || name.toLowerCase() === 'link' || name.toLowerCase() === 'href') {
                        paramNote = "URL parameter - encoding recommended";
                    } else if (name.toLowerCase() === 'redirect' || name.toLowerCase() === 'return' || name.toLowerCase() === 'returnurl') {
                        paramNote = "Redirect URL - verify for security";
                    } else if (name.toLowerCase() === 'token' || name.toLowerCase() === 'auth' || name.toLowerCase() === 'key') {
                        paramNote = "Security token - handle with care";
                    }
                    
                    paramDetails.push({
                        name,
                        originalValue: value,
                        encodedValue: encodedValue,
                        wasEncoded,
                        note: paramNote
                    });
                }
            }
            
            const result = baseUrl + "?" + params.join("&");
            
            return { 
                result, 
                valid: true, 
                message: encodedCount > 0 ? 
                    `${encodedCount} parameter${encodedCount > 1 ? 's' : ''} encoded` : 
                    "No parameters needed encoding",
                params: paramDetails,
                baseUrl
            };
        } catch (error) {
            console.error("Error encoding URL:", error);
            return { result: url, valid: false, message: `Error: ${error.message}`, params: [] };
        }
    }
    
    // Generate parameter state signature for comparison
    function generateParamState(params) {
        return params.map(p => `${p.name}=${p.encodedValue}`).sort().join('&');
    }
    
    // Update parameter breakdown table
    function updateParamTable(params) {
        const tbody = paramTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        if (params.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" style="text-align: center;">No parameters found</td>';
            tbody.appendChild(row);
            return;
        }
        
        params.forEach(param => {
            const row = document.createElement('tr');
            
            if (isEditingParams) {
                row.innerHTML = `
                    <td>${param.name}</td>
                    <td>${param.originalValue}</td>
                    <td contenteditable="true" data-param="${param.name}">${param.encodedValue}</td>
                    <td>${param.wasEncoded ? '<span style="color:#f8961e">Encoded</span>' : ''}
                    ${param.note ? `<span style="color:#f8961e">${param.note}</span>` : ''}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${param.name}</td>
                    <td>${param.originalValue}</td>
                    <td>${param.encodedValue}</td>
                    <td>${param.wasEncoded ? '<span style="color:#f8961e">Encoded</span>' : ''}
                    ${param.note ? `<span style="color:#f8961e">${param.note}</span>` : ''}</td>
                `;
            }
            
            tbody.appendChild(row);
        });
    }
    
    // Enable parameter editing mode
    function enableParamEditing() {
        isEditingParams = true;
        updateParamTable(lastProcessedResult.params);
        paramEditActions.style.display = 'block';
        paramEditBtn.style.display = 'none';
    }
    
    // Disable parameter editing mode
    function disableParamEditing() {
        isEditingParams = false;
        updateParamTable(lastProcessedResult.params);
        paramEditActions.style.display = 'none';
        paramEditBtn.style.display = 'inline-block';
    }
    
    // Save edited parameters
    function saveEditedParams() {
        const editableFields = paramTable.querySelectorAll('td[contenteditable="true"]');
        let paramUpdates = {};
        
        editableFields.forEach(field => {
            const paramName = field.dataset.param;
            const paramValue = field.textContent;
            paramUpdates[paramName] = paramValue;
        });
        
        if (Object.keys(paramUpdates).length > 0 && lastProcessedResult) {
            const baseUrl = lastProcessedResult.baseUrl;
            const updatedParams = [];
            
            lastProcessedResult.params.forEach(param => {
                const updatedValue = paramUpdates[param.name] !== undefined ? 
                    paramUpdates[param.name] : param.encodedValue;
                
                updatedParams.push(`${param.name}=${updatedValue}`);
            });
            
            const newUrl = baseUrl + '?' + updatedParams.join('&');
            processedUrl.textContent = newUrl;
            lastProcessedUrl = newUrl;
            
            // Update other parameters as needed
            updateQRCode(newUrl);
            window.myDebugger.showStatusMessage('Parameters updated');
            
            // Save to history
            saveToHistory(false);
        }
        
        disableParamEditing();
    }
    
    // Update QR code
    function updateQRCode(url) {
        if (!url) {
            qrContainer.style.display = 'none';
            return;
        }
        
        qrContainer.style.display = 'block';
        qrCode.innerHTML = '';
        currentQrCodeData = url;
        
        try {
            new QRCode(qrCode, {
                text: url,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (e) {
            console.error("Error generating QR code:", e);
            // Try to load QR code library if it failed
            if (typeof QRCode === 'undefined') {
                const script = document.createElement('script');
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
                script.onload = function() {
                    // Try again after loading
                    updateQRCode(url);
                };
                document.head.appendChild(script);
            }
        }
    }
    
    // Show QR code in overlay
    function showQrOverlay(url) {
        qrOverlayImage.innerHTML = '';
        qrOverlayUrl.textContent = url;
        
        try {
            new QRCode(qrOverlayImage, {
                text: url,
                width: 300,
                height: 300,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            qrOverlay.style.display = 'block';
        } catch (e) {
            console.error("Error generating overlay QR code:", e);
            window.myDebugger.showStatusMessage('Error generating QR code', true);
        }
    }
    
    // Improved text wrapping for saved QR codes
    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const characters = text.split('');
        let line = '';
        let currentY = y;
        
        for (let i = 0; i < characters.length; i++) {
            const testLine = line + characters[i];
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(line, x, currentY);
                line = characters[i];
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        
        ctx.fillText(line, x, currentY);
        return currentY;
    }
    
    // Save QR code as image
    function saveQrCode(container, filename) {
        try {
            const canvas = container.querySelector('canvas');
            
            if (!canvas) {
                window.myDebugger.showStatusMessage('No QR code available to save', true);
                return;
            }
            
            // Create a new canvas with padding and text
            const paddedCanvas = document.createElement('canvas');
            const ctx = paddedCanvas.getContext('2d');
            const padding = 40;
            const headerHeight = 40;
            const footerHeight = 80;
            const qrSize = Math.max(canvas.width, canvas.height);
            
            paddedCanvas.width = qrSize + (padding * 2);
            paddedCanvas.height = qrSize + headerHeight + footerHeight + (padding * 2);
            
            // Fill with white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
            
            // Add "QR Code" title at the top in blue
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = '#4361ee';
            ctx.textAlign = 'center';
            ctx.fillText('QR Code', paddedCanvas.width / 2, padding);
            
            // Draw the QR code
            ctx.drawImage(canvas, 
                padding, 
                headerHeight, 
                qrSize, 
                qrSize
            );
            
            // Add "Scan with your phone" text
            ctx.font = '14px Arial';
            ctx.fillStyle = '#adb5bd';
            ctx.textAlign = 'center';
            ctx.fillText('Scan with your phone to open this link directly', 
                paddedCanvas.width / 2, 
                headerHeight + qrSize + 20
            );
            
            // Add "Processed URL:" label
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#4361ee';
            ctx.textAlign = 'center';
            ctx.fillText('Processed URL:', 
                paddedCanvas.width / 2, 
                headerHeight + qrSize + 40
            );
            
            // Get URL
            const url = container === qrOverlayImage ? qrOverlayUrl.textContent : currentQrCodeData;
            
            // Draw gray background for URL text
            const urlBoxY = headerHeight + qrSize + 50;
            const urlBoxHeight = 70;
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(20, urlBoxY, paddedCanvas.width - 40, urlBoxHeight);
            
            // Add URL text with wrapping
            ctx.font = '12px Arial';
            ctx.fillStyle = '#212529';
            ctx.textAlign = 'center';
            wrapText(ctx, url, paddedCanvas.width / 2, urlBoxY + 15, paddedCanvas.width - 60, 18);
            
            // Create download link
            const dataUrl = paddedCanvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = dataUrl;
            downloadLink.download = filename || 'qrcode.png';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            window.myDebugger.showStatusMessage('QR code saved to your device');
        } catch (e) {
            console.error("Error saving QR code:", e);
            window.myDebugger.showStatusMessage('Error saving QR code', true);
        }
    }
    
    // Save URL to history
    function saveToHistory(showNotification = true) {
        const url = inputUrl.value.trim();
        const processedResult = lastProcessedUrl;
        const postParamsValue = postParams ? postParams.value.trim() : '';
        
        if (!url || !processedResult) return;
        
        try {
            const now = new Date();
            const timestamp = now.toISOString();
            const displayDate = now.toLocaleString(undefined, { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            // Generate ID
            const paramState = lastProcessedResult.params ? generateParamState(lastProcessedResult.params) : '';
            const urlId = btoa(url + currentMode + paramState).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
            
            // Check if URL already exists
            const existingIndex = urlHistory.findIndex(item => item.id === urlId);
            
            if (existingIndex !== -1) {
                // Update existing entry
                urlHistory[existingIndex] = {
                    ...urlHistory[existingIndex],
                    timestamp,
                    displayDate,
                    lastUsed: now.getTime(),
                    encodedUrl: processedResult
                };
            } else {
                // Add new entry
                const entry = {
                    id: urlId,
                    originalUrl: url,
                    encodedUrl: processedResult,
                    timestamp,
                    displayDate,
                    starred: false,
                    lastUsed: now.getTime(),
                    nickname: '',
                    requestMode: currentMode,
                    postParams: currentMode === 'post' ? postParamsValue : ''
                };
                
                urlHistory.unshift(entry);
                
                // Limit history size to 50 items
                if (urlHistory.length > 50) {
                    const nonStarredIndex = urlHistory.findIndex(item => !item.starred);
                    if (nonStarredIndex !== -1) {
                        urlHistory.splice(nonStarredIndex, 1);
                    } else {
                        urlHistory.pop();
                    }
                }
            }
            
            // Save to storage
            window.toolStorage.set('url-encoder', 'urlHistory', urlHistory);
            
            // Update UI
            renderLinksList();
            updateCounts();
            
            if (showNotification) {
                window.myDebugger.showStatusMessage('URL saved to history');
            }
            
            return true;
        } catch (e) {
            console.error("Error saving to history:", e);
            if (showNotification) {
                window.myDebugger.showStatusMessage('Error saving URL', true);
            }
            return false;
        }
    }
    
    // Toggle star status for a URL
    function toggleStar(id) {
        const itemIndex = urlHistory.findIndex(entry => entry.id === id);
        
        if (itemIndex !== -1) {
            urlHistory[itemIndex].starred = !urlHistory[itemIndex].starred;
            window.toolStorage.set('url-encoder', 'urlHistory', urlHistory);
            
            renderLinksList();
            updateCounts();
            
            window.myDebugger.showStatusMessage(
                urlHistory[itemIndex].starred ? 'Added to starred links' : 'Removed from starred links'
            );
        }
    }
    
    // Load URL into editor
    function loadUrlToEditor(id) {
        const item = urlHistory.find(entry => entry.id === id);
        
        if (item) {
            inputUrl.value = item.originalUrl;
            
            // Set request mode
            if (item.requestMode) {
                setRequestMode(item.requestMode);
                
                // If POST mode, load post params
                if (item.requestMode === 'post' && item.postParams && postParams) {
                    postParams.value = item.postParams;
                }
            } else {
                setRequestMode('get');
            }
            
            // Update last used timestamp
            item.lastUsed = Date.now();
            window.toolStorage.set('url-encoder', 'urlHistory', urlHistory);
            
            // Process URL
            processUrl();
            
            window.myDebugger.showStatusMessage('URL loaded to editor');
        }
    }
    
    // Copy URL to clipboard
    function copyUrl(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                window.myDebugger.showStatusMessage('Copied to clipboard');
            })
            .catch(err => {
                console.error('Failed to copy text:', err);
                window.myDebugger.showStatusMessage('Failed to copy', true);
            });
    }
    
    // Open URL in new tab
    function runUrl(url, mode = null, postParamsText = null) {
        const useMode = mode || currentMode;
        
        if (useMode === 'get') {
            window.open(url, '_blank');
        } else if (useMode === 'post') {
            // Create a form to submit POST request
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = url.split('?')[0]; // Base URL without query string
            form.target = '_blank';
            
            // Add query parameters from URL
            const queryParams = new URLSearchParams(url.split('?')[1] || '');
            for (const [key, value] of queryParams.entries()) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                form.appendChild(input);
            }
            
            // Add POST parameters
            const postParamsValue = postParamsText || (postParams ? postParams.value : '');
            let postData = {};
            
            try {
                // Try to parse as JSON
                postData = JSON.parse(postParamsValue);
            } catch (e) {
                // Parse as URL encoded string
                const params = new URLSearchParams(postParamsValue);
                for (const [key, value] of params.entries()) {
                    postData[key] = value;
                }
            }
            
            // Add POST parameters to form
            for (const key in postData) {
                if (postData.hasOwnProperty(key)) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = postData[key];
                    form.appendChild(input);
                }
            }
            
            // Submit form
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        }
    }
    
    // Delete history item
    function deleteHistoryItem(id) {
        urlHistory = urlHistory.filter(entry => entry.id !== id);
        window.toolStorage.set('url-encoder', 'urlHistory', urlHistory);
        
        renderLinksList();
        updateCounts();
        
        window.myDebugger.showStatusMessage('Item deleted');
    }
    
    // Set request mode (GET/POST)
    function setRequestMode(mode) {
        currentMode = mode;
        
        // Update UI
        modeBtns.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Show/hide POST parameters
        if (mode === 'post' && postParamsContent) {
            postParamsContent.style.display = 'block';
        } else if (postParamsContent) {
            postParamsContent.style.display = 'none';
        }
    }
    
    // Update links count
    function updateCounts() {
        if (linksCount) {
            linksCount.textContent = urlHistory.length;
        }
    }
    
    // Add nickname to URL
    function addNickname(id) {
        // Implement if needed
    }
    
    // Toggle QR code for list item
    function toggleListQR(id) {
        // Implement if needed
    }
    
    // Render links list with starred items at the top
    function renderLinksList(searchTerm = '') {
        if (!linksList) return;
        
        if (urlHistory.length === 0) {
            linksList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #adb5bd;">
                    <i class="fas fa-history" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <p>No history yet</p>
                </div>
            `;
            return;
        }
        
        const normalizedSearch = searchTerm ? searchTerm.toLowerCase() : '';
        
        // Filter by search term if provided
        const filteredHistory = normalizedSearch ? 
            urlHistory.filter(entry => 
                (entry.originalUrl.toLowerCase().includes(normalizedSearch) || 
                entry.encodedUrl.toLowerCase().includes(normalizedSearch) ||
                (entry.nickname && entry.nickname.toLowerCase().includes(normalizedSearch)))) : 
            urlHistory;
        
        if (filteredHistory.length === 0) {
            linksList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #adb5bd;">
                    <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <p>No matching links found</p>
                </div>
            `;
            return;
        }
        
        // Separate starred and regular items
        const starredItems = filteredHistory.filter(item => item.starred);
        const regularItems = filteredHistory.filter(item => !item.starred);
        
        // Sort by last used time
        starredItems.sort((a, b) => b.lastUsed - a.lastUsed);
        regularItems.sort((a, b) => b.lastUsed - a.lastUsed);
        
        // Combine with starred first
        const sortedHistory = [...starredItems, ...regularItems];
        
        linksList.innerHTML = sortedHistory.map(entry => {
            return `
                <div class="list-item">
                    <button class="star-btn ${entry.starred ? 'active' : ''}" onclick="window.toggleStar('${entry.id}')">
                        <i class="fas fa-star"></i>
                    </button>
                    
                    <div class="list-url" onclick="window.loadUrlToEditor('${entry.id}')">
                        ${entry.encodedUrl}
                    </div>
                    
                    <div class="add-nickname-btn" onclick="window.addNickname('${entry.id}')">
                        <i class="fas fa-tag"></i> Add Nickname
                    </div>
                    
                    <div class="list-meta">
                        <span>${entry.displayDate} · ${entry.requestMode ? entry.requestMode.toUpperCase() : 'GET'}</span>
                        <div class="list-actions">
                            <button class="action-icon" onclick="window.copyUrl('${entry.encodedUrl}')">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="action-icon" onclick="window.runUrl('${entry.encodedUrl}', '${entry.requestMode || 'get'}', '${entry.postParams ? entry.postParams.replace(/'/g, "\\'") : ''}')">
                                <i class="fas fa-external-link-alt"></i>
                            </button>
                            <button class="toggle-qr" onclick="window.toggleListQR('${entry.id}')">
                                <i class="fas fa-qrcode"></i> Show QR
                            </button>
                            <button class="action-icon" onclick="window.deleteHistoryItem('${entry.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Expose functions to global scope for event handlers
    window.toggleStar = toggleStar;
    window.copyUrl = copyUrl;
    window.runUrl = runUrl;
    window.deleteHistoryItem = deleteHistoryItem;
    window.loadUrlToEditor = loadUrlToEditor;
    window.toggleListQR = toggleListQR || function(){};
    window.addNickname = addNickname || function(){};
    
    // Process URL if already present
    if (inputUrl && inputUrl.value.trim()) {
        processUrl();
    }
});