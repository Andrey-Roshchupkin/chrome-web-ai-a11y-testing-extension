/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/shared/uiHelpers.ts":
/*!*********************************!*\
  !*** ./src/shared/uiHelpers.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   escapeHtml: () => (/* binding */ escapeHtml),
/* harmony export */   formatResultsForCopy: () => (/* binding */ formatResultsForCopy),
/* harmony export */   renderAccessibilityReport: () => (/* binding */ renderAccessibilityReport)
/* harmony export */ });
// shared/uiHelpers.ts - Shared UI helper functions for the extension window
/**
 * Escapes HTML to prevent XSS and display issues
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
/**
 * Formats accessibility report results for copying to clipboard
 */
function formatResultsForCopy(results) {
    if (results.report) {
        const report = results.report;
        let text = '=== ACCESSIBILITY ANALYSIS REPORT ===\n\n';
        text += `Generated: ${results.timestamp || new Date().toISOString()}\n\n`;
        // Summary
        if (report.summary) {
            text += 'SUMMARY:\n';
            text += `Total Issues: ${report.summary.totalIssues}\n`;
            text += `Critical: ${report.summary.criticalIssues}\n`;
            text += `High Priority: ${report.summary.seriousIssues}\n`;
            text += `Medium Priority: ${report.summary.moderateIssues}\n`;
            text += `Low Priority: ${report.summary.minorIssues}\n`;
            text += `WCAG Level A: ${report.summary.wcagLevelA}\n`;
            text += `WCAG Level AA: ${report.summary.wcagLevelAA}\n\n`;
        }
        // Recommendations
        if (report.recommendations && report.recommendations.length > 0) {
            text += 'RECOMMENDATIONS:\n\n';
            report.recommendations.forEach((rec, index) => {
                text += `${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}\n`;
                text += `   ${rec.description}\n`;
                if (rec.fix) {
                    text += `   Fix: ${rec.fix}\n`;
                }
                if (rec.wcagCriteria && rec.wcagCriteria.length > 0) {
                    text += `   WCAG: ${rec.wcagCriteria.join(', ')}\n`;
                }
                text += '\n';
            });
        }
        text += '\n=== FULL JSON DATA ===\n';
        text += JSON.stringify(results, null, 2);
        return text;
    }
    return JSON.stringify(results, null, 2);
}
/**
 * Renders accessibility report HTML and inserts it into the target element
 */
function renderAccessibilityReport(report, targetElement) {
    const { summary, recommendations } = report;
    // Summary statistics
    const summaryHTML = `
        <div class="summary-stats">
            <div class="stat-item">
                <div class="stat-label">Total Issues</div>
                <div class="stat-value">${summary.totalIssues}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Critical</div>
                <div class="stat-value critical">${summary.criticalIssues}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">High Priority</div>
                <div class="stat-value high">${summary.seriousIssues}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Medium Priority</div>
                <div class="stat-value medium">${summary.moderateIssues}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">WCAG Level A</div>
                <div class="stat-value">${summary.wcagLevelA}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">WCAG Level AA</div>
                <div class="stat-value">${summary.wcagLevelAA}</div>
            </div>
        </div>
    `;
    targetElement.innerHTML = summaryHTML;
    // Recommendations
    if (recommendations && recommendations.length > 0) {
        const recommendationsHTML = `
            <div style="margin-top: 16px;">
                <h4 style="margin-bottom: 12px; font-size: 14px; font-weight: 600;">Recommendations (${recommendations.length}):</h4>
                ${recommendations.map((rec, index) => `
                    <div class="recommendation-item priority-${rec.priority}">
                        <div class="recommendation-title">
                            ${index + 1}. ${escapeHtml(rec.title || '')}
                        </div>
                        <div class="recommendation-description">
                            ${escapeHtml(rec.description || '')}
                        </div>
                        ${rec.fix ? `
                            <div class="recommendation-fix">
                                <strong>Fix:</strong><br>
                                ${escapeHtml(rec.fix)}
                            </div>
                        ` : ''}
                        ${rec.example ? `
                            <div class="recommendation-fix" style="margin-top: 4px;">
                                <strong>Example:</strong><br>
                                ${escapeHtml(rec.example)}
                            </div>
                        ` : ''}
                        <div class="recommendation-meta">
                            ${rec.wcagCriteria && rec.wcagCriteria.length > 0 ?
            rec.wcagCriteria.map((c) => `<span class="wcag-badge">WCAG ${escapeHtml(c)}</span>`).join(' ')
            : ''}
                            <span style="margin-left: 8px;">Priority: <strong>${escapeHtml(rec.priority || '')}</strong></span>
                            <span>Category: ${escapeHtml(rec.category || '')}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        targetElement.innerHTML += recommendationsHTML;
    }
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!***********************!*\
  !*** ./src/window.ts ***!
  \***********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_uiHelpers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./shared/uiHelpers */ "./src/shared/uiHelpers.ts");
// window.ts - handles interaction with the extension's window UI, sends requests to the
// service worker (background.ts), and updates the window's UI (window.html) on completion.

