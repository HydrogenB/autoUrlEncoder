/**
 * dynamic-link-tracer.js - Trace dynamic links and redirect chains
 * Provides visualization of redirect paths for Firebase, AppsFlyer and other link types
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const linkInput = document.getElementById('linkInput');
    const traceBtn = document.getElementById('traceBtn');
    const userAgentSelect = document.getElementById('userAgent');
    const maxRedirectsInput = document.getElementById('maxRedirects');
    const followJsRedirectsCheckbox = document.getElementById('followJsRedirects');
    const resultContainer = document.getElementById('resultContainer');
    const traceDate = document.getElementById('traceDate');
    const traceAgent = document.getElementById('traceAgent');
    const redirectChain = document.getElementById('redirectChain');
    const linkSummary = document.getElementById('linkSummary');

    // Available CORS proxies (for redundancy)
    const CORS_PROXIES = [
        'https://api.allorigins.win/get?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://cors-proxy.htmldriven.com/?url=',
        'https://api.codetabs.com/v1/proxy/?quest='
    ];

    // Initialize browser user agent option
    if (userAgentSelect) {
        const browserOption = userAgentSelect.querySelector('option[value="browser"]');
        if (browserOption) {
            browserOption.textContent = `Current Browser - ${navigator.userAgent}`;
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
            traceBtn.disabled = true;
            traceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Tracing...';

            // Get trace options
            const options = {
                maxRedirects: parseInt(maxRedirectsInput.value) || 15,
                followJsRedirects: followJsRedirectsCheckbox.checked,
                userAgent: getUserAgent(userAgentSelect.value)
            };

            // Start tracing
            const result = await traceRedirects(url, options);
            displayResults(result);

            // Log the trace
            window.myDebugger.logger.log("Link traced", { 
                url, 
                redirectCount: result.redirects.length - 1,
                linkType: result.linkType
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
    function getUserAgent(value) {
        switch (value) {
            case 'default':
                return 'MyDebugger Dynamic Link Tracer/1.0';
            case 'browser':
                return navigator.userAgent;
            case 'iphone':
                return 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';
            case 'android':
                return 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Mobile Safari/537.36';
            default:
                return 'MyDebugger Dynamic Link Tracer/1.0';
        }
    }

    // Get a working CORS proxy
    async function getWorkingCorsProxy() {
        // Default to first proxy
        let workingProxy = CORS_PROXIES[0];
        
        // Try a simple test with each proxy
        for (const proxy of CORS_PROXIES) {
            try {
                const testUrl = 'https://httpbin.org/get';
                const response = await fetch(`${proxy}${encodeURIComponent(testUrl)}`);
                if (response.ok) {
                    workingProxy = proxy;
                    break;
                }
            } catch (e) {
                console.log(`Proxy ${proxy} failed test: ${e.message}`);
            }
        }
        
        return workingProxy;
    }

    // Trace redirects using CORS proxy and fetch
    async function traceRedirects(initialUrl, options) {
        try {
            const corsProxy = await getWorkingCorsProxy();
            // First try with CORS proxy
            return await traceWithCorsProxy(initialUrl, options, corsProxy);
        } catch (corsError) {
            window.myDebugger.logger.error("CORS proxy failed:", corsError);
            window.myDebugger.showStatusMessage('Switching to alternative tracing method...', false);
            
            // Fall back to API service if CORS proxy fails
            try {
                return await traceWithApi(initialUrl, options);
            } catch (apiError) {
                window.myDebugger.logger.error("API fallback failed:", apiError);
                throw new Error('Both tracing methods failed. Please try again later.');
            }
        }
    }

    // Helper function to try CORS proxy approach
    async function traceWithCorsProxy(url, options, corsProxy) {
        const redirects = [];
        let currentUrl = url;
        
        while (true) {
            const proxyUrl = `${corsProxy}${encodeURIComponent(currentUrl)}`;
            const response = await fetch(proxyUrl, {
                method: 'HEAD',
                redirect: 'manual'
            });

            redirects.push({
                url: currentUrl,
                statusCode: response.status,
                headers: Object.fromEntries(response.headers)
            });

            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');
                if (!location) break;
                currentUrl = new URL(location, currentUrl).href;
            } else {
                break;
            }

            if (redirects.length >= options.maxRedirects) {
                throw new Error(`Maximum number of redirects (${options.maxRedirects}) exceeded`);
            }
        }

        return redirects;
    }

    // Helper function to use API fallback
    async function traceWithApi(url, options) {
        const response = await fetch('/api/trace-redirects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                maxRedirects: options.maxRedirects
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
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
        
        linkSummary.innerHTML = `
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
            ${result.loopDetected ? `
            <div class="summary-item">
                <div class="summary-label">Status:</div>
                <div class="summary-value warning">
                    <i class="fas fa-exclamation-triangle"></i> Redirect loop detected
                </div>
            </div>` : ''}
        `;
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
        if (!status) return '';
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
                timestamp: new Date().toISOString()
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
                    timestamp: historyItem.timestamp
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
        
        // Record tool usage analytics
        if (window.toolAnalytics) {
            window.toolAnalytics.recordToolUsage('dynamic-link-tracer', 'view');
        }
        
        // Add current page highlight in navigation
        highlightCurrentPage();
    }

    // Add this function to highlight the current page in navigation
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

    // Call init function
    init();
});