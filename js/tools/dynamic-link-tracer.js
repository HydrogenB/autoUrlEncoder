document.addEventListener('DOMContentLoaded', function() {
    const linkInput = document.getElementById('linkInput');
    const traceBtn = document.getElementById('traceBtn');
    const resultContainer = document.getElementById('resultContainer');
    const redirectChain = document.getElementById('redirectChain');
    const linkSummary = document.getElementById('linkSummary');

    traceBtn.addEventListener('click', async () => {
        const url = linkInput.value.trim();
        if (!url) return;

        try {
            traceBtn.disabled = true;
            traceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Tracing...';

            const result = await traceLink(url);
            displayResults(result);

            window.myDebugger.showStatusMessage('Trace completed');
            window.myDebugger.logger.log("Link traced", { url });

        } catch (e) {
            window.myDebugger.showStatusMessage('Error tracing link', true);
            window.myDebugger.logger.error("Trace error:", e);
        } finally {
            traceBtn.disabled = false;
            traceBtn.innerHTML = '<i class="fas fa-project-diagram"></i> Trace Link';
        }
    });

    async function traceLink(url) {
        const response = await fetch(`https://wheregoes.com/trace-api.php?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Trace failed');
        return await response.json();
    }

    function displayResults(result) {
        resultContainer.style.display = 'block';

        // Display redirect chain
        redirectChain.innerHTML = result.redirects.map((redirect, index) => `
            <div class="redirect-step">
                <div class="step-number">${index + 1}</div>
                <div class="step-details">
                    <div class="step-url">${window.myDebugger.escapeHtml(redirect.url)}</div>
                    <div class="step-meta">
                        Status: ${redirect.status}
                        ${redirect.time ? `• Time: ${redirect.time}ms` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        // Display summary
        linkSummary.innerHTML = `
            <div class="summary-item">
                <div class="summary-label">Total Redirects:</div>
                <div class="summary-value">${result.redirects.length}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Final Destination:</div>
                <div class="summary-value">${window.myDebugger.escapeHtml(result.finalUrl)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Time:</div>
                <div class="summary-value">${result.totalTime}ms</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Link Type:</div>
                <div class="summary-value">${detectLinkType(result.redirects)}</div>
            </div>
        `;
    }

    function detectLinkType(redirects) {
        const urls = redirects.map(r => r.url.toLowerCase());
        
        if (urls.some(url => url.includes('firebase') || url.includes('app.goo.gl'))) {
            return 'Firebase Dynamic Link';
        }
        if (urls.some(url => url.includes('onelink') || url.includes('appsflyer'))) {
            return 'AppsFlyer OneLink';
        }
        return 'Unknown';
    }
});
