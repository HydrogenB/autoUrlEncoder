/**
 * common.js - Common functionality for MyDebugger Tools Platform
 * Includes header/footer injection, path helpers, and utility functions
 */

// Vercel-compatible logging function
const logger = {
    log: function(msg, data) {
        if (typeof console !== 'undefined') {
            const timestamp = new Date().toISOString();
            const formattedMsg = `[${timestamp}] ${msg}`;
            if (data) {
                console.log(formattedMsg, data);
            } else {
                console.log(formattedMsg);
            }
        }
        
        // In production with Vercel, we could send logs to a monitoring service
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
            try {
                // Collect logs for potential serverless function reporting
                const logEntry = {
                    timestamp: Date.now(),
                    message: msg,
                    data: data || null,
                    url: window.location.href,
                    userAgent: navigator.userAgent
                };
                
                // Store in local storage for demo purposes
                // In a real app, you might send these to a serverless function
                const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
                logs.push(logEntry);
                // Keep only the last 100 logs
                if (logs.length > 100) logs.splice(0, logs.length - 100);
                localStorage.setItem('app_logs', JSON.stringify(logs));
            } catch (e) {
                console.error('Error saving log:', e);
            }
        }
    },
    error: function(msg, error) {
        if (typeof console !== 'undefined') {
            const timestamp = new Date().toISOString();
            const formattedMsg = `[${timestamp}] ERROR: ${msg}`;
            if (error && error.stack) {
                console.error(formattedMsg, error.stack);
            } else if (error) {
                console.error(formattedMsg, error);
            } else {
                console.error(formattedMsg);
            }
        }
        
        // In production with Vercel, we could send errors to a monitoring service
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
            try {
                // Collect errors for potential serverless function reporting
                const errorEntry = {
                    timestamp: Date.now(),
                    message: msg,
                    error: error ? (error.stack || error.toString()) : null,
                    url: window.location.href,
                    userAgent: navigator.userAgent
                };
                
                // Store in local storage for demo purposes
                // In a real app, you might send these to a serverless function
                const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
                errors.push(errorEntry);
                // Keep only the last 50 errors
                if (errors.length > 50) errors.splice(0, errors.length - 50);
                localStorage.setItem('app_errors', JSON.stringify(errors));
            } catch (e) {
                console.error('Error saving error log:', e);
            }
        }
    }
};

// Get base path for all URLs
function getBasePath() {
    const path = window.location.pathname;
    return path.includes('/tools/') ? '../' : '';
}

// Render header navigation
function renderHeader() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;

    const currentPage = window.location.pathname;
    
    const tools = [
        { id: 'url-encoder', name: 'URL Encoder', path: 'index.html' },
        { id: 'jwt-decoder', name: 'JWT Decoder', path: 'tools/jwt-decoder.html' },
        { id: 'dynamic-link-tracer', name: 'Dynamic Link Tracer', path: 'tools/dynamic-link-tracer.html' },
        { id: 'base64-converter', name: 'Base64 Tool', path: 'tools/base64-tool.html' }
    ];

    headerContainer.innerHTML = `
        <header>
            <div class="container">
                <div class="logo">
                    <a href="${getBasePath()}index.html">MyDebugger</a>
                </div>
                <nav>
                    <ul>
                        <li>
                            <a href="${getBasePath()}landing.html" 
                               class="${currentPage.includes('landing.html') ? 'active' : ''}">
                                Home
                            </a>
                        </li>
                        ${tools.map(tool => `
                            <li>
                                <a href="${getBasePath()}${tool.path}" 
                                   class="${currentPage.includes(tool.path) || 
                                          (tool.path === 'index.html' && (currentPage === '/' || currentPage === '')) ? 
                                          'active' : ''}">
                                    ${tool.name}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </nav>
            </div>
        </header>
    `;
}

// Show status message popup
function showStatusMessage(message, isError = false) {
    const existingStatus = document.getElementById('statusMessage');
    let statusElement;
    
    if (existingStatus) {
        statusElement = existingStatus;
    } else {
        statusElement = document.createElement('div');
        statusElement.id = 'statusMessage';
        statusElement.className = 'status-message';
        document.body.appendChild(statusElement);
    }
    
    statusElement.textContent = message;
    statusElement.style.backgroundColor = isError ? 'rgba(247, 37, 133, 0.9)' : 'rgba(0, 0, 0, 0.8)';
    
    statusElement.classList.add('show');
    
    setTimeout(() => {
        statusElement.classList.remove('show');
    }, 2000);
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Log visitor information
function logVisitorInfo() {
    try {
        const visitorInfo = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: new Date().toISOString(),
            referrer: document.referrer || 'direct',
            hostname: window.location.hostname
        };
        
        // Store in Vercel-compatible format
        logger.log("Visitor information", visitorInfo);
    } catch (e) {
        logger.error('Error logging visitor information:', e);
    }
}

// Initialize common components
document.addEventListener('DOMContentLoaded', function() {
    renderHeader();
    
    // Inject footer
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        const currentYear = new Date().getFullYear();
        footerContainer.innerHTML = `
            <footer>
                <div class="container">
                    <div class="footer-content">
                        <div class="footer-section">
                            <h3>MyDebugger Tools</h3>
                            <p>A collection of developer-focused utilities for debugging, testing, and development</p>
                        </div>
                        
                        <div class="footer-section">
                            <h3>Quick Links</h3>
                            <ul>
                                <li><a href="${getBasePath()}landing.html">Tools Home</a></li>
                                <li><a href="${getBasePath()}index.html">URL Encoder</a></li>
                                <li><a href="${getBasePath()}tools/jwt-decoder.html">JWT Decoder</a></li>
                                <li><a href="${getBasePath()}tools/dynamic-link-tracer.html">Dynamic Link Tracer</a></li>
                                <li><a href="${getBasePath()}tools/base64-tool.html">Base64 Tool</a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="footer-bottom">
                        <div class="deploy-info">
                            Last deployed: <span id="deployDate">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div class="disclaimer">
                            All tools are provided "as is" without warranty. Processing occurs client-side for your privacy.
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }
    
    // Create status message container if it doesn't exist
    if (!document.getElementById('statusMessage')) {
        const statusElement = document.createElement('div');
        statusElement.id = 'statusMessage';
        statusElement.className = 'status-message';
        document.body.appendChild(statusElement);
    }
    
    // Log visitor information
    logVisitorInfo();
});

// Expose utility functions globally
window.myDebugger = {
    logger,
    showStatusMessage,
    escapeHtml,
    getBasePath
};
