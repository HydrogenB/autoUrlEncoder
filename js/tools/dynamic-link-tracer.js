/**
 * dynamic-link-tracer.js - Trace dynamic links and redirect chains
 * Provides visualization of redirect paths for Firebase, AppsFlyer and other link types
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const linkInput = document.getElementById('linkInput');
    const traceBtn = document.getElementById('traceBtn');
    const userAgentSelect = document.getElementById('userAgent');
    const customUserAgent = document.getElementById('customUserAgent');
    const maxRedirectsInput = document.getElementById('maxRedirects');
    const followJsRedirectsCheckbox = document.getElementById('followJsRedirects');
    const detectLoopsCheckbox = document.getElementById('detectLoops');
    const traceModeCheckbox = document.getElementById('traceMode');
    const resultContainer = document.getElementById('resultContainer');
    const traceDate = document.getElementById('traceDate');
    const traceAgent = document.getElementById('traceAgent');
    const redirectChain = document.getElementById('redirectChain');
    const linkSummary = document.getElementById('linkSummary');
    const tracesList = document.getElementById('tracesList');
    const traceCount = document.getElementById('traceCount');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');

    // Available CORS proxies (for redundancy)
    const CORS_PROXIES = [
        'https://api.allorigins.win/get?url=',
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/',
        'https://cors-proxy.htmldriven.com/?url='
    ];

    // Initialize browser user agent option
    if (userAgentSelect) {
        const browserOption = userAgentSelect.querySelector('option[value="browser"]');
        if (browserOption) {
            browserOption.textContent = `Current Browser - ${navigator.userAgent.substring(0, 50)}...`;
        }
    }

    // Trace button click handler
    traceBtn.addEventListener('click', async function() {
        const url = linkInput.value.trim();
        if (!url) {
            window.myDebugger.showStatusMessage('Please enter a URL to trace', true);
            return;
        }

        // Validate URL
        if (!isValidURL(url)) {
            window.myDebugger.showStatusMessage('Please enter a valid URL', true);
            return;
        }

        try {
            // Update button state
            traceBtn.disabled = true;
            traceBtn.innerHTML = '<div class="loading-spinner"></div> Tracing...';

            // Get trace options
            const options = {
                maxRedirects: parseInt(maxRedirectsInput.value) || 15,
                followJsRedirects: followJsRedirectsCheckbox.checked,
                detectLoops: detectLoopsCheckbox.checked,
                useProxy: traceModeCheckbox.checked,
                userAgent: getUserAgent()
            };

            // Start tracing
            let result;
            if (options.useProxy) {
                // Try with real tracing
                try {
                    result = await traceRedirects(url, options);
                } catch (proxyError) {
                    window.myDebugger.logger.error("All CORS proxies failed:", proxyError);
                    window.myDebugger.showStatusMessage('CORS proxies failed. Switching to simulation mode...', false);
                    
                    // Fall back to simulation if CORS fails
                    result = simulateTrace(url, options);
                }
            } else {
                // Use simulation mode directly
                result = simulateTrace(url, options);
            }

            // Display results
            displayResults(result);

            // Log the trace
            window.myDebugger.logger.log("Link traced", { 
                url, 
                redirectCount: result.redirects.length - 1,
                linkType: result.linkType,
                mode: options.useProxy ? 'real' : 'simulation'
            });
            
            // Save to history
            saveToHistory(url, result);
            
            window.myDebugger.showStatusMessage('Trace completed successfully');
        } catch (e) {
            window.myDebugger.logger.error("Error tracing link:", e);
            window.myDebugger.showStatusMessage('Error tracing link: ' + e.message, true);
        } finally {
            traceBtn.disabled = false;
            traceBtn.innerHTML = '<i class="fas fa-project-diagram"></i> Trace Link';
        }
    });

    // Validate URL format
    function isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Get appropriate user agent
    function getUserAgent() {
        const selectedValue = userAgentSelect.value;
        
        switch (selectedValue) {
            case 'default':
                return 'MyDebugger Dynamic Link Tracer/1.0';
            case 'browser':
                return navigator.userAgent;
            case 'iphone':
                return 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';
            case 'android':
                return 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Mobile Safari/537.36';
            case 'custom':
                return customUserAgent.value.trim() || 'MyDebugger Dynamic Link Tracer/1.0';
            default:
                return 'MyDebugger Dynamic Link Tracer/1.0';
        }
    }

    // Get a working CORS proxy
    async function getWorkingCorsProxy() {
        // Try each proxy in sequence
        for (const proxy of CORS_PROXIES) {
            try {
                const testUrl = 'https://httpbin.org/status/200';
                const response = await fetch(`${proxy}${encodeURIComponent(testUrl)}`, {
                    method: 'HEAD',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                
                if (response.ok) {
                    return proxy;
                }
            } catch (e) {
                console.log(`Proxy ${proxy} failed test: ${e.message}`);
            }
        }
        
        throw new Error('No working CORS proxy found');
    }

    // Trace redirects using CORS proxy approach
    async function traceRedirects(initialUrl, options) {
        const startTime = Date.now();
        const corsProxy = await getWorkingCorsProxy();
        
        let currentUrl = initialUrl;
        let redirects = [{
            url: currentUrl,
            status: null,
            time: 0,
            cookies: false
        }];
        let visitedUrls = new Map(); // Track URLs and their visit count
        
        try {
            // Follow redirects up to max
            for (let i = 0; i < options.maxRedirects; i++) {
                const redirectStartTime = Date.now();
                let nextUrl = null;
                let status = null;
                let hasCookies = false;
                let error = null;
                
                try {
                    // Make request through CORS proxy
                    const proxyUrl = `${corsProxy}${encodeURIComponent(currentUrl)}`;
                    const response = await fetch(proxyUrl, {
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'User-Agent': options.userAgent
                        }
                    });
                    
                    status = response.status;
                    
                    // Check for cookies
                    const setCookie = response.headers.get('set-cookie');
                    hasCookies = !!setCookie;
                    
                    // Get redirect location from header or content
                    if (status >= 300 && status < 400) {
                        const location = response.headers.get('location');
                        if (location) {
                            nextUrl = new URL(location, currentUrl).href;
                        }
                    }
                    
                    // Check for JavaScript redirects
                    if (options.followJsRedirects && status === 200) {
                        const text = await response.text();
                        const jsRedirect = extractJsRedirect(text, currentUrl);
                        if (jsRedirect) {
                            nextUrl = jsRedirect;
                            status = 200; // Mark as JS redirect
                        }
                    }
                } catch (e) {
                    error = e.message;
                }
                
                const requestTime = Date.now() - redirectStartTime;
                
                // Add to redirects
                redirects.push({
                    url: currentUrl,
                    status,
                    time: requestTime,
                    cookies: hasCookies,
                    error
                });
                
                // Stop if no next URL or error
                if (!nextUrl || error) {
                    break;
                }
                
                // Update visited URLs map
                if (options.detectLoops) {
                    const normalizedUrl = nextUrl.toLowerCase();
                    const visitCount = visitedUrls.get(normalizedUrl) || 0;
                    visitedUrls.set(normalizedUrl, visitCount + 1);
                    
                    // Check for redirect loops (same URL visited 3+ times)
                    if (visitCount >= 2) {
                        redirects.push({
                            url: nextUrl,
                            status: null,
                            time: 0,
                            cookies: false,
                            error: `Redirect loop detected (URL visited ${visitCount + 1} times)`
                        });
                        break;
                    }
                }
                
                // Move to next URL
                currentUrl = nextUrl;
            }
            
            // Calculate metrics
            const totalTime = redirects.reduce((sum, r) => sum + (r.time || 0), 0);
            const finalUrl = redirects[redirects.length - 1].url;
            const linkType = detectLinkType(redirects);
            const loopDetected = Array.from(visitedUrls.values()).some(count => count > 1);
            
            return {
                redirects,
                finalUrl,
                totalTime,
                totalRedirects: redirects.length - 1,
                linkType,
                loopDetected,
                traceDate: new Date().toISOString(),
                userAgent: options.userAgent
            };
            
        } catch (e) {
            throw e;
        }
    }
    
    // Extract JavaScript redirects from HTML content
    function extractJsRedirect(html, baseUrl) {
        // Common redirect patterns
        const patterns = [
            // window.location redirect patterns
            /window\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i,
            /window\.location\.replace\(['"]([^'"]+)['"]\)/i,
            /window\.location\.assign\(['"]([^'"]+)['"]\)/i,
            
            // Meta refresh patterns
            /<meta\s+http-equiv=['"]refresh['"]\s+content=['"]\d+;\s*url=([^'"]+)['"]/i,
            
            // JavaScript frameworks patterns
            /location\.replace\(['"]([^'"]+)['"]\)/i,
            /location\.href\s*=\s*['"]([^'"]+)['"]/i,
            
            // Special redirect patterns for common services
            /top\.location\.href\s*=\s*['"]([^'"]+)['"]/i,
            /parent\.location\.href\s*=\s*['"]([^'"]+)['"]/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                try {
                    // Resolve relative URLs against base URL
                    return new URL(match[1], baseUrl).href;
                } catch (e) {
                    console.error('Error resolving redirect URL:', e);
                }
            }
        }
        
        return null;
    }
    
    // Detect link type based on URLs in the redirect chain
    function detectLinkType(redirects) {
        const urls = redirects.map(r => r.url.toLowerCase());
        
        if (urls.some(url => url.includes('firebase') || url.includes('app.goo.gl'))) {
            return 'firebase';
        }
        
        if (urls.some(url => url.includes('onelink') || url.includes('appsflyer'))) {
            return 'appsflyer';
        }
        
        if (urls.some(url => url.includes('branch.io') || url.includes('bnc.lt'))) {
            return 'branch';
        }
        
        if (urls.some(url => url.includes('adj.st') || url.includes('adjust'))) {
            return 'adjust';
        }
        
        return 'unknown';
    }

    // Simulate a trace (fallback when CORS proxies fail)
    function simulateTrace(url, options) {
        const startTime = Date.now();
        
        // Determine trace pattern based on URL
        let result;
        if (url.includes('firebase') || url.includes('app.goo.gl') || url.includes('page.link')) {
            result = simulateFirebaseLink(url, options);
        } else if (url.includes('onelink') || url.includes('appsflyer')) {
            result = simulateAppsFlyerLink(url, options);
        } else if (url.includes('branch.io') || url.includes('bnc.lt')) {
            result = simulateBranchLink(url, options);
        } else if (url.includes('adj.st') || url.includes('adjust')) {
            result = simulateAdjustLink(url, options);
        } else {
            result = simulateGenericLink(url, options);
        }
        
        // Add the "simulation" flag to the result
        result.simulation = true;
        result.traceDate = new Date().toISOString();
        result.userAgent = options.userAgent;
        
        return result;
    }

    // Simulate a Firebase Dynamic Link trace
    function simulateFirebaseLink(url, options) {
        const redirects = [
            {
                url: url,
                status: 302,
                time: 150,
                cookies: true
            },
            {
                url: url.includes('page.link') ? url : `https://app.goo.gl/${randomString(6)}`,
                status: 302,
                time: 120,
                cookies: false
            },
            {
                url: `https://firebase-dynamic-links-proxy.googleapis.com/v1/link?deep_link_id=${randomString(10)}`,
                status: 200,
                time: 180,
                cookies: true
            }
        ];
        
        // Add app path
        const appUrl = `https://example.app.com/open?link=${randomString(12)}&utm_source=firebase&utm_medium=dynamic_link`;
        redirects.push({
            url: appUrl,
            status: 200,
            time: 180,
            cookies: true
        });
        
        return {
            redirects,
            finalUrl: redirects[redirects.length - 1].url,
            totalTime: redirects.reduce((sum, r) => sum + r.time, 0),
            totalRedirects: redirects.length - 1,
            linkType: 'firebase',
            loopDetected: false
        };
    }

    // Simulate an AppsFlyer OneLink trace
    function simulateAppsFlyerLink(url, options) {
        const redirects = [
            {
                url: url,
                status: 302,
                time: 130,
                cookies: true
            },
            {
                url: `https://impression.appsflyer.com/${randomString(10)}`,
                status: 302,
                time: 140,
                cookies: true
            },
            {
                url: `https://app.appsflyer.com/${randomString(8)}?af_id=${randomString(12)}`,
                status: 200,
                time: 190,
                cookies: true
            }
        ];
        
        // Add app store or app path
        if (Math.random() > 0.5) {
            redirects.push({
                url: `https://play.google.com/store/apps/details?id=com.example.app&referrer=utm_source%3Dappsflyer`,
                status: 200,
                time: 160,
                cookies: true
            });
        } else {
            redirects.push({
                url: `https://example.app.com/landing?utm_source=appsflyer&utm_campaign=${randomString(8)}`,
                status: 200,
                time: 170,
                cookies: true
            });
        }
        
        return {
            redirects,
            finalUrl: redirects[redirects.length - 1].url,
            totalTime: redirects.reduce((sum, r) => sum + r.time, 0),
            totalRedirects: redirects.length - 1,
            linkType: 'appsflyer',
            loopDetected: false
        };
    }

    // Simulate a Branch.io link trace
    function simulateBranchLink(url, options) {
        const redirects = [
            {
                url: url,
                status: 302,
                time: 140,
                cookies: true
            },
            {
                url: `https://bnc.lt/${randomString(7)}`,
                status: 302,
                time: 130,
                cookies: true
            },
            {
                url: `https://branch-app.link/${randomString(10)}?_branch_match_id=${randomString(12)}`,
                status: 200,
                time: 170,
                cookies: true
            }
        ];
        
        // Add destination
        redirects.push({
            url: `https://example.app.com/share?branch_id=${randomString(8)}`,
            status: 200,
            time: 180,
            cookies: true
        });
        
        return {
            redirects,
            finalUrl: redirects[redirects.length - 1].url,
            totalTime: redirects.reduce((sum, r) => sum + r.time, 0),
            totalRedirects: redirects.length - 1,
            linkType: 'branch',
            loopDetected: false
        };
    }

    // Simulate an Adjust link trace
    function simulateAdjustLink(url, options) {
        const redirects = [
            {
                url: url,
                status: 302,
                time: 120,
                cookies: true
            },
            {
                url: `https://adj.st/${randomString(8)}`,
                status: 302,
                time: 130,
                cookies: true
            },
            {
                url: `https://app.adjust.com/${randomString(6)}?adjust_t=${randomString(10)}`,
                status: 302,
                time: 150,
                cookies: true
            }
        ];
        
        // Add destination
        redirects.push({
            url: `https://play.google.com/store/apps/details?id=com.example.app&referrer=adjust_tracker%3D${randomString(8)}`,
            status: 200,
            time: 190,
            cookies: true
        });
        
        return {
            redirects,
            finalUrl: redirects[redirects.length - 1].url,
            totalTime: redirects.reduce((sum, r) => sum + r.time, 0),
            totalRedirects: redirects.length - 1,
            linkType: 'adjust',
            loopDetected: false
        };
    }

    // Simulate a generic link trace
    function simulateGenericLink(url, options) {
        // Create a random number of redirects (1-4)
        const numRedirects = Math.floor(Math.random() * 4) + 1;
        let redirects = [{
            url: url,
            status: 301,
            time: 100 + Math.floor(Math.random() * 100),
            cookies: Math.random() > 0.5
        }];

        // Generate random redirects
        for (let i = 0; i < numRedirects; i++) {
            const domain = `example${i}.com`;
            const status = [301, 302, 303, 307][Math.floor(Math.random() * 4)];
            redirects.push({
                url: `https://${domain}/redirect?to=${randomString(8)}`,
                status,
                time: 100 + Math.floor(Math.random() * 150),
                cookies: Math.random() > 0.5
            });
        }

        // Add final destination
        redirects.push({
            url: `https://final-destination.com/${randomString(10)}?ref=redirect`,
            status: 200,
            time: 150 + Math.floor(Math.random() * 100),
            cookies: Math.random() > 0.5
        });

        return {
            redirects,
            finalUrl: redirects[redirects.length - 1].url,
            totalTime: redirects.reduce((sum, r) => sum + r.time, 0),
            totalRedirects: redirects.length - 1,
            linkType: 'unknown',
            loopDetected: false
        };
    }

    // Helper to generate random strings
    function randomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Display trace results
    function displayResults(result) {
        resultContainer.style.display = 'block';
        
        // Set trace metadata
        traceDate.textContent = new Date(result.traceDate).toLocaleString();
        traceAgent.textContent = result.userAgent;
        
        // Display summary
        displaySummary(result);
        
        // Display redirect chain
        displayRedirectChain(result);
        
        // Scroll to results
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Display trace summary
    function displaySummary(result) {
        const linkTypeLabel = getLinkTypeLabel(result.linkType);
        
        let summaryHTML = `
            <div class="summary-item">
                <div class="summary-label">Total Redirects:</div>
                <div class="summary-value">${result.totalRedirects}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Final Destination:</div>
                <div class="summary-value">${escapeHtml(result.finalUrl)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Time:</div>
                <div class="summary-value">${result.totalTime}ms</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Link Type:</div>
                <div class="summary-value">
                    ${result.linkType.charAt(0).toUpperCase() + result.linkType.slice(1)}
                    ${linkTypeLabel}
                </div>
            </div>
        `;
        
        // Add simulation warning if applicable
        if (result.simulation) {
            summaryHTML += `
                <div class="summary-item">
                    <div class="summary-label">Mode:</div>
                    <div class="summary-value warning">
                        <i class="fas fa-info-circle"></i> Simulation Mode
                    </div>
                </div>
            `;
        }
        
        // Add loop detection warning if applicable
        if (result.loopDetected) {
            summaryHTML += `
                <div class="summary-item">
                    <div class="summary-label">Status:</div>
                    <div class="summary-value warning">
                        <i class="fas fa-exclamation-triangle"></i> Redirect loop detected
                    </div>
                </div>
            `;
        }
        
        linkSummary.innerHTML = summaryHTML;
    }

    // Generate badge HTML for link type
    function getLinkTypeLabel(type) {
        switch (type) {
            case 'firebase':
                return '<span class="link-type firebase">Firebase</span>';
            case 'appsflyer':
                return '<span class="link-type appsflyer">AppsFlyer</span>';
            case 'branch':
                return '<span class="link-type branch">Branch</span>';
            case 'adjust':
                return '<span class="link-type adjust">Adjust</span>';
            default:
                return '<span class="link-type unknown">Generic</span>';
        }
    }

    // Display redirect chain
    function displayRedirectChain(result) {
        redirectChain.innerHTML = '';
        
        // Create each redirect step
        result.redirects.forEach((redirect, index) => {
            const isLast = index === result.redirects.length - 1;
            const statusClass = getStatusClass(redirect.status);
            
            const redirectStep = document.createElement('div');
            redirectStep.className = 'redirect-step';
            
            redirectStep.innerHTML = `
                <div class="cell num">${index}</div>
                <div class="cell status">
                    <span class="${statusClass}">${redirect.status || '—'}</span>
                </div>
                <div class="cell url">
                    <div class="url-content">
                        <div class="url-main">${escapeHtml(redirect.url)}</div>
                        <div class="url-meta">
                            ${redirect.cookies ? '<span>🍪 Uses Cookies</span>' : ''}
                            ${redirect.time ? `<span class="time">Time: ${redirect.time}ms</span>` : ''}
                        </div>
                        ${!isLast ? getRedirectArrow(redirect.status) : ''}
                        ${redirect.error ? `<div class="error-message">${redirect.error}</div>` : ''}
                    </div>
                </div>
            `;
            
            redirectChain.appendChild(redirectStep);
        });
    }

    // Get CSS class for status code
    function getStatusClass(status) {
        if (!status) return 'code-0xx';
        if (status >= 200 && status < 300) return 'code-2xx';
        if (status >= 300 && status < 400) return 'code-3xx';
        if (status >= 400 && status < 500) return 'code-4xx';
        if (status >= 500) return 'code-5xx';
        return '';
    }

    // Generate redirect arrow HTML
    function getRedirectArrow(status) {
        let redirectType = 'Redirect';
        if (status === 301) redirectType = '301 Permanent Redirect';
        else if (status === 302) redirectType = '302 Temporary Redirect';
        else if (status === 303) redirectType = '303 See Other';
        else if (status === 307) redirectType = '307 Temporary Redirect';
        else if (status === 308) redirectType = '308 Permanent Redirect';
        else if (status === 200) redirectType = 'JavaScript Redirect';
        
        return `
            <div class="arrow">
                <i class="fas fa-arrow-down"></i>
                <span>${redirectType}</span>
            </div>
        `;
    }

    // Save trace to history
    function saveToHistory(url, result) {
        try {
            const historyItem = {
                id: generateId(url),
                url: url,
                finalUrl: result.finalUrl,
                redirectCount: result.totalRedirects,
                linkType: result.linkType,
                timestamp: new Date().toISOString(),
                displayDate: new Date().toLocaleString(undefined, { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }),
                simulation: !!result.simulation,
                lastUsed: Date.now(),
                starred: false
            };
            
            let history = window.toolStorage.get('dynamic-link-tracer', 'history', []);
            
            // Check if URL already exists in history
            const existingIndex = history.findIndex(item => item.id === historyItem.id);
            if (existingIndex !== -1) {
                // Update existing entry
                history[existingIndex] = {
                    ...history[existingIndex],
                    finalUrl: historyItem.finalUrl,
                    redirectCount: historyItem.redirectCount,
                    timestamp: historyItem.timestamp,
                    displayDate: historyItem.displayDate,
                    simulation: historyItem.simulation,
                    lastUsed: historyItem.lastUsed
                };
            } else {
                // Add new entry
                history.unshift(historyItem);
                
                // Limit history size
                if (history.length > 50) {
                    history = history.slice(0, 50);
                }
            }
            
            window.toolStorage.set('dynamic-link-tracer', 'history', history);
            
            // Update the traces list
            renderTracesList();
        } catch (e) {
            window.myDebugger.logger.error("Error saving to history:", e);
        }
    }

    // Generate ID for history item
    function generateId(url) {
        // Simple hash function for URLs
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `link-${Math.abs(hash)}`;
    }

    // Toggle star status
    function toggleStar(id, event) {
        if (event) event.stopPropagation();
        
        try {
            let history = window.toolStorage.get('dynamic-link-tracer', 'history', []);
            const itemIndex = history.findIndex(entry => entry.id === id);
            
            if (itemIndex !== -1) {
                history[itemIndex].starred = !history[itemIndex].starred;
                window.toolStorage.set('dynamic-link-tracer', 'history', history);
                
                renderTracesList();
                
                window.myDebugger.showStatusMessage(
                    history[itemIndex].starred 
                        ? 'Added to starred traces' 
                        : 'Removed from starred traces'
                );
            }
        } catch (e) {
            window.myDebugger.logger.error("Error toggling star:", e);
            window.myDebugger.showStatusMessage('Error updating star status', true);
        }
    }

    // Load trace into UI
    function loadTrace(id) {
        try {
            let history = window.toolStorage.get('dynamic-link-tracer', 'history', []);
            const item = history.find(entry => entry.id === id);
            
            if (item) {
                // Update "last used" timestamp
                item.lastUsed = Date.now();
                window.toolStorage.set('dynamic-link-tracer', 'history', history);
                
                // Set form values
                linkInput.value = item.url;
                
                // Scroll to top on mobile
                if (window.innerWidth < 1024) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                
                // Trigger trace button click
                traceBtn.click();
                
                window.myDebugger.showStatusMessage('Trace loaded');
            }
        } catch (e) {
            window.myDebugger.logger.error("Error loading trace:", e);
            window.myDebugger.showStatusMessage('Error loading trace', true);
        }
    }

    // Delete trace from history
    function deleteTrace(id, event) {
        if (event) event.stopPropagation();
        
        try {
            let history = window.toolStorage.get('dynamic-link-tracer', 'history', []);
            history = history.filter(entry => entry.id !== id);
            window.toolStorage.set('dynamic-link-tracer', 'history', history);
            
            renderTracesList();
            
            window.myDebugger.showStatusMessage('Trace deleted');
        } catch (e) {
            window.myDebugger.logger.error("Error deleting trace:", e);
            window.myDebugger.showStatusMessage('Error deleting trace', true);
        }
    }

    // Copy URL to clipboard
    function copyUrl(url, event) {
        if (event) event.stopPropagation();
        
        try {
            navigator.clipboard.writeText(url)
                .then(() => {
                    window.myDebugger.showStatusMessage('URL copied to clipboard');
                })
                .catch(err => {
                    window.myDebugger.logger.error('Failed to copy URL:', err);
                    window.myDebugger.showStatusMessage('Failed to copy URL', true);
                });
        } catch (e) {
            window.myDebugger.logger.error("Error copying URL:", e);
            window.myDebugger.showStatusMessage('Error copying URL', true);
        }
    }

    // Render the traces list
    function renderTracesList(searchTerm = '') {
        try {
            const history = window.toolStorage.get('dynamic-link-tracer', 'history', []);
            
            // Update count
            if (traceCount) {
                traceCount.textContent = history.length;
            }
            
            if (history.length === 0) {
                tracesList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-history"></i>
                        <p>No trace history yet</p>
                    </div>
                `;
                return;
            }
            
            const normalizedSearch = searchTerm.toLowerCase();
            
            // Filter by search term if provided
            const filteredHistory = normalizedSearch ? 
                history.filter(entry => 
                    entry.url.toLowerCase().includes(normalizedSearch) || 
                    entry.finalUrl.toLowerCase().includes(normalizedSearch) ||
                    entry.linkType.toLowerCase().includes(normalizedSearch)) : 
                history;
            
            if (filteredHistory.length === 0) {
                tracesList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>No matching traces found</p>
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
            
            tracesList.innerHTML = sortedHistory.map(entry => {
                const linkTypeLabel = getLinkTypeLabel(entry.linkType);
                
                return `
                    <div class="list-item ${entry.starred ? 'starred' : ''}" onclick="loadTrace('${entry.id}')">
                        <button class="star-btn ${entry.starred ? 'active' : ''}" onclick="toggleStar('${entry.id}', event)">
                            <i class="fas fa-star"></i>
                        </button>
                        
                        <div class="list-url">${escapeHtml(entry.url)}</div>
                        
                        <div class="list-metadata">
                            <span>
                                ${entry.displayDate || ''} · 
                                ${linkTypeLabel} · 
                                Redirects: ${entry.redirectCount}
                                ${entry.simulation ? ' · <span class="warning"><i class="fas fa-info-circle"></i> Simulation</span>' : ''}
                            </span>
                            <div class="list-actions">
                                <button class="action-icon tooltip" data-tooltip="Copy URL" onclick="copyUrl('${escapeHtml(entry.url)}', event)">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button class="action-icon tooltip" data-tooltip="Delete" onclick="deleteTrace('${entry.id}', event)">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (e) {
            window.myDebugger.logger.error("Error rendering traces list:", e);
            tracesList.innerHTML = `<div class="empty-state">Error loading trace history</div>`;
        }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Get base path based on current location
    function getBasePath() {
        const path = window.location.pathname;
        return path.includes('/tools/') ? '../' : '';
    }

    // Add current page highlight in navigation
    function highlightCurrentPage() {
        const path = window.location.pathname;
        const navLinks = document.querySelectorAll('header nav a');
        
        navLinks.forEach(link => {
            if (path.includes(link.getAttribute('href'))) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Initialize tool
    function init() {
        // Add Enter key support for the input field
        linkInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                traceBtn.click();
            }
        });
        
        // Set example URL in the input for demonstration
        if (!linkInput.value) {
            linkInput.value = 'https://example.page.link/demo';
        }
        
        // Toggle advanced options
        const advancedToggle = document.getElementById('advanced-options-toggle');
        const optionsContent = document.querySelector('.options-content');
        
        if (advancedToggle && optionsContent) {
            advancedToggle.addEventListener('click', () => {
                optionsContent.classList.toggle('expanded');
                advancedToggle.classList.toggle('active');
            });
        }
        
        // Handle search functionality
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                renderTracesList(searchTerm);
                
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
                renderTracesList();
            });
        }
        
        // Initialize traces list
        renderTracesList();
        
        // Record tool usage analytics
        if (window.toolAnalytics) {
            window.toolAnalytics.recordToolUsage('dynamic-link-tracer', 'view');
        }
        
        // Add current page highlight in navigation
        highlightCurrentPage();
        
        // Set up global functions
        window.toggleStar = toggleStar;
        window.loadTrace = loadTrace;
        window.deleteTrace = deleteTrace;
        window.copyUrl = copyUrl;
    }

    // Call init function
    init();
});