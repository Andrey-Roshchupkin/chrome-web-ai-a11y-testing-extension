// window.ts - handles interaction with the extension's window UI, sends requests to the
// service worker (background.ts), and updates the window's UI (window.html) on completion.

import type { ScreenshotResponse, APIProvider } from './shared/types';
import { escapeHtml, formatResultsForCopy, renderAccessibilityReport } from './shared/uiHelpers';

const outputElement = document.getElementById('output') as HTMLPreElement;
const analyzeButton = document.getElementById('analyzeScreenshot') as HTMLButtonElement;
const apiUrlInput = document.getElementById('apiUrl') as HTMLInputElement;
const modelNameInput = document.getElementById('modelName') as HTMLInputElement;
const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const ollamaFields = document.getElementById('ollamaFields') as HTMLDivElement;
const googleWebAIFields = document.getElementById('googleWebAIFields') as HTMLDivElement;
const providerRadios = document.querySelectorAll('input[name="apiProvider"]') as NodeListOf<HTMLInputElement>;
const resultsSection = document.getElementById('resultsSection') as HTMLDivElement;
const resultsContent = document.getElementById('resultsContent') as HTMLDivElement;
const copyResultsButton = document.getElementById('copyResults') as HTMLButtonElement;
const saveResultsButton = document.getElementById('saveResults') as HTMLButtonElement;
const copyRawJsonButton = document.getElementById('copyRawJson') as HTMLButtonElement;

let currentResults: any = null;

let currentProvider: APIProvider = 'google-web-ai';

// Function to update UI based on selected provider
function updateProviderUI(provider: APIProvider) {
    currentProvider = provider;
    
    if (provider === 'ollama') {
        ollamaFields.style.display = 'block';
        googleWebAIFields.style.display = 'none';
    } else {
        ollamaFields.style.display = 'none';
        googleWebAIFields.style.display = 'block';
    }
    
    updateAnalyzeButtonState();
}

// Function to check if inputs are filled and enable/disable analyze button
function updateAnalyzeButtonState() {
    if (currentProvider === 'ollama') {
        const apiUrl = apiUrlInput.value.trim();
        const modelName = modelNameInput.value.trim();
        analyzeButton.disabled = !(apiUrl && modelName);
    } else {
        // Google Web AI doesn't require additional inputs
        analyzeButton.disabled = false;
    }
}

// Function to lock/unlock UI during analysis
function setUILocked(locked: boolean) {
    // Lock/unlock analyze button
    analyzeButton.disabled = locked;
    
    // Lock/unlock radio buttons
    providerRadios.forEach(radio => {
        (radio as HTMLInputElement).disabled = locked;
    });
    
    // Lock/unlock input fields
    apiUrlInput.disabled = locked;
    modelNameInput.disabled = locked;
    apiKeyInput.disabled = locked;
    
    // Update visual state
    if (locked) {
        document.body.style.opacity = '0.7';
        document.body.style.pointerEvents = 'none';
        analyzeButton.style.pointerEvents = 'auto';
    } else {
        document.body.style.opacity = '1';
        document.body.style.pointerEvents = 'auto';
        updateAnalyzeButtonState();
    }
}

// Listen to provider radio button changes
providerRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
            updateProviderUI(target.value as APIProvider);
        }
    });
});

// Listen to input changes to update button state
apiUrlInput.addEventListener('input', updateAnalyzeButtonState);
modelNameInput.addEventListener('input', updateAnalyzeButtonState);

// Initialize UI on page load
// Load saved config from storage if available
chrome.storage.local.get(['windowConfig'], (result) => {
    if (result.windowConfig) {
        const config = result.windowConfig;
        if (config.provider === 'ollama') {
            if (config.apiUrl) apiUrlInput.value = config.apiUrl;
            if (config.modelName) modelNameInput.value = config.modelName;
            if (config.apiKey) apiKeyInput.value = config.apiKey;
        }
        updateProviderUI(config.provider || 'google-web-ai');
    } else {
        updateProviderUI('google-web-ai');
    }
});

// Display results function
function displayResults(results: any) {
    resultsSection.style.display = 'block';
    
    // Clear previous results
    resultsContent.innerHTML = '';
    
    // If results have summary and recommendations (AccessibilityReport format)
    if (results.summary && results.recommendations) {
        displayAccessibilityReport(results);
    } else {
        // Fallback: display as JSON
        resultsContent.textContent = JSON.stringify(results, null, 2);
    }
}

function displayAccessibilityReport(report: any) {
    renderAccessibilityReport(report, resultsContent);
}

// Copy results to clipboard
copyResultsButton.addEventListener('click', async () => {
    if (!currentResults) {
        alert('No results to copy');
        return;
    }
    
    try {
        // Format results for better readability
        const formattedResults = formatResultsForCopy(currentResults);
        await navigator.clipboard.writeText(formattedResults);
        
        copyResultsButton.textContent = '✅ Copied!';
        setTimeout(() => {
            copyResultsButton.textContent = '📋 Copy';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback: try to copy JSON
        try {
            const textArea = document.createElement('textarea');
            textArea.value = JSON.stringify(currentResults, null, 2);
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            copyResultsButton.textContent = '✅ Copied!';
            setTimeout(() => {
                copyResultsButton.textContent = '📋 Copy';
            }, 2000);
        } catch (fallbackErr) {
            alert('Failed to copy results');
        }
    }
});


// Save results to file
saveResultsButton.addEventListener('click', () => {
    if (!currentResults) {
        alert('No results to save');
        return;
    }
    
    const dataStr = JSON.stringify(currentResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accessibility-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    saveResultsButton.textContent = '✅ Saved!';
    setTimeout(() => {
        saveResultsButton.textContent = '💾 Save';
    }, 2000);
});

// Copy raw JSON for testing
copyRawJsonButton.addEventListener('click', async () => {
    if (!currentResults) {
        alert('No results to copy');
        return;
    }
    
    try {
        // Copy full raw JSON (suitable for tests)
        const rawJson = JSON.stringify(currentResults, null, 2);
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(rawJson);
            copyRawJsonButton.textContent = '✅ Copied!';
            setTimeout(() => {
                copyRawJsonButton.textContent = '📄 Copy Raw JSON';
            }, 2000);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = rawJson;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                copyRawJsonButton.textContent = '✅ Copied!';
                setTimeout(() => {
                    copyRawJsonButton.textContent = '📄 Copy Raw JSON';
                }, 2000);
            } catch (err) {
                alert('Failed to copy. Please copy manually from the console.');
                console.log('Raw JSON for testing:', rawJson);
            }
            document.body.removeChild(textArea);
        }
    } catch (error) {
        console.error('Error copying raw JSON:', error);
        alert('Failed to copy raw JSON');
    }
});

// Handle screenshot analysis button click - captures screenshot and analyzes
analyzeButton.addEventListener('click', () => {
    setUILocked(true);
    analyzeButton.textContent = '⏳ Capturing screenshot...';
    outputElement.textContent = 'Capturing screenshot...';
    
    // First, capture screenshot
    chrome.runtime.sendMessage({
        action: 'captureScreenshot'
    }, (screenshotResponse: ScreenshotResponse) => {
            if (!screenshotResponse || !screenshotResponse.success || !screenshotResponse.dataUrl) {
                outputElement.textContent = `Error capturing screenshot: ${screenshotResponse?.error || 'Unknown error'}`;
                analyzeButton.textContent = '❌ Error';
                setUILocked(false);
                setTimeout(() => {
                    analyzeButton.textContent = '🔍 Analyze Screenshot';
                }, 2000);
                return;
            }
        
        const screenshotDataUrl = screenshotResponse.dataUrl;
        
        // Prepare config based on selected provider
        let config: any = {
            provider: currentProvider
        };
        
        if (currentProvider === 'ollama') {
            const apiUrl = apiUrlInput.value.trim();
            const modelName = modelNameInput.value.trim();
            const apiKey = apiKeyInput.value.trim();
            
            if (!apiUrl || !modelName) {
                outputElement.textContent = 'Error: Please fill in API URL and model name';
                analyzeButton.textContent = '❌ Error';
                setUILocked(false);
                setTimeout(() => {
                    analyzeButton.textContent = '🔍 Analyze Screenshot';
                }, 2000);
                return;
            }
            
            config.apiUrl = apiUrl;
            config.modelName = modelName;
            if (apiKey) {
                config.apiKey = apiKey;
            }
            
            analyzeButton.textContent = '⏳ Analyzing...';
            outputElement.textContent = 'Sending request to Ollama...\nThis may take 1.5-2 minutes.';
        } else {
            // Google Web AI
            config.outputLanguage = 'en';
            analyzeButton.textContent = '⏳ Analyzing...';
            outputElement.textContent = 'Sending request to Google Web AI...\nThis may take 1.5-2 minutes.';
        }
        
        // Send screenshot to API for full accessibility analysis
        chrome.runtime.sendMessage({
            action: 'analyzeAccessibility',
            imageDataUrl: screenshotDataUrl,
            config: config
        }, (response: any) => {
            if (response && response.success) {
                // Store full results for copying/saving
                currentResults = {
                    report: response.report,
                    screenshotAnalysis: response.screenshotAnalysis,
                    domAnalysis: response.domAnalysis,
                    colorAnalysis: response.colorAnalysis,
                    matchingResult: response.matchingResult,
                    timestamp: new Date().toISOString()
                };
                
                // Display formatted report
                displayResults(response.report || response);
                analyzeButton.textContent = '✅ Analysis Complete';
                outputElement.textContent = `Analysis complete! Found ${response.report?.summary?.totalIssues || 0} issues.`;
            } else {
                outputElement.textContent = `Analysis error: ${response?.error || 'Unknown error'}`;
                analyzeButton.textContent = '❌ Error';
                resultsSection.style.display = 'none';
                currentResults = null;
            }
            
            setUILocked(false);
            setTimeout(() => {
                analyzeButton.textContent = '🔍 Analyze Screenshot';
            }, 3000);
        });
    });
});
