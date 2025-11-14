// background.ts - Handles requests from the UI, captures screenshots and sends them to external API

import { AccessibilityAIAnalyzer } from './core/index';

// Function to analyze DOM on the page (executed via executeScript)
// This function runs in the page context where DOM API is available
function analyzeDOMOnPage(): any {
    const elements: any[] = [];
    let elementIdCounter = 0;

    function shouldSkipElement(element: Element): boolean {
        const tagName = element.tagName.toLowerCase();
        return ['script', 'style', 'noscript', 'meta', 'link', 'title', 'head'].includes(tagName);
    }

    function getBoundingBox(element: Element): any {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        };
    }

    function getTextContent(element: Element): string | undefined {
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        const ariaLabelledBy = element.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
            const labelledByElement = document.getElementById(ariaLabelledBy);
            if (labelledByElement) return labelledByElement.textContent?.trim() || undefined;
        }

        const text = element.textContent?.trim();
        return text && text.length > 0 ? text : undefined;
    }

    function extractAriaAttributes(element: Element): Record<string, string> {
        const ariaAttrs: Record<string, string> = {};
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('aria-')) {
                ariaAttrs[attr.name] = attr.value;
            }
        });
        return ariaAttrs;
    }

    function detectGenericElement(element: Element): { isGeneric: boolean; type?: string } {
        const tagName = element.tagName.toLowerCase();
        if (!['div', 'span'].includes(tagName)) {
            return { isGeneric: false };
        }

        const hasOnClick = element.hasAttribute('onclick') || 
            Array.from(element.attributes).some(attr => attr.name.startsWith('on') && attr.name !== 'onload');
        const hasTabindex = element.hasAttribute('tabindex');
        const hasRole = element.hasAttribute('role');
        const computedStyle = window.getComputedStyle(element);
        const hasPointerCursor = computedStyle.cursor === 'pointer';
        const isContentEditable = element.hasAttribute('contenteditable');

        if (hasOnClick || (hasRole && element.getAttribute('role') === 'button') || (hasTabindex && hasPointerCursor)) {
            return { isGeneric: true, type: 'button' };
        }
        if (hasOnClick && (hasRole && element.getAttribute('role') === 'link') || hasPointerCursor) {
            return { isGeneric: true, type: 'link' };
        }
        if (isContentEditable && (hasRole && element.getAttribute('role') === 'textbox')) {
            return { isGeneric: true, type: 'form-control' };
        }

        return { isGeneric: false };
    }

    function generateSelector(element: Element): string {
        // Try ID first (most specific)
        if (element.id) {
            return `#${element.id}`;
        }
        
        // Try class
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/).filter(c => c.length > 0);
            if (classes.length > 0) {
                // Use first meaningful class
                const firstClass = classes[0];
                const tagName = element.tagName.toLowerCase();
                return `${tagName}.${firstClass}`;
            }
        }
        
        // Try to build path with parent
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        
        if (parent) {
            const siblings = Array.from(parent.children);
            const index = siblings.indexOf(element);
            const sameTagSiblings = siblings.filter(s => s.tagName.toLowerCase() === tagName);
            const sameTagIndex = sameTagSiblings.indexOf(element);
            
            // If there are multiple same tags, use nth-of-type
            if (sameTagSiblings.length > 1) {
                const parentSelector = parent.id ? `#${parent.id}` : 
                                     (parent.className && typeof parent.className === 'string' && parent.className.trim()) 
                                        ? `${parent.tagName.toLowerCase()}.${parent.className.trim().split(/\s+/)[0]}`
                                        : parent.tagName.toLowerCase();
                return `${parentSelector} > ${tagName}:nth-of-type(${sameTagIndex + 1})`;
            }
            
            // Simple parent > child
            const parentSelector = parent.id ? `#${parent.id}` : parent.tagName.toLowerCase();
            return `${parentSelector} > ${tagName}`;
        }
        
        // Fallback: just tag name
        return tagName;
    }

    function analyzeElement(element: Element): any | null {
        const tagName = element.tagName.toLowerCase();
        if (shouldSkipElement(element)) return null;

        const id = `dom-${elementIdCounter++}-${Date.now()}`;
        const bbox = getBoundingBox(element);
        const text = getTextContent(element);
        const ariaLabel = element.getAttribute('aria-label') || undefined;
        const ariaRole = element.getAttribute('role') || undefined;
        const ariaAttributes = extractAriaAttributes(element);
        const genericInfo = detectGenericElement(element);
        
        // Generate selector and identifiers
        const selector = generateSelector(element);
        const elementId = element.id || undefined;
        const className = (element.className && typeof element.className === 'string') 
            ? element.className.trim() 
            : undefined;

        const recommendations: any = {
            issues: [],
            wcagCriteria: []
        };

        // Basic semantic checks
        if (['div', 'span'].includes(tagName) && ariaRole) {
            recommendations.issues.push(`Generic element <${tagName}> used with ARIA role "${ariaRole}". Consider using a native semantic element.`);
            recommendations.wcagCriteria.push('4.1.2 Name, Role, Value');
        }

        if (tagName === 'img' && !ariaLabel && !element.getAttribute('alt')) {
            recommendations.issues.push('Image element is missing an accessible name (alt attribute or aria-label).');
            recommendations.wcagCriteria.push('1.1.1 Non-text Content');
        }

        if (tagName === 'a' && (!element.getAttribute('href') || element.getAttribute('href')?.trim() === '#') && !ariaLabel) {
            recommendations.issues.push('Link element has no valid href or accessible name.');
            recommendations.wcagCriteria.push('2.4.4 Link Purpose (In Context)', '4.1.2 Name, Role, Value');
        }

        if (tagName === 'button' && !ariaLabel && !text) {
            recommendations.issues.push('Button element has no accessible name (text content or aria-label).');
            recommendations.wcagCriteria.push('4.1.2 Name, Role, Value');
        }

        // Generic element checks
        if (genericInfo.isGeneric) {
            recommendations.issues.push(`Generic <${tagName}> element used as ${genericInfo.type}.`);
            recommendations.wcagCriteria.push('4.1.2 Name, Role, Value', '2.1.1 Keyboard');
        }

        // Skip elements without any problems (no issues, no WCAG criteria)
        // Elements without problems have no value for accessibility analysis
        // Exception: include generic elements as they always need attention
        if (!genericInfo.isGeneric && 
            recommendations.issues.length === 0 && 
            recommendations.wcagCriteria.length === 0) {
            return null;
        }

        return {
            id,
            tagName,
            selector,
            elementId,
            className,
            text: text || undefined,
            ariaLabel,
            ariaRole,
            ariaAttributes: Object.keys(ariaAttributes).length > 0 ? ariaAttributes : undefined,
            bbox,
            isGeneric: genericInfo.isGeneric,
            genericType: genericInfo.type,
            recommendations
        };
    }

    // Analyze all elements
    const allElements = Array.from(document.querySelectorAll('*'));
    for (const element of allElements) {
        const domElement = analyzeElement(element);
        if (domElement) {
            elements.push(domElement);
        }
    }

    return {
        elements,
        timestamp: Date.now()
    };
}


// Import shared types
import type {
    ScreenshotResponse,
    ExtensionMessage,
    OpenWindowMessage,
} from './shared/types';


////////////////////// 1. Extension Icon Click Handler /////////////////////
// Open window when extension icon is clicked
chrome.action.onClicked.addListener(async () => {
    try {
        // Check if window already exists
        const windows = await chrome.windows.getAll();
        const existingWindow = windows.find(w => {
            if (w.type !== 'popup') return false;
            const url = (w as any).url;
            return url && typeof url === 'string' && url.includes('window.html');
        });
        
        if (existingWindow) {
            // Focus existing window
            await chrome.windows.update(existingWindow.id!, { focused: true });
            return;
        }
        
        // Create new window with default config
        const defaultConfig = {
            provider: 'google-web-ai' as const,
            outputLanguage: 'en'
        };
        
        const newWindow = await chrome.windows.create({
            url: chrome.runtime.getURL('window.html'),
            type: 'popup',
            width: 600,
            height: 800,
            focused: true
        });
        
        if (newWindow && newWindow.id) {
            // Store default config for the window
            await chrome.storage.local.set({
                windowConfig: defaultConfig
            });
        }
    } catch (error) {
        console.error('Error opening window on icon click:', error);
    }
});

////////////////////// 2. Message Events /////////////////////
// 
// Listen for messages from the UI, process it, and send the result back.
chrome.runtime.onMessage.addListener((
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
): boolean => {
    console.log('sender', sender);
    
    // Handle screenshot capture
    if (message.action === 'captureScreenshot') {
        (async function () {
            try {
                // Get the active tab - use lastFocusedWindow to work with both popup and separate window
                // With 'tabs' permission, we can query tabs from any context
                const [activeTab] = await chrome.tabs.query({ 
                    active: true, 
                    lastFocusedWindow: true 
                });
                
                if (!activeTab || !activeTab.id || !activeTab.windowId) {
                    throw new Error('No active tab found');
                }
                
                // For separate windows, activeTab permission doesn't activate automatically
                // We need to use tabs permission directly. Try to capture using windowId.
                // If that fails, we'll try without windowId (uses current window)
                let dataUrl: string;
                try {
                    // Try with explicit windowId first (works with tabs permission)
                    dataUrl = await chrome.tabs.captureVisibleTab(
                        activeTab.windowId,
                        {
                            format: 'png',
                            quality: 100
                        }
                    );
                } catch (windowIdError) {
                    // Fallback: try without windowId (uses the window that contains the active tab)
                    // This might work if the tab's window is still accessible
                    console.warn('Failed to capture with windowId, trying without:', windowIdError);
                    dataUrl = await chrome.tabs.captureVisibleTab({
                        format: 'png',
                        quality: 100
                    });
                }
                
                const response: ScreenshotResponse = {
                    success: true,
                    dataUrl: dataUrl
                };
                sendResponse(response);
            } catch (error) {
                console.error('Error capturing screenshot:', error);
                const response: ScreenshotResponse = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
                sendResponse(response);
            }
        })();
        
        return true; // Indicate async response
    }
    
    // Handle external API screenshot analysis (Ollama or Google Web AI)
    if (message.action === 'analyzeScreenshotExternal') {
        (async function () {
            try {
                console.log('Starting screenshot analysis...', message.config);
                const { imageDataUrl, config } = message;
                
                // Initialize Accessibility AI Analyzer with provided configuration
                const analyzer = new AccessibilityAIAnalyzer(config as any);
                
                // Analyze screenshot using core analyzer
                const modelName = config.provider === 'ollama' ? config.modelName : undefined;
                const analysis = await analyzer.analyzeScreenshot(imageDataUrl, modelName);
                
                console.log('Screenshot analysis completed:', analysis);
                
                sendResponse({
                    success: true,
                    description: analysis.description || JSON.stringify(analysis.elements, null, 2),
                    analysis: analysis,
                    elementsFound: analysis.elements.length
                });
            } catch (error) {
                console.error('Error analyzing screenshot:', error);
                sendResponse({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        })();
        
        return true; // Indicate async response
    }
    
    // Handle full accessibility analysis (screenshot + DOM + axe + matching + AI recommendations)
    if (message.action === 'analyzeAccessibility') {
        (async function () {
            const startTime = performance.now();
            const stepTimes: Record<string, number> = {};
            
            try {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🚀 Starting full accessibility analysis...');
                console.log('Config:', message.config);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                const { imageDataUrl, config } = message;
                
                // Get active web page tab (exclude extension pages)
                // Query all active tabs across all windows to find a web page
                const allTabs = await chrome.tabs.query({ active: true });
                const tab = allTabs.find(t => 
                    t.url && 
                    !t.url.startsWith('chrome://') && 
                    !t.url.startsWith('chrome-extension://') &&
                    !t.url.startsWith('about:') &&
                    (t.url.startsWith('http://') || t.url.startsWith('https://'))
                );
                
                if (!tab || !tab.id) {
                    throw new Error('No active web page tab found. Please open a web page (http:// or https://) in your browser and try again.');
                }
                
                // Initialize Accessibility AI Analyzer
                const analyzer = new AccessibilityAIAnalyzer(config as any);
                
                // Step 1: Analyze screenshot
                const step1Start = performance.now();
                console.log('\n📸 Step 1: Analyzing screenshot...');
                const modelName = config.provider === 'ollama' ? config.modelName : undefined;
                const screenshotAnalysis = await analyzer.analyzeScreenshot(imageDataUrl, modelName);
                const step1Time = performance.now() - step1Start;
                stepTimes['Step 1: Screenshot Analysis'] = step1Time;
                console.log(`✅ Step 1 completed in ${(step1Time / 1000).toFixed(2)}s`);
                console.log(`   Found ${screenshotAnalysis.elements.length} elements`);
                console.log(`   Description length: ${screenshotAnalysis.description?.length || 0} chars`);
                
                // Step 2: Get DOM and analyze
                const step2Start = performance.now();
                console.log('\n🌳 Step 2: Analyzing DOM...');
                let domAnalysis;
                
                try {
                    // Use executeScript to analyze DOM directly on the page
                    // This works everywhere and has access to DOM API
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id! },
                        func: analyzeDOMOnPage
                    });
                    
                    if (results && results[0] && results[0].result) {
                        domAnalysis = results[0].result;
                    } else {
                        throw new Error('Failed to analyze DOM via executeScript');
                    }
                } catch (executeError) {
                    throw new Error(`Failed to analyze DOM: ${executeError instanceof Error ? executeError.message : 'Unknown error'}. Make sure you're on a web page (not chrome:// or about: pages).`);
                }
                
                const step2Time = performance.now() - step2Start;
                stepTimes['Step 2: DOM Analysis'] = step2Time;
                console.log(`✅ Step 2 completed in ${(step2Time / 1000).toFixed(2)}s`);
                console.log(`   Found ${domAnalysis.elements.length} DOM elements`);
                const genericCount = domAnalysis.elements.filter((e: any) => e.isGeneric).length;
                if (genericCount > 0) {
                    console.log(`   ⚠️  Found ${genericCount} generic interactive elements`);
                }
                
                // Step 3: Run color analysis (axe-core + AI)
                const step3Start = performance.now();
                console.log('\n🎨 Step 3: Running color analysis...');
                let colorAnalysis;
                let step3aTime = 0;
                let step3bTime = 0;
                let step3cTime = 0;
                
                try {
                    // Step 3a: Run axe-core analysis
                    const step3aStart = performance.now();
                    console.log('   📊 Step 3a: Running axe-core analysis...');
                    let axeColorAnalysis;
                    try {
                        axeColorAnalysis = await analyzer.analyzeColors(
                            tab.id,
                            undefined,
                            async (func: () => any) => {
                                const results = await chrome.scripting.executeScript({
                                    target: { tabId: tab.id! },
                                    func: func
                                });
                                return results[0]?.result;
                            }
                        );
                        step3aTime = performance.now() - step3aStart;
                        console.log(`   ✅ Step 3a completed in ${(step3aTime / 1000).toFixed(2)}s`);
                        console.log(`      Found ${axeColorAnalysis.issues.length} issues from axe-core`);
                    } catch (error) {
                        step3aTime = performance.now() - step3aStart;
                        console.warn(`   ⚠️  Step 3a failed after ${(step3aTime / 1000).toFixed(2)}s:`, error);
                        axeColorAnalysis = {
                            issues: [],
                            timestamp: Date.now()
                        };
                    }

                    // Step 3b: Run AI color analysis
                    const step3bStart = performance.now();
                    console.log('   🤖 Step 3b: Running AI color analysis...');
                    let aiColorAnalysis;
                    try {
                        aiColorAnalysis = await analyzer.analyzeColorsWithAI(imageDataUrl, modelName);
                        step3bTime = performance.now() - step3bStart;
                        console.log(`   ✅ Step 3b completed in ${(step3bTime / 1000).toFixed(2)}s`);
                        console.log(`      Found ${aiColorAnalysis.issues.length} issues from AI`);
                    } catch (error) {
                        step3bTime = performance.now() - step3bStart;
                        console.warn(`   ⚠️  Step 3b failed after ${(step3bTime / 1000).toFixed(2)}s:`, error);
                        aiColorAnalysis = {
                            issues: [],
                            timestamp: Date.now()
                        };
                    }

                    // Step 3c: Combine results
                    const step3cStart = performance.now();
                    console.log('   🔄 Step 3c: Combining color analysis results...');
                    const colorAnalyzer = (analyzer as any).colorAnalyzer;
                    colorAnalysis = colorAnalyzer.combineWithAI(axeColorAnalysis, aiColorAnalysis);
                    step3cTime = performance.now() - step3cStart;
                    const step3Time = performance.now() - step3Start;
                    stepTimes['Step 3: Color Analysis'] = step3Time;
                    stepTimes['  - 3a: Axe-core'] = step3aTime;
                    stepTimes['  - 3b: AI Analysis'] = step3bTime;
                    stepTimes['  - 3c: Combine'] = step3cTime;
                    console.log(`   ✅ Step 3c completed in ${(step3cTime / 1000).toFixed(2)}s`);
                    console.log(`✅ Step 3 completed in ${(step3Time / 1000).toFixed(2)}s`);
                    console.log(`   Total color issues: ${colorAnalysis.issues.length}`);
                    const axeIssues = colorAnalysis.issues.filter((i: any) => i.source === 'axe-core').length;
                    const aiIssues = colorAnalysis.issues.filter((i: any) => i.source === 'ai').length;
                    const bothIssues = colorAnalysis.issues.filter((i: any) => i.source === 'both').length;
                    console.log(`   - Axe-core: ${axeIssues}, AI: ${aiIssues}, Both: ${bothIssues}`);
                } catch (error) {
                    const step3Time = performance.now() - step3Start;
                    stepTimes['Step 3: Color Analysis'] = step3Time;
                    console.warn(`⚠️  Step 3 failed after ${(step3Time / 1000).toFixed(2)}s:`, error);
                    // Continue without color analysis if it fails
                    colorAnalysis = {
                        issues: [],
                        timestamp: Date.now()
                    };
                }
                
                // Step 4: Match elements
                const step4Start = performance.now();
                console.log('\n🔗 Step 4: Matching elements...');
                const matchingResult = analyzer.matchElements(screenshotAnalysis, domAnalysis);
                const step4Time = performance.now() - step4Start;
                stepTimes['Step 4: Element Matching'] = step4Time;
                console.log(`✅ Step 4 completed in ${(step4Time / 1000).toFixed(2)}s`);
                console.log(`   Matched: ${matchingResult.matched.length}`);
                console.log(`   Unmatched screenshot: ${matchingResult.unmatchedScreenshot.length}`);
                console.log(`   Unmatched DOM: ${matchingResult.unmatchedDOM.length}`);
                
                // Step 5: Generate comprehensive report
                const step5Start = performance.now();
                console.log('\n📝 Step 5: Generating AI-powered report...');
                const report = await analyzer.generateReport(
                    screenshotAnalysis,
                    domAnalysis,
                    colorAnalysis,
                    matchingResult
                );
                const step5Time = performance.now() - step5Start;
                stepTimes['Step 5: Report Generation'] = step5Time;
                console.log(`✅ Step 5 completed in ${(step5Time / 1000).toFixed(2)}s`);
                console.log(`   Total recommendations: ${report.recommendations.length}`);
                console.log(`   Summary: ${report.summary.totalIssues} total issues`);
                console.log(`   - Critical: ${report.summary.criticalIssues}`);
                console.log(`   - Serious: ${report.summary.seriousIssues}`);
                console.log(`   - Moderate: ${report.summary.moderateIssues}`);
                console.log(`   - Minor: ${report.summary.minorIssues}`);
                
                // Total time
                const totalTime = performance.now() - startTime;
                console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✨ Full accessibility analysis completed!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('\n⏱️  Performance Summary:');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                Object.entries(stepTimes).forEach(([step, time]) => {
                    const seconds = (time / 1000).toFixed(2);
                    const percentage = ((time / totalTime) * 100).toFixed(1);
                    console.log(`   ${step.padEnd(30)} ${seconds.padStart(6)}s (${percentage.padStart(5)}%)`);
                });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log(`   ${'TOTAL'.padEnd(30)} ${(totalTime / 1000).toFixed(2).padStart(6)}s (100.0%)`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                
                // Filter out elements without issues from domAnalysis
                // NOTE: Elements without problems are already filtered at generation time (analyzeDOMOnPage),
                // but we still need to filter based on matching results and color issues
                const filteredDomAnalysis = {
                    ...domAnalysis,
                    elements: domAnalysis.elements.filter((element: any) => {
                        // All elements in domAnalysis already have issues or are generic (filtered at generation)
                        // But we need to check if element is involved in matching/color issues
                        
                        // Include element if it has issues in recommendations
                        const hasIssues = element.recommendations?.issues?.length > 0;
                        
                        // Include generic elements (they always need fixing)
                        const isGeneric = element.isGeneric === true;
                        
                        // Include if element is in unmatched list AND has issues
                        // (unmatched alone doesn't mean problematic - element might just not be visible)
                        // IMPORTANT: Check the original element from domAnalysis, not from unmatchedDOM
                        // because unmatchedDOM contains copies that might have different data
                        const unmatchedElement = matchingResult.unmatchedDOM.find((e: any) => e.id === element.id);
                        // Element must be in unmatchedDOM AND have issues or be generic
                        // Skip root elements (html, body) that are always unmatched but usually don't have issues
                        const isRootElement = element.tagName === 'html' || element.tagName === 'body';
                        const isUnmatchedWithIssues = unmatchedElement !== undefined && !isRootElement && (
                            element.recommendations?.issues?.length > 0 || 
                            element.isGeneric === true
                        );
                        
                        // Include if element is in matched pairs with issues (only if there are actual issues)
                        // Also check that the DOM element itself has issues, not just the match
                        const isMatchedWithIssues = matchingResult.matched.some((m: any) => {
                            if (m.domElement?.id !== element.id) return false;
                            // Match must have issues
                            if (!m.issues || m.issues.length === 0) return false;
                            // DOM element must also have issues or be generic
                            const domHasIssues = m.domElement?.recommendations?.issues?.length > 0 || m.domElement?.isGeneric === true;
                            return domHasIssues;
                        });
                        
                        // Include if element has color issues (check by selector, id, or class)
                        // Be more precise to avoid false positives - only match CSS selectors, not text descriptions
                        const hasColorIssues = colorAnalysis.issues.some((issue: any) => {
                            const issueElement = issue.element || '';
                            
                            // Skip if issue.element looks like a text description
                            // CSS selectors are typically short, don't contain quotes, and follow specific patterns
                            // Text descriptions often contain quotes, spaces, or are very long
                            if (issueElement.length > 50 || 
                                issueElement.includes('"') || 
                                issueElement.includes("'") ||
                                (issueElement.includes(' ') && !issueElement.includes('[') && !issueElement.includes(':')) ||
                                issueElement.toLowerCase().includes('text') ||
                                issueElement.toLowerCase().includes('element description') ||
                                issueElement.toLowerCase().includes('presented in')) {
                                return false; // Likely a text description, not a selector
                            }
                            
                            // Only check if issue.element looks like a CSS selector
                            // CSS selectors typically start with #, ., tag name, or contain [attribute]
                            const looksLikeSelector = /^[#.a-zA-Z]|\[/.test(issueElement.trim());
                            if (!looksLikeSelector) {
                                return false; // Not a CSS selector
                            }
                            
                            // Exact selector match
                            if (issueElement === element.selector) return true;
                            // ID match (exact)
                            if (element.elementId && issueElement === `#${element.elementId}`) return true;
                            // Class match - only if the issue element explicitly contains the class selector
                            // Avoid matching generic class names that might appear in other contexts
                            if (element.className) {
                                const classes = element.className.split(/\s+/).filter((cls: string) => cls.length > 0);
                                for (const cls of classes) {
                                    // Only match if issue.element contains the class as a CSS selector (e.g., ".light" or "html.light")
                                    // Not just the class name as a substring (to avoid false matches)
                                    if (issueElement.includes(`.${cls}`) && 
                                        (issueElement.startsWith(`.${cls}`) || 
                                         issueElement.includes(` ${cls}`) ||
                                         issueElement.includes(`${element.tagName}.${cls}`))) {
                                        return true;
                                    }
                                }
                            }
                            return false;
                        });
                        
                        // Since elements are already filtered at generation, we only need to check
                        // if element is involved in matching/color issues
                        // All elements here already have issues or are generic
                        return hasIssues || isGeneric || isUnmatchedWithIssues || isMatchedWithIssues || hasColorIssues;
                    })
                };
                
                sendResponse({
                    success: true,
                    report: report,
                    screenshotAnalysis,
                    domAnalysis: filteredDomAnalysis,
                    colorAnalysis,
                    matchingResult
                });
            } catch (error) {
                const totalTime = performance.now() - startTime;
                console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.error('❌ Error in full accessibility analysis');
                console.error(`   Failed after ${(totalTime / 1000).toFixed(2)}s`);
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.error('Error:', error);
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                sendResponse({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        })();
        
        return true; // Indicate async response
    }
    
    // Handle open window request
    if (message.action === 'openWindow') {
        (async function () {
            try {
                const { config } = message as OpenWindowMessage;
                
                // Check if window already exists
                const windows = await chrome.windows.getAll();
                const existingWindow = windows.find(w => {
                    if (w.type !== 'popup') return false;
                    // Check if window URL contains 'window.html'
                    const url = (w as any).url;
                    return url && typeof url === 'string' && url.includes('window.html');
                });
                
                if (existingWindow) {
                    // Focus existing window
                    await chrome.windows.update(existingWindow.id!, { focused: true });
                    sendResponse({ success: true, windowId: existingWindow.id });
                    return;
                }
                
                // Create new window
                const newWindow = await chrome.windows.create({
                    url: chrome.runtime.getURL('window.html'),
                    type: 'popup',
                    width: 600,
                    height: 800,
                    focused: true
                });
                
                if (!newWindow || !newWindow.id) {
                    throw new Error('Failed to create window');
                }
                
                // Store config for the window (use a single key, window will load it on init)
                await chrome.storage.local.set({
                    windowConfig: config
                });
                
                sendResponse({ success: true, windowId: newWindow.id });
            } catch (error) {
                console.error('Error opening window:', error);
                sendResponse({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        })();
        
        return true; // Indicate async response
    }
    
    return false;
});
//////////////////////////////////////////////////////////////

