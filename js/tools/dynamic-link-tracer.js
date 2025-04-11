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
                redirectCount: result.redirects.length,
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

    // Trace redirects using a proxy service
    async function traceRedirects(url, options) {
        // In a real implementation, this would call your backend
        // For now, we'll simulate with a mock response based on typical redirect patterns
        
        // For demo purposes, simulate API call with different responses based on URL patterns
        if (url.includes('firebase') || url.includes('app.goo.gl')) {
            return simulateFirebaseLink(url, options);
        } else if (url.includes('onelink') || url.includes('appsflyer')) {
            return simulateAppsFlyerLink(url, options);
        } else {
            return simulateGenericLink(url, options);
        }
    }

    // Simulate a Firebase Dynamic Link trace
    function simulateFirebaseLink(url, options) {
        const startTime = Date.now();
        const redirects = [
            {
                url: url,
                status: 302,
                time: 150,
                cookies: true
            },
            {
                url: `https://app.goo.gl/${randomString(6)}`,
                status: 302,
                time: 120,
                cookies: false
            },
            {
                url: `https://firebasedynamiclinks-ipv4.googleapis.com/v1/link?deep_link_id=${randomString(10)}`,
                status: 200,
                time: 180,
                cookies: true
            },
            {
                url: `https://app.example.com/open?link=${randomString(12)}&utm_source=firebase&utm_medium=dynamic_link`,
                status: 301,
                time: 110,
                cookies: true
            },
            {
                url: `https://app.example.com/product/${randomString(8)}?ref=firebase`,
                status: 200,
                time: 200,
                cookies: true
            }
        ];

        return {
            redirects,
            finalUrl: redirects[redirects.length - 1].url,
            totalTime: redirects.reduce((sum, r) => sum + r.time, 0),
            totalRedirects: redirects.length - 1,
            linkType: 'firebase',
            traceDate: new Date().toISOString(),
            userAgent: options.userAgent
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
            },
            {
                url: `https://example.page.link/${randomString(7)}`,
                status: 302,
                time: 100,
                cookies: false
            },
            {
                url: `https://app.example.com/landing?utm_source=appsflyer&utm_campaign=${randomString(8)}`,
                status: 200,
                time: 180,
                cookies: true
            }
        ];

        return {
            redirects,
            finalUrl: redirects[redirects.length - 1].url,
            totalTime: redirects.reduce((sum, r) => sum + r.time, 0),
            totalRedirects: redirects.length - 1,
            linkType: 'appsflyer',
            traceDate: new Date().toISOString(),
            userAgent: options.userAgent
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
            traceDate: new Date().toISOString(),
            userAgent: options.userAgent
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
                <div class="cell num">${index + 1}</div>
                <div class="cell status">
                    <span class="${statusClass}">${redirect.status || 'JS'}</span>
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

    // Initialize tool
    function init() {
        // Add Enter key support for the input field
        linkInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                traceBtn.click();
            }
        });
        
        // Record tool usage analytics
        if (window.toolAnalytics) {
            window.toolAnalytics.recordToolUsage('dynamic-link-tracer', 'view');
        }
    }

    // Call init function
    init();
});