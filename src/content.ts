// content.ts - Content script that runs in web page context
// Has access to DOM and can inject axe-core for accessibility analysis

// Inject axe-core into the page
async function injectAxeCore() {
    // Check if axe-core is already loaded
    if (typeof (window as any).axe !== 'undefined') {
        return;
    }

    try {
        // Import axe-core dynamically
        const axe = await import('axe-core');
        
        // Make axe available globally
        (window as any).axe = axe.default || axe;
        
        console.log('axe-core loaded successfully');
    } catch (error) {
        console.error('Failed to load axe-core:', error);
    }
}

// Initialize on script load
injectAxeCore();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'runAxeAnalysis') {
        (async () => {
            try {
                await injectAxeCore();
                
                if (typeof (window as any).axe === 'undefined') {
                    sendResponse({
                        success: false,
                        error: 'axe-core is not available'
                    });
                    return;
                }

                const axe = (window as any).axe;
                const results = await new Promise((resolve, reject) => {
                    axe.run(document, {
                        runOnly: {
                            type: 'tag',
                            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
                        }
                    }, (err: Error | null, results: any) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(results);
                        }
                    });
                });

                sendResponse({
                    success: true,
                    results
                });
            } catch (error) {
                sendResponse({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        })();
        
        return true; // Indicate async response
    }

    if (message.action === 'getDOMAnalysis') {
        // Return DOM structure for analysis (legacy, kept for compatibility)
        const html = document.documentElement.outerHTML;
        sendResponse({
            success: true,
            html
        });
        return true;
    }

});