const outputElement = document.getElementById('output');
const analyzeButton = document.getElementById('analyzeScreenshot');
const apiUrlInput = document.getElementById('apiUrl');
const modelNameInput = document.getElementById('modelName');
const apiKeyInput = document.getElementById('apiKey');
const ollamaFields = document.getElementById('ollamaFields');
const googleWebAIFields = document.getElementById('googleWebAIFields');
const providerRadios = document.querySelectorAll('input[name="apiProvider"]');
const resultsSection = document.getElementById('resultsSection');
const resultsContent = document.getElementById('resultsContent');
const copyResultsButton = document.getElementById('copyResults');
const saveResultsButton = document.getElementById('saveResults');
const copyRawJsonButton = document.getElementById('copyRawJson');
let currentResults = null;
let currentProvider = 'google-web-ai';
// Function to update UI based on selected provider
function updateProviderUI(provider) {
    currentProvider = provider;
    if (provider === 'ollama') {
        ollamaFields.style.display = 'block';
        googleWebAIFields.style.display = 'none';
    }
    else {
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
    }
    else {
        // Google Web AI doesn't require additional inputs
        analyzeButton.disabled = false;
    }
}
// Function to lock/unlock UI during analysis
function setUILocked(locked) {
    // Lock/unlock analyze button
    analyzeButton.disabled = locked;
    // Lock/unlock radio buttons
    providerRadios.forEach(radio => {
        radio.disabled = locked;
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
    }
    else {
        document.body.style.opacity = '1';
        document.body.style.pointerEvents = 'auto';
        updateAnalyzeButtonState();
    }
}
// Listen to provider radio button changes
providerRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const target = e.target;
        if (target.checked) {
            updateProviderUI(target.value);
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
            if (config.apiUrl)
                apiUrlInput.value = config.apiUrl;
            if (config.modelName)
                modelNameInput.value = config.modelName;
            if (config.apiKey)
                apiKeyInput.value = config.apiKey;
        }
        updateProviderUI(config.provider || 'google-web-ai');
    }
    else {
        updateProviderUI('google-web-ai');
    }
});
// Display results function
function displayResults(results) {
    resultsSection.style.display = 'block';
    // Clear previous results
    resultsContent.innerHTML = '';
    // If results have summary and recommendations (AccessibilityReport format)
    if (results.summary && results.recommendations) {
        displayAccessibilityReport(results);
    }
    else {
        // Fallback: display as JSON
        resultsContent.textContent = JSON.stringify(results, null, 2);
    }
}
function displayAccessibilityReport(report) {
    (0,_shared_uiHelpers__WEBPACK_IMPORTED_MODULE_0__.renderAccessibilityReport)(report, resultsContent);
}
// Copy results to clipboard
copyResultsButton.addEventListener('click', async () => {
    if (!currentResults) {
        alert('No results to copy');
        return;
    }
    try {
        // Format results for better readability
        const formattedResults = (0,_shared_uiHelpers__WEBPACK_IMPORTED_MODULE_0__.formatResultsForCopy)(currentResults);
        await navigator.clipboard.writeText(formattedResults);
        copyResultsButton.textContent = '✅ Copied!';
        setTimeout(() => {
            copyResultsButton.textContent = '📋 Copy';
        }, 2000);
    }
    catch (err) {
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
        }
        catch (fallbackErr) {
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
        }
        else {
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
            }
            catch (err) {
                alert('Failed to copy. Please copy manually from the console.');
                console.log('Raw JSON for testing:', rawJson);
            }
            document.body.removeChild(textArea);
        }
    }
    catch (error) {
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
    }, (screenshotResponse) => {
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
        let config = {
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
        }
        else {
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
        }, (response) => {
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
            }
            else {
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

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QSx1RUFBdUUsNkNBQTZDO0FBQ3BIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0VBQXdFLDRDQUE0QztBQUNwSDtBQUNBO0FBQ0EsK0RBQStELG1DQUFtQztBQUNsRztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTO0FBQ1QsS0FBSztBQUNMLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9leHRlbnNpb24vLi9zcmMvc2hhcmVkL3VpSGVscGVycy50cyIsIndlYnBhY2s6Ly9leHRlbnNpb24vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vZXh0ZW5zaW9uL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9leHRlbnNpb24vd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9leHRlbnNpb24vd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9leHRlbnNpb24vLi9zcmMvd2luZG93LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIHNoYXJlZC91aUhlbHBlcnMudHMgLSBTaGFyZWQgVUkgaGVscGVyIGZ1bmN0aW9ucyBmb3IgdGhlIGV4dGVuc2lvbiB3aW5kb3dcbi8qKlxuICogRXNjYXBlcyBIVE1MIHRvIHByZXZlbnQgWFNTIGFuZCBkaXNwbGF5IGlzc3Vlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlSHRtbCh0ZXh0KSB7XG4gICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LnRleHRDb250ZW50ID0gdGV4dDtcbiAgICByZXR1cm4gZGl2LmlubmVySFRNTDtcbn1cbi8qKlxuICogRm9ybWF0cyBhY2Nlc3NpYmlsaXR5IHJlcG9ydCByZXN1bHRzIGZvciBjb3B5aW5nIHRvIGNsaXBib2FyZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0UmVzdWx0c0ZvckNvcHkocmVzdWx0cykge1xuICAgIGlmIChyZXN1bHRzLnJlcG9ydCkge1xuICAgICAgICBjb25zdCByZXBvcnQgPSByZXN1bHRzLnJlcG9ydDtcbiAgICAgICAgbGV0IHRleHQgPSAnPT09IEFDQ0VTU0lCSUxJVFkgQU5BTFlTSVMgUkVQT1JUID09PVxcblxcbic7XG4gICAgICAgIHRleHQgKz0gYEdlbmVyYXRlZDogJHtyZXN1bHRzLnRpbWVzdGFtcCB8fCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XFxuXFxuYDtcbiAgICAgICAgLy8gU3VtbWFyeVxuICAgICAgICBpZiAocmVwb3J0LnN1bW1hcnkpIHtcbiAgICAgICAgICAgIHRleHQgKz0gJ1NVTU1BUlk6XFxuJztcbiAgICAgICAgICAgIHRleHQgKz0gYFRvdGFsIElzc3VlczogJHtyZXBvcnQuc3VtbWFyeS50b3RhbElzc3Vlc31cXG5gO1xuICAgICAgICAgICAgdGV4dCArPSBgQ3JpdGljYWw6ICR7cmVwb3J0LnN1bW1hcnkuY3JpdGljYWxJc3N1ZXN9XFxuYDtcbiAgICAgICAgICAgIHRleHQgKz0gYEhpZ2ggUHJpb3JpdHk6ICR7cmVwb3J0LnN1bW1hcnkuc2VyaW91c0lzc3Vlc31cXG5gO1xuICAgICAgICAgICAgdGV4dCArPSBgTWVkaXVtIFByaW9yaXR5OiAke3JlcG9ydC5zdW1tYXJ5Lm1vZGVyYXRlSXNzdWVzfVxcbmA7XG4gICAgICAgICAgICB0ZXh0ICs9IGBMb3cgUHJpb3JpdHk6ICR7cmVwb3J0LnN1bW1hcnkubWlub3JJc3N1ZXN9XFxuYDtcbiAgICAgICAgICAgIHRleHQgKz0gYFdDQUcgTGV2ZWwgQTogJHtyZXBvcnQuc3VtbWFyeS53Y2FnTGV2ZWxBfVxcbmA7XG4gICAgICAgICAgICB0ZXh0ICs9IGBXQ0FHIExldmVsIEFBOiAke3JlcG9ydC5zdW1tYXJ5LndjYWdMZXZlbEFBfVxcblxcbmA7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVjb21tZW5kYXRpb25zXG4gICAgICAgIGlmIChyZXBvcnQucmVjb21tZW5kYXRpb25zICYmIHJlcG9ydC5yZWNvbW1lbmRhdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGV4dCArPSAnUkVDT01NRU5EQVRJT05TOlxcblxcbic7XG4gICAgICAgICAgICByZXBvcnQucmVjb21tZW5kYXRpb25zLmZvckVhY2goKHJlYywgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IGAke2luZGV4ICsgMX0uIFske3JlYy5wcmlvcml0eS50b1VwcGVyQ2FzZSgpfV0gJHtyZWMudGl0bGV9XFxuYDtcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IGAgICAke3JlYy5kZXNjcmlwdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgIGlmIChyZWMuZml4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRleHQgKz0gYCAgIEZpeDogJHtyZWMuZml4fVxcbmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZWMud2NhZ0NyaXRlcmlhICYmIHJlYy53Y2FnQ3JpdGVyaWEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9IGAgICBXQ0FHOiAke3JlYy53Y2FnQ3JpdGVyaWEuam9pbignLCAnKX1cXG5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0ZXh0ICs9ICdcXG4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGV4dCArPSAnXFxuPT09IEZVTEwgSlNPTiBEQVRBID09PVxcbic7XG4gICAgICAgIHRleHQgKz0gSlNPTi5zdHJpbmdpZnkocmVzdWx0cywgbnVsbCwgMik7XG4gICAgICAgIHJldHVybiB0ZXh0O1xuICAgIH1cbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocmVzdWx0cywgbnVsbCwgMik7XG59XG4vKipcbiAqIFJlbmRlcnMgYWNjZXNzaWJpbGl0eSByZXBvcnQgSFRNTCBhbmQgaW5zZXJ0cyBpdCBpbnRvIHRoZSB0YXJnZXQgZWxlbWVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQWNjZXNzaWJpbGl0eVJlcG9ydChyZXBvcnQsIHRhcmdldEVsZW1lbnQpIHtcbiAgICBjb25zdCB7IHN1bW1hcnksIHJlY29tbWVuZGF0aW9ucyB9ID0gcmVwb3J0O1xuICAgIC8vIFN1bW1hcnkgc3RhdGlzdGljc1xuICAgIGNvbnN0IHN1bW1hcnlIVE1MID0gYFxuICAgICAgICA8ZGl2IGNsYXNzPVwic3VtbWFyeS1zdGF0c1wiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN0YXQtaXRlbVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+VG90YWwgSXNzdWVzPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke3N1bW1hcnkudG90YWxJc3N1ZXN9PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LWl0ZW1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPkNyaXRpY2FsPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN0YXQtdmFsdWUgY3JpdGljYWxcIj4ke3N1bW1hcnkuY3JpdGljYWxJc3N1ZXN9PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LWl0ZW1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPkhpZ2ggUHJpb3JpdHk8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZSBoaWdoXCI+JHtzdW1tYXJ5LnNlcmlvdXNJc3N1ZXN9PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LWl0ZW1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPk1lZGl1bSBQcmlvcml0eTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlIG1lZGl1bVwiPiR7c3VtbWFyeS5tb2RlcmF0ZUlzc3Vlc308L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN0YXQtaXRlbVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+V0NBRyBMZXZlbCBBPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke3N1bW1hcnkud2NhZ0xldmVsQX08L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN0YXQtaXRlbVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+V0NBRyBMZXZlbCBBQTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtzdW1tYXJ5LndjYWdMZXZlbEFBfTwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgIGA7XG4gICAgdGFyZ2V0RWxlbWVudC5pbm5lckhUTUwgPSBzdW1tYXJ5SFRNTDtcbiAgICAvLyBSZWNvbW1lbmRhdGlvbnNcbiAgICBpZiAocmVjb21tZW5kYXRpb25zICYmIHJlY29tbWVuZGF0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IHJlY29tbWVuZGF0aW9uc0hUTUwgPSBgXG4gICAgICAgICAgICA8ZGl2IHN0eWxlPVwibWFyZ2luLXRvcDogMTZweDtcIj5cbiAgICAgICAgICAgICAgICA8aDQgc3R5bGU9XCJtYXJnaW4tYm90dG9tOiAxMnB4OyBmb250LXNpemU6IDE0cHg7IGZvbnQtd2VpZ2h0OiA2MDA7XCI+UmVjb21tZW5kYXRpb25zICgke3JlY29tbWVuZGF0aW9ucy5sZW5ndGh9KTo8L2g0PlxuICAgICAgICAgICAgICAgICR7cmVjb21tZW5kYXRpb25zLm1hcCgocmVjLCBpbmRleCkgPT4gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicmVjb21tZW5kYXRpb24taXRlbSBwcmlvcml0eS0ke3JlYy5wcmlvcml0eX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyZWNvbW1lbmRhdGlvbi10aXRsZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aW5kZXggKyAxfS4gJHtlc2NhcGVIdG1sKHJlYy50aXRsZSB8fCAnJyl9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyZWNvbW1lbmRhdGlvbi1kZXNjcmlwdGlvblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZXNjYXBlSHRtbChyZWMuZGVzY3JpcHRpb24gfHwgJycpfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3JlYy5maXggPyBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJlY29tbWVuZGF0aW9uLWZpeFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPkZpeDo8L3N0cm9uZz48YnI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZXNjYXBlSHRtbChyZWMuZml4KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIGAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICR7cmVjLmV4YW1wbGUgPyBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJlY29tbWVuZGF0aW9uLWZpeFwiIHN0eWxlPVwibWFyZ2luLXRvcDogNHB4O1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPkV4YW1wbGU6PC9zdHJvbmc+PGJyPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2VzY2FwZUh0bWwocmVjLmV4YW1wbGUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgYCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJlY29tbWVuZGF0aW9uLW1ldGFcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke3JlYy53Y2FnQ3JpdGVyaWEgJiYgcmVjLndjYWdDcml0ZXJpYS5sZW5ndGggPiAwID9cbiAgICAgICAgICAgIHJlYy53Y2FnQ3JpdGVyaWEubWFwKChjKSA9PiBgPHNwYW4gY2xhc3M9XCJ3Y2FnLWJhZGdlXCI+V0NBRyAke2VzY2FwZUh0bWwoYyl9PC9zcGFuPmApLmpvaW4oJyAnKVxuICAgICAgICAgICAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBzdHlsZT1cIm1hcmdpbi1sZWZ0OiA4cHg7XCI+UHJpb3JpdHk6IDxzdHJvbmc+JHtlc2NhcGVIdG1sKHJlYy5wcmlvcml0eSB8fCAnJyl9PC9zdHJvbmc+PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPkNhdGVnb3J5OiAke2VzY2FwZUh0bWwocmVjLmNhdGVnb3J5IHx8ICcnKX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYCkuam9pbignJyl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgdGFyZ2V0RWxlbWVudC5pbm5lckhUTUwgKz0gcmVjb21tZW5kYXRpb25zSFRNTDtcbiAgICB9XG59XG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsIi8vIHdpbmRvdy50cyAtIGhhbmRsZXMgaW50ZXJhY3Rpb24gd2l0aCB0aGUgZXh0ZW5zaW9uJ3Mgd2luZG93IFVJLCBzZW5kcyByZXF1ZXN0cyB0byB0aGVcbi8vIHNlcnZpY2Ugd29ya2VyIChiYWNrZ3JvdW5kLnRzKSwgYW5kIHVwZGF0ZXMgdGhlIHdpbmRvdydzIFVJICh3aW5kb3cuaHRtbCkgb24gY29tcGxldGlvbi5cbmltcG9ydCB7IGZvcm1hdFJlc3VsdHNGb3JDb3B5LCByZW5kZXJBY2Nlc3NpYmlsaXR5UmVwb3J0IH0gZnJvbSAnLi9zaGFyZWQvdWlIZWxwZXJzJztcbmNvbnN0IG91dHB1dEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnb3V0cHV0Jyk7XG5jb25zdCBhbmFseXplQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuYWx5emVTY3JlZW5zaG90Jyk7XG5jb25zdCBhcGlVcmxJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcGlVcmwnKTtcbmNvbnN0IG1vZGVsTmFtZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGVsTmFtZScpO1xuY29uc3QgYXBpS2V5SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXBpS2V5Jyk7XG5jb25zdCBvbGxhbWFGaWVsZHMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnb2xsYW1hRmllbGRzJyk7XG5jb25zdCBnb29nbGVXZWJBSUZpZWxkcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnb29nbGVXZWJBSUZpZWxkcycpO1xuY29uc3QgcHJvdmlkZXJSYWRpb3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFtuYW1lPVwiYXBpUHJvdmlkZXJcIl0nKTtcbmNvbnN0IHJlc3VsdHNTZWN0aW9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3VsdHNTZWN0aW9uJyk7XG5jb25zdCByZXN1bHRzQ29udGVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN1bHRzQ29udGVudCcpO1xuY29uc3QgY29weVJlc3VsdHNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29weVJlc3VsdHMnKTtcbmNvbnN0IHNhdmVSZXN1bHRzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmVSZXN1bHRzJyk7XG5jb25zdCBjb3B5UmF3SnNvbkJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb3B5UmF3SnNvbicpO1xubGV0IGN1cnJlbnRSZXN1bHRzID0gbnVsbDtcbmxldCBjdXJyZW50UHJvdmlkZXIgPSAnZ29vZ2xlLXdlYi1haSc7XG4vLyBGdW5jdGlvbiB0byB1cGRhdGUgVUkgYmFzZWQgb24gc2VsZWN0ZWQgcHJvdmlkZXJcbmZ1bmN0aW9uIHVwZGF0ZVByb3ZpZGVyVUkocHJvdmlkZXIpIHtcbiAgICBjdXJyZW50UHJvdmlkZXIgPSBwcm92aWRlcjtcbiAgICBpZiAocHJvdmlkZXIgPT09ICdvbGxhbWEnKSB7XG4gICAgICAgIG9sbGFtYUZpZWxkcy5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICAgICAgZ29vZ2xlV2ViQUlGaWVsZHMuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIG9sbGFtYUZpZWxkcy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICBnb29nbGVXZWJBSUZpZWxkcy5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICB9XG4gICAgdXBkYXRlQW5hbHl6ZUJ1dHRvblN0YXRlKCk7XG59XG4vLyBGdW5jdGlvbiB0byBjaGVjayBpZiBpbnB1dHMgYXJlIGZpbGxlZCBhbmQgZW5hYmxlL2Rpc2FibGUgYW5hbHl6ZSBidXR0b25cbmZ1bmN0aW9uIHVwZGF0ZUFuYWx5emVCdXR0b25TdGF0ZSgpIHtcbiAgICBpZiAoY3VycmVudFByb3ZpZGVyID09PSAnb2xsYW1hJykge1xuICAgICAgICBjb25zdCBhcGlVcmwgPSBhcGlVcmxJbnB1dC52YWx1ZS50cmltKCk7XG4gICAgICAgIGNvbnN0IG1vZGVsTmFtZSA9IG1vZGVsTmFtZUlucHV0LnZhbHVlLnRyaW0oKTtcbiAgICAgICAgYW5hbHl6ZUJ1dHRvbi5kaXNhYmxlZCA9ICEoYXBpVXJsICYmIG1vZGVsTmFtZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyBHb29nbGUgV2ViIEFJIGRvZXNuJ3QgcmVxdWlyZSBhZGRpdGlvbmFsIGlucHV0c1xuICAgICAgICBhbmFseXplQnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XG4gICAgfVxufVxuLy8gRnVuY3Rpb24gdG8gbG9jay91bmxvY2sgVUkgZHVyaW5nIGFuYWx5c2lzXG5mdW5jdGlvbiBzZXRVSUxvY2tlZChsb2NrZWQpIHtcbiAgICAvLyBMb2NrL3VubG9jayBhbmFseXplIGJ1dHRvblxuICAgIGFuYWx5emVCdXR0b24uZGlzYWJsZWQgPSBsb2NrZWQ7XG4gICAgLy8gTG9jay91bmxvY2sgcmFkaW8gYnV0dG9uc1xuICAgIHByb3ZpZGVyUmFkaW9zLmZvckVhY2gocmFkaW8gPT4ge1xuICAgICAgICByYWRpby5kaXNhYmxlZCA9IGxvY2tlZDtcbiAgICB9KTtcbiAgICAvLyBMb2NrL3VubG9jayBpbnB1dCBmaWVsZHNcbiAgICBhcGlVcmxJbnB1dC5kaXNhYmxlZCA9IGxvY2tlZDtcbiAgICBtb2RlbE5hbWVJbnB1dC5kaXNhYmxlZCA9IGxvY2tlZDtcbiAgICBhcGlLZXlJbnB1dC5kaXNhYmxlZCA9IGxvY2tlZDtcbiAgICAvLyBVcGRhdGUgdmlzdWFsIHN0YXRlXG4gICAgaWYgKGxvY2tlZCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm9wYWNpdHkgPSAnMC43JztcbiAgICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xuICAgICAgICBhbmFseXplQnV0dG9uLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnYXV0byc7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUucG9pbnRlckV2ZW50cyA9ICdhdXRvJztcbiAgICAgICAgdXBkYXRlQW5hbHl6ZUJ1dHRvblN0YXRlKCk7XG4gICAgfVxufVxuLy8gTGlzdGVuIHRvIHByb3ZpZGVyIHJhZGlvIGJ1dHRvbiBjaGFuZ2VzXG5wcm92aWRlclJhZGlvcy5mb3JFYWNoKHJhZGlvID0+IHtcbiAgICByYWRpby5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldDtcbiAgICAgICAgaWYgKHRhcmdldC5jaGVja2VkKSB7XG4gICAgICAgICAgICB1cGRhdGVQcm92aWRlclVJKHRhcmdldC52YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuLy8gTGlzdGVuIHRvIGlucHV0IGNoYW5nZXMgdG8gdXBkYXRlIGJ1dHRvbiBzdGF0ZVxuYXBpVXJsSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCB1cGRhdGVBbmFseXplQnV0dG9uU3RhdGUpO1xubW9kZWxOYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCB1cGRhdGVBbmFseXplQnV0dG9uU3RhdGUpO1xuLy8gSW5pdGlhbGl6ZSBVSSBvbiBwYWdlIGxvYWRcbi8vIExvYWQgc2F2ZWQgY29uZmlnIGZyb20gc3RvcmFnZSBpZiBhdmFpbGFibGVcbmNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbJ3dpbmRvd0NvbmZpZyddLCAocmVzdWx0KSA9PiB7XG4gICAgaWYgKHJlc3VsdC53aW5kb3dDb25maWcpIHtcbiAgICAgICAgY29uc3QgY29uZmlnID0gcmVzdWx0LndpbmRvd0NvbmZpZztcbiAgICAgICAgaWYgKGNvbmZpZy5wcm92aWRlciA9PT0gJ29sbGFtYScpIHtcbiAgICAgICAgICAgIGlmIChjb25maWcuYXBpVXJsKVxuICAgICAgICAgICAgICAgIGFwaVVybElucHV0LnZhbHVlID0gY29uZmlnLmFwaVVybDtcbiAgICAgICAgICAgIGlmIChjb25maWcubW9kZWxOYW1lKVxuICAgICAgICAgICAgICAgIG1vZGVsTmFtZUlucHV0LnZhbHVlID0gY29uZmlnLm1vZGVsTmFtZTtcbiAgICAgICAgICAgIGlmIChjb25maWcuYXBpS2V5KVxuICAgICAgICAgICAgICAgIGFwaUtleUlucHV0LnZhbHVlID0gY29uZmlnLmFwaUtleTtcbiAgICAgICAgfVxuICAgICAgICB1cGRhdGVQcm92aWRlclVJKGNvbmZpZy5wcm92aWRlciB8fCAnZ29vZ2xlLXdlYi1haScpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdXBkYXRlUHJvdmlkZXJVSSgnZ29vZ2xlLXdlYi1haScpO1xuICAgIH1cbn0pO1xuLy8gRGlzcGxheSByZXN1bHRzIGZ1bmN0aW9uXG5mdW5jdGlvbiBkaXNwbGF5UmVzdWx0cyhyZXN1bHRzKSB7XG4gICAgcmVzdWx0c1NlY3Rpb24uc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgLy8gQ2xlYXIgcHJldmlvdXMgcmVzdWx0c1xuICAgIHJlc3VsdHNDb250ZW50LmlubmVySFRNTCA9ICcnO1xuICAgIC8vIElmIHJlc3VsdHMgaGF2ZSBzdW1tYXJ5IGFuZCByZWNvbW1lbmRhdGlvbnMgKEFjY2Vzc2liaWxpdHlSZXBvcnQgZm9ybWF0KVxuICAgIGlmIChyZXN1bHRzLnN1bW1hcnkgJiYgcmVzdWx0cy5yZWNvbW1lbmRhdGlvbnMpIHtcbiAgICAgICAgZGlzcGxheUFjY2Vzc2liaWxpdHlSZXBvcnQocmVzdWx0cyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyBGYWxsYmFjazogZGlzcGxheSBhcyBKU09OXG4gICAgICAgIHJlc3VsdHNDb250ZW50LnRleHRDb250ZW50ID0gSlNPTi5zdHJpbmdpZnkocmVzdWx0cywgbnVsbCwgMik7XG4gICAgfVxufVxuZnVuY3Rpb24gZGlzcGxheUFjY2Vzc2liaWxpdHlSZXBvcnQocmVwb3J0KSB7XG4gICAgcmVuZGVyQWNjZXNzaWJpbGl0eVJlcG9ydChyZXBvcnQsIHJlc3VsdHNDb250ZW50KTtcbn1cbi8vIENvcHkgcmVzdWx0cyB0byBjbGlwYm9hcmRcbmNvcHlSZXN1bHRzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYXN5bmMgKCkgPT4ge1xuICAgIGlmICghY3VycmVudFJlc3VsdHMpIHtcbiAgICAgICAgYWxlcnQoJ05vIHJlc3VsdHMgdG8gY29weScpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIEZvcm1hdCByZXN1bHRzIGZvciBiZXR0ZXIgcmVhZGFiaWxpdHlcbiAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzdWx0cyA9IGZvcm1hdFJlc3VsdHNGb3JDb3B5KGN1cnJlbnRSZXN1bHRzKTtcbiAgICAgICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoZm9ybWF0dGVkUmVzdWx0cyk7XG4gICAgICAgIGNvcHlSZXN1bHRzQnV0dG9uLnRleHRDb250ZW50ID0gJ+KchSBDb3BpZWQhJztcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBjb3B5UmVzdWx0c0J1dHRvbi50ZXh0Q29udGVudCA9ICfwn5OLIENvcHknO1xuICAgICAgICB9LCAyMDAwKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY29weTonLCBlcnIpO1xuICAgICAgICAvLyBGYWxsYmFjazogdHJ5IHRvIGNvcHkgSlNPTlxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdGV4dEFyZWEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xuICAgICAgICAgICAgdGV4dEFyZWEudmFsdWUgPSBKU09OLnN0cmluZ2lmeShjdXJyZW50UmVzdWx0cywgbnVsbCwgMik7XG4gICAgICAgICAgICB0ZXh0QXJlYS5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gICAgICAgICAgICB0ZXh0QXJlYS5zdHlsZS5vcGFjaXR5ID0gJzAnO1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0ZXh0QXJlYSk7XG4gICAgICAgICAgICB0ZXh0QXJlYS5zZWxlY3QoKTtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjb3B5Jyk7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRleHRBcmVhKTtcbiAgICAgICAgICAgIGNvcHlSZXN1bHRzQnV0dG9uLnRleHRDb250ZW50ID0gJ+KchSBDb3BpZWQhJztcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvcHlSZXN1bHRzQnV0dG9uLnRleHRDb250ZW50ID0gJ/Cfk4sgQ29weSc7XG4gICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZmFsbGJhY2tFcnIpIHtcbiAgICAgICAgICAgIGFsZXJ0KCdGYWlsZWQgdG8gY29weSByZXN1bHRzJyk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcbi8vIFNhdmUgcmVzdWx0cyB0byBmaWxlXG5zYXZlUmVzdWx0c0J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBpZiAoIWN1cnJlbnRSZXN1bHRzKSB7XG4gICAgICAgIGFsZXJ0KCdObyByZXN1bHRzIHRvIHNhdmUnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBkYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoY3VycmVudFJlc3VsdHMsIG51bGwsIDIpO1xuICAgIGNvbnN0IGRhdGFCbG9iID0gbmV3IEJsb2IoW2RhdGFTdHJdLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGRhdGFCbG9iKTtcbiAgICBjb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgIGxpbmsuaHJlZiA9IHVybDtcbiAgICBsaW5rLmRvd25sb2FkID0gYGFjY2Vzc2liaWxpdHktcmVwb3J0LSR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KCdUJylbMF19Lmpzb25gO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobGluayk7XG4gICAgbGluay5jbGljaygpO1xuICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQobGluayk7XG4gICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgIHNhdmVSZXN1bHRzQnV0dG9uLnRleHRDb250ZW50ID0gJ+KchSBTYXZlZCEnO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBzYXZlUmVzdWx0c0J1dHRvbi50ZXh0Q29udGVudCA9ICfwn5K+IFNhdmUnO1xuICAgIH0sIDIwMDApO1xufSk7XG4vLyBDb3B5IHJhdyBKU09OIGZvciB0ZXN0aW5nXG5jb3B5UmF3SnNvbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jICgpID0+IHtcbiAgICBpZiAoIWN1cnJlbnRSZXN1bHRzKSB7XG4gICAgICAgIGFsZXJ0KCdObyByZXN1bHRzIHRvIGNvcHknKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyBDb3B5IGZ1bGwgcmF3IEpTT04gKHN1aXRhYmxlIGZvciB0ZXN0cylcbiAgICAgICAgY29uc3QgcmF3SnNvbiA9IEpTT04uc3RyaW5naWZ5KGN1cnJlbnRSZXN1bHRzLCBudWxsLCAyKTtcbiAgICAgICAgaWYgKG5hdmlnYXRvci5jbGlwYm9hcmQgJiYgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQpIHtcbiAgICAgICAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHJhd0pzb24pO1xuICAgICAgICAgICAgY29weVJhd0pzb25CdXR0b24udGV4dENvbnRlbnQgPSAn4pyFIENvcGllZCEnO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29weVJhd0pzb25CdXR0b24udGV4dENvbnRlbnQgPSAn8J+ThCBDb3B5IFJhdyBKU09OJztcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgZm9yIG9sZGVyIGJyb3dzZXJzXG4gICAgICAgICAgICBjb25zdCB0ZXh0QXJlYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RleHRhcmVhJyk7XG4gICAgICAgICAgICB0ZXh0QXJlYS52YWx1ZSA9IHJhd0pzb247XG4gICAgICAgICAgICB0ZXh0QXJlYS5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gICAgICAgICAgICB0ZXh0QXJlYS5zdHlsZS5sZWZ0ID0gJy05OTk5OTlweCc7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRleHRBcmVhKTtcbiAgICAgICAgICAgIHRleHRBcmVhLmZvY3VzKCk7XG4gICAgICAgICAgICB0ZXh0QXJlYS5zZWxlY3QoKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2NvcHknKTtcbiAgICAgICAgICAgICAgICBjb3B5UmF3SnNvbkJ1dHRvbi50ZXh0Q29udGVudCA9ICfinIUgQ29waWVkISc7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvcHlSYXdKc29uQnV0dG9uLnRleHRDb250ZW50ID0gJ/Cfk4QgQ29weSBSYXcgSlNPTic7XG4gICAgICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgYWxlcnQoJ0ZhaWxlZCB0byBjb3B5LiBQbGVhc2UgY29weSBtYW51YWxseSBmcm9tIHRoZSBjb25zb2xlLicpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSYXcgSlNPTiBmb3IgdGVzdGluZzonLCByYXdKc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGV4dEFyZWEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjb3B5aW5nIHJhdyBKU09OOicsIGVycm9yKTtcbiAgICAgICAgYWxlcnQoJ0ZhaWxlZCB0byBjb3B5IHJhdyBKU09OJyk7XG4gICAgfVxufSk7XG4vLyBIYW5kbGUgc2NyZWVuc2hvdCBhbmFseXNpcyBidXR0b24gY2xpY2sgLSBjYXB0dXJlcyBzY3JlZW5zaG90IGFuZCBhbmFseXplc1xuYW5hbHl6ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBzZXRVSUxvY2tlZCh0cnVlKTtcbiAgICBhbmFseXplQnV0dG9uLnRleHRDb250ZW50ID0gJ+KPsyBDYXB0dXJpbmcgc2NyZWVuc2hvdC4uLic7XG4gICAgb3V0cHV0RWxlbWVudC50ZXh0Q29udGVudCA9ICdDYXB0dXJpbmcgc2NyZWVuc2hvdC4uLic7XG4gICAgLy8gRmlyc3QsIGNhcHR1cmUgc2NyZWVuc2hvdFxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgYWN0aW9uOiAnY2FwdHVyZVNjcmVlbnNob3QnXG4gICAgfSwgKHNjcmVlbnNob3RSZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAoIXNjcmVlbnNob3RSZXNwb25zZSB8fCAhc2NyZWVuc2hvdFJlc3BvbnNlLnN1Y2Nlc3MgfHwgIXNjcmVlbnNob3RSZXNwb25zZS5kYXRhVXJsKSB7XG4gICAgICAgICAgICBvdXRwdXRFbGVtZW50LnRleHRDb250ZW50ID0gYEVycm9yIGNhcHR1cmluZyBzY3JlZW5zaG90OiAke3NjcmVlbnNob3RSZXNwb25zZT8uZXJyb3IgfHwgJ1Vua25vd24gZXJyb3InfWA7XG4gICAgICAgICAgICBhbmFseXplQnV0dG9uLnRleHRDb250ZW50ID0gJ+KdjCBFcnJvcic7XG4gICAgICAgICAgICBzZXRVSUxvY2tlZChmYWxzZSk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBhbmFseXplQnV0dG9uLnRleHRDb250ZW50ID0gJ/CflI0gQW5hbHl6ZSBTY3JlZW5zaG90JztcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNjcmVlbnNob3REYXRhVXJsID0gc2NyZWVuc2hvdFJlc3BvbnNlLmRhdGFVcmw7XG4gICAgICAgIC8vIFByZXBhcmUgY29uZmlnIGJhc2VkIG9uIHNlbGVjdGVkIHByb3ZpZGVyXG4gICAgICAgIGxldCBjb25maWcgPSB7XG4gICAgICAgICAgICBwcm92aWRlcjogY3VycmVudFByb3ZpZGVyXG4gICAgICAgIH07XG4gICAgICAgIGlmIChjdXJyZW50UHJvdmlkZXIgPT09ICdvbGxhbWEnKSB7XG4gICAgICAgICAgICBjb25zdCBhcGlVcmwgPSBhcGlVcmxJbnB1dC52YWx1ZS50cmltKCk7XG4gICAgICAgICAgICBjb25zdCBtb2RlbE5hbWUgPSBtb2RlbE5hbWVJbnB1dC52YWx1ZS50cmltKCk7XG4gICAgICAgICAgICBjb25zdCBhcGlLZXkgPSBhcGlLZXlJbnB1dC52YWx1ZS50cmltKCk7XG4gICAgICAgICAgICBpZiAoIWFwaVVybCB8fCAhbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0RWxlbWVudC50ZXh0Q29udGVudCA9ICdFcnJvcjogUGxlYXNlIGZpbGwgaW4gQVBJIFVSTCBhbmQgbW9kZWwgbmFtZSc7XG4gICAgICAgICAgICAgICAgYW5hbHl6ZUJ1dHRvbi50ZXh0Q29udGVudCA9ICfinYwgRXJyb3InO1xuICAgICAgICAgICAgICAgIHNldFVJTG9ja2VkKGZhbHNlKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYW5hbHl6ZUJ1dHRvbi50ZXh0Q29udGVudCA9ICfwn5SNIEFuYWx5emUgU2NyZWVuc2hvdCc7XG4gICAgICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uZmlnLmFwaVVybCA9IGFwaVVybDtcbiAgICAgICAgICAgIGNvbmZpZy5tb2RlbE5hbWUgPSBtb2RlbE5hbWU7XG4gICAgICAgICAgICBpZiAoYXBpS2V5KSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLmFwaUtleSA9IGFwaUtleTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFuYWx5emVCdXR0b24udGV4dENvbnRlbnQgPSAn4o+zIEFuYWx5emluZy4uLic7XG4gICAgICAgICAgICBvdXRwdXRFbGVtZW50LnRleHRDb250ZW50ID0gJ1NlbmRpbmcgcmVxdWVzdCB0byBPbGxhbWEuLi5cXG5UaGlzIG1heSB0YWtlIDEuNS0yIG1pbnV0ZXMuJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIEdvb2dsZSBXZWIgQUlcbiAgICAgICAgICAgIGNvbmZpZy5vdXRwdXRMYW5ndWFnZSA9ICdlbic7XG4gICAgICAgICAgICBhbmFseXplQnV0dG9uLnRleHRDb250ZW50ID0gJ+KPsyBBbmFseXppbmcuLi4nO1xuICAgICAgICAgICAgb3V0cHV0RWxlbWVudC50ZXh0Q29udGVudCA9ICdTZW5kaW5nIHJlcXVlc3QgdG8gR29vZ2xlIFdlYiBBSS4uLlxcblRoaXMgbWF5IHRha2UgMS41LTIgbWludXRlcy4nO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNlbmQgc2NyZWVuc2hvdCB0byBBUEkgZm9yIGZ1bGwgYWNjZXNzaWJpbGl0eSBhbmFseXNpc1xuICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICBhY3Rpb246ICdhbmFseXplQWNjZXNzaWJpbGl0eScsXG4gICAgICAgICAgICBpbWFnZURhdGFVcmw6IHNjcmVlbnNob3REYXRhVXJsLFxuICAgICAgICAgICAgY29uZmlnOiBjb25maWdcbiAgICAgICAgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIC8vIFN0b3JlIGZ1bGwgcmVzdWx0cyBmb3IgY29weWluZy9zYXZpbmdcbiAgICAgICAgICAgICAgICBjdXJyZW50UmVzdWx0cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0OiByZXNwb25zZS5yZXBvcnQsXG4gICAgICAgICAgICAgICAgICAgIHNjcmVlbnNob3RBbmFseXNpczogcmVzcG9uc2Uuc2NyZWVuc2hvdEFuYWx5c2lzLFxuICAgICAgICAgICAgICAgICAgICBkb21BbmFseXNpczogcmVzcG9uc2UuZG9tQW5hbHlzaXMsXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yQW5hbHlzaXM6IHJlc3BvbnNlLmNvbG9yQW5hbHlzaXMsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoaW5nUmVzdWx0OiByZXNwb25zZS5tYXRjaGluZ1Jlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIC8vIERpc3BsYXkgZm9ybWF0dGVkIHJlcG9ydFxuICAgICAgICAgICAgICAgIGRpc3BsYXlSZXN1bHRzKHJlc3BvbnNlLnJlcG9ydCB8fCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgYW5hbHl6ZUJ1dHRvbi50ZXh0Q29udGVudCA9ICfinIUgQW5hbHlzaXMgQ29tcGxldGUnO1xuICAgICAgICAgICAgICAgIG91dHB1dEVsZW1lbnQudGV4dENvbnRlbnQgPSBgQW5hbHlzaXMgY29tcGxldGUhIEZvdW5kICR7cmVzcG9uc2UucmVwb3J0Py5zdW1tYXJ5Py50b3RhbElzc3VlcyB8fCAwfSBpc3N1ZXMuYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dHB1dEVsZW1lbnQudGV4dENvbnRlbnQgPSBgQW5hbHlzaXMgZXJyb3I6ICR7cmVzcG9uc2U/LmVycm9yIHx8ICdVbmtub3duIGVycm9yJ31gO1xuICAgICAgICAgICAgICAgIGFuYWx5emVCdXR0b24udGV4dENvbnRlbnQgPSAn4p2MIEVycm9yJztcbiAgICAgICAgICAgICAgICByZXN1bHRzU2VjdGlvbi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRSZXN1bHRzID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFVJTG9ja2VkKGZhbHNlKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGFuYWx5emVCdXR0b24udGV4dENvbnRlbnQgPSAn8J+UjSBBbmFseXplIFNjcmVlbnNob3QnO1xuICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=