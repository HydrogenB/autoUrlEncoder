/**
 * url-encoder.js - Implementation of URL Parameter Encoder tool
 * Provides URL parameter encoding, QR code generation, and history management
 */

// Global variables
let urlHistory = [];
let lastProcessedUrl = '';
let lastProcessedResult = null;
let autoSaveTimer = null;
let lastInputTime = 0;
let qrDebounceTimer = null;
let currentMode = 'get';
let isEditingParams = false;
let currentQrCodeData = '';
let lastParamState = ''; // For parameter change detection

// Ensure QR Code library is loaded
if (!window.QRCode) {
    console.error("QRCode library not found - loading from CDN");
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = function() {
      console.log("QRCode library loaded successfully");
      // Re-initialize QR code if needed
      if (window.lastProcessedUrl) {
        updateQRCode(window.lastProcessedUrl);
      }
    };
    document.head.appendChild(script);
  }

// Main URL encoding function
function encodeUrlParamsInUrl(url, paramNames) {
    try {
        // Check for valid input
        if (!url || typeof url !== "string") return { result: url, valid: false, message: "Invalid URL format" };
        
        // Basic URL validation
        if (!url.includes("://")) {
            return { result: url, valid: false, message: "Missing protocol (http:// or https://)" };
        }
        
        // Parse parameter names to encode, if specified
        let paramsToEncode = null;
        if (paramNames) {
            paramsToEncode = paramNames.split(",").map(p => p.trim()).filter(p => p.length > 0);
        }
        
        // Split URL into base and query string
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
        
        // Split query string into parameters
        const params = queryString.split("&");
        let encodedCount = 0;
        let paramDetails = [];
        
        // Process each parameter
        for (let i = 0; i < params.length; i++) {
            const eqIndex = params[i].indexOf("=");
            if (eqIndex !== -1) {
                const name = params[i].substring(0, eqIndex);
                const value = params[i].substring(eqIndex + 1);
                let encodedValue = value;
                let wasEncoded = false;
                let paramNote = "";
                
                // Check if we should encode this parameter
                if (
                    (paramsToEncode === null && value.match(/^https?:\/\//)) || // Auto-detect URL values
                    (paramsToEncode !== null && paramsToEncode.includes(name))  // Specifically listed parameters
                ) {
                    const originalValue = value;
                    encodedValue = encodeURIComponent(value);
                    
                    // Only count as encoded if the value actually changed
                    if (originalValue !== encodedValue) {
                        encodedCount++;
                        wasEncoded = true;
                    }
                    
                    params[i] = name + "=" + encodedValue;
                }
                
                // Check for special parameters and add notes
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
        
        // Join everything back together
        const result = baseUrl + "?" + params.join("&");
        
        // Return result with validation info
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
        window.myDebugger.logger.error("Error encoding URL:", error);
        return { result: url, valid: false, message: `Error: ${error.message}`, params: [] };
    }
}

// Generate parameter state signature for comparison
function generateParamState(params) {
    return params.map(p => `${p.name}=${p.encodedValue}`).sort().join('&');
}

// Process URL and update UI
function processUrl() {
    const url = inputUrl.value.trim();
    
    // Clear auto-save status
    autosaveStatus.classList.remove('autosave-active');
    autosaveText.textContent = '';
    
    // Reset auto-save timer
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    lastInputTime = Date.now();
    
    if (!url) {
        validationProgress.style.width = '0';
        validationMessage.textContent = '';
        resultContainer.style.display = 'none';
        return;
    }
    
    const result = encodeUrlParamsInUrl(url, null); // Auto-detect all URLs
    lastProcessedUrl = result.result;
    lastProcessedResult = result;
    
    // Update validation UI
    if (result.valid) {
        validationProgress.className = 'validation-progress valid';
        validationProgress.style.width = '100%';
    } else {
        validationProgress.className = 'validation-progress invalid';
        validationProgress.style.width = '30%';
    }
    
    validationMessage.textContent = result.message;
    processedUrl.textContent = result.result;
    resultContainer.style.display = 'block';
    
    // Update parameter breakdown table
    updateParamTable(result.params);
    
    // Generate parameter state signature
    const currentParamState = generateParamState(result.params);
    const paramsChanged = lastParamState && currentParamState !== lastParamState;
    lastParamState = currentParamState;
    
    // Set auto-save timer for 10 seconds of inactivity
    autoSaveTimer = setTimeout(() => {
        if (url && result.valid) {
            saveToHistory(false);
            autosaveStatus.classList.add('autosave-active');
            autosaveText.textContent = 'Auto-saved';
        }
    }, 10000);
    
    // If parameters have changed, trigger save immediately
    if (paramsChanged && url && result.valid) {
        saveToHistory(false);
        autosaveStatus.classList.add('autosave-active');
        autosaveText.textContent = 'Auto-saved (parameters changed)';
    }
    
    // Update QR code immediately
    updateQRCode(result.result);
    
    // Log the processed URL
    window.myDebugger.logger.log("URL processed", { 
        originalUrl: url,
        encoded: result.valid,
        paramCount: result.params.length
    });
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
                <td class="param-name">${window.myDebugger.escapeHtml(param.name)}</td>
                <td>${window.myDebugger.escapeHtml(param.originalValue)}</td>
                <td>
                    <div class="param-editable editing" contenteditable="true" data-param="${window.myDebugger.escapeHtml(param.name)}">${window.myDebugger.escapeHtml(param.encodedValue)}</div>
                </td>
                <td>
                    ${param.wasEncoded ? '<span class="param-warning">Encoded</span><br>' : ''}
                    ${param.note ? `<span class="param-warning">${window.myDebugger.escapeHtml(param.note)}</span>` : ''}
                </td>
            `;
        } else {
            row.innerHTML = `
                <td class="param-name">${window.myDebugger.escapeHtml(param.name)}</td>
                <td>${window.myDebugger.escapeHtml(param.originalValue)}</td>
                <td class="param-value">${window.myDebugger.escapeHtml(param.encodedValue)}</td>
                <td>
                    ${param.wasEncoded ? '<span class="param-warning">Encoded</span><br>' : ''}
                    ${param.note ? `<span class="param-warning">${window.myDebugger.escapeHtml(param.note)}</span>` : ''}
                </td>
            `;
        }
        
        tbody.appendChild(row);
    });
}

// Enable parameter editing mode
function enableParamEditing() {
    isEditingParams = true;
    updateParamTable(lastProcessedResult.params);
    paramEditActions.style.display = 'flex';
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
    const editableFields = document.querySelectorAll('.param-editable.editing');
    let paramUpdates = {};
    
    editableFields.forEach(field => {
        const paramName = field.dataset.param;
        const paramValue = field.textContent;
        paramUpdates[paramName] = paramValue;
    });
    
    // Reconstruct URL with updated parameters
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
        
        // Generate updated param state
        const updatedParamState = updatedParams.sort().join('&');
        const paramsChanged = lastParamState && updatedParamState !== lastParamState;
        lastParamState = updatedParamState;
        
        // Save to history if parameters changed
        if (paramsChanged) {
            saveToHistory(false);
            autosaveStatus.classList.add('autosave-active');
            autosaveText.textContent = 'Saved (parameters updated)';
        }
        
        // Update other parameters as needed
        updateQRCode(newUrl);
        window.myDebugger.showStatusMessage('Parameters updated');
        
        // Log parameter updates
        window.myDebugger.logger.log("Parameters edited", { 
            updates: paramUpdates,
            newUrl: newUrl
        });
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
        // Clear any previous QR code
        while (qrCode.firstChild) {
            qrCode.removeChild(qrCode.firstChild);
        }
        
        new QRCode(qrCode, {
            text: url,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (e) {
        window.myDebugger.logger.error("Error generating QR code:", e);
        qrCode.innerHTML = '<div style="color: var(--danger)">Error generating QR code</div>';
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
        
        qrOverlay.classList.add('active');
        
        // Log QR code view
        window.myDebugger.logger.log("QR code overlay opened", { url: url });
    } catch (e) {
        window.myDebugger.logger.error("Error generating overlay QR code:", e);
        window.myDebugger.showStatusMessage('Error generating QR code', true);
    }
}

// Improved text wrapping for saved QR codes
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split('');
    let line = '';
    let testLine = '';
    let currentY = y;
    
    for(let i = 0; i < words.length; i++) {
        testLine += words[i];
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && i > 0) {
            ctx.fillText(line, x, currentY);
            line = words[i];
            testLine = words[i];
            currentY += lineHeight;
        }
        else {
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
        const headerHeight = 50;
        const footerHeight = 100;
        const qrSize = Math.max(canvas.width, canvas.height);
        
        paddedCanvas.width = qrSize + (padding * 2);
        paddedCanvas.height = qrSize + headerHeight + footerHeight + (padding * 2);
        
        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
        
        // Add "QR Code" title at the top in blue
        ctx.font = 'bold 20px Arial';
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
            headerHeight + qrSize + 25
        );
        
        // Add "Processed URL:" label in blue
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#4361ee';
        ctx.textAlign = 'center';
        ctx.fillText('Processed URL:', 
            paddedCanvas.width / 2, 
            headerHeight + qrSize + 50
        );
        
        // Draw gray background for URL text
        const urlBoxY = headerHeight + qrSize + 60;
        const urlBoxHeight = 80;
        ctx.fillStyle = '#f5f7fa';
        ctx.fillRect(20, urlBoxY, paddedCanvas.width - 40, urlBoxHeight);
        
        // Add URL text with improved wrapping
        ctx.font = '14px Arial';
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'center';
        
        // Get URL to display
        const url = container === qrOverlayImage ? qrOverlayUrl.textContent : currentQrCodeData;
        
        // Use improved text wrapping function
        wrapText(ctx, url, paddedCanvas.width / 2, urlBoxY + 20, paddedCanvas.width - 80, 20);
        
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
        window.myDebugger.logger.error("Error saving QR code:", e);
        window.myDebugger.showStatusMessage('Error saving QR code', true);
    }
}

// Generate QR code for list item
function generateListQR(container, url) {
    container.innerHTML = '';
    
    try {
        new QRCode(container, {
            text: url,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (e) {
        window.myDebugger.logger.error("Error generating QR code:", e);
        container.innerHTML = '<div style="color: var(--danger)">Error generating QR code</div>';
    }
}

// Toggle QR code visibility for list item
function toggleListQR(id) {
    const qrElement = document.getElementById(`qr-${id}`);
    const toggleBtn = document.getElementById(`toggle-qr-${id}`);
    
    if (qrElement.classList.contains('expanded')) {
        qrElement.classList.remove('expanded');
        toggleBtn.innerHTML = '<i class="fas fa-qrcode"></i> Show QR';
    } else {
        qrElement.classList.add('expanded');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Hide QR';
        
        // Generate QR code if container is empty
        if (qrElement.children.length === 0) {
            const item = urlHistory.find(entry => entry.id === id);
            if (item) {
                generateListQR(qrElement, item.encodedUrl);
            }
        }
    }
}

// Show QR code overlay from list item
function showListQrOverlay(id) {
    const item = urlHistory.find(entry => entry.id === id);
    if (item) {
        showQrOverlay(item.encodedUrl);
    }
}

// Extract domain from URL
function extractDomain(url) {
    try {
        if (!url) return '';
        
        // Remove protocol and get domain
        let domain = url.split('//')[1] || url;
        
        // Get domain and subdomain
        domain = domain.split('/')[0];
        
        return domain;
    } catch (e) {
        window.myDebugger.logger.error("Error extracting domain:", e);
        return url;
    }
}

// Edit nickname for list item
function editNickname(id) {
    const nameDisplay = document.getElementById(`nickname-display-${id}`);
    const nameEdit = document.getElementById(`nickname-edit-${id}`);
    
    nameDisplay.style.display = 'none';
    nameEdit.style.display = 'block';
    
    const inputElement = document.getElementById(`nickname-input-${id}`);
    inputElement.focus();
    inputElement.select();
    
    // Log edit action
    window.myDebugger.logger.log("Nickname edit started", { 
        id: id
    });
}

// Save nickname for list item
function saveNickname(id) {
    const nameDisplay = document.getElementById(`nickname-display-${id}`);
    const nameEdit = document.getElementById(`nickname-edit-${id}`);
    const inputElement = document.getElementById(`nickname-input-${id}`);
    
    const newNickname = inputElement.value.trim();
    
    // Update in history array
    const itemIndex = urlHistory.findIndex(entry => entry.id === id);
    if (itemIndex !== -1) {
        urlHistory[itemIndex].nickname = newNickname;
        window.toolStorage.set('url-encoder', 'urlHistory', urlHistory);
        
        // Update display
        const displayElement = document.getElementById(`nickname-text-${id}`);
        if (displayElement) {
            displayElement.textContent = newNickname || 'No nickname';
        }
        
        // Show or hide nickname section based on presence of nickname
        const nicknameSection = document.getElementById(`nickname-section-${id}`);
        if (nicknameSection) {
            if (newNickname) {
                nicknameSection.style.display = 'flex';
            } else {
                nicknameSection.style.display = 'none';
            }
        }
        
        // Update add nickname button
        const addButton = document.getElementById(`add-nickname-${id}`);
        if (addButton) {
            addButton.style.display = newNickname ? 'none' : 'inline-flex';
        }
        
        nameDisplay.style.display = 'flex';
        nameEdit.style.display = 'none';
        
        window.myDebugger.showStatusMessage('Nickname updated');
        
        // Refresh the links list to reflect changes
        renderLinksList();
        
        // Log nickname update
        window.myDebugger.logger.log("Nickname updated", { 
            id: id,
            nickname: newNickname
        });
    }
}

// Add nickname to list item
function addNickname(id) {
    const nicknameSection = document.getElementById(`nickname-section-${id}`);
    const addButton = document.getElementById(`add-nickname-${id}`);
    
    nicknameSection.style.display = 'flex';
    addButton.style.display = 'none';
    
    // Trigger edit mode
    editNickname(id);
    
    // Log add nickname action
    window.myDebugger.logger.log("Add nickname initiated", { 
        id: id
    });
}

// Save URL to history
function saveToHistory(showNotification = true) {
    const url = inputUrl.value.trim();
    const processedResult = lastProcessedUrl;
    const postParamsValue = postParams.value.trim();
    
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
        
        // Generate a consistent ID based on URL content to avoid duplicates
        const paramState = lastProcessedResult.params 
            ? generateParamState(lastProcessedResult.params) 
            : '';
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
                encodedUrl: processedResult, // Update encoded URL in case parameters changed
                paramState: paramState // Save parameter state
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
                postParams: currentMode === 'post' ? postParamsValue : '',
                paramState: paramState // Save parameter state
            };
            
            urlHistory.unshift(entry);
            
            // Limit history size to 100 items
            if (urlHistory.length > 100) {
                // Remove oldest non-starred items first
                const nonStarredIndex = urlHistory.findIndex(item => !item.starred);
                if (nonStarredIndex !== -1) {
                    urlHistory.splice(nonStarredIndex, 1);
                } else {
                    urlHistory.pop(); // If all are starred, remove the oldest
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
        
        // Log history save
        window.myDebugger.logger.log("URL saved to history", { 
            id: urlId,
            mode: currentMode,
            hasPostParams: currentMode === 'post' && postParamsValue.length > 0
        });
        
        return true;
    } catch (e) {
        window.myDebugger.logger.error("Error saving to history:", e);
        if (showNotification) {
            window.myDebugger.showStatusMessage('Error saving URL', true);
        }
        return false;
    }
}

// Toggle star status
function toggleStar(id) {
    try {
        const itemIndex = urlHistory.findIndex(entry => entry.id === id);
        
        if (itemIndex !== -1) {
            urlHistory[itemIndex].starred = !urlHistory[itemIndex].starred;
            window.toolStorage.set('url-encoder', 'urlHistory', urlHistory);
            
            renderLinksList();
            updateCounts();
            
            window.myDebugger.showStatusMessage(
                urlHistory[itemIndex].starred 
                    ? 'Added to starred links' 
                    : 'Removed from starred links'
            );
            
            // Log star toggle
            window.myDebugger.logger.log("Star toggled", { 
                id: id,
                starred: urlHistory[itemIndex].starred
            });
        }
    } catch (e) {
        window.myDebugger.logger.error("Error toggling star:", e);
        window.myDebugger.showStatusMessage('Error updating star status', true);
    }
}

// Load URL into editor
function loadUrlToEditor(id) {
    try {
        const item = urlHistory.find(entry => entry.id === id);
        
        if (item) {
            inputUrl.value = item.originalUrl;
            
            // Set request mode
            if (item.requestMode) {
                setRequestMode(item.requestMode);
                
                // If POST mode, load post params
                if (item.requestMode === 'post' && item.postParams) {
                    postParams.value = item.postParams;
                }
            } else {
                setRequestMode('get'); // Default to GET if no mode specified
            }
            
            // Update item's "last used" timestamp
            item.lastUsed = Date.now();
            window.toolStorage.set('url-encoder', 'urlHistory', urlHistory);
            
            // Process URL
            processUrl();
            
            // Scroll to top on mobile
            if (window.innerWidth < 1024) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            
            window.myDebugger.showStatusMessage('URL loaded to editor');
            
            // Log URL load
            window.myDebugger.logger.log("URL loaded to editor", { 
                id: id
            });
        }
    } catch (e) {
        window.myDebugger.logger.error("Error loading URL to editor:", e);
        window.myDebugger.showStatusMessage('Error loading URL', true);
    }
}

// Copy URL to clipboard
function copyUrl(text) {
    try {
        navigator.clipboard.writeText(text)
            .then(() => {
                window.myDebugger.showStatusMessage('Copied to clipboard');
                
                // Log copy action
                window.myDebugger.logger.log("URL copied to clipboard");
            })
            .catch(err => {
                window.myDebugger.logger.error('Failed to copy text:', err);
                window.myDebugger.showStatusMessage('Failed to copy', true);
            });
    } catch (e) {
        window.myDebugger.logger.error("Error copying URL:", e);
        window.myDebugger.showStatusMessage('Error copying URL', true);
    }
}

// Open URL in new tab
function runUrl(url, mode = null, postParamsText = null) {
    try {
        const useMode = mode || currentMode;
        
        if (useMode === 'get') {
            window.open(url, '_blank');
            
            // Log GET URL run
            window.myDebugger.logger.log("URL opened (GET)", { 
                url: url
            });
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
            const postParamsValue = postParamsText || postParams.value;
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
            
            // Append form to body, submit it, and remove it
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
            
            // Log POST URL run
            window.myDebugger.logger.log("URL opened (POST)", { 
                url: url,
                postParamsCount: Object.keys(postData).length
            });
        }
    } catch (e) {
        window.myDebugger.logger.error("Error opening URL:", e);
        window.myDebugger.showStatusMessage('Error opening URL', true);
    }
}

// Delete history item
function deleteHistoryItem(id) {
    try {
        urlHistory = urlHistory.filter(entry => entry.id !== id);
        window.toolStorage.set('url-encoder', 'urlHistory', urlHistory);
        
        renderLinksList();
        updateCounts();
        
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
    if (mode === 'post') {
        postParamsContent.style.display = 'block';
    } else {
        postParamsContent.style.display = 'none';
    }
    
    // Log mode change
    window.myDebugger.logger.log("Request mode changed", { 
        mode: mode
    });
}

// Update links count
function updateCounts() {
    if (linksCount) {
        linksCount.textContent = urlHistory.length;
    }
}

// Render links list with starred items at the top
function renderLinksList(searchTerm = '') {
    try {
        if (urlHistory.length === 0) {
            linksList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No history yet</p>
                </div>
            `;
            return;
        }
        
        const normalizedSearch = searchTerm.toLowerCase();
        
        // Filter by search term if provided
        const filteredHistory = normalizedSearch ? 
            urlHistory.filter(entry => 
                (entry.originalUrl.toLowerCase().includes(normalizedSearch) || 
                entry.encodedUrl.toLowerCase().includes(normalizedSearch) ||
                (entry.nickname && entry.nickname.toLowerCase().includes(normalizedSearch)))) : 
            urlHistory;
        
        if (filteredHistory.length === 0) {
            linksList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>No matching links found</p>
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
        
        linksList.innerHTML = sortedHistory.map(entry => {
            // Highlight domain if no nickname
            const domain = extractDomain(entry.originalUrl);
            const protocol = entry.originalUrl.split('://')[0] || '';
            const displayUrl = entry.nickname ? 
                entry.nickname : 
                entry.encodedUrl; // Show the full encoded URL
            
            return `
                <div class="list-item ${entry.starred ? 'starred' : ''}">
                    <button class="star-btn ${entry.starred ? 'active' : ''}" onclick="toggleStar('${entry.id}')">
                        <i class="fas fa-star"></i>
                    </button>
                    
                    <div class="list-url" onclick="loadUrlToEditor('${entry.id}')">
                        ${window.myDebugger.escapeHtml(displayUrl)}
                    </div>
                    
                    <div id="nickname-section-${entry.id}" class="list-nickname" style="${entry.nickname ? 'display:flex' : 'display:none'}">
                        <div id="nickname-display-${entry.id}" class="nickname-display">
                            <span id="nickname-text-${entry.id}">${entry.nickname ? window.myDebugger.escapeHtml(entry.nickname) : 'No nickname'}</span>
                            <button class="nickname-edit" onclick="editNickname('${entry.id}')"><i class="fas fa-pencil-alt"></i></button>
                        </div>
                        <div id="nickname-edit-${entry.id}" class="edit-mode">
                            <input type="text" id="nickname-input-${entry.id}" class="nickname-input" value="${window.myDebugger.escapeHtml(entry.nickname || '')}" placeholder="Enter nickname">
                            <button class="btn btn-primary" onclick="saveNickname('${entry.id}')">Save</button>
                        </div>
                    </div>
                    
                    ${!entry.nickname ? `
                        <button id="add-nickname-${entry.id}" class="add-nickname-btn" onclick="addNickname('${entry.id}')">
                            <i class="fas fa-tag"></i> Add Nickname
                        </button>
                    ` : ''}
                    
                    <div class="list-meta">
                        <span>${window.myDebugger.escapeHtml(entry.displayDate)} · ${entry.requestMode ? entry.requestMode.toUpperCase() : 'GET'}</span>
                        <div class="list-actions">
                            <button class="action-icon tooltip" data-tooltip="Copy" onclick="copyUrl('${window.myDebugger.escapeHtml(entry.encodedUrl)}')">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="action-icon tooltip" data-tooltip="Open" onclick="runUrl('${window.myDebugger.escapeHtml(entry.encodedUrl)}', '${entry.requestMode || 'get'}', '${entry.postParams ? window.myDebugger.escapeHtml(entry.postParams.replace(/'/g, "\\'")) : ''}')">
                                <i class="fas fa-external-link-alt"></i>
                            </button>
                            <button id="toggle-qr-${entry.id}" class="toggle-qr" onclick="toggleListQR('${entry.id}')">
                                <i class="fas fa-qrcode"></i> Show QR
                            </button>
                            <button class="action-icon tooltip" data-tooltip="Delete" onclick="deleteHistoryItem('${entry.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div id="qr-${entry.id}" class="list-qr" onclick="showListQrOverlay('${entry.id}')"></div>
                </div>
            `;
        }).join('');
    } catch (e) {
        window.myDebugger.logger.error("Error rendering links list:", e);
        linksList.innerHTML = `<div class="empty-state">Error loading links</div>`;
    }
}

// Close overlay when clicking outside content
function handleOverlayClick(e) {
    if (e.target === qrOverlay) {
        qrOverlay.classList.remove('active');
    }
}

// Close overlay with ESC key
function handleEscKey(e) {
    if (e.key === 'Escape' && qrOverlay.classList.contains('active')) {
        qrOverlay.classList.remove('active');
    }
}

// Initialize tool when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Define DOM elements
    window.inputUrl = document.getElementById('inputUrl');
    window.postParams = document.getElementById('postParams');
    window.validationProgress = document.getElementById('validationProgress');
    window.validationMessage = document.getElementById('validationMessage');
    window.resultContainer = document.getElementById('resultContainer');
    window.processedUrl = document.getElementById('processedUrl');
    window.paramTable = document.getElementById('paramTable');
    window.paramEditBtn = document.getElementById('paramEditBtn');
    window.paramEditActions = document.getElementById('paramEditActions');
    window.paramSaveBtn = document.getElementById('paramSaveBtn');
    window.paramCancelBtn = document.getElementById('paramCancelBtn');
    window.copyBtn = document.getElementById('copyBtn');
    window.runBtn = document.getElementById('runBtn');
    window.clearBtn = document.getElementById('clearBtn');
    window.saveQrBtn = document.getElementById('saveQrBtn');
    window.qrContainer = document.getElementById('qrContainer');
    window.qrCode = document.getElementById('qrCode');
    window.qrOverlay = document.getElementById('qrOverlay');
    window.qrOverlayClose = document.getElementById('qrOverlayClose');
    window.qrOverlayImage = document.getElementById('qrOverlayImage');
    window.qrOverlayUrl = document.getElementById('qrOverlayUrl');
    window.qrOverlaySave = document.getElementById('qrOverlaySave');
    window.linksList = document.getElementById('linksList');
    window.searchInput = document.getElementById('searchInput');
    window.clearSearch = document.getElementById('clearSearch');
    window.linksCount = document.getElementById('linksCount');
    window.autosaveStatus = document.getElementById('autosaveStatus');
    window.autosaveText = document.getElementById('autosaveText');
    window.modeBtns = document.querySelectorAll('.mode-btn');
    window.postParamsContent = document.getElementById('postParamsContent');
    
    // Load history from storage
    urlHistory = window.toolStorage.get('url-encoder', 'urlHistory', []);
    
    // URL processing
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
            qrOverlay.classList.remove('active');
        });
    }
    
    if (qrOverlay) {
        qrOverlay.addEventListener('click', handleOverlayClick);
    }
    
    document.addEventListener('keydown', handleEscKey);
    
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
            
            if (searchTerm) {
                clearSearch.classList.add('visible');
            } else {
                clearSearch.classList.remove('visible');
            }
        });
    }
    
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            clearSearch.classList.remove('visible');
            renderLinksList();
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
    updateCounts();
    
    // Record analytics for tool usage
    if (window.toolAnalytics) {
        window.toolAnalytics.recordToolUsage('url-encoder', 'view');
    }
    
    // Log tool initialization
    window.myDebugger.logger.log("URL Encoder tool initialized");
    
    // Expose functions to global scope for event handlers
    window.toggleStar = toggleStar;
    window.copyUrl = copyUrl;
    window.runUrl = runUrl;
    window.deleteHistoryItem = deleteHistoryItem;
    window.loadUrlToEditor = loadUrlToEditor;
    window.toggleListQR = toggleListQR;
    window.showListQrOverlay = showListQrOverlay;
    window.editNickname = editNickname;
    window.saveNickname = saveNickname;
    window.addNickname = addNickname;
});