/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/core/analyzers/colorAnalyzer.ts":
/*!*********************************************!*\
  !*** ./src/core/analyzers/colorAnalyzer.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ColorAnalyzer: () => (/* binding */ ColorAnalyzer)
/* harmony export */ });
// core/analyzers/colorAnalyzer.ts - Color contrast and WCAG analysis using axe-core
/**
 * Analyzer for color contrast and accessibility using axe-core
 * Runs automated WCAG 2.1 checks
 */
class ColorAnalyzer {
    constructor() {
        this.axeLoaded = false;
    }
    /**
     * Analyze accessibility issues on a page using axe-core
     * In Chrome extension context, this should be called from background script
     * which communicates with content script where axe-core runs
     * @param tabId - Chrome tab ID (for extension context)
     * @param context - DOM element, document, or window object (for direct DOM access)
     * @param executeScriptFunc - Optional function to execute script on page (for fallback)
     */
    async analyze(tabId, context, executeScriptFunc) {
        // If we have direct DOM access (e.g., in content script), use it
        if (context && typeof document !== 'undefined') {
            await this.ensureAxeCore();
            if (this.isAxeAvailable()) {
                try {
                    const results = await this.runAxe(context);
                    const issues = this.convertAxeViolationsToIssues(results);
                    return {
                        issues,
                        timestamp: Date.now()
                    };
                }
                catch (error) {
                    console.error('Error running axe-core analysis:', error);
                }
            }
        }
        // If we're in background script, try content script first, then executeScript
        if (tabId !== undefined) {
            try {
                const results = await this.runAxeViaContentScript(tabId);
                const issues = this.convertAxeViolationsToIssues(results);
                return {
                    issues,
                    timestamp: Date.now()
                };
            }
            catch (error) {
                // Fallback to executeScript if content script is not available
                if (executeScriptFunc) {
                    try {
                        // Define the function inline to be executed on the page
                        const runAxeOnPage = () => {
                            return new Promise((resolve) => {
                                // Check if axe-core is already available
                                if (typeof window.axe !== 'undefined') {
                                    const axe = window.axe;
                                    axe.run(document, {
                                        runOnly: {
                                            type: 'tag',
                                            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
                                        }
                                    }, (err, results) => {
                                        if (err) {
                                            resolve({ violations: [], passes: [], incomplete: [], inapplicable: [] });
                                        }
                                        else {
                                            resolve(results);
                                        }
                                    });
                                    return;
                                }
                                // Try to load axe-core from extension
                                const script = document.createElement('script');
                                script.src = chrome.runtime.getURL('vendors-node_modules_axe-core_axe_js.js');
                                script.onload = () => {
                                    // Wait a bit for axe to initialize
                                    setTimeout(() => {
                                        if (typeof window.axe !== 'undefined') {
                                            const axe = window.axe;
                                            axe.run(document, {
                                                runOnly: {
                                                    type: 'tag',
                                                    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
                                                }
                                            }, (err, results) => {
                                                if (err) {
                                                    resolve({ violations: [], passes: [], incomplete: [], inapplicable: [] });
                                                }
                                                else {
                                                    resolve(results);
                                                }
                                            });
                                        }
                                        else {
                                            resolve({ violations: [], passes: [], incomplete: [], inapplicable: [] });
                                        }
                                    }, 100);
                                };
                                script.onerror = () => {
                                    resolve({ violations: [], passes: [], incomplete: [], inapplicable: [] });
                                };
                                document.head.appendChild(script);
                            });
                        };
                        const results = await executeScriptFunc(runAxeOnPage);
                        const issues = this.convertAxeViolationsToIssues(results);
                        return {
                            issues,
                            timestamp: Date.now()
                        };
                    }
                    catch (executeError) {
                        console.error('Error running axe-core via executeScript:', executeError);
                    }
                }
                else {
                    console.error('Error running axe-core via content script:', error);
                }
            }
        }
        return {
            issues: [],
            timestamp: Date.now()
        };
    }
    /**
     * Run axe-core analysis via content script (from background script)
     * Falls back to executeScript if content script is not available
     */
    async runAxeViaContentScript(tabId) {
        // Try content script first
        try {
            return await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tabId, { action: 'runAxeAnalysis' }, (response) => {
                    if (chrome.runtime.lastError) {
                        // Content script not available, will use executeScript fallback
                        reject(new Error('Content script not available'));
                        return;
                    }
                    if (response && response.success) {
                        resolve(response.results);
                    }
                    else {
                        reject(new Error(response?.error || 'Unknown error'));
                    }
                });
            });
        }
        catch (error) {
            // Fallback: use executeScript to run axe-core directly on the page
            // This requires the function to be passed from background script
            throw new Error('Content script not available, use executeScript fallback');
        }
    }
    /**
     * Run axe-core analysis
     */
    async runAxe(context) {
        // Check if we're in a browser context with axe-core
        if (typeof window !== 'undefined' && window.axe) {
            const axe = window.axe;
            return new Promise((resolve, reject) => {
                axe.run(context, {
                    runOnly: {
                        type: 'tag',
                        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
                    }
                }, (err, results) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(results);
                    }
                });
            });
        }
        // If axe is not available, return empty results
        return {
            violations: [],
            passes: [],
            incomplete: [],
            inapplicable: []
        };
    }
    /**
     * Combine axe-core results with AI analysis results
     */
    combineWithAI(axeAnalysis, aiAnalysis) {
        const combinedIssues = [];
        const seenIssues = new Set();
        // Add axe-core issues (prioritize - they are more accurate)
        for (const issue of axeAnalysis.issues) {
            const key = `${issue.element}-${issue.issue.substring(0, 50)}`;
            if (!seenIssues.has(key)) {
                combinedIssues.push({
                    ...issue,
                    source: 'axe-core' // Mark as axe-core detected
                });
                seenIssues.add(key);
            }
        }
        // Add AI issues (especially for generic elements)
        for (const issue of aiAnalysis.issues) {
            const key = `${issue.element}-${issue.issue.substring(0, 50)}`;
            if (!seenIssues.has(key)) {
                // Check if this is a generic element issue (AI can detect these better)
                const isGenericElement = issue.element.toLowerCase().includes('div') ||
                    issue.element.toLowerCase().includes('span') ||
                    issue.element.toLowerCase().includes('generic');
                // Prioritize AI issues for generic elements
                if (isGenericElement || issue.severity === 'critical') {
                    combinedIssues.unshift({
                        ...issue,
                        source: 'ai'
                    });
                }
                else {
                    combinedIssues.push({
                        ...issue,
                        source: 'ai'
                    });
                }
                seenIssues.add(key);
            }
            else {
                // If both found the same issue, mark as confirmed and increase severity
                const existingIndex = combinedIssues.findIndex(i => i.element === issue.element &&
                    i.issue.substring(0, 50) === issue.issue.substring(0, 50));
                if (existingIndex !== -1) {
                    const existing = combinedIssues[existingIndex];
                    // Upgrade severity if both detected it
                    if (existing.severity === 'minor' && issue.severity !== 'minor') {
                        existing.severity = issue.severity;
                    }
                    else if (existing.severity === 'moderate' &&
                        (issue.severity === 'serious' || issue.severity === 'critical')) {
                        existing.severity = issue.severity;
                    }
                    existing.source = 'both'; // Mark as detected by both
                }
            }
        }
        // Sort by severity (critical first)
        combinedIssues.sort((a, b) => {
            const severityOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
        return {
            issues: combinedIssues,
            timestamp: Date.now()
        };
    }
    /**
     * Convert axe violations to ColorIssue format
     */
    convertAxeViolationsToIssues(results) {
        const issues = [];
        for (const violation of results.violations) {
            for (const node of violation.nodes) {
                // Extract WCAG criteria from tags
                const wcagTags = violation.tags.filter(tag => tag.startsWith('wcag') || tag.startsWith('wcag2'));
                // Map impact to severity
                const severity = this.mapImpactToSeverity(violation.impact);
                // Create issue description
                const description = `${violation.description}. ${node.failureSummary || ''}`;
                // Create recommendation
                const recommendation = `${violation.help}. See: ${violation.helpUrl}`;
                issues.push({
                    element: node.target.join(' '), // CSS selector
                    issue: description,
                    source: 'axe-core', // Mark as axe-core detected
                    severity,
                    recommendation,
                    wcagCriteria: wcagTags,
                    ruleId: violation.id
                });
            }
        }
        return issues;
    }
    /**
     * Map axe impact to severity
     */
    mapImpactToSeverity(impact) {
        switch (impact) {
            case 'critical':
                return 'critical';
            case 'serious':
                return 'serious';
            case 'moderate':
                return 'moderate';
            case 'minor':
                return 'minor';
            default:
                return 'moderate';
        }
    }
    /**
     * Check if axe-core is available
     */
    isAxeAvailable() {
        if (typeof window !== 'undefined') {
            return typeof window.axe !== 'undefined';
        }
        return false;
    }
    /**
     * Ensure axe-core is loaded
     * In Chrome extension context, axe-core should be injected via content script
     */
    async ensureAxeCore() {
        if (this.axeLoaded || this.isAxeAvailable()) {
            this.axeLoaded = true;
            return;
        }
        // Try to load axe-core dynamically
        if (typeof window !== 'undefined') {
            try {
                // In Chrome extension, axe-core should be injected via content script
                // For now, we'll assume it's available or will be injected
                this.axeLoaded = this.isAxeAvailable();
            }
            catch (error) {
                console.warn('Could not load axe-core:', error);
            }
        }
    }
}


/***/ }),

/***/ "./src/core/analyzers/domAnalyzer.ts":
/*!*******************************************!*\
  !*** ./src/core/analyzers/domAnalyzer.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DOMAnalyzer: () => (/* binding */ DOMAnalyzer)
/* harmony export */ });
// core/analyzers/domAnalyzer.ts - DOM tree analysis for accessibility
/**
 * Analyzer for DOM tree accessibility
 * Extracts semantic information, ARIA attributes, detects generic elements, and provides recommendations
 */
class DOMAnalyzer {
    /**
     * Analyze DOM tree from HTML string or DOM element
     * Works in content script context where DOM is available
     */
    async analyze(htmlOrElement) {
        let rootElement;
        if (typeof htmlOrElement === 'string') {
            // Parse HTML string
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlOrElement, 'text/html');
            rootElement = doc.documentElement;
        }
        else {
            rootElement = htmlOrElement;
        }
        const elements = [];
        // Get all elements in the DOM
        const allElements = Array.from(rootElement.querySelectorAll('*'));
        for (const element of allElements) {
            // Skip script, style, and other non-content elements
            if (this.shouldSkipElement(element)) {
                continue;
            }
            const domElement = this.analyzeElement(element);
            if (domElement) {
                elements.push(domElement);
            }
        }
        return {
            elements,
            timestamp: Date.now()
        };
    }
    /**
     * Analyze a single DOM element
     */
    analyzeElement(element) {
        const tagName = element.tagName.toLowerCase();
        const id = this.generateElementId(element);
        const bbox = this.getBoundingBox(element);
        // Extract text content
        const text = this.extractTextContent(element);
        // Extract ARIA attributes
        const ariaLabel = element.getAttribute('aria-label') || undefined;
        const ariaRole = element.getAttribute('role') || undefined;
        const ariaAttributes = this.extractAriaAttributes(element);
        // Check if element is generic (div/span used as interactive)
        const genericInfo = this.detectGenericElement(element);
        // Analyze for issues and recommendations
        const recommendations = this.analyzeAccessibility(element, genericInfo);
        // Determine semantic tag recommendation
        const semanticTag = this.getSemanticRecommendation(element, genericInfo);
        return {
            id,
            tagName,
            semanticTag,
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
    /**
     * Detect if element is a generic element (div/span) used as interactive component
     */
    detectGenericElement(element) {
        const tagName = element.tagName.toLowerCase();
        // Only check div and span
        if (tagName !== 'div' && tagName !== 'span') {
            return { isGeneric: false };
        }
        // Check for interactive indicators
        const hasOnClick = element.hasAttribute('onclick') ||
            element.getAttribute('onclick') !== null;
        const hasRole = element.hasAttribute('role');
        const role = element.getAttribute('role');
        const hasTabIndex = element.hasAttribute('tabindex');
        const tabIndex = element.getAttribute('tabindex');
        const isContentEditable = element.hasAttribute('contenteditable') &&
            element.getAttribute('contenteditable') !== 'false';
        // Check for keyboard event handlers
        const hasKeyboardHandler = element.hasAttribute('onkeydown') ||
            element.hasAttribute('onkeypress') ||
            element.hasAttribute('onkeyup');
        // Check computed style for cursor pointer (indicates interactivity)
        let hasPointerCursor = false;
        try {
            const style = window.getComputedStyle(element);
            hasPointerCursor = style.cursor === 'pointer';
        }
        catch (e) {
            // Can't access computed style in some contexts
        }
        // Determine if generic and what type
        if (hasOnClick || hasRole || hasTabIndex || hasKeyboardHandler || hasPointerCursor || isContentEditable) {
            let type = 'interactive';
            // Determine specific type
            if (role === 'button' || (hasOnClick && !role)) {
                type = 'button';
            }
            else if (role === 'link' || role === 'tab') {
                type = 'link';
            }
            else if (isContentEditable || role === 'textbox' || role === 'combobox') {
                type = 'form-control';
            }
            return { isGeneric: true, type };
        }
        return { isGeneric: false };
    }
    /**
     * Analyze element for accessibility issues
     */
    analyzeAccessibility(element, genericInfo) {
        const issues = [];
        const ariaRecommendations = [];
        const wcagCriteria = [];
        let semanticRecommendation;
        const tagName = element.tagName.toLowerCase();
        // Check for generic element issues
        if (genericInfo.isGeneric) {
            issues.push(`Generic ${tagName} element used as ${genericInfo.type || 'interactive'} component`);
            wcagCriteria.push('4.1.2'); // Name, Role, Value
            // Provide semantic recommendation
            switch (genericInfo.type) {
                case 'button':
                    semanticRecommendation = 'button';
                    issues.push('Missing native button semantics and keyboard support');
                    wcagCriteria.push('2.1.1'); // Keyboard
                    break;
                case 'link':
                    semanticRecommendation = 'a';
                    issues.push('Missing native link semantics and href attribute');
                    wcagCriteria.push('2.4.4'); // Link Purpose
                    break;
                case 'form-control':
                    semanticRecommendation = 'input or textarea';
                    issues.push('Missing native form control semantics');
                    wcagCriteria.push('4.1.2'); // Name, Role, Value
                    break;
            }
            // Check for missing ARIA on generic elements
            if (!element.hasAttribute('aria-label') && !element.textContent?.trim()) {
                ariaRecommendations.push('Add aria-label for accessible name');
                issues.push('Generic interactive element missing accessible name');
            }
            // Check for keyboard handlers on generic buttons
            if (genericInfo.type === 'button' && !element.hasAttribute('onkeydown') &&
                !element.hasAttribute('onkeypress') && !element.hasAttribute('onkeyup')) {
                issues.push('Generic button missing keyboard event handlers');
                wcagCriteria.push('2.1.1'); // Keyboard
            }
        }
        // Check semantic HTML issues
        if (tagName === 'button' && !element.textContent?.trim() && !element.hasAttribute('aria-label')) {
            issues.push('Button missing accessible name');
            ariaRecommendations.push('Add text content or aria-label');
            wcagCriteria.push('4.1.2'); // Name, Role, Value
        }
        if (tagName === 'a' && !element.hasAttribute('href')) {
            issues.push('Link missing href attribute');
            wcagCriteria.push('2.4.4'); // Link Purpose
        }
        if ((tagName === 'input' || tagName === 'textarea' || tagName === 'select') &&
            !this.hasAssociatedLabel(element)) {
            issues.push('Form control missing associated label');
            wcagCriteria.push('1.3.1', '4.1.2'); // Info and Relationships, Name Role Value
        }
        // Check heading hierarchy
        if (tagName.match(/^h[1-6]$/)) {
            const level = parseInt(tagName[1]);
            // This would need context of previous headings to check hierarchy
            // For now, just note if heading has no text
            if (!element.textContent?.trim()) {
                issues.push('Heading element missing text content');
                wcagCriteria.push('2.4.6'); // Headings and Labels
            }
        }
        // Check ARIA issues
        if (element.hasAttribute('aria-label') && !element.getAttribute('aria-label')?.trim()) {
            issues.push('Empty aria-label attribute');
        }
        if (element.hasAttribute('role') && !this.isValidAriaRole(element.getAttribute('role'))) {
            issues.push(`Invalid ARIA role: ${element.getAttribute('role')}`);
            wcagCriteria.push('4.1.2'); // Name, Role, Value
        }
        return {
            semantic: semanticRecommendation,
            aria: ariaRecommendations.length > 0 ? ariaRecommendations : undefined,
            issues: issues.length > 0 ? issues : [],
            wcagCriteria: wcagCriteria.length > 0 ? wcagCriteria : undefined
        };
    }
    /**
     * Get semantic tag recommendation
     */
    getSemanticRecommendation(element, genericInfo) {
        if (genericInfo.isGeneric) {
            switch (genericInfo.type) {
                case 'button':
                    return 'button';
                case 'link':
                    return 'a';
                case 'form-control':
                    return 'input or textarea';
            }
        }
        return undefined;
    }
    /**
     * Check if element has associated label
     */
    hasAssociatedLabel(element) {
        // Check for id and label with for attribute
        const id = element.getAttribute('id');
        if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label)
                return true;
        }
        // Check for label parent
        const labelParent = element.closest('label');
        if (labelParent)
            return true;
        // Check for aria-label or aria-labelledby
        if (element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby')) {
            return true;
        }
        return false;
    }
    /**
     * Check if ARIA role is valid
     */
    isValidAriaRole(role) {
        // Basic validation - check against common ARIA roles
        const validRoles = [
            'button', 'link', 'textbox', 'combobox', 'checkbox', 'radio', 'switch',
            'tab', 'tabpanel', 'menuitem', 'menu', 'menubar', 'navigation', 'main',
            'article', 'region', 'banner', 'contentinfo', 'search', 'form', 'list',
            'listitem', 'heading', 'img', 'presentation', 'none'
        ];
        return validRoles.includes(role.toLowerCase());
    }
    /**
     * Extract ARIA attributes
     */
    extractAriaAttributes(element) {
        const ariaAttrs = {};
        const attributes = Array.from(element.attributes);
        for (const attr of attributes) {
            if (attr.name.startsWith('aria-')) {
                ariaAttrs[attr.name] = attr.value;
            }
        }
        return ariaAttrs;
    }
    /**
     * Extract text content from element
     */
    extractTextContent(element) {
        // Get direct text content, excluding nested elements
        const text = Array.from(element.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent?.trim())
            .filter(Boolean)
            .join(' ');
        return text || null;
    }
    /**
     * Generate unique ID for element
     */
    generateElementId(element) {
        // Try to use existing ID
        if (element.id) {
            return `dom-${element.id}`;
        }
        // Generate based on tag and position
        const tagName = element.tagName.toLowerCase();
        const index = Array.from(element.parentElement?.children || []).indexOf(element);
        const parentId = element.parentElement ?
            (element.parentElement.id || element.parentElement.tagName.toLowerCase()) : 'root';
        return `dom-${parentId}-${tagName}-${index}-${Date.now()}`;
    }
    /**
     * Extract bounding box from DOM element
     */
    getBoundingBox(element) {
        try {
            const rect = element.getBoundingClientRect();
            return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
        }
        catch (e) {
            // Fallback if getBoundingClientRect is not available
            return {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            };
        }
    }
    /**
     * Check if element should be skipped in analysis
     */
    shouldSkipElement(element) {
        const tagName = element.tagName.toLowerCase();
        const skipTags = ['script', 'style', 'meta', 'link', 'noscript', 'template'];
        return skipTags.includes(tagName);
    }
}


/***/ }),

/***/ "./src/core/analyzers/elementMatcher.ts":
/*!**********************************************!*\
  !*** ./src/core/analyzers/elementMatcher.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ElementMatcher: () => (/* binding */ ElementMatcher)
/* harmony export */ });
// core/analyzers/elementMatcher.ts - Matches screenshot elements with DOM elements
/**
 * Matches visual elements from screenshots with DOM elements
 * Identifies mismatches, missing elements, and accessibility issues
 */
class ElementMatcher {
    /**
     * Match screenshot elements with DOM elements
     * @param screenshotElements - Elements detected from screenshot
     * @param domElements - Elements from DOM analysis
     */
    match(screenshotElements, domElements) {
        const matched = [];
        const unmatchedScreenshot = [];
        const unmatchedDOM = [];
        // Create a copy of DOM elements for matching (to track which ones are matched)
        const availableDOMElements = [...domElements];
        // Match each screenshot element with closest DOM element
        for (const screenshotElement of screenshotElements) {
            const bestMatch = this.findBestMatch(screenshotElement, availableDOMElements);
            if (bestMatch && bestMatch.matchScore > 0.3) {
                // Good match found
                matched.push(bestMatch);
                // Remove matched DOM element from available list
                const index = availableDOMElements.findIndex(el => el.id === bestMatch.domElement?.id);
                if (index !== -1) {
                    availableDOMElements.splice(index, 1);
                }
            }
            else {
                // No good match found - element only in screenshot
                unmatchedScreenshot.push(screenshotElement);
            }
        }
        // Remaining DOM elements are unmatched (only in DOM, not visible)
        unmatchedDOM.push(...availableDOMElements);
        // Analyze matches for issues
        this.analyzeMatches(matched);
        return {
            matched,
            unmatchedScreenshot,
            unmatchedDOM
        };
    }
    /**
     * Find best matching DOM element for a screenshot element
     */
    findBestMatch(screenshotElement, domElements) {
        if (domElements.length === 0) {
            return null;
        }
        let bestMatch = null;
        let bestScore = 0;
        for (const domElement of domElements) {
            const score = this.calculateMatchScore(screenshotElement, domElement);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = {
                    screenshotElement,
                    domElement,
                    matchScore: score,
                    issues: []
                };
            }
        }
        return bestMatch;
    }
    /**
     * Calculate match score between screenshot and DOM element
     * Returns value between 0 and 1
     */
    calculateMatchScore(screenshotElement, domElement) {
        let score = 0;
        let factors = 0;
        // Factor 1: Position overlap (40% weight)
        const positionScore = this.calculatePositionOverlap(screenshotElement.bbox, domElement.bbox);
        score += positionScore * 0.4;
        factors += 0.4;
        // Factor 2: Type match (30% weight)
        const typeScore = this.calculateTypeMatch(screenshotElement.type, domElement.tagName, domElement.isGeneric, domElement.genericType);
        score += typeScore * 0.3;
        factors += 0.3;
        // Factor 3: Text content match (20% weight)
        const textScore = this.calculateTextMatch(screenshotElement.text, domElement.text);
        score += textScore * 0.2;
        factors += 0.2;
        // Factor 4: Size similarity (10% weight)
        const sizeScore = this.calculateSizeSimilarity(screenshotElement.bbox, domElement.bbox);
        score += sizeScore * 0.1;
        factors += 0.1;
        // Normalize score
        return factors > 0 ? score / factors : 0;
    }
    /**
     * Calculate position overlap between two bounding boxes
     */
    calculatePositionOverlap(bbox1, bbox2) {
        // Skip if either bbox is invalid (zero size)
        if (bbox1.width === 0 || bbox1.height === 0 || bbox2.width === 0 || bbox2.height === 0) {
            return 0;
        }
        // Calculate intersection
        const x1 = Math.max(bbox1.x, bbox2.x);
        const y1 = Math.max(bbox1.y, bbox2.y);
        const x2 = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
        const y2 = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);
        if (x2 <= x1 || y2 <= y1) {
            return 0; // No overlap
        }
        const intersectionArea = (x2 - x1) * (y2 - y1);
        const bbox1Area = bbox1.width * bbox1.height;
        const bbox2Area = bbox2.width * bbox2.height;
        const unionArea = bbox1Area + bbox2Area - intersectionArea;
        // IoU (Intersection over Union)
        return unionArea > 0 ? intersectionArea / unionArea : 0;
    }
    /**
     * Calculate type match score
     */
    calculateTypeMatch(screenshotType, domTagName, isGeneric, genericType) {
        // Map screenshot types to DOM tag names
        const typeMap = {
            'button': ['button'],
            'link': ['a'],
            'input': ['input', 'textarea'],
            'heading': ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
            'image': ['img'],
            'text': ['p', 'span', 'div', 'li', 'td', 'th'],
            'navigation': ['nav'],
            'form': ['form', 'select', 'option'],
            'list': ['ul', 'ol', 'li']
        };
        const expectedTags = typeMap[screenshotType] || [];
        // Exact match
        if (expectedTags.includes(domTagName.toLowerCase())) {
            return 1.0;
        }
        // Generic element match
        if (isGeneric) {
            if (screenshotType === 'button' && genericType === 'button') {
                return 0.7; // Generic button matches screenshot button
            }
            if (screenshotType === 'link' && genericType === 'link') {
                return 0.7; // Generic link matches screenshot link
            }
            if (screenshotType === 'input' && genericType === 'form-control') {
                return 0.7; // Generic form control matches screenshot input
            }
            if (genericType === 'interactive' && ['button', 'link', 'input'].includes(screenshotType)) {
                return 0.5; // Generic interactive element
            }
        }
        // Partial matches
        if (screenshotType === 'text' && ['p', 'span', 'div', 'li'].includes(domTagName.toLowerCase())) {
            return 0.6;
        }
        // No match
        return 0.1;
    }
    /**
     * Calculate text content match score
     */
    calculateTextMatch(text1, text2) {
        if (!text1 && !text2) {
            return 0.5; // Both empty - neutral score
        }
        if (!text1 || !text2) {
            return 0.2; // One is empty - low score
        }
        // Normalize text (lowercase, trim)
        const normalized1 = text1.toLowerCase().trim();
        const normalized2 = text2.toLowerCase().trim();
        // Exact match
        if (normalized1 === normalized2) {
            return 1.0;
        }
        // Contains match
        if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
            return 0.7;
        }
        // Word overlap
        const words1 = normalized1.split(/\s+/);
        const words2 = normalized2.split(/\s+/);
        const commonWords = words1.filter(w => words2.includes(w));
        const totalWords = Math.max(words1.length, words2.length);
        if (totalWords > 0) {
            return commonWords.length / totalWords;
        }
        return 0.1;
    }
    /**
     * Calculate size similarity score
     */
    calculateSizeSimilarity(bbox1, bbox2) {
        if (bbox1.width === 0 || bbox1.height === 0 || bbox2.width === 0 || bbox2.height === 0) {
            return 0;
        }
        const area1 = bbox1.width * bbox1.height;
        const area2 = bbox2.width * bbox2.height;
        // Calculate size ratio
        const ratio = Math.min(area1, area2) / Math.max(area1, area2);
        return ratio;
    }
    /**
     * Analyze matched pairs for accessibility issues
     */
    analyzeMatches(matched) {
        for (const pair of matched) {
            const issues = [];
            if (!pair.domElement) {
                continue;
            }
            const screenshot = pair.screenshotElement;
            const dom = pair.domElement;
            // Check for semantic mismatches
            if (dom.isGeneric) {
                issues.push(`Generic ${dom.tagName} element used instead of semantic ${screenshot.type}`);
            }
            // Check for missing accessible names
            if (screenshot.text && !dom.text && !dom.ariaLabel) {
                issues.push('Element visible in screenshot but missing accessible name in DOM');
            }
            // Check for type mismatches
            const typeMismatch = this.checkTypeMismatch(screenshot.type, dom.tagName, dom.isGeneric, dom.genericType);
            if (typeMismatch) {
                issues.push(typeMismatch);
            }
            // Check for position mismatches (if match score is low)
            if (pair.matchScore < 0.5) {
                issues.push('Position mismatch between screenshot and DOM element');
            }
            // Add DOM element's existing issues
            if (dom.recommendations.issues.length > 0) {
                issues.push(...dom.recommendations.issues);
            }
            pair.issues = issues;
        }
    }
    /**
     * Check for type mismatches
     */
    checkTypeMismatch(screenshotType, domTagName, isGeneric, genericType) {
        if (screenshotType === 'button' && domTagName !== 'button' && !(isGeneric && genericType === 'button')) {
            return `Button detected in screenshot but DOM has ${domTagName} element`;
        }
        if (screenshotType === 'link' && domTagName !== 'a' && !(isGeneric && genericType === 'link')) {
            return `Link detected in screenshot but DOM has ${domTagName} element`;
        }
        if (screenshotType === 'input' && !['input', 'textarea'].includes(domTagName) &&
            !(isGeneric && genericType === 'form-control')) {
            return `Input field detected in screenshot but DOM has ${domTagName} element`;
        }
        return null;
    }
}


/***/ }),

/***/ "./src/core/analyzers/recommendationEngine.ts":
/*!****************************************************!*\
  !*** ./src/core/analyzers/recommendationEngine.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RecommendationEngine: () => (/* binding */ RecommendationEngine)
/* harmony export */ });
// core/analyzers/recommendationEngine.ts - AI-powered recommendation engine
/**
 * AI-powered recommendation engine
 * Combines all analysis results and generates contextual recommendations
 */
class RecommendationEngine {
    constructor(provider, ollamaClient, googleWebAIClient) {
        this.provider = provider;
        this.ollamaClient = ollamaClient;
        this.googleWebAIClient = googleWebAIClient;
    }
    /**
     * Generate comprehensive accessibility report from all analysis results
     */
    async generateReport(screenshotAnalysis, domAnalysis, colorAnalysis, matchingResult) {
        // First, generate structured recommendations without AI
        const structuredRecommendations = this.generateStructuredRecommendations(screenshotAnalysis, domAnalysis, colorAnalysis, matchingResult);
        // Then, enhance with AI-powered contextual recommendations
        const aiRecommendations = await this.generateAIRecommendations(structuredRecommendations, screenshotAnalysis, domAnalysis, colorAnalysis, matchingResult);
        // Combine and prioritize
        const allRecommendations = [...structuredRecommendations, ...aiRecommendations];
        const prioritized = this.prioritizeRecommendations(allRecommendations);
        // Generate summary
        const summary = this.generateSummary(prioritized, colorAnalysis);
        return {
            summary,
            recommendations: prioritized,
            timestamp: Date.now()
        };
    }
    /**
     * Generate structured recommendations from analysis results
     */
    generateStructuredRecommendations(screenshotAnalysis, domAnalysis, colorAnalysis, matchingResult) {
        const recommendations = [];
        // Recommendations from generic elements
        // NOTE: domAnalysis.elements already contains only elements with issues or generic elements
        // (filtered at generation time in analyzeDOMOnPage), so we can safely process all elements
        for (const element of domAnalysis.elements) {
            if (element.isGeneric) {
                // Build element identifier
                const identifier = this.buildElementIdentifier(element);
                // Add coordinates
                const bbox = element.bbox;
                const coordinates = `Position: (${Math.round(bbox.x)}, ${Math.round(bbox.y)}), Size: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px`;
                recommendations.push({
                    id: `generic-${element.id}`,
                    priority: 'critical',
                    category: 'generic',
                    title: `Replace generic ${element.tagName} with semantic element`,
                    description: `Generic ${element.tagName} element is used as ${element.genericType || 'interactive'} component. This violates WCAG 4.1.2 (Name, Role, Value).\n\nElement: ${identifier}\n${coordinates}`,
                    wcagCriteria: ['4.1.2'],
                    affectedElements: [element.id],
                    fix: `Replace <${element.tagName}> with <${element.recommendations.semantic || 'button'}> element`,
                    example: `Before: <div onclick="submit()" role="button">Submit</div>\nAfter: <button onclick="submit()">Submit</button>`
                });
            }
            // Missing accessible names
            // Only check if element has issues (already filtered, but double-check for safety)
            if (element.recommendations?.issues?.length > 0 &&
                element.recommendations.issues.some(issue => issue.includes('missing accessible name'))) {
                const identifier = this.buildElementIdentifier(element);
                // Add coordinates
                const bbox = element.bbox;
                const coordinates = `Position: (${Math.round(bbox.x)}, ${Math.round(bbox.y)}), Size: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px`;
                recommendations.push({
                    id: `name-${element.id}`,
                    priority: 'critical',
                    category: 'label',
                    title: `Add accessible name to ${element.tagName} element`,
                    description: `Element is missing accessible name (text content or aria-label). Required for screen readers.\n\nElement: ${identifier}\n${coordinates}`,
                    wcagCriteria: ['4.1.2'],
                    affectedElements: [element.id],
                    fix: `Add text content or aria-label attribute: <${element.tagName} aria-label="Description">`
                });
            }
        }
        // Recommendations from matching results
        for (const match of matchingResult.matched) {
            if (match.issues.length > 0) {
                // Build element identifier
                let identifier = '';
                if (match.domElement) {
                    identifier = this.buildElementIdentifier(match.domElement);
                }
                else {
                    identifier = `${match.screenshotElement.type} element`;
                }
                // Add coordinates from screenshot
                const bbox = match.screenshotElement.bbox;
                const coordinates = `Position: (${Math.round(bbox.x)}, ${Math.round(bbox.y)}), Size: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px`;
                recommendations.push({
                    id: `match-${match.screenshotElement.id}`,
                    priority: match.matchScore < 0.5 ? 'high' : 'medium',
                    category: 'semantic',
                    title: `Semantic mismatch detected`,
                    description: `${match.issues.join('. ')}\n\nElement: ${identifier}\n${coordinates}`,
                    wcagCriteria: ['4.1.2'],
                    affectedElements: [match.screenshotElement.id, match.domElement?.id || ''],
                    fix: 'Ensure visual element matches semantic HTML structure'
                });
            }
        }
        // Recommendations from unmatched elements
        for (const unmatched of matchingResult.unmatchedScreenshot) {
            // Add coordinates from screenshot
            const bbox = unmatched.bbox;
            const coordinates = `Position: (${Math.round(bbox.x)}, ${Math.round(bbox.y)}), Size: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px`;
            // Build identifier from available data
            let identifier = `${unmatched.type} element`;
            if (unmatched.text) {
                identifier += ` with text: "${unmatched.text.length > 50 ? unmatched.text.substring(0, 50) + '...' : unmatched.text}"`;
            }
            recommendations.push({
                id: `unmatched-screenshot-${unmatched.id}`,
                priority: 'medium',
                category: 'other',
                title: `Element visible but not accessible in DOM`,
                description: `${unmatched.type} element is visible in screenshot but not properly accessible in DOM structure.\n\nElement: ${identifier}\n${coordinates}`,
                wcagCriteria: ['4.1.2'],
                affectedElements: [unmatched.id],
                fix: 'Ensure all visible interactive elements have proper DOM representation'
            });
        }
        // Recommendations from color analysis (axe-core + AI)
        for (const issue of colorAnalysis.issues) {
            const priority = issue.severity === 'critical' ? 'critical' :
                issue.severity === 'serious' ? 'high' :
                    issue.severity === 'moderate' ? 'medium' : 'low';
            // Add source information to description if available
            let description = issue.recommendation;
            if (issue.source === 'both') {
                description += ' (Detected by both axe-core and AI vision analysis)';
            }
            else if (issue.source === 'ai') {
                description += ' (Detected by AI vision analysis)';
            }
            // Add estimated contrast if available from AI
            if (issue.estimatedContrast) {
                description += ` Estimated contrast ratio: ${issue.estimatedContrast}:1.`;
            }
            // Try to find matching DOM element for coordinates and better identification
            let elementInfo = `Element: ${issue.element}`;
            let coordinates = '';
            // For axe-core issues, try to find DOM element by selector
            if (issue.source === 'axe-core' || issue.source === 'both') {
                // Try exact selector match first
                let domElement = domAnalysis.elements.find(e => e.selector === issue.element);
                // If not found, try partial match (e.g., "#id" matches element with that id)
                if (!domElement && issue.element.startsWith('#')) {
                    const id = issue.element.replace('#', '').trim();
                    domElement = domAnalysis.elements.find(e => e.elementId === id);
                }
                // Try class match
                if (!domElement && issue.element.includes('.')) {
                    const classMatch = issue.element.match(/\.([\w-]+)/);
                    if (classMatch && classMatch[1]) {
                        domElement = domAnalysis.elements.find(e => e.className && e.className.split(' ').includes(classMatch[1]));
                    }
                }
                if (domElement) {
                    // Use buildElementIdentifier for better identification
                    elementInfo = `Element: ${this.buildElementIdentifier(domElement)}`;
                    const bbox = domElement.bbox;
                    coordinates = `\nPosition: (${Math.round(bbox.x)}, ${Math.round(bbox.y)}), Size: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px`;
                }
            }
            // For AI-detected issues, try to find in screenshot or matched elements
            if (issue.source === 'ai' || (!coordinates && issue.source !== 'axe-core')) {
                // First, try to find in matched pairs (most accurate)
                const matchedPair = matchingResult.matched.find(m => {
                    if (m.domElement) {
                        const identifier = this.buildElementIdentifier(m.domElement);
                        return identifier.toLowerCase().includes(issue.element.toLowerCase()) ||
                            issue.element.toLowerCase().includes(m.screenshotElement.type);
                    }
                    return issue.element.toLowerCase().includes(m.screenshotElement.type);
                });
                if (matchedPair) {
                    if (matchedPair.domElement) {
                        elementInfo = `Element: ${this.buildElementIdentifier(matchedPair.domElement)}`;
                        const bbox = matchedPair.domElement.bbox;
                        coordinates = `\nPosition: (${Math.round(bbox.x)}, ${Math.round(bbox.y)}), Size: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px`;
                    }
                    else {
                        const bbox = matchedPair.screenshotElement.bbox;
                        coordinates = `\nPosition: (${Math.round(bbox.x)}, ${Math.round(bbox.y)}), Size: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px`;
                    }
                }
                else {
                    // Try to find in screenshot elements directly
                    const screenshotElement = screenshotAnalysis.elements.find(e => e.text && issue.element.toLowerCase().includes(e.text.toLowerCase()) ||
                        issue.element.toLowerCase().includes(e.type) ||
                        (e.text && e.text.toLowerCase().includes(issue.element.toLowerCase())));
                    if (screenshotElement) {
                        const bbox = screenshotElement.bbox;
                        coordinates = `\nPosition: (${Math.round(bbox.x)}, ${Math.round(bbox.y)}), Size: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px`;
                        // Enhance element info with screenshot data
                        if (screenshotElement.text) {
                            elementInfo = `Element: ${screenshotElement.type} with text "${screenshotElement.text.length > 50 ? screenshotElement.text.substring(0, 50) + '...' : screenshotElement.text}"`;
                        }
                        else {
                            elementInfo = `Element: ${screenshotElement.type} element`;
                        }
                    }
                }
            }
            description += `\n\n${elementInfo}${coordinates}`;
            recommendations.push({
                id: `${issue.source || 'color'}-${issue.ruleId || issue.element}`,
                priority,
                category: this.mapAxeCategory(issue),
                title: issue.issue,
                description,
                wcagCriteria: issue.wcagCriteria || [],
                affectedElements: [issue.element],
                fix: issue.recommendation
            });
        }
        return recommendations;
    }
    /**
     * Generate AI-powered contextual recommendations
     */
    async generateAIRecommendations(structuredRecommendations, screenshotAnalysis, domAnalysis, colorAnalysis, matchingResult) {
        // Prepare context for AI
        const context = this.prepareAIContext(structuredRecommendations, screenshotAnalysis, domAnalysis, colorAnalysis, matchingResult);
        const prompt = this.buildRecommendationPrompt(context);
        try {
            let aiResponse;
            if (this.provider === 'ollama' && this.ollamaClient) {
                const response = await this.ollamaClient.analyzeImage({
                    imageDataUrl: screenshotAnalysis.imageDataUrl,
                    prompt,
                    modelName: 'gemma3:12b'
                });
                aiResponse = response.description;
            }
            else if (this.provider === 'google-web-ai' && this.googleWebAIClient) {
                const response = await this.googleWebAIClient.analyzeImage({
                    imageDataUrl: screenshotAnalysis.imageDataUrl,
                    prompt
                });
                aiResponse = response.description;
            }
            else {
                return []; // No AI provider available
            }
            // Parse AI response into recommendations
            return this.parseAIRecommendations(aiResponse);
        }
        catch (error) {
            console.error('Error generating AI recommendations:', error);
            return [];
        }
    }
    /**
     * Prepare context for AI analysis
     */
    prepareAIContext(structuredRecommendations, screenshotAnalysis, domAnalysis, colorAnalysis, matchingResult) {
        const genericCount = domAnalysis.elements.filter(e => e.isGeneric).length;
        const unmatchedCount = matchingResult.unmatchedScreenshot.length + matchingResult.unmatchedDOM.length;
        const axeViolations = colorAnalysis.issues.length;
        return `
Accessibility Analysis Summary:
- Screenshot elements found: ${screenshotAnalysis.elements.length}
- DOM elements analyzed: ${domAnalysis.elements.length}
- Generic elements (div/span used as interactive): ${genericCount}
- Axe-core violations: ${axeViolations}
- Matched elements: ${matchingResult.matched.length}
- Unmatched screenshot elements: ${matchingResult.unmatchedScreenshot.length}
- Unmatched DOM elements: ${matchingResult.unmatchedDOM.length}

Key Issues:
${structuredRecommendations.slice(0, 10).map(r => `- ${r.title}: ${r.description}`).join('\n')}
`;
    }
    /**
     * Build prompt for AI recommendation generation
     */
    buildRecommendationPrompt(context) {
        return `You are an accessibility expert analyzing a webpage for WCAG 2.1 compliance.

${context}

Provide ONLY accessibility recommendations in the EXACT format below. Do NOT add any introductory text, explanations, or comments. Start directly with the recommendations.

REQUIRED FORMAT (follow exactly):

1. Priority: high
Category: semantic
Title: Missing semantic HTML for interactive element
Description: The button is implemented as a div element instead of using the semantic button tag, which reduces accessibility for screen readers.
WCAG criteria: WCAG 4.1.2
Fix: Replace the div element with a proper button element and ensure it has proper ARIA attributes if needed.

2. Priority: critical
Category: color
Title: Insufficient color contrast for text
Description: The text color does not meet WCAG AA contrast requirements, making it difficult for users with visual impairments to read.
WCAG criteria: WCAG 1.4.3
Fix: Increase the contrast ratio between text and background colors to at least 4.5:1 for normal text.

STRICT RULES:
- Start immediately with "1." - no preamble
- Use ONLY the format shown above
- Do NOT include HTML code in titles or descriptions
- Use plain text only - no markdown, no HTML tags
- Each recommendation must be numbered (1., 2., 3., etc.)
- Do NOT add any text before or after the numbered list
- Do NOT include phrases like "Here are recommendations:" or "Based on the analysis:"
- Title must be a clear, descriptive sentence (5-15 words)
- Description must be a detailed explanation (20-100 words)
- Priority must be one of: critical, high, medium, low
- Category must be one of: semantic, color, aria, keyboard, focus, other

Provide your recommendations now, starting with "1.":`;
    }
    /**
     * Parse AI response into structured recommendations
     */
    parseAIRecommendations(aiResponse) {
        const recommendations = [];
        // Helper to strip HTML tags and clean text
        const stripHtml = (text) => {
            return text
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/&[a-z]+;/gi, '') // Remove HTML entities
                .trim();
        };
        // Helper to validate recommendation
        const isValidRecommendation = (rec) => {
            if (!rec.title || rec.title.length < 5)
                return false;
            // Reject if title looks like HTML code
            if (rec.title.includes('<') && rec.title.includes('>'))
                return false;
            // Reject if title is just HTML tag
            if (rec.title.match(/^<[^>]+>$/))
                return false;
            // Reject if description is just HTML code
            if (rec.description && rec.description.match(/^<[^>]+>$/))
                return false;
            // Reject if title contains markdown formatting (**, *, #, etc.)
            if (rec.title.match(/^\*+\s*[\d.]+\s*\*+|^\*{2,}|^#{1,6}\s/))
                return false;
            // Reject if title looks like a section header (starts with number and asterisks)
            if (rec.title.match(/^\*?\s*[\d.]+\s*[.*]|^[\d.]+\s*[.*]/))
                return false;
            // Reject if title and description are the same (likely a parsing error)
            if (rec.title === rec.description)
                return false;
            // Reject if title contains "Additional Contextual", "Priority-Based", etc. (section headers)
            const lowerTitle = rec.title.toLowerCase();
            if (lowerTitle.includes('additional contextual') ||
                lowerTitle.includes('priority-based') ||
                lowerTitle.includes('action plan') ||
                lowerTitle.includes('specific wcag') ||
                lowerTitle.includes('practical fix')) {
                return false;
            }
            // Must have a meaningful description
            if (!rec.description || rec.description.length < 10)
                return false;
            return true;
        };
        // Try to extract recommendations from AI response
        const lines = aiResponse.split('\n').filter(line => line.trim());
        let currentRec = null;
        for (const line of lines) {
            const cleanLine = stripHtml(line);
            const lowerLine = cleanLine.toLowerCase();
            // Skip introductory text or comments before recommendations
            if (!currentRec && (lowerLine.includes('here are') ||
                lowerLine.includes('based on') ||
                lowerLine.includes('recommendations:') ||
                lowerLine.includes('following recommendations') ||
                lowerLine.startsWith('provide') ||
                lowerLine.startsWith('i will'))) {
                continue; // Skip preamble
            }
            // Look for recommendation patterns - must start with number
            if (line.match(/^\d+\./)) {
                if (currentRec && isValidRecommendation(currentRec)) {
                    recommendations.push(currentRec);
                }
                currentRec = {
                    id: `ai-${Date.now()}-${recommendations.length}`,
                    priority: 'medium',
                    category: 'other',
                    wcagCriteria: [],
                    affectedElements: []
                };
            }
            if (currentRec) {
                // Extract priority (must be on a line starting with "Priority:")
                if (lowerLine.startsWith('priority:')) {
                    const priorityMatch = lowerLine.match(/priority:\s*(critical|high|medium|low)/);
                    if (priorityMatch) {
                        currentRec.priority = priorityMatch[1];
                    }
                }
                // Extract category (must be on a line starting with "Category:")
                if (lowerLine.startsWith('category:')) {
                    const categoryMatch = lowerLine.match(/category:\s*(\w+)/);
                    if (categoryMatch) {
                        const cat = categoryMatch[1].toLowerCase();
                        // Map AI categories to our allowed categories
                        const categoryMap = {
                            'semantic': 'semantic',
                            'color': 'contrast',
                            'contrast': 'contrast',
                            'aria': 'aria',
                            'keyboard': 'keyboard',
                            'focus': 'keyboard',
                            'generic': 'generic',
                            'label': 'label',
                            'other': 'other'
                        };
                        if (cat in categoryMap) {
                            currentRec.category = categoryMap[cat];
                        }
                        else {
                            currentRec.category = 'other';
                        }
                    }
                }
                // Extract title (must be on a line starting with "Title:")
                if (lowerLine.startsWith('title:')) {
                    const title = cleanLine.replace(/^title:\s*/i, '').trim();
                    if (title.length > 5 && !(title.includes('<') && title.includes('>'))) {
                        currentRec.title = title.substring(0, 200);
                    }
                }
                // Extract description (must be on a line starting with "Description:")
                if (lowerLine.startsWith('description:')) {
                    const desc = cleanLine.replace(/^description:\s*/i, '').trim();
                    if (desc.length > 10 && !desc.match(/^<[^>]+>$/)) {
                        currentRec.description = desc.substring(0, 500);
                    }
                }
                // Extract WCAG criteria (must be on a line starting with "WCAG criteria:")
                if (lowerLine.startsWith('wcag criteria:')) {
                    const wcagMatch = cleanLine.match(/WCAG\s*(\d+\.\d+\.\d+)/i);
                    if (wcagMatch) {
                        currentRec.wcagCriteria = currentRec.wcagCriteria || [];
                        currentRec.wcagCriteria.push(wcagMatch[1]);
                    }
                }
                // Extract fix (must be on a line starting with "Fix:")
                if (lowerLine.startsWith('fix:')) {
                    const fix = cleanLine.replace(/^fix:\s*/i, '').trim();
                    if (fix.length > 5) {
                        currentRec.fix = fix.substring(0, 500);
                    }
                }
            }
        }
        // Add final recommendation if valid
        if (currentRec && isValidRecommendation(currentRec)) {
            recommendations.push(currentRec);
        }
        return recommendations;
    }
    /**
     * Prioritize recommendations
     */
    prioritizeRecommendations(recommendations) {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return recommendations.sort((a, b) => {
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            // If same priority, sort by WCAG level (A > AA > AAA)
            const aLevel = this.getWCAGLevel(a.wcagCriteria);
            const bLevel = this.getWCAGLevel(b.wcagCriteria);
            return aLevel - bLevel;
        });
    }
    /**
     * Get WCAG level (A=1, AA=2, AAA=3)
     */
    getWCAGLevel(criteria) {
        // Simplified - in production, map actual criteria to levels
        if (criteria.some(c => c.includes('AAA')))
            return 3;
        if (criteria.some(c => c.includes('AA')))
            return 2;
        return 1;
    }
    /**
     * Generate summary statistics
     */
    generateSummary(recommendations, colorAnalysis) {
        const critical = recommendations.filter(r => r.priority === 'critical').length;
        const serious = recommendations.filter(r => r.priority === 'high').length;
        const moderate = recommendations.filter(r => r.priority === 'medium').length;
        const minor = recommendations.filter(r => r.priority === 'low').length;
        // Count WCAG levels from axe violations
        const wcagLevelA = colorAnalysis.issues.filter(i => i.wcagCriteria?.some(c => c.includes('wcag2a') || c.includes('wcag21a'))).length;
        const wcagLevelAA = colorAnalysis.issues.filter(i => i.wcagCriteria?.some(c => c.includes('wcag2aa') || c.includes('wcag21aa'))).length;
        const wcagLevelAAA = colorAnalysis.issues.filter(i => i.wcagCriteria?.some(c => c.includes('wcag2aaa') || c.includes('wcag21aaa'))).length;
        return {
            totalIssues: recommendations.length,
            criticalIssues: critical,
            seriousIssues: serious,
            moderateIssues: moderate,
            minorIssues: minor,
            wcagLevelA,
            wcagLevelAA,
            wcagLevelAAA
        };
    }
    /**
     * Build human-readable element identifier
     */
    buildElementIdentifier(element) {
        const parts = [];
        // Add selector if available
        if (element.selector) {
            parts.push(`Selector: ${element.selector}`);
        }
        // Add ID if available
        if (element.elementId) {
            parts.push(`ID: #${element.elementId}`);
        }
        // Add class if available
        if (element.className) {
            const classes = element.className.split(/\s+/).slice(0, 2).join(', ');
            parts.push(`Class: .${classes}`);
        }
        // Add text content if available (truncated)
        if (element.text) {
            const textPreview = element.text.length > 50
                ? element.text.substring(0, 50) + '...'
                : element.text;
            parts.push(`Text: "${textPreview}"`);
        }
        // Add ARIA label if available
        if (element.ariaLabel) {
            parts.push(`ARIA Label: "${element.ariaLabel}"`);
        }
        // Add role if available
        if (element.ariaRole) {
            parts.push(`Role: ${element.ariaRole}`);
        }
        // If no specific identifiers, use tag name and position
        if (parts.length === 0) {
            parts.push(`Tag: <${element.tagName}>`);
        }
        return parts.join(' | ');
    }
    /**
     * Map axe issue to recommendation category
     */
    mapAxeCategory(issue) {
        const ruleId = issue.ruleId?.toLowerCase() || '';
        const issueText = issue.issue.toLowerCase();
        if (ruleId.includes('color') || issueText.includes('contrast')) {
            return 'contrast';
        }
        if (ruleId.includes('keyboard') || issueText.includes('keyboard')) {
            return 'keyboard';
        }
        if (ruleId.includes('aria') || issueText.includes('aria')) {
            return 'aria';
        }
        if (issueText.includes('label') || issueText.includes('name')) {
            return 'label';
        }
        return 'other';
    }
}


/***/ }),

/***/ "./src/core/analyzers/screenshotAnalyzer.ts":
/*!**************************************************!*\
  !*** ./src/core/analyzers/screenshotAnalyzer.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ScreenshotAnalyzer: () => (/* binding */ ScreenshotAnalyzer)
/* harmony export */ });
// core/analyzers/screenshotAnalyzer.ts - Screenshot analysis using external API
/**
 * Analyzer for webpage screenshots
 * Supports both Ollama and Google Web AI APIs
 */
class ScreenshotAnalyzer {
    constructor(provider, ollamaClient, googleWebAIClient, defaultModelName = 'gemma3:12b') {
        this.provider = provider;
        this.ollamaClient = ollamaClient;
        this.googleWebAIClient = googleWebAIClient;
        this.defaultModelName = defaultModelName;
    }
    /**
     * Analyze screenshot and extract UI elements
     */
    async analyze(imageDataUrl, modelName) {
        const prompt = this.getAnalysisPrompt();
        let description;
        if (this.provider === 'ollama') {
            if (!this.ollamaClient) {
                throw new Error('Ollama client is not configured');
            }
            const response = await this.ollamaClient.analyzeImage({
                imageDataUrl,
                prompt,
                modelName: modelName || this.defaultModelName
            });
            description = response.description;
        }
        else if (this.provider === 'google-web-ai') {
            if (!this.googleWebAIClient) {
                throw new Error('Google Web AI client is not configured');
            }
            const response = await this.googleWebAIClient.analyzeImage({
                imageDataUrl,
                prompt
            });
            description = response.description;
        }
        else {
            throw new Error(`Unsupported provider: ${this.provider}`);
        }
        // Parse description to extract UI elements
        const elements = this.parseDescriptionToElements(description);
        // Filter out elements with metadata or invalid content
        const filteredElements = elements.filter(element => {
            // Skip elements with metadata text
            if (element.text && this.isMetadataText(element.text)) {
                return false;
            }
            // Skip elements without meaningful text
            if (!element.text || element.text.length < 2) {
                return false;
            }
            return true;
        });
        return {
            elements: filteredElements,
            timestamp: Date.now(),
            imageDataUrl,
            description
        };
    }
    /**
     * Get prompt for screenshot analysis (accessibility-focused)
     * IMPORTANT: Return only actual UI elements, not metadata or structured descriptions
     */
    getAnalysisPrompt() {
        return `Analyze this webpage screenshot for accessibility testing. List ONLY the actual interactive UI elements and text content visible on the page.

For each element, provide ONLY:
- The actual visible text content or label (e.g., "Submit", "Search", "Home", "Welcome to our site")
- The element type in natural language (e.g., "button", "link", "input field", "heading", "text")

DO NOT include:
- Metadata labels like "Element Type:", "Visible Text Content:", "Approximate Position:", "Accessibility Notes:"
- Structured markdown formatting with asterisks or bullets
- Position descriptions unless they are part of the actual text content
- Analysis notes or recommendations

Format as a simple list, one element per line. Example:
- "Submit" button
- "Search" input field
- "Welcome" heading
- "Click here to learn more" link

Focus on elements that are important for accessibility testing.`;
    }
    /**
     * Get prompt for color and contrast analysis
     */
    getColorAnalysisPrompt() {
        return `Analyze this webpage screenshot for color and contrast accessibility issues according to WCAG 2.1 guidelines.

For each text element, evaluate:
1. Visual contrast between text and background (estimate contrast ratio: 4.5:1 minimum for normal text, 3:1 for large text)
2. Text size and readability
3. Color usage as the only indicator (e.g., red for errors without icon/text)

For each interactive element (buttons, links, inputs):
1. Visual contrast of text/labels against background
2. Border contrast (if visible)
3. Focus indicator visibility (if any focus state is shown)
4. Hover state visibility (if any hover state is shown)
5. Disabled state distinction from enabled state

For generic elements (divs/spans styled as buttons/links):
1. Visual appearance (does it look like a button/link?)
2. Contrast issues
3. Missing visual indicators

Flag issues with severity:
- CRITICAL: Very low contrast (estimated < 3:1), color-only indicators without text/icon
- SERIOUS: Low contrast (estimated 3:1-4.5:1), missing focus indicators
- MODERATE: Borderline contrast (estimated 4.5:1-5:1), unclear hover states
- MINOR: Slight contrast issues, minor visual problems

For each issue, provide:
- Element description and location
- Issue type (contrast, color-only indicator, missing focus, etc.)
- Estimated contrast ratio (if applicable)
- WCAG criteria affected (e.g., 1.4.3 Contrast, 1.4.1 Use of Color, 2.4.7 Focus Visible)
- Recommendation for fixing

Format as a structured list of issues.`;
    }
    /**
     * Analyze screenshot for color and contrast issues using AI
     */
    async analyzeColors(imageDataUrl, modelName) {
        const prompt = this.getColorAnalysisPrompt();
        let description;
        if (this.provider === 'ollama') {
            if (!this.ollamaClient) {
                throw new Error('Ollama client is not configured');
            }
            const response = await this.ollamaClient.analyzeImage({
                imageDataUrl,
                prompt,
                modelName: modelName || this.defaultModelName
            });
            description = response.description;
        }
        else if (this.provider === 'google-web-ai') {
            if (!this.googleWebAIClient) {
                throw new Error('Google Web AI client is not configured');
            }
            const response = await this.googleWebAIClient.analyzeImage({
                imageDataUrl,
                prompt
            });
            description = response.description;
        }
        else {
            throw new Error(`Unsupported provider: ${this.provider}`);
        }
        // Parse description to extract color issues
        const issues = this.parseColorIssues(description);
        return {
            description,
            issues
        };
    }
    /**
     * Parse AI description to extract color and contrast issues
     */
    parseColorIssues(description) {
        const issues = [];
        // Try to extract issues from structured format
        const issuePatterns = [
            /(?:CRITICAL|SERIOUS|MODERATE|MINOR)[:\s]+(.*?)(?=(?:CRITICAL|SERIOUS|MODERATE|MINOR|$))/gis,
            /(?:Issue|Problem)[:\s]+(.*?)(?=(?:Issue|Problem|$))/gis,
            /(?:Contrast|Color)[:\s]+(.*?)(?=(?:Contrast|Color|$))/gis
        ];
        for (const pattern of issuePatterns) {
            const matches = description.matchAll(pattern);
            for (const match of matches) {
                const issueText = match[1]?.trim();
                if (issueText && issueText.length > 20) {
                    // Determine severity
                    let severity = 'moderate';
                    const lowerText = issueText.toLowerCase();
                    if (lowerText.includes('critical') || lowerText.includes('very low') || lowerText.includes('< 3:1')) {
                        severity = 'critical';
                    }
                    else if (lowerText.includes('serious') || lowerText.includes('low contrast') || lowerText.includes('3:1-4.5:1')) {
                        severity = 'serious';
                    }
                    else if (lowerText.includes('moderate') || lowerText.includes('borderline') || lowerText.includes('4.5:1-5:1')) {
                        severity = 'moderate';
                    }
                    else if (lowerText.includes('minor') || lowerText.includes('slight')) {
                        severity = 'minor';
                    }
                    // Extract WCAG criteria
                    const wcagCriteria = [];
                    if (lowerText.includes('1.4.3') || lowerText.includes('contrast')) {
                        wcagCriteria.push('1.4.3 Contrast (Minimum)');
                    }
                    if (lowerText.includes('1.4.1') || lowerText.includes('color') && lowerText.includes('only')) {
                        wcagCriteria.push('1.4.1 Use of Color');
                    }
                    if (lowerText.includes('2.4.7') || lowerText.includes('focus')) {
                        wcagCriteria.push('2.4.7 Focus Visible');
                    }
                    if (lowerText.includes('1.4.6') || lowerText.includes('enhanced contrast')) {
                        wcagCriteria.push('1.4.6 Contrast (Enhanced)');
                    }
                    // Extract estimated contrast
                    const contrastMatch = issueText.match(/(\d+\.?\d*):1|contrast.*?(\d+\.?\d*)/i);
                    const estimatedContrast = contrastMatch ? parseFloat(contrastMatch[1] || contrastMatch[2]) : undefined;
                    issues.push({
                        element: this.extractElementDescription(issueText),
                        issue: issueText.substring(0, 200), // Limit length
                        severity,
                        recommendation: this.extractRecommendation(issueText),
                        wcagCriteria: wcagCriteria.length > 0 ? wcagCriteria : ['1.4.3 Contrast (Minimum)'],
                        estimatedContrast,
                        source: 'ai' // Mark as AI-detected
                    });
                }
            }
        }
        // If no structured issues found, try simple line-by-line parsing
        if (issues.length === 0) {
            const lines = description.split('\n').filter(line => line.trim().length > 20 &&
                (line.toLowerCase().includes('contrast') ||
                    line.toLowerCase().includes('color') ||
                    line.toLowerCase().includes('focus') ||
                    line.toLowerCase().includes('issue')));
            for (const line of lines) {
                const lowerLine = line.toLowerCase();
                let severity = 'moderate';
                if (lowerLine.includes('critical') || lowerLine.includes('very low')) {
                    severity = 'critical';
                }
                else if (lowerLine.includes('serious') || lowerLine.includes('low')) {
                    severity = 'serious';
                }
                else if (lowerLine.includes('minor') || lowerLine.includes('slight')) {
                    severity = 'minor';
                }
                const wcagCriteria = [];
                if (lowerLine.includes('contrast'))
                    wcagCriteria.push('1.4.3 Contrast (Minimum)');
                if (lowerLine.includes('color') && lowerLine.includes('only'))
                    wcagCriteria.push('1.4.1 Use of Color');
                if (lowerLine.includes('focus'))
                    wcagCriteria.push('2.4.7 Focus Visible');
                issues.push({
                    element: 'Visual element',
                    issue: line.trim(),
                    severity,
                    recommendation: 'Review and improve contrast/color usage',
                    wcagCriteria: wcagCriteria.length > 0 ? wcagCriteria : ['1.4.3 Contrast (Minimum)'],
                    source: 'ai'
                });
            }
        }
        return issues;
    }
    /**
     * Extract element description from issue text
     */
    extractElementDescription(text) {
        // Try to find element description
        const patterns = [
            /(?:button|link|input|text|heading|element)[^.]*/i,
            /(?:in|on|at)\s+([^,]+)/i,
            /^([^:]+):/i
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[0]) {
                return match[0].trim().substring(0, 100);
            }
        }
        return 'Visual element';
    }
    /**
     * Extract recommendation from issue text
     */
    extractRecommendation(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('contrast')) {
            if (lowerText.includes('increase') || lowerText.includes('improve')) {
                return 'Increase contrast between text and background to meet WCAG 2.1 AA standards (minimum 4.5:1 for normal text, 3:1 for large text)';
            }
            return 'Improve color contrast to meet WCAG 2.1 AA standards';
        }
        if (lowerText.includes('color') && lowerText.includes('only')) {
            return 'Add additional visual indicators (icons, text, patterns) beyond color alone';
        }
        if (lowerText.includes('focus')) {
            return 'Add visible focus indicator (outline, border, background change)';
        }
        return 'Review and improve accessibility based on WCAG 2.1 guidelines';
    }
    /**
     * Check if text contains metadata patterns (should be filtered out)
     */
    isMetadataText(text) {
        if (!text)
            return false;
        const lowerText = text.toLowerCase();
        // Check for metadata labels
        const metadataPatterns = [
            /\*\s*\*\*Element Type:\*\*/,
            /\*\s*\*\*Visible Text Content:\*\*/,
            /\*\s*\*\*Approximate Position:\*\*/,
            /\*\s*\*\*Accessibility Notes:\*\*/,
            /\*\s*\*\*Visible State Indicators:\*\*/,
            /^Element Type:/i,
            /^Visible Text Content:/i,
            /^Approximate Position:/i,
            /^Accessibility Notes:/i,
            /^Visible State Indicators:/i,
        ];
        for (const pattern of metadataPatterns) {
            if (pattern.test(text)) {
                return true;
            }
        }
        // Check for markdown formatting that indicates metadata
        if (text.startsWith('*') && text.includes('**')) {
            return true;
        }
        // Check for common metadata phrases
        if (lowerText.includes('n/a') && lowerText.length < 20) {
            return true;
        }
        return false;
    }
    /**
     * Clean text content by removing metadata and formatting
     */
    cleanTextContent(text) {
        if (!text)
            return '';
        // Remove markdown formatting
        let cleaned = text
            .replace(/\*\*/g, '') // Remove bold markers
            .replace(/\*/g, '') // Remove asterisks
            .replace(/^[\s\-•]\s*/, '') // Remove list markers
            .trim();
        // Remove metadata prefixes
        cleaned = cleaned
            .replace(/^Element Type:\s*/i, '')
            .replace(/^Visible Text Content:\s*/i, '')
            .replace(/^Approximate Position:\s*/i, '')
            .replace(/^Accessibility Notes:\s*/i, '')
            .replace(/^Visible State Indicators:\s*/i, '')
            .trim();
        return cleaned;
    }
    /**
     * Parse text description to extract UI elements
     * Filters out metadata and elements with no real content
     */
    parseDescriptionToElements(description) {
        const elements = [];
        // Split by lines and process each
        const lines = description.split(/\n/).map(line => line.trim()).filter(line => line.length > 0);
        let elementIndex = 0;
        for (const line of lines) {
            // Skip metadata lines
            if (this.isMetadataText(line)) {
                continue;
            }
            // Skip very short lines or generic responses
            if (line.length < 3 ||
                line.toLowerCase() === 'none' ||
                line.toLowerCase() === 'n/a' ||
                line.toLowerCase().startsWith('overall') ||
                line.toLowerCase().startsWith('the screenshot')) {
                continue;
            }
            const lowerLine = line.toLowerCase();
            // Determine element type
            let type = 'other';
            let confidence = 0.7;
            // Extract type from line (e.g., "Submit" button, "Search" input)
            if (lowerLine.includes(' button') || lowerLine.endsWith(' button')) {
                type = 'button';
                confidence = 0.85;
            }
            else if (lowerLine.includes(' input') || lowerLine.includes(' input field') || lowerLine.endsWith(' input')) {
                type = 'input';
                confidence = 0.85;
            }
            else if (lowerLine.includes(' link') || lowerLine.endsWith(' link')) {
                type = 'link';
                confidence = 0.8;
            }
            else if (lowerLine.includes(' heading') || lowerLine.endsWith(' heading') || lowerLine.match(/h[1-6]/)) {
                type = 'heading';
                confidence = 0.85;
            }
            else if (lowerLine.includes(' image') || lowerLine.includes(' icon') || lowerLine.endsWith(' image')) {
                type = 'image';
                confidence = 0.8;
            }
            else if (lowerLine.includes(' menu') || lowerLine.includes(' navigation') || lowerLine.includes(' nav')) {
                type = 'navigation';
                confidence = 0.85;
            }
            else if (lowerLine.includes(' text') || lowerLine.includes(' paragraph') || lowerLine.endsWith(' text')) {
                type = 'text';
                confidence = 0.7;
            }
            else if (lowerLine.includes(' form') || lowerLine.includes(' dropdown') || lowerLine.includes(' checkbox') || lowerLine.includes(' radio')) {
                type = 'form';
                confidence = 0.8;
            }
            else {
                // Try to infer type from content
                if (lowerLine.includes('button') || lowerLine.includes('btn') || lowerLine.includes('submit') || lowerLine.includes('click')) {
                    type = 'button';
                    confidence = 0.8;
                }
                else if (lowerLine.includes('search') || lowerLine.includes('input') || lowerLine.includes('field')) {
                    type = 'input';
                    confidence = 0.8;
                }
                else if (lowerLine.includes('link') || lowerLine.includes('anchor') || lowerLine.includes('href')) {
                    type = 'link';
                    confidence = 0.75;
                }
                else if (lowerLine.includes('heading') || lowerLine.includes('title') || lowerLine.match(/^h[1-6]/)) {
                    type = 'heading';
                    confidence = 0.8;
                }
                else if (lowerLine.includes('image') || lowerLine.includes('icon') || lowerLine.includes('avatar') || lowerLine.includes('thumbnail')) {
                    type = 'image';
                    confidence = 0.75;
                }
                else if (lowerLine.includes('menu') || lowerLine.includes('navigation') || lowerLine.includes('nav') || lowerLine.includes('toolbar')) {
                    type = 'navigation';
                    confidence = 0.8;
                }
                else {
                    // Default to text for longer content
                    if (line.length > 10) {
                        type = 'text';
                        confidence = 0.7;
                    }
                    else {
                        continue; // Skip very short lines without clear type
                    }
                }
            }
            // Extract and clean text content
            let text = this.cleanTextContent(line);
            // Remove type suffix if present (e.g., "Submit" button -> "Submit")
            text = text.replace(/\s+(button|input|link|heading|text|image|menu|navigation|form)$/i, '').trim();
            // Remove quotes
            text = text.replace(/^["']|["']$/g, '').trim();
            // Skip if no meaningful text left
            if (!text || text.length < 2 || text.toLowerCase() === 'none' || text.toLowerCase() === 'n/a') {
                continue;
            }
            // Skip if text is just a type description
            if (text.toLowerCase() === type.toLowerCase() || text.toLowerCase().includes('element type')) {
                continue;
            }
            elements.push({
                id: `screenshot-${elementIndex++}-${Date.now()}`,
                type,
                text: text.length > 0 ? text : undefined,
                bbox: {
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                },
                confidence,
            });
        }
        // Filter out duplicate elements (same text and type)
        const uniqueElements = elements.filter((element, index, self) => index === self.findIndex(e => e.text === element.text &&
            e.type === element.type));
        return uniqueElements;
    }
}


/***/ }),

/***/ "./src/core/api/externalApiClient.ts":
/*!*******************************************!*\
  !*** ./src/core/api/externalApiClient.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ExternalAPIClient: () => (/* binding */ ExternalAPIClient)
/* harmony export */ });
// core/api/externalApiClient.ts - Client for external LLM APIs (Ollama, etc.)
/**
 * Client for external vision-language model APIs
 * Supports Ollama and similar APIs
 */
class ExternalAPIClient {
    constructor(config) {
        this.config = config;
    }
    /**
     * Analyze image using external API
     * Tries /api/chat first, falls back to /api/generate if needed
     */
    async analyzeImage(request) {
        const { imageDataUrl, prompt, modelName } = request;
        // Convert data URL to base64
        const base64Image = imageDataUrl.split(',')[1];
        // Try /api/chat first (preferred for vision models)
        let url = `${this.config.apiUrl.replace(/\/$/, '')}/api/chat`;
        let requestBody = {
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                    images: [base64Image]
                }
            ],
            stream: false
        };
        console.log('Sending request to:', url);
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        let response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
        });
        // If /api/chat fails with 404 or 405, try /api/generate as fallback
        if (!response.ok && (response.status === 404 || response.status === 405)) {
            console.log('Trying /api/generate as fallback...');
            url = `${this.config.apiUrl.replace(/\/$/, '')}/api/generate`;
            requestBody = {
                model: modelName,
                prompt: prompt,
                images: [base64Image],
                stream: false
            };
            response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
            });
        }
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API request failed: ${response.status}`;
            // Provide helpful error messages
            if (response.status === 403) {
                errorMessage += `\n\nОшибка доступа (403). Для Ollama необходимо настроить CORS:\n` +
                    `1. Остановите Ollama\n` +
                    `2. Запустите с переменной окружения:\n` +
                    `   OLLAMA_ORIGINS=chrome-extension://* ollama serve\n` +
                    `   или экспортируйте переменную:\n` +
                    `   export OLLAMA_ORIGINS=chrome-extension://*\n` +
                    `   ollama serve\n\n` +
                    `Детали ошибки: ${errorText}`;
            }
            else if (response.status === 404) {
                errorMessage += `\n\nЭндпоинт не найден. Проверьте URL API и убедитесь, что сервер запущен.\nДетали: ${errorText}`;
            }
            else {
                errorMessage += `\n\nДетали: ${errorText}`;
            }
            throw new Error(errorMessage);
        }
        const result = await response.json();
        // Extract response text - Ollama /api/chat returns message.content, /api/generate returns response
        const description = result.message?.content || result.response || result.text || JSON.stringify(result);
        console.log('External API response:', description);
        return {
            description,
            rawResponse: result
        };
    }
}


/***/ }),

/***/ "./src/core/api/googleWebAIClient.ts":
/*!*******************************************!*\
  !*** ./src/core/api/googleWebAIClient.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GoogleWebAIClient: () => (/* binding */ GoogleWebAIClient)
/* harmony export */ });
// core/api/googleWebAIClient.ts - Client for Google Web AI (Prompt API)
/**
 * Client for Google Web AI (Prompt API)
 * Uses built-in LanguageModel API in Chrome
 */
class GoogleWebAIClient {
    constructor(config = {}) {
        this.config = {
            outputLanguage: config.outputLanguage || 'en'
        };
    }
    /**
     * Check if Google Web AI is available
     */
    static async isAvailable() {
        if (typeof LanguageModel === 'undefined' || !LanguageModel.availability) {
            return false;
        }
        try {
            const availability = await LanguageModel.availability();
            return availability === 'available' || availability === true;
        }
        catch {
            return false;
        }
    }
    /**
     * Analyze image using Google Web AI (Prompt API)
     */
    async analyzeImage(request) {
        const { imageDataUrl, prompt } = request;
        // Check if API is available
        if (typeof LanguageModel === 'undefined' || !LanguageModel.create) {
            throw new Error('Google Web AI (LanguageModel API) is not available. Make sure you have Chrome 139+ with the required flags enabled.');
        }
        // Convert data URL to File/Blob
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'screenshot.png', { type: 'image/png' });
        // Create session with image and text inputs
        const session = await LanguageModel.create({
            expectedInputs: [
                { type: 'image' },
                { type: 'text' }
            ],
            outputLanguage: this.config.outputLanguage
        });
        // Prepare user message
        const userMessage = {
            role: 'user',
            content: [
                { type: 'text', value: prompt },
                { type: 'image', value: file }
            ]
        };
        // Send prompt
        const result = await session.prompt([userMessage]);
        // Extract description from response
        let description = '';
        if (typeof result === 'string') {
            description = result;
        }
        else if (result?.[0]?.content) {
            const content = result[0].content;
            if (Array.isArray(content)) {
                description = content.map(c => c.text || JSON.stringify(c)).join('\n');
            }
            else if (typeof content === 'string') {
                description = content;
            }
            else {
                description = JSON.stringify(content);
            }
        }
        else if (result?.outputText) {
            description = result.outputText;
        }
        else if (result?.choices && result.choices[0]?.message?.content) {
            description = result.choices[0].message.content;
        }
        else if (result?.text) {
            description = result.text;
        }
        else if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'string') {
            description = result[0];
        }
        else {
            description = JSON.stringify(result, null, 2);
        }
        return {
            description,
            rawResponse: result
        };
    }
}


/***/ }),

/***/ "./src/core/index.ts":
/*!***************************!*\
  !*** ./src/core/index.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AccessibilityAIAnalyzer: () => (/* binding */ AccessibilityAIAnalyzer)
/* harmony export */ });
/* harmony import */ var _api_externalApiClient__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./api/externalApiClient */ "./src/core/api/externalApiClient.ts");
/* harmony import */ var _api_googleWebAIClient__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./api/googleWebAIClient */ "./src/core/api/googleWebAIClient.ts");
/* harmony import */ var _analyzers_screenshotAnalyzer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./analyzers/screenshotAnalyzer */ "./src/core/analyzers/screenshotAnalyzer.ts");
/* harmony import */ var _analyzers_domAnalyzer__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./analyzers/domAnalyzer */ "./src/core/analyzers/domAnalyzer.ts");
/* harmony import */ var _analyzers_colorAnalyzer__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./analyzers/colorAnalyzer */ "./src/core/analyzers/colorAnalyzer.ts");
/* harmony import */ var _analyzers_elementMatcher__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./analyzers/elementMatcher */ "./src/core/analyzers/elementMatcher.ts");
/* harmony import */ var _analyzers_recommendationEngine__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./analyzers/recommendationEngine */ "./src/core/analyzers/recommendationEngine.ts");
// core/index.ts - Accessibility AI Analyzer class







/**
 * Accessibility AI Analyzer
 * Provides unified interface for AI-powered accessibility analysis
 * Supports both Ollama and Google Web AI
 *
 * @example
 * ```typescript
 * // Using Ollama
 * const analyzer = new AccessibilityAIAnalyzer({
 *   provider: 'ollama',
 *   apiUrl: 'http://localhost:11434',
 *   apiKey: 'optional-key',
 *   modelName: 'gemma3:12b'
 * });
 *
 * // Using Google Web AI
 * const analyzer = new AccessibilityAIAnalyzer({
 *   provider: 'google-web-ai',
 *   outputLanguage: 'en'
 * });
 *
 * const screenshotAnalysis = await analyzer.analyzeScreenshot(imageDataUrl);
 * const domAnalysis = await analyzer.analyzeDOM(htmlString);
 * const colorAnalysis = await analyzer.analyzeColors(page);
 * ```
 */
class AccessibilityAIAnalyzer {
    constructor(config) {
        this.config = config;
        // Initialize API clients based on provider
        if (config.provider === 'ollama') {
            if (!config.apiUrl || !config.modelName) {
                throw new Error('Ollama provider requires apiUrl and modelName');
            }
            this.ollamaClient = new _api_externalApiClient__WEBPACK_IMPORTED_MODULE_0__.ExternalAPIClient({
                apiUrl: config.apiUrl,
                apiKey: config.apiKey
            });
        }
        else if (config.provider === 'google-web-ai') {
            this.googleWebAIClient = new _api_googleWebAIClient__WEBPACK_IMPORTED_MODULE_1__.GoogleWebAIClient({
                outputLanguage: config.outputLanguage || 'en'
            });
        }
        else {
            throw new Error(`Unsupported provider: ${config.provider}`);
        }
        // Initialize analyzers
        this.screenshotAnalyzer = new _analyzers_screenshotAnalyzer__WEBPACK_IMPORTED_MODULE_2__.ScreenshotAnalyzer(config.provider, this.ollamaClient, this.googleWebAIClient, config.modelName || 'gemma3:12b');
        this.domAnalyzer = new _analyzers_domAnalyzer__WEBPACK_IMPORTED_MODULE_3__.DOMAnalyzer();
        this.colorAnalyzer = new _analyzers_colorAnalyzer__WEBPACK_IMPORTED_MODULE_4__.ColorAnalyzer();
        this.elementMatcher = new _analyzers_elementMatcher__WEBPACK_IMPORTED_MODULE_5__.ElementMatcher();
        this.recommendationEngine = new _analyzers_recommendationEngine__WEBPACK_IMPORTED_MODULE_6__.RecommendationEngine(config.provider, this.ollamaClient, this.googleWebAIClient);
    }
    /**
     * Analyze screenshot and extract UI elements
     * @param imageDataUrl - Data URL of the screenshot
     * @param modelName - Optional model name override
     */
    async analyzeScreenshot(imageDataUrl, modelName) {
        return this.screenshotAnalyzer.analyze(imageDataUrl, modelName);
    }
    /**
     * Analyze DOM tree for accessibility issues
     * @param htmlOrElement - HTML string or DOM element
     */
    async analyzeDOM(htmlOrElement) {
        return this.domAnalyzer.analyze(htmlOrElement);
    }
    /**
     * Analyze color contrast and accessibility using axe-core
     * @param tabId - Chrome tab ID (for extension context)
     * @param context - DOM element, document, or window object (for direct DOM access)
     * @param executeScriptFunc - Optional function to execute script on page (for fallback)
     */
    async analyzeColors(tabId, context, executeScriptFunc) {
        return this.colorAnalyzer.analyze(tabId, context, executeScriptFunc);
    }
    /**
     * Analyze colors and contrast using AI vision model
     * @param imageDataUrl - Screenshot data URL
     * @param modelName - Optional model name override
     */
    async analyzeColorsWithAI(imageDataUrl, modelName) {
        const aiAnalysis = await this.screenshotAnalyzer.analyzeColors(imageDataUrl, modelName);
        // Convert AI issues to ColorIssue format
        const issues = aiAnalysis.issues.map((issue, index) => ({
            element: issue.element,
            issue: issue.issue,
            severity: issue.severity,
            recommendation: issue.recommendation,
            wcagCriteria: issue.wcagCriteria,
            ruleId: `ai-${issue.severity}-${Date.now()}-${index}`, // Generate unique ID
            source: 'ai', // Mark as AI-detected
            estimatedContrast: issue.estimatedContrast // Preserve estimated contrast from AI
        }));
        return {
            issues,
            timestamp: Date.now()
        };
    }
    /**
     * Match screenshot elements with DOM elements
     * Identifies matches, mismatches, and accessibility issues
     * @param screenshotAnalysis - Results from screenshot analysis
     * @param domAnalysis - Results from DOM analysis
     */
    matchElements(screenshotAnalysis, domAnalysis) {
        return this.elementMatcher.match(screenshotAnalysis.elements, domAnalysis.elements);
    }
    /**
     * Generate comprehensive accessibility report
     * Combines all analysis results and generates AI-powered recommendations
     * @param screenshotAnalysis - Results from screenshot analysis
     * @param domAnalysis - Results from DOM analysis
     * @param colorAnalysis - Results from axe-core analysis
     * @param matchingResult - Results from element matching
     */
    async generateReport(screenshotAnalysis, domAnalysis, colorAnalysis, matchingResult) {
        return this.recommendationEngine.generateReport(screenshotAnalysis, domAnalysis, colorAnalysis, matchingResult);
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        const newConfig = { ...this.config, ...config };
        // Reinitialize if provider changed or relevant config changed
        if (config.provider || config.apiUrl || config.apiKey !== undefined || config.outputLanguage !== undefined) {
            this.config = newConfig;
            if (newConfig.provider === 'ollama') {
                if (!newConfig.apiUrl || !newConfig.modelName) {
                    throw new Error('Ollama provider requires apiUrl and modelName');
                }
                this.ollamaClient = new _api_externalApiClient__WEBPACK_IMPORTED_MODULE_0__.ExternalAPIClient({
                    apiUrl: newConfig.apiUrl,
                    apiKey: newConfig.apiKey
                });
                this.googleWebAIClient = undefined;
            }
            else if (newConfig.provider === 'google-web-ai') {
                this.googleWebAIClient = new _api_googleWebAIClient__WEBPACK_IMPORTED_MODULE_1__.GoogleWebAIClient({
                    outputLanguage: newConfig.outputLanguage || 'en'
                });
                this.ollamaClient = undefined;
            }
            this.screenshotAnalyzer = new _analyzers_screenshotAnalyzer__WEBPACK_IMPORTED_MODULE_2__.ScreenshotAnalyzer(newConfig.provider, this.ollamaClient, this.googleWebAIClient, newConfig.modelName || 'gemma3:12b');
            this.recommendationEngine = new _analyzers_recommendationEngine__WEBPACK_IMPORTED_MODULE_6__.RecommendationEngine(newConfig.provider, this.ollamaClient, this.googleWebAIClient);
        }
        else {
            this.config = newConfig;
        }
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
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
/*!***************************!*\
  !*** ./src/background.ts ***!
  \***************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_index__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./core/index */ "./src/core/index.ts");
// background.ts - Handles requests from the UI, captures screenshots and sends them to external API

// Function to analyze DOM on the page (executed via executeScript)
// This function runs in the page context where DOM API is available
function analyzeDOMOnPage() {
    const elements = [];
    let elementIdCounter = 0;
    function shouldSkipElement(element) {
        const tagName = element.tagName.toLowerCase();
        return ['script', 'style', 'noscript', 'meta', 'link', 'title', 'head'].includes(tagName);
    }
    function getBoundingBox(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        };
    }
    function getTextContent(element) {
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel)
            return ariaLabel;
        const ariaLabelledBy = element.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
            const labelledByElement = document.getElementById(ariaLabelledBy);
            if (labelledByElement)
                return labelledByElement.textContent?.trim() || undefined;
        }
        const text = element.textContent?.trim();
        return text && text.length > 0 ? text : undefined;
    }
    function extractAriaAttributes(element) {
        const ariaAttrs = {};
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('aria-')) {
                ariaAttrs[attr.name] = attr.value;
            }
        });
        return ariaAttrs;
    }
    function detectGenericElement(element) {
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
    function generateSelector(element) {
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
    function analyzeElement(element) {
        const tagName = element.tagName.toLowerCase();
        if (shouldSkipElement(element))
            return null;
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
        const recommendations = {
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
////////////////////// 1. Extension Icon Click Handler /////////////////////
// Open window when extension icon is clicked
chrome.action.onClicked.addListener(async () => {
    try {
        // Check if window already exists
        const windows = await chrome.windows.getAll();
        const existingWindow = windows.find(w => {
            if (w.type !== 'popup')
                return false;
            const url = w.url;
            return url && typeof url === 'string' && url.includes('window.html');
        });
        if (existingWindow) {
            // Focus existing window
            await chrome.windows.update(existingWindow.id, { focused: true });
            return;
        }
        // Create new window with default config
        const defaultConfig = {
            provider: 'google-web-ai',
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
    }
    catch (error) {
        console.error('Error opening window on icon click:', error);
    }
});
////////////////////// 2. Message Events /////////////////////
// 
// Listen for messages from the UI, process it, and send the result back.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
                let dataUrl;
                try {
                    // Try with explicit windowId first (works with tabs permission)
                    dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, {
                        format: 'png',
                        quality: 100
                    });
                }
                catch (windowIdError) {
                    // Fallback: try without windowId (uses the window that contains the active tab)
                    // This might work if the tab's window is still accessible
                    console.warn('Failed to capture with windowId, trying without:', windowIdError);
                    dataUrl = await chrome.tabs.captureVisibleTab({
                        format: 'png',
                        quality: 100
                    });
                }
                const response = {
                    success: true,
                    dataUrl: dataUrl
                };
                sendResponse(response);
            }
            catch (error) {
                console.error('Error capturing screenshot:', error);
                const response = {
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
                const analyzer = new _core_index__WEBPACK_IMPORTED_MODULE_0__.AccessibilityAIAnalyzer(config);
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
            }
            catch (error) {
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
            const stepTimes = {};
            try {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🚀 Starting full accessibility analysis...');
                console.log('Config:', message.config);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                const { imageDataUrl, config } = message;
                // Get active web page tab (exclude extension pages)
                // Query all active tabs across all windows to find a web page
                const allTabs = await chrome.tabs.query({ active: true });
                const tab = allTabs.find(t => t.url &&
                    !t.url.startsWith('chrome://') &&
                    !t.url.startsWith('chrome-extension://') &&
                    !t.url.startsWith('about:') &&
                    (t.url.startsWith('http://') || t.url.startsWith('https://')));
                if (!tab || !tab.id) {
                    throw new Error('No active web page tab found. Please open a web page (http:// or https://) in your browser and try again.');
                }
                // Initialize Accessibility AI Analyzer
                const analyzer = new _core_index__WEBPACK_IMPORTED_MODULE_0__.AccessibilityAIAnalyzer(config);
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
                        target: { tabId: tab.id },
                        func: analyzeDOMOnPage
                    });
                    if (results && results[0] && results[0].result) {
                        domAnalysis = results[0].result;
                    }
                    else {
                        throw new Error('Failed to analyze DOM via executeScript');
                    }
                }
                catch (executeError) {
                    throw new Error(`Failed to analyze DOM: ${executeError instanceof Error ? executeError.message : 'Unknown error'}. Make sure you're on a web page (not chrome:// or about: pages).`);
                }
                const step2Time = performance.now() - step2Start;
                stepTimes['Step 2: DOM Analysis'] = step2Time;
                console.log(`✅ Step 2 completed in ${(step2Time / 1000).toFixed(2)}s`);
                console.log(`   Found ${domAnalysis.elements.length} DOM elements`);
                const genericCount = domAnalysis.elements.filter((e) => e.isGeneric).length;
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
                        axeColorAnalysis = await analyzer.analyzeColors(tab.id, undefined, async (func) => {
                            const results = await chrome.scripting.executeScript({
                                target: { tabId: tab.id },
                                func: func
                            });
                            return results[0]?.result;
                        });
                        step3aTime = performance.now() - step3aStart;
                        console.log(`   ✅ Step 3a completed in ${(step3aTime / 1000).toFixed(2)}s`);
                        console.log(`      Found ${axeColorAnalysis.issues.length} issues from axe-core`);
                    }
                    catch (error) {
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
                    }
                    catch (error) {
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
                    const colorAnalyzer = analyzer.colorAnalyzer;
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
                    const axeIssues = colorAnalysis.issues.filter((i) => i.source === 'axe-core').length;
                    const aiIssues = colorAnalysis.issues.filter((i) => i.source === 'ai').length;
                    const bothIssues = colorAnalysis.issues.filter((i) => i.source === 'both').length;
                    console.log(`   - Axe-core: ${axeIssues}, AI: ${aiIssues}, Both: ${bothIssues}`);
                }
                catch (error) {
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
                const report = await analyzer.generateReport(screenshotAnalysis, domAnalysis, colorAnalysis, matchingResult);
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
                    elements: domAnalysis.elements.filter((element) => {
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
                        const unmatchedElement = matchingResult.unmatchedDOM.find((e) => e.id === element.id);
                        // Element must be in unmatchedDOM AND have issues or be generic
                        // Skip root elements (html, body) that are always unmatched but usually don't have issues
                        const isRootElement = element.tagName === 'html' || element.tagName === 'body';
                        const isUnmatchedWithIssues = unmatchedElement !== undefined && !isRootElement && (element.recommendations?.issues?.length > 0 ||
                            element.isGeneric === true);
                        // Include if element is in matched pairs with issues (only if there are actual issues)
                        // Also check that the DOM element itself has issues, not just the match
                        const isMatchedWithIssues = matchingResult.matched.some((m) => {
                            if (m.domElement?.id !== element.id)
                                return false;
                            // Match must have issues
                            if (!m.issues || m.issues.length === 0)
                                return false;
                            // DOM element must also have issues or be generic
                            const domHasIssues = m.domElement?.recommendations?.issues?.length > 0 || m.domElement?.isGeneric === true;
                            return domHasIssues;
                        });
                        // Include if element has color issues (check by selector, id, or class)
                        // Be more precise to avoid false positives - only match CSS selectors, not text descriptions
                        const hasColorIssues = colorAnalysis.issues.some((issue) => {
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
                            if (issueElement === element.selector)
                                return true;
                            // ID match (exact)
                            if (element.elementId && issueElement === `#${element.elementId}`)
                                return true;
                            // Class match - only if the issue element explicitly contains the class selector
                            // Avoid matching generic class names that might appear in other contexts
                            if (element.className) {
                                const classes = element.className.split(/\s+/).filter((cls) => cls.length > 0);
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
            }
            catch (error) {
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
                const { config } = message;
                // Check if window already exists
                const windows = await chrome.windows.getAll();
                const existingWindow = windows.find(w => {
                    if (w.type !== 'popup')
                        return false;
                    // Check if window URL contains 'window.html'
                    const url = w.url;
                    return url && typeof url === 'string' && url.includes('window.html');
                });
                if (existingWindow) {
                    // Focus existing window
                    await chrome.windows.update(existingWindow.id, { focused: true });
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
            }
            catch (error) {
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

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7QUN2VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1DQUFtQyxTQUFTLGtCQUFrQixtQ0FBbUM7QUFDakcsd0NBQXdDO0FBQ3hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnREFBZ0Q7QUFDaEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnREFBZ0Q7QUFDaEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnREFBZ0Q7QUFDaEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRDQUE0QztBQUM1QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3Q0FBd0M7QUFDeEM7QUFDQTtBQUNBO0FBQ0Esd0NBQXdDO0FBQ3hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaURBQWlEO0FBQ2pEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw0Q0FBNEM7QUFDNUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4Q0FBOEMsNkJBQTZCO0FBQzNFLHdDQUF3QztBQUN4QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLCtEQUErRCxHQUFHO0FBQ2xFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDBCQUEwQixXQUFXO0FBQ3JDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNCQUFzQixTQUFTLEdBQUcsUUFBUSxHQUFHLE1BQU0sR0FBRyxXQUFXO0FBQ2pFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7O0FDcFVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxzQkFBc0I7QUFDdEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwwQkFBMEI7QUFDMUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4QkFBOEIsV0FBVyxHQUFHLHVCQUF1QjtBQUNuRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDO0FBQ2hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0NBQW9DLGlCQUFpQjtBQUNyRDtBQUNBO0FBQ0E7QUFDQSwrQkFBK0Isa0JBQWtCO0FBQ2pEO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0NBQWtDLFFBQVE7QUFDMUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUNBQWlDLFlBQVk7QUFDN0M7QUFDQTtBQUNBO0FBQ0EsdUNBQXVDLGtCQUFrQjtBQUN6RDtBQUNBO0FBQ0E7QUFDQSxnQ0FBZ0MsaUJBQWlCO0FBQ2pEO0FBQ0E7QUFDQTtBQUNBLGdDQUFnQyxnQkFBZ0I7QUFDaEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7QUM1akJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBLHFEQUFxRCxjQUFjO0FBQ25FO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBLHFEQUFxRCxjQUFjO0FBQ25FO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtDQUFrQztBQUNsQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUFDckI7QUFDQTtBQUNBLENBQUM7QUFDRCIsInNvdXJjZXMiOlsid2VicGFjazovL2V4dGVuc2lvbi8uL3NyYy9jb3JlL2FuYWx5emVycy9jb2xvckFuYWx5emVyLnRzIiwid2VicGFjazovL2V4dGVuc2lvbi8uL3NyYy9jb3JlL2FuYWx5emVycy9kb21BbmFseXplci50cyIsIndlYnBhY2s6Ly9leHRlbnNpb24vLi9zcmMvY29yZS9hbmFseXplcnMvZWxlbWVudE1hdGNoZXIudHMiLCJ3ZWJwYWNrOi8vZXh0ZW5zaW9uLy4vc3JjL2NvcmUvYW5hbHl6ZXJzL3JlY29tbWVuZGF0aW9uRW5naW5lLnRzIiwid2VicGFjazovL2V4dGVuc2lvbi8uL3NyYy9jb3JlL2FuYWx5emVycy9zY3JlZW5zaG90QW5hbHl6ZXIudHMiLCJ3ZWJwYWNrOi8vZXh0ZW5zaW9uLy4vc3JjL2NvcmUvYXBpL2V4dGVybmFsQXBpQ2xpZW50LnRzIiwid2VicGFjazovL2V4dGVuc2lvbi8uL3NyYy9jb3JlL2FwaS9nb29nbGVXZWJBSUNsaWVudC50cyIsIndlYnBhY2s6Ly9leHRlbnNpb24vLi9zcmMvY29yZS9pbmRleC50cyIsIndlYnBhY2s6Ly9leHRlbnNpb24vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vZXh0ZW5zaW9uL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9leHRlbnNpb24vd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9leHRlbnNpb24vd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9leHRlbnNpb24vLi9zcmMvYmFja2dyb3VuZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBjb3JlL2FuYWx5emVycy9jb2xvckFuYWx5emVyLnRzIC0gQ29sb3IgY29udHJhc3QgYW5kIFdDQUcgYW5hbHlzaXMgdXNpbmcgYXhlLWNvcmVcbi8qKlxuICogQW5hbHl6ZXIgZm9yIGNvbG9yIGNvbnRyYXN0IGFuZCBhY2Nlc3NpYmlsaXR5IHVzaW5nIGF4ZS1jb3JlXG4gKiBSdW5zIGF1dG9tYXRlZCBXQ0FHIDIuMSBjaGVja3NcbiAqL1xuZXhwb3J0IGNsYXNzIENvbG9yQW5hbHl6ZXIge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmF4ZUxvYWRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBbmFseXplIGFjY2Vzc2liaWxpdHkgaXNzdWVzIG9uIGEgcGFnZSB1c2luZyBheGUtY29yZVxuICAgICAqIEluIENocm9tZSBleHRlbnNpb24gY29udGV4dCwgdGhpcyBzaG91bGQgYmUgY2FsbGVkIGZyb20gYmFja2dyb3VuZCBzY3JpcHRcbiAgICAgKiB3aGljaCBjb21tdW5pY2F0ZXMgd2l0aCBjb250ZW50IHNjcmlwdCB3aGVyZSBheGUtY29yZSBydW5zXG4gICAgICogQHBhcmFtIHRhYklkIC0gQ2hyb21lIHRhYiBJRCAoZm9yIGV4dGVuc2lvbiBjb250ZXh0KVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gRE9NIGVsZW1lbnQsIGRvY3VtZW50LCBvciB3aW5kb3cgb2JqZWN0IChmb3IgZGlyZWN0IERPTSBhY2Nlc3MpXG4gICAgICogQHBhcmFtIGV4ZWN1dGVTY3JpcHRGdW5jIC0gT3B0aW9uYWwgZnVuY3Rpb24gdG8gZXhlY3V0ZSBzY3JpcHQgb24gcGFnZSAoZm9yIGZhbGxiYWNrKVxuICAgICAqL1xuICAgIGFzeW5jIGFuYWx5emUodGFiSWQsIGNvbnRleHQsIGV4ZWN1dGVTY3JpcHRGdW5jKSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgZGlyZWN0IERPTSBhY2Nlc3MgKGUuZy4sIGluIGNvbnRlbnQgc2NyaXB0KSwgdXNlIGl0XG4gICAgICAgIGlmIChjb250ZXh0ICYmIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5zdXJlQXhlQ29yZSgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNBeGVBdmFpbGFibGUoKSkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0aGlzLnJ1bkF4ZShjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNzdWVzID0gdGhpcy5jb252ZXJ0QXhlVmlvbGF0aW9uc1RvSXNzdWVzKHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNzdWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBydW5uaW5nIGF4ZS1jb3JlIGFuYWx5c2lzOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgd2UncmUgaW4gYmFja2dyb3VuZCBzY3JpcHQsIHRyeSBjb250ZW50IHNjcmlwdCBmaXJzdCwgdGhlbiBleGVjdXRlU2NyaXB0XG4gICAgICAgIGlmICh0YWJJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0aGlzLnJ1bkF4ZVZpYUNvbnRlbnRTY3JpcHQodGFiSWQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzc3VlcyA9IHRoaXMuY29udmVydEF4ZVZpb2xhdGlvbnNUb0lzc3VlcyhyZXN1bHRzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBpc3N1ZXMsXG4gICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byBleGVjdXRlU2NyaXB0IGlmIGNvbnRlbnQgc2NyaXB0IGlzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAoZXhlY3V0ZVNjcmlwdEZ1bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERlZmluZSB0aGUgZnVuY3Rpb24gaW5saW5lIHRvIGJlIGV4ZWN1dGVkIG9uIHRoZSBwYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBydW5BeGVPblBhZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGF4ZS1jb3JlIGlzIGFscmVhZHkgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygd2luZG93LmF4ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF4ZSA9IHdpbmRvdy5heGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBheGUucnVuKGRvY3VtZW50LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcnVuT25seToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGFnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzOiBbJ3djYWcyYScsICd3Y2FnMmFhJywgJ3djYWcyMWEnLCAnd2NhZzIxYWEnXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIChlcnIsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyB2aW9sYXRpb25zOiBbXSwgcGFzc2VzOiBbXSwgaW5jb21wbGV0ZTogW10sIGluYXBwbGljYWJsZTogW10gfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyeSB0byBsb2FkIGF4ZS1jb3JlIGZyb20gZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JpcHQuc3JjID0gY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKCd2ZW5kb3JzLW5vZGVfbW9kdWxlc19heGUtY29yZV9heGVfanMuanMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyaXB0Lm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdhaXQgYSBiaXQgZm9yIGF4ZSB0byBpbml0aWFsaXplXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdy5heGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF4ZSA9IHdpbmRvdy5heGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF4ZS5ydW4oZG9jdW1lbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ1bk9ubHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGFnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXM6IFsnd2NhZzJhJywgJ3djYWcyYWEnLCAnd2NhZzIxYScsICd3Y2FnMjFhYSddXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIChlcnIsIHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgdmlvbGF0aW9uczogW10sIHBhc3NlczogW10sIGluY29tcGxldGU6IFtdLCBpbmFwcGxpY2FibGU6IFtdIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgdmlvbGF0aW9uczogW10sIHBhc3NlczogW10sIGluY29tcGxldGU6IFtdLCBpbmFwcGxpY2FibGU6IFtdIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdC5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHZpb2xhdGlvbnM6IFtdLCBwYXNzZXM6IFtdLCBpbmNvbXBsZXRlOiBbXSwgaW5hcHBsaWNhYmxlOiBbXSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBleGVjdXRlU2NyaXB0RnVuYyhydW5BeGVPblBhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNzdWVzID0gdGhpcy5jb252ZXJ0QXhlVmlvbGF0aW9uc1RvSXNzdWVzKHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhdGNoIChleGVjdXRlRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJ1bm5pbmcgYXhlLWNvcmUgdmlhIGV4ZWN1dGVTY3JpcHQ6JywgZXhlY3V0ZUVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcnVubmluZyBheGUtY29yZSB2aWEgY29udGVudCBzY3JpcHQ6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaXNzdWVzOiBbXSxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSdW4gYXhlLWNvcmUgYW5hbHlzaXMgdmlhIGNvbnRlbnQgc2NyaXB0IChmcm9tIGJhY2tncm91bmQgc2NyaXB0KVxuICAgICAqIEZhbGxzIGJhY2sgdG8gZXhlY3V0ZVNjcmlwdCBpZiBjb250ZW50IHNjcmlwdCBpcyBub3QgYXZhaWxhYmxlXG4gICAgICovXG4gICAgYXN5bmMgcnVuQXhlVmlhQ29udGVudFNjcmlwdCh0YWJJZCkge1xuICAgICAgICAvLyBUcnkgY29udGVudCBzY3JpcHQgZmlyc3RcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHsgYWN0aW9uOiAncnVuQXhlQW5hbHlzaXMnIH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb250ZW50IHNjcmlwdCBub3QgYXZhaWxhYmxlLCB3aWxsIHVzZSBleGVjdXRlU2NyaXB0IGZhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdDb250ZW50IHNjcmlwdCBub3QgYXZhaWxhYmxlJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3BvbnNlLnJlc3VsdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihyZXNwb25zZT8uZXJyb3IgfHwgJ1Vua25vd24gZXJyb3InKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHVzZSBleGVjdXRlU2NyaXB0IHRvIHJ1biBheGUtY29yZSBkaXJlY3RseSBvbiB0aGUgcGFnZVxuICAgICAgICAgICAgLy8gVGhpcyByZXF1aXJlcyB0aGUgZnVuY3Rpb24gdG8gYmUgcGFzc2VkIGZyb20gYmFja2dyb3VuZCBzY3JpcHRcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29udGVudCBzY3JpcHQgbm90IGF2YWlsYWJsZSwgdXNlIGV4ZWN1dGVTY3JpcHQgZmFsbGJhY2snKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBSdW4gYXhlLWNvcmUgYW5hbHlzaXNcbiAgICAgKi9cbiAgICBhc3luYyBydW5BeGUoY29udGV4dCkge1xuICAgICAgICAvLyBDaGVjayBpZiB3ZSdyZSBpbiBhIGJyb3dzZXIgY29udGV4dCB3aXRoIGF4ZS1jb3JlXG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuYXhlKSB7XG4gICAgICAgICAgICBjb25zdCBheGUgPSB3aW5kb3cuYXhlO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBheGUucnVuKGNvbnRleHQsIHtcbiAgICAgICAgICAgICAgICAgICAgcnVuT25seToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3RhZycsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXM6IFsnd2NhZzJhJywgJ3djYWcyYWEnLCAnd2NhZzIxYScsICd3Y2FnMjFhYSddXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCAoZXJyLCByZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgYXhlIGlzIG5vdCBhdmFpbGFibGUsIHJldHVybiBlbXB0eSByZXN1bHRzXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2aW9sYXRpb25zOiBbXSxcbiAgICAgICAgICAgIHBhc3NlczogW10sXG4gICAgICAgICAgICBpbmNvbXBsZXRlOiBbXSxcbiAgICAgICAgICAgIGluYXBwbGljYWJsZTogW11cbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29tYmluZSBheGUtY29yZSByZXN1bHRzIHdpdGggQUkgYW5hbHlzaXMgcmVzdWx0c1xuICAgICAqL1xuICAgIGNvbWJpbmVXaXRoQUkoYXhlQW5hbHlzaXMsIGFpQW5hbHlzaXMpIHtcbiAgICAgICAgY29uc3QgY29tYmluZWRJc3N1ZXMgPSBbXTtcbiAgICAgICAgY29uc3Qgc2Vlbklzc3VlcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgLy8gQWRkIGF4ZS1jb3JlIGlzc3VlcyAocHJpb3JpdGl6ZSAtIHRoZXkgYXJlIG1vcmUgYWNjdXJhdGUpXG4gICAgICAgIGZvciAoY29uc3QgaXNzdWUgb2YgYXhlQW5hbHlzaXMuaXNzdWVzKSB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBgJHtpc3N1ZS5lbGVtZW50fS0ke2lzc3VlLmlzc3VlLnN1YnN0cmluZygwLCA1MCl9YDtcbiAgICAgICAgICAgIGlmICghc2Vlbklzc3Vlcy5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIGNvbWJpbmVkSXNzdWVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAuLi5pc3N1ZSxcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiAnYXhlLWNvcmUnIC8vIE1hcmsgYXMgYXhlLWNvcmUgZGV0ZWN0ZWRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzZWVuSXNzdWVzLmFkZChrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCBBSSBpc3N1ZXMgKGVzcGVjaWFsbHkgZm9yIGdlbmVyaWMgZWxlbWVudHMpXG4gICAgICAgIGZvciAoY29uc3QgaXNzdWUgb2YgYWlBbmFseXNpcy5pc3N1ZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke2lzc3VlLmVsZW1lbnR9LSR7aXNzdWUuaXNzdWUuc3Vic3RyaW5nKDAsIDUwKX1gO1xuICAgICAgICAgICAgaWYgKCFzZWVuSXNzdWVzLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGdlbmVyaWMgZWxlbWVudCBpc3N1ZSAoQUkgY2FuIGRldGVjdCB0aGVzZSBiZXR0ZXIpXG4gICAgICAgICAgICAgICAgY29uc3QgaXNHZW5lcmljRWxlbWVudCA9IGlzc3VlLmVsZW1lbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnZGl2JykgfHxcbiAgICAgICAgICAgICAgICAgICAgaXNzdWUuZWxlbWVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdzcGFuJykgfHxcbiAgICAgICAgICAgICAgICAgICAgaXNzdWUuZWxlbWVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdnZW5lcmljJyk7XG4gICAgICAgICAgICAgICAgLy8gUHJpb3JpdGl6ZSBBSSBpc3N1ZXMgZm9yIGdlbmVyaWMgZWxlbWVudHNcbiAgICAgICAgICAgICAgICBpZiAoaXNHZW5lcmljRWxlbWVudCB8fCBpc3N1ZS5zZXZlcml0eSA9PT0gJ2NyaXRpY2FsJykge1xuICAgICAgICAgICAgICAgICAgICBjb21iaW5lZElzc3Vlcy51bnNoaWZ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLmlzc3VlLFxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiAnYWknXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29tYmluZWRJc3N1ZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5pc3N1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogJ2FpJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2Vlbklzc3Vlcy5hZGQoa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIGJvdGggZm91bmQgdGhlIHNhbWUgaXNzdWUsIG1hcmsgYXMgY29uZmlybWVkIGFuZCBpbmNyZWFzZSBzZXZlcml0eVxuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nSW5kZXggPSBjb21iaW5lZElzc3Vlcy5maW5kSW5kZXgoaSA9PiBpLmVsZW1lbnQgPT09IGlzc3VlLmVsZW1lbnQgJiZcbiAgICAgICAgICAgICAgICAgICAgaS5pc3N1ZS5zdWJzdHJpbmcoMCwgNTApID09PSBpc3N1ZS5pc3N1ZS5zdWJzdHJpbmcoMCwgNTApKTtcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBjb21iaW5lZElzc3Vlc1tleGlzdGluZ0luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBncmFkZSBzZXZlcml0eSBpZiBib3RoIGRldGVjdGVkIGl0XG4gICAgICAgICAgICAgICAgICAgIGlmIChleGlzdGluZy5zZXZlcml0eSA9PT0gJ21pbm9yJyAmJiBpc3N1ZS5zZXZlcml0eSAhPT0gJ21pbm9yJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmcuc2V2ZXJpdHkgPSBpc3N1ZS5zZXZlcml0eTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChleGlzdGluZy5zZXZlcml0eSA9PT0gJ21vZGVyYXRlJyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgKGlzc3VlLnNldmVyaXR5ID09PSAnc2VyaW91cycgfHwgaXNzdWUuc2V2ZXJpdHkgPT09ICdjcml0aWNhbCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZy5zZXZlcml0eSA9IGlzc3VlLnNldmVyaXR5O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nLnNvdXJjZSA9ICdib3RoJzsgLy8gTWFyayBhcyBkZXRlY3RlZCBieSBib3RoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFNvcnQgYnkgc2V2ZXJpdHkgKGNyaXRpY2FsIGZpcnN0KVxuICAgICAgICBjb21iaW5lZElzc3Vlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZXZlcml0eU9yZGVyID0geyBjcml0aWNhbDogMCwgc2VyaW91czogMSwgbW9kZXJhdGU6IDIsIG1pbm9yOiAzIH07XG4gICAgICAgICAgICByZXR1cm4gc2V2ZXJpdHlPcmRlclthLnNldmVyaXR5XSAtIHNldmVyaXR5T3JkZXJbYi5zZXZlcml0eV07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaXNzdWVzOiBjb21iaW5lZElzc3VlcyxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGF4ZSB2aW9sYXRpb25zIHRvIENvbG9ySXNzdWUgZm9ybWF0XG4gICAgICovXG4gICAgY29udmVydEF4ZVZpb2xhdGlvbnNUb0lzc3VlcyhyZXN1bHRzKSB7XG4gICAgICAgIGNvbnN0IGlzc3VlcyA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHZpb2xhdGlvbiBvZiByZXN1bHRzLnZpb2xhdGlvbnMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiB2aW9sYXRpb24ubm9kZXMpIHtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IFdDQUcgY3JpdGVyaWEgZnJvbSB0YWdzXG4gICAgICAgICAgICAgICAgY29uc3Qgd2NhZ1RhZ3MgPSB2aW9sYXRpb24udGFncy5maWx0ZXIodGFnID0+IHRhZy5zdGFydHNXaXRoKCd3Y2FnJykgfHwgdGFnLnN0YXJ0c1dpdGgoJ3djYWcyJykpO1xuICAgICAgICAgICAgICAgIC8vIE1hcCBpbXBhY3QgdG8gc2V2ZXJpdHlcbiAgICAgICAgICAgICAgICBjb25zdCBzZXZlcml0eSA9IHRoaXMubWFwSW1wYWN0VG9TZXZlcml0eSh2aW9sYXRpb24uaW1wYWN0KTtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgaXNzdWUgZGVzY3JpcHRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IGAke3Zpb2xhdGlvbi5kZXNjcmlwdGlvbn0uICR7bm9kZS5mYWlsdXJlU3VtbWFyeSB8fCAnJ31gO1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSByZWNvbW1lbmRhdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29tbWVuZGF0aW9uID0gYCR7dmlvbGF0aW9uLmhlbHB9LiBTZWU6ICR7dmlvbGF0aW9uLmhlbHBVcmx9YDtcbiAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IG5vZGUudGFyZ2V0LmpvaW4oJyAnKSwgLy8gQ1NTIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgIGlzc3VlOiBkZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiAnYXhlLWNvcmUnLCAvLyBNYXJrIGFzIGF4ZS1jb3JlIGRldGVjdGVkXG4gICAgICAgICAgICAgICAgICAgIHNldmVyaXR5LFxuICAgICAgICAgICAgICAgICAgICByZWNvbW1lbmRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgd2NhZ0NyaXRlcmlhOiB3Y2FnVGFncyxcbiAgICAgICAgICAgICAgICAgICAgcnVsZUlkOiB2aW9sYXRpb24uaWRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXNzdWVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBNYXAgYXhlIGltcGFjdCB0byBzZXZlcml0eVxuICAgICAqL1xuICAgIG1hcEltcGFjdFRvU2V2ZXJpdHkoaW1wYWN0KSB7XG4gICAgICAgIHN3aXRjaCAoaW1wYWN0KSB7XG4gICAgICAgICAgICBjYXNlICdjcml0aWNhbCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdjcml0aWNhbCc7XG4gICAgICAgICAgICBjYXNlICdzZXJpb3VzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3NlcmlvdXMnO1xuICAgICAgICAgICAgY2FzZSAnbW9kZXJhdGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnbW9kZXJhdGUnO1xuICAgICAgICAgICAgY2FzZSAnbWlub3InOlxuICAgICAgICAgICAgICAgIHJldHVybiAnbWlub3InO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ21vZGVyYXRlJztcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBheGUtY29yZSBpcyBhdmFpbGFibGVcbiAgICAgKi9cbiAgICBpc0F4ZUF2YWlsYWJsZSgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIHdpbmRvdy5heGUgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRW5zdXJlIGF4ZS1jb3JlIGlzIGxvYWRlZFxuICAgICAqIEluIENocm9tZSBleHRlbnNpb24gY29udGV4dCwgYXhlLWNvcmUgc2hvdWxkIGJlIGluamVjdGVkIHZpYSBjb250ZW50IHNjcmlwdFxuICAgICAqL1xuICAgIGFzeW5jIGVuc3VyZUF4ZUNvcmUoKSB7XG4gICAgICAgIGlmICh0aGlzLmF4ZUxvYWRlZCB8fCB0aGlzLmlzQXhlQXZhaWxhYmxlKCkpIHtcbiAgICAgICAgICAgIHRoaXMuYXhlTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBUcnkgdG8gbG9hZCBheGUtY29yZSBkeW5hbWljYWxseVxuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gSW4gQ2hyb21lIGV4dGVuc2lvbiwgYXhlLWNvcmUgc2hvdWxkIGJlIGluamVjdGVkIHZpYSBjb250ZW50IHNjcmlwdFxuICAgICAgICAgICAgICAgIC8vIEZvciBub3csIHdlJ2xsIGFzc3VtZSBpdCdzIGF2YWlsYWJsZSBvciB3aWxsIGJlIGluamVjdGVkXG4gICAgICAgICAgICAgICAgdGhpcy5heGVMb2FkZWQgPSB0aGlzLmlzQXhlQXZhaWxhYmxlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0NvdWxkIG5vdCBsb2FkIGF4ZS1jb3JlOicsIGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIi8vIGNvcmUvYW5hbHl6ZXJzL2RvbUFuYWx5emVyLnRzIC0gRE9NIHRyZWUgYW5hbHlzaXMgZm9yIGFjY2Vzc2liaWxpdHlcbi8qKlxuICogQW5hbHl6ZXIgZm9yIERPTSB0cmVlIGFjY2Vzc2liaWxpdHlcbiAqIEV4dHJhY3RzIHNlbWFudGljIGluZm9ybWF0aW9uLCBBUklBIGF0dHJpYnV0ZXMsIGRldGVjdHMgZ2VuZXJpYyBlbGVtZW50cywgYW5kIHByb3ZpZGVzIHJlY29tbWVuZGF0aW9uc1xuICovXG5leHBvcnQgY2xhc3MgRE9NQW5hbHl6ZXIge1xuICAgIC8qKlxuICAgICAqIEFuYWx5emUgRE9NIHRyZWUgZnJvbSBIVE1MIHN0cmluZyBvciBET00gZWxlbWVudFxuICAgICAqIFdvcmtzIGluIGNvbnRlbnQgc2NyaXB0IGNvbnRleHQgd2hlcmUgRE9NIGlzIGF2YWlsYWJsZVxuICAgICAqL1xuICAgIGFzeW5jIGFuYWx5emUoaHRtbE9yRWxlbWVudCkge1xuICAgICAgICBsZXQgcm9vdEVsZW1lbnQ7XG4gICAgICAgIGlmICh0eXBlb2YgaHRtbE9yRWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIFBhcnNlIEhUTUwgc3RyaW5nXG4gICAgICAgICAgICBjb25zdCBwYXJzZXIgPSBuZXcgRE9NUGFyc2VyKCk7XG4gICAgICAgICAgICBjb25zdCBkb2MgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKGh0bWxPckVsZW1lbnQsICd0ZXh0L2h0bWwnKTtcbiAgICAgICAgICAgIHJvb3RFbGVtZW50ID0gZG9jLmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJvb3RFbGVtZW50ID0gaHRtbE9yRWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbGVtZW50cyA9IFtdO1xuICAgICAgICAvLyBHZXQgYWxsIGVsZW1lbnRzIGluIHRoZSBET01cbiAgICAgICAgY29uc3QgYWxsRWxlbWVudHMgPSBBcnJheS5mcm9tKHJvb3RFbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyonKSk7XG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBhbGxFbGVtZW50cykge1xuICAgICAgICAgICAgLy8gU2tpcCBzY3JpcHQsIHN0eWxlLCBhbmQgb3RoZXIgbm9uLWNvbnRlbnQgZWxlbWVudHNcbiAgICAgICAgICAgIGlmICh0aGlzLnNob3VsZFNraXBFbGVtZW50KGVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkb21FbGVtZW50ID0gdGhpcy5hbmFseXplRWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgICAgIGlmIChkb21FbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaChkb21FbGVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWxlbWVudHMsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQW5hbHl6ZSBhIHNpbmdsZSBET00gZWxlbWVudFxuICAgICAqL1xuICAgIGFuYWx5emVFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgdGFnTmFtZSA9IGVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBjb25zdCBpZCA9IHRoaXMuZ2VuZXJhdGVFbGVtZW50SWQoZWxlbWVudCk7XG4gICAgICAgIGNvbnN0IGJib3ggPSB0aGlzLmdldEJvdW5kaW5nQm94KGVsZW1lbnQpO1xuICAgICAgICAvLyBFeHRyYWN0IHRleHQgY29udGVudFxuICAgICAgICBjb25zdCB0ZXh0ID0gdGhpcy5leHRyYWN0VGV4dENvbnRlbnQoZWxlbWVudCk7XG4gICAgICAgIC8vIEV4dHJhY3QgQVJJQSBhdHRyaWJ1dGVzXG4gICAgICAgIGNvbnN0IGFyaWFMYWJlbCA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJykgfHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBhcmlhUm9sZSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdyb2xlJykgfHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBhcmlhQXR0cmlidXRlcyA9IHRoaXMuZXh0cmFjdEFyaWFBdHRyaWJ1dGVzKGVsZW1lbnQpO1xuICAgICAgICAvLyBDaGVjayBpZiBlbGVtZW50IGlzIGdlbmVyaWMgKGRpdi9zcGFuIHVzZWQgYXMgaW50ZXJhY3RpdmUpXG4gICAgICAgIGNvbnN0IGdlbmVyaWNJbmZvID0gdGhpcy5kZXRlY3RHZW5lcmljRWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgLy8gQW5hbHl6ZSBmb3IgaXNzdWVzIGFuZCByZWNvbW1lbmRhdGlvbnNcbiAgICAgICAgY29uc3QgcmVjb21tZW5kYXRpb25zID0gdGhpcy5hbmFseXplQWNjZXNzaWJpbGl0eShlbGVtZW50LCBnZW5lcmljSW5mbyk7XG4gICAgICAgIC8vIERldGVybWluZSBzZW1hbnRpYyB0YWcgcmVjb21tZW5kYXRpb25cbiAgICAgICAgY29uc3Qgc2VtYW50aWNUYWcgPSB0aGlzLmdldFNlbWFudGljUmVjb21tZW5kYXRpb24oZWxlbWVudCwgZ2VuZXJpY0luZm8pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICB0YWdOYW1lLFxuICAgICAgICAgICAgc2VtYW50aWNUYWcsXG4gICAgICAgICAgICB0ZXh0OiB0ZXh0IHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGFyaWFMYWJlbCxcbiAgICAgICAgICAgIGFyaWFSb2xlLFxuICAgICAgICAgICAgYXJpYUF0dHJpYnV0ZXM6IE9iamVjdC5rZXlzKGFyaWFBdHRyaWJ1dGVzKS5sZW5ndGggPiAwID8gYXJpYUF0dHJpYnV0ZXMgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBiYm94LFxuICAgICAgICAgICAgaXNHZW5lcmljOiBnZW5lcmljSW5mby5pc0dlbmVyaWMsXG4gICAgICAgICAgICBnZW5lcmljVHlwZTogZ2VuZXJpY0luZm8udHlwZSxcbiAgICAgICAgICAgIHJlY29tbWVuZGF0aW9uc1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgaWYgZWxlbWVudCBpcyBhIGdlbmVyaWMgZWxlbWVudCAoZGl2L3NwYW4pIHVzZWQgYXMgaW50ZXJhY3RpdmUgY29tcG9uZW50XG4gICAgICovXG4gICAgZGV0ZWN0R2VuZXJpY0VsZW1lbnQoZWxlbWVudCkge1xuICAgICAgICBjb25zdCB0YWdOYW1lID0gZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIC8vIE9ubHkgY2hlY2sgZGl2IGFuZCBzcGFuXG4gICAgICAgIGlmICh0YWdOYW1lICE9PSAnZGl2JyAmJiB0YWdOYW1lICE9PSAnc3BhbicpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGlzR2VuZXJpYzogZmFsc2UgfTtcbiAgICAgICAgfVxuICAgICAgICAvLyBDaGVjayBmb3IgaW50ZXJhY3RpdmUgaW5kaWNhdG9yc1xuICAgICAgICBjb25zdCBoYXNPbkNsaWNrID0gZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ29uY2xpY2snKSB8fFxuICAgICAgICAgICAgZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ29uY2xpY2snKSAhPT0gbnVsbDtcbiAgICAgICAgY29uc3QgaGFzUm9sZSA9IGVsZW1lbnQuaGFzQXR0cmlidXRlKCdyb2xlJyk7XG4gICAgICAgIGNvbnN0IHJvbGUgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgncm9sZScpO1xuICAgICAgICBjb25zdCBoYXNUYWJJbmRleCA9IGVsZW1lbnQuaGFzQXR0cmlidXRlKCd0YWJpbmRleCcpO1xuICAgICAgICBjb25zdCB0YWJJbmRleCA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCd0YWJpbmRleCcpO1xuICAgICAgICBjb25zdCBpc0NvbnRlbnRFZGl0YWJsZSA9IGVsZW1lbnQuaGFzQXR0cmlidXRlKCdjb250ZW50ZWRpdGFibGUnKSAmJlxuICAgICAgICAgICAgZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2NvbnRlbnRlZGl0YWJsZScpICE9PSAnZmFsc2UnO1xuICAgICAgICAvLyBDaGVjayBmb3Iga2V5Ym9hcmQgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgY29uc3QgaGFzS2V5Ym9hcmRIYW5kbGVyID0gZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ29ua2V5ZG93bicpIHx8XG4gICAgICAgICAgICBlbGVtZW50Lmhhc0F0dHJpYnV0ZSgnb25rZXlwcmVzcycpIHx8XG4gICAgICAgICAgICBlbGVtZW50Lmhhc0F0dHJpYnV0ZSgnb25rZXl1cCcpO1xuICAgICAgICAvLyBDaGVjayBjb21wdXRlZCBzdHlsZSBmb3IgY3Vyc29yIHBvaW50ZXIgKGluZGljYXRlcyBpbnRlcmFjdGl2aXR5KVxuICAgICAgICBsZXQgaGFzUG9pbnRlckN1cnNvciA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KTtcbiAgICAgICAgICAgIGhhc1BvaW50ZXJDdXJzb3IgPSBzdHlsZS5jdXJzb3IgPT09ICdwb2ludGVyJztcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gQ2FuJ3QgYWNjZXNzIGNvbXB1dGVkIHN0eWxlIGluIHNvbWUgY29udGV4dHNcbiAgICAgICAgfVxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgZ2VuZXJpYyBhbmQgd2hhdCB0eXBlXG4gICAgICAgIGlmIChoYXNPbkNsaWNrIHx8IGhhc1JvbGUgfHwgaGFzVGFiSW5kZXggfHwgaGFzS2V5Ym9hcmRIYW5kbGVyIHx8IGhhc1BvaW50ZXJDdXJzb3IgfHwgaXNDb250ZW50RWRpdGFibGUpIHtcbiAgICAgICAgICAgIGxldCB0eXBlID0gJ2ludGVyYWN0aXZlJztcbiAgICAgICAgICAgIC8vIERldGVybWluZSBzcGVjaWZpYyB0eXBlXG4gICAgICAgICAgICBpZiAocm9sZSA9PT0gJ2J1dHRvbicgfHwgKGhhc09uQ2xpY2sgJiYgIXJvbGUpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdidXR0b24nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAocm9sZSA9PT0gJ2xpbmsnIHx8IHJvbGUgPT09ICd0YWInKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdsaW5rJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGlzQ29udGVudEVkaXRhYmxlIHx8IHJvbGUgPT09ICd0ZXh0Ym94JyB8fCByb2xlID09PSAnY29tYm9ib3gnKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdmb3JtLWNvbnRyb2wnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgaXNHZW5lcmljOiB0cnVlLCB0eXBlIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgaXNHZW5lcmljOiBmYWxzZSB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBbmFseXplIGVsZW1lbnQgZm9yIGFjY2Vzc2liaWxpdHkgaXNzdWVzXG4gICAgICovXG4gICAgYW5hbHl6ZUFjY2Vzc2liaWxpdHkoZWxlbWVudCwgZ2VuZXJpY0luZm8pIHtcbiAgICAgICAgY29uc3QgaXNzdWVzID0gW107XG4gICAgICAgIGNvbnN0IGFyaWFSZWNvbW1lbmRhdGlvbnMgPSBbXTtcbiAgICAgICAgY29uc3Qgd2NhZ0NyaXRlcmlhID0gW107XG4gICAgICAgIGxldCBzZW1hbnRpY1JlY29tbWVuZGF0aW9uO1xuICAgICAgICBjb25zdCB0YWdOYW1lID0gZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIC8vIENoZWNrIGZvciBnZW5lcmljIGVsZW1lbnQgaXNzdWVzXG4gICAgICAgIGlmIChnZW5lcmljSW5mby5pc0dlbmVyaWMpIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKGBHZW5lcmljICR7dGFnTmFtZX0gZWxlbWVudCB1c2VkIGFzICR7Z2VuZXJpY0luZm8udHlwZSB8fCAnaW50ZXJhY3RpdmUnfSBjb21wb25lbnRgKTtcbiAgICAgICAgICAgIHdjYWdDcml0ZXJpYS5wdXNoKCc0LjEuMicpOyAvLyBOYW1lLCBSb2xlLCBWYWx1ZVxuICAgICAgICAgICAgLy8gUHJvdmlkZSBzZW1hbnRpYyByZWNvbW1lbmRhdGlvblxuICAgICAgICAgICAgc3dpdGNoIChnZW5lcmljSW5mby50eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnYnV0dG9uJzpcbiAgICAgICAgICAgICAgICAgICAgc2VtYW50aWNSZWNvbW1lbmRhdGlvbiA9ICdidXR0b24nO1xuICAgICAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCgnTWlzc2luZyBuYXRpdmUgYnV0dG9uIHNlbWFudGljcyBhbmQga2V5Ym9hcmQgc3VwcG9ydCcpO1xuICAgICAgICAgICAgICAgICAgICB3Y2FnQ3JpdGVyaWEucHVzaCgnMi4xLjEnKTsgLy8gS2V5Ym9hcmRcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnbGluayc6XG4gICAgICAgICAgICAgICAgICAgIHNlbWFudGljUmVjb21tZW5kYXRpb24gPSAnYSc7XG4gICAgICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdNaXNzaW5nIG5hdGl2ZSBsaW5rIHNlbWFudGljcyBhbmQgaHJlZiBhdHRyaWJ1dGUnKTtcbiAgICAgICAgICAgICAgICAgICAgd2NhZ0NyaXRlcmlhLnB1c2goJzIuNC40Jyk7IC8vIExpbmsgUHVycG9zZVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdmb3JtLWNvbnRyb2wnOlxuICAgICAgICAgICAgICAgICAgICBzZW1hbnRpY1JlY29tbWVuZGF0aW9uID0gJ2lucHV0IG9yIHRleHRhcmVhJztcbiAgICAgICAgICAgICAgICAgICAgaXNzdWVzLnB1c2goJ01pc3NpbmcgbmF0aXZlIGZvcm0gY29udHJvbCBzZW1hbnRpY3MnKTtcbiAgICAgICAgICAgICAgICAgICAgd2NhZ0NyaXRlcmlhLnB1c2goJzQuMS4yJyk7IC8vIE5hbWUsIFJvbGUsIFZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIG1pc3NpbmcgQVJJQSBvbiBnZW5lcmljIGVsZW1lbnRzXG4gICAgICAgICAgICBpZiAoIWVsZW1lbnQuaGFzQXR0cmlidXRlKCdhcmlhLWxhYmVsJykgJiYgIWVsZW1lbnQudGV4dENvbnRlbnQ/LnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIGFyaWFSZWNvbW1lbmRhdGlvbnMucHVzaCgnQWRkIGFyaWEtbGFiZWwgZm9yIGFjY2Vzc2libGUgbmFtZScpO1xuICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdHZW5lcmljIGludGVyYWN0aXZlIGVsZW1lbnQgbWlzc2luZyBhY2Nlc3NpYmxlIG5hbWUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBrZXlib2FyZCBoYW5kbGVycyBvbiBnZW5lcmljIGJ1dHRvbnNcbiAgICAgICAgICAgIGlmIChnZW5lcmljSW5mby50eXBlID09PSAnYnV0dG9uJyAmJiAhZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ29ua2V5ZG93bicpICYmXG4gICAgICAgICAgICAgICAgIWVsZW1lbnQuaGFzQXR0cmlidXRlKCdvbmtleXByZXNzJykgJiYgIWVsZW1lbnQuaGFzQXR0cmlidXRlKCdvbmtleXVwJykpIHtcbiAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCgnR2VuZXJpYyBidXR0b24gbWlzc2luZyBrZXlib2FyZCBldmVudCBoYW5kbGVycycpO1xuICAgICAgICAgICAgICAgIHdjYWdDcml0ZXJpYS5wdXNoKCcyLjEuMScpOyAvLyBLZXlib2FyZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIENoZWNrIHNlbWFudGljIEhUTUwgaXNzdWVzXG4gICAgICAgIGlmICh0YWdOYW1lID09PSAnYnV0dG9uJyAmJiAhZWxlbWVudC50ZXh0Q29udGVudD8udHJpbSgpICYmICFlbGVtZW50Lmhhc0F0dHJpYnV0ZSgnYXJpYS1sYWJlbCcpKSB7XG4gICAgICAgICAgICBpc3N1ZXMucHVzaCgnQnV0dG9uIG1pc3NpbmcgYWNjZXNzaWJsZSBuYW1lJyk7XG4gICAgICAgICAgICBhcmlhUmVjb21tZW5kYXRpb25zLnB1c2goJ0FkZCB0ZXh0IGNvbnRlbnQgb3IgYXJpYS1sYWJlbCcpO1xuICAgICAgICAgICAgd2NhZ0NyaXRlcmlhLnB1c2goJzQuMS4yJyk7IC8vIE5hbWUsIFJvbGUsIFZhbHVlXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdhJyAmJiAhZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ2hyZWYnKSkge1xuICAgICAgICAgICAgaXNzdWVzLnB1c2goJ0xpbmsgbWlzc2luZyBocmVmIGF0dHJpYnV0ZScpO1xuICAgICAgICAgICAgd2NhZ0NyaXRlcmlhLnB1c2goJzIuNC40Jyk7IC8vIExpbmsgUHVycG9zZVxuICAgICAgICB9XG4gICAgICAgIGlmICgodGFnTmFtZSA9PT0gJ2lucHV0JyB8fCB0YWdOYW1lID09PSAndGV4dGFyZWEnIHx8IHRhZ05hbWUgPT09ICdzZWxlY3QnKSAmJlxuICAgICAgICAgICAgIXRoaXMuaGFzQXNzb2NpYXRlZExhYmVsKGVsZW1lbnQpKSB7XG4gICAgICAgICAgICBpc3N1ZXMucHVzaCgnRm9ybSBjb250cm9sIG1pc3NpbmcgYXNzb2NpYXRlZCBsYWJlbCcpO1xuICAgICAgICAgICAgd2NhZ0NyaXRlcmlhLnB1c2goJzEuMy4xJywgJzQuMS4yJyk7IC8vIEluZm8gYW5kIFJlbGF0aW9uc2hpcHMsIE5hbWUgUm9sZSBWYWx1ZVxuICAgICAgICB9XG4gICAgICAgIC8vIENoZWNrIGhlYWRpbmcgaGllcmFyY2h5XG4gICAgICAgIGlmICh0YWdOYW1lLm1hdGNoKC9eaFsxLTZdJC8pKSB7XG4gICAgICAgICAgICBjb25zdCBsZXZlbCA9IHBhcnNlSW50KHRhZ05hbWVbMV0pO1xuICAgICAgICAgICAgLy8gVGhpcyB3b3VsZCBuZWVkIGNvbnRleHQgb2YgcHJldmlvdXMgaGVhZGluZ3MgdG8gY2hlY2sgaGllcmFyY2h5XG4gICAgICAgICAgICAvLyBGb3Igbm93LCBqdXN0IG5vdGUgaWYgaGVhZGluZyBoYXMgbm8gdGV4dFxuICAgICAgICAgICAgaWYgKCFlbGVtZW50LnRleHRDb250ZW50Py50cmltKCkpIHtcbiAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCgnSGVhZGluZyBlbGVtZW50IG1pc3NpbmcgdGV4dCBjb250ZW50Jyk7XG4gICAgICAgICAgICAgICAgd2NhZ0NyaXRlcmlhLnB1c2goJzIuNC42Jyk7IC8vIEhlYWRpbmdzIGFuZCBMYWJlbHNcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBDaGVjayBBUklBIGlzc3Vlc1xuICAgICAgICBpZiAoZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnKSAmJiAhZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnKT8udHJpbSgpKSB7XG4gICAgICAgICAgICBpc3N1ZXMucHVzaCgnRW1wdHkgYXJpYS1sYWJlbCBhdHRyaWJ1dGUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ3JvbGUnKSAmJiAhdGhpcy5pc1ZhbGlkQXJpYVJvbGUoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3JvbGUnKSkpIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKGBJbnZhbGlkIEFSSUEgcm9sZTogJHtlbGVtZW50LmdldEF0dHJpYnV0ZSgncm9sZScpfWApO1xuICAgICAgICAgICAgd2NhZ0NyaXRlcmlhLnB1c2goJzQuMS4yJyk7IC8vIE5hbWUsIFJvbGUsIFZhbHVlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNlbWFudGljOiBzZW1hbnRpY1JlY29tbWVuZGF0aW9uLFxuICAgICAgICAgICAgYXJpYTogYXJpYVJlY29tbWVuZGF0aW9ucy5sZW5ndGggPiAwID8gYXJpYVJlY29tbWVuZGF0aW9ucyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGlzc3VlczogaXNzdWVzLmxlbmd0aCA+IDAgPyBpc3N1ZXMgOiBbXSxcbiAgICAgICAgICAgIHdjYWdDcml0ZXJpYTogd2NhZ0NyaXRlcmlhLmxlbmd0aCA+IDAgPyB3Y2FnQ3JpdGVyaWEgOiB1bmRlZmluZWRcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IHNlbWFudGljIHRhZyByZWNvbW1lbmRhdGlvblxuICAgICAqL1xuICAgIGdldFNlbWFudGljUmVjb21tZW5kYXRpb24oZWxlbWVudCwgZ2VuZXJpY0luZm8pIHtcbiAgICAgICAgaWYgKGdlbmVyaWNJbmZvLmlzR2VuZXJpYykge1xuICAgICAgICAgICAgc3dpdGNoIChnZW5lcmljSW5mby50eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnYnV0dG9uJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdidXR0b24nO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2xpbmsnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2EnO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2Zvcm0tY29udHJvbCc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnaW5wdXQgb3IgdGV4dGFyZWEnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGVsZW1lbnQgaGFzIGFzc29jaWF0ZWQgbGFiZWxcbiAgICAgKi9cbiAgICBoYXNBc3NvY2lhdGVkTGFiZWwoZWxlbWVudCkge1xuICAgICAgICAvLyBDaGVjayBmb3IgaWQgYW5kIGxhYmVsIHdpdGggZm9yIGF0dHJpYnV0ZVxuICAgICAgICBjb25zdCBpZCA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdpZCcpO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgbGFiZWxbZm9yPVwiJHtpZH1cIl1gKTtcbiAgICAgICAgICAgIGlmIChsYWJlbClcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBDaGVjayBmb3IgbGFiZWwgcGFyZW50XG4gICAgICAgIGNvbnN0IGxhYmVsUGFyZW50ID0gZWxlbWVudC5jbG9zZXN0KCdsYWJlbCcpO1xuICAgICAgICBpZiAobGFiZWxQYXJlbnQpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGFyaWEtbGFiZWwgb3IgYXJpYS1sYWJlbGxlZGJ5XG4gICAgICAgIGlmIChlbGVtZW50Lmhhc0F0dHJpYnV0ZSgnYXJpYS1sYWJlbCcpIHx8IGVsZW1lbnQuaGFzQXR0cmlidXRlKCdhcmlhLWxhYmVsbGVkYnknKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBBUklBIHJvbGUgaXMgdmFsaWRcbiAgICAgKi9cbiAgICBpc1ZhbGlkQXJpYVJvbGUocm9sZSkge1xuICAgICAgICAvLyBCYXNpYyB2YWxpZGF0aW9uIC0gY2hlY2sgYWdhaW5zdCBjb21tb24gQVJJQSByb2xlc1xuICAgICAgICBjb25zdCB2YWxpZFJvbGVzID0gW1xuICAgICAgICAgICAgJ2J1dHRvbicsICdsaW5rJywgJ3RleHRib3gnLCAnY29tYm9ib3gnLCAnY2hlY2tib3gnLCAncmFkaW8nLCAnc3dpdGNoJyxcbiAgICAgICAgICAgICd0YWInLCAndGFicGFuZWwnLCAnbWVudWl0ZW0nLCAnbWVudScsICdtZW51YmFyJywgJ25hdmlnYXRpb24nLCAnbWFpbicsXG4gICAgICAgICAgICAnYXJ0aWNsZScsICdyZWdpb24nLCAnYmFubmVyJywgJ2NvbnRlbnRpbmZvJywgJ3NlYXJjaCcsICdmb3JtJywgJ2xpc3QnLFxuICAgICAgICAgICAgJ2xpc3RpdGVtJywgJ2hlYWRpbmcnLCAnaW1nJywgJ3ByZXNlbnRhdGlvbicsICdub25lJ1xuICAgICAgICBdO1xuICAgICAgICByZXR1cm4gdmFsaWRSb2xlcy5pbmNsdWRlcyhyb2xlLnRvTG93ZXJDYXNlKCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0IEFSSUEgYXR0cmlidXRlc1xuICAgICAqL1xuICAgIGV4dHJhY3RBcmlhQXR0cmlidXRlcyhlbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGFyaWFBdHRycyA9IHt9O1xuICAgICAgICBjb25zdCBhdHRyaWJ1dGVzID0gQXJyYXkuZnJvbShlbGVtZW50LmF0dHJpYnV0ZXMpO1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgYXR0cmlidXRlcykge1xuICAgICAgICAgICAgaWYgKGF0dHIubmFtZS5zdGFydHNXaXRoKCdhcmlhLScpKSB7XG4gICAgICAgICAgICAgICAgYXJpYUF0dHJzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhcmlhQXR0cnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgdGV4dCBjb250ZW50IGZyb20gZWxlbWVudFxuICAgICAqL1xuICAgIGV4dHJhY3RUZXh0Q29udGVudChlbGVtZW50KSB7XG4gICAgICAgIC8vIEdldCBkaXJlY3QgdGV4dCBjb250ZW50LCBleGNsdWRpbmcgbmVzdGVkIGVsZW1lbnRzXG4gICAgICAgIGNvbnN0IHRleHQgPSBBcnJheS5mcm9tKGVsZW1lbnQuY2hpbGROb2RlcylcbiAgICAgICAgICAgIC5maWx0ZXIobm9kZSA9PiBub2RlLm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSlcbiAgICAgICAgICAgIC5tYXAobm9kZSA9PiBub2RlLnRleHRDb250ZW50Py50cmltKCkpXG4gICAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgICAgICAuam9pbignICcpO1xuICAgICAgICByZXR1cm4gdGV4dCB8fCBudWxsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSB1bmlxdWUgSUQgZm9yIGVsZW1lbnRcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUVsZW1lbnRJZChlbGVtZW50KSB7XG4gICAgICAgIC8vIFRyeSB0byB1c2UgZXhpc3RpbmcgSURcbiAgICAgICAgaWYgKGVsZW1lbnQuaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBgZG9tLSR7ZWxlbWVudC5pZH1gO1xuICAgICAgICB9XG4gICAgICAgIC8vIEdlbmVyYXRlIGJhc2VkIG9uIHRhZyBhbmQgcG9zaXRpb25cbiAgICAgICAgY29uc3QgdGFnTmFtZSA9IGVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBjb25zdCBpbmRleCA9IEFycmF5LmZyb20oZWxlbWVudC5wYXJlbnRFbGVtZW50Py5jaGlsZHJlbiB8fCBbXSkuaW5kZXhPZihlbGVtZW50KTtcbiAgICAgICAgY29uc3QgcGFyZW50SWQgPSBlbGVtZW50LnBhcmVudEVsZW1lbnQgP1xuICAgICAgICAgICAgKGVsZW1lbnQucGFyZW50RWxlbWVudC5pZCB8fCBlbGVtZW50LnBhcmVudEVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpKSA6ICdyb290JztcbiAgICAgICAgcmV0dXJuIGBkb20tJHtwYXJlbnRJZH0tJHt0YWdOYW1lfS0ke2luZGV4fS0ke0RhdGUubm93KCl9YDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBib3VuZGluZyBib3ggZnJvbSBET00gZWxlbWVudFxuICAgICAqL1xuICAgIGdldEJvdW5kaW5nQm94KGVsZW1lbnQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB4OiByZWN0LngsXG4gICAgICAgICAgICAgICAgeTogcmVjdC55LFxuICAgICAgICAgICAgICAgIHdpZHRoOiByZWN0LndpZHRoLFxuICAgICAgICAgICAgICAgIGhlaWdodDogcmVjdC5oZWlnaHRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIGlmIGdldEJvdW5kaW5nQ2xpZW50UmVjdCBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgeTogMCxcbiAgICAgICAgICAgICAgICB3aWR0aDogMCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgZWxlbWVudCBzaG91bGQgYmUgc2tpcHBlZCBpbiBhbmFseXNpc1xuICAgICAqL1xuICAgIHNob3VsZFNraXBFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgdGFnTmFtZSA9IGVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBjb25zdCBza2lwVGFncyA9IFsnc2NyaXB0JywgJ3N0eWxlJywgJ21ldGEnLCAnbGluaycsICdub3NjcmlwdCcsICd0ZW1wbGF0ZSddO1xuICAgICAgICByZXR1cm4gc2tpcFRhZ3MuaW5jbHVkZXModGFnTmFtZSk7XG4gICAgfVxufVxuIiwiLy8gY29yZS9hbmFseXplcnMvZWxlbWVudE1hdGNoZXIudHMgLSBNYXRjaGVzIHNjcmVlbnNob3QgZWxlbWVudHMgd2l0aCBET00gZWxlbWVudHNcbi8qKlxuICogTWF0Y2hlcyB2aXN1YWwgZWxlbWVudHMgZnJvbSBzY3JlZW5zaG90cyB3aXRoIERPTSBlbGVtZW50c1xuICogSWRlbnRpZmllcyBtaXNtYXRjaGVzLCBtaXNzaW5nIGVsZW1lbnRzLCBhbmQgYWNjZXNzaWJpbGl0eSBpc3N1ZXNcbiAqL1xuZXhwb3J0IGNsYXNzIEVsZW1lbnRNYXRjaGVyIHtcbiAgICAvKipcbiAgICAgKiBNYXRjaCBzY3JlZW5zaG90IGVsZW1lbnRzIHdpdGggRE9NIGVsZW1lbnRzXG4gICAgICogQHBhcmFtIHNjcmVlbnNob3RFbGVtZW50cyAtIEVsZW1lbnRzIGRldGVjdGVkIGZyb20gc2NyZWVuc2hvdFxuICAgICAqIEBwYXJhbSBkb21FbGVtZW50cyAtIEVsZW1lbnRzIGZyb20gRE9NIGFuYWx5c2lzXG4gICAgICovXG4gICAgbWF0Y2goc2NyZWVuc2hvdEVsZW1lbnRzLCBkb21FbGVtZW50cykge1xuICAgICAgICBjb25zdCBtYXRjaGVkID0gW107XG4gICAgICAgIGNvbnN0IHVubWF0Y2hlZFNjcmVlbnNob3QgPSBbXTtcbiAgICAgICAgY29uc3QgdW5tYXRjaGVkRE9NID0gW107XG4gICAgICAgIC8vIENyZWF0ZSBhIGNvcHkgb2YgRE9NIGVsZW1lbnRzIGZvciBtYXRjaGluZyAodG8gdHJhY2sgd2hpY2ggb25lcyBhcmUgbWF0Y2hlZClcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlRE9NRWxlbWVudHMgPSBbLi4uZG9tRWxlbWVudHNdO1xuICAgICAgICAvLyBNYXRjaCBlYWNoIHNjcmVlbnNob3QgZWxlbWVudCB3aXRoIGNsb3Nlc3QgRE9NIGVsZW1lbnRcbiAgICAgICAgZm9yIChjb25zdCBzY3JlZW5zaG90RWxlbWVudCBvZiBzY3JlZW5zaG90RWxlbWVudHMpIHtcbiAgICAgICAgICAgIGNvbnN0IGJlc3RNYXRjaCA9IHRoaXMuZmluZEJlc3RNYXRjaChzY3JlZW5zaG90RWxlbWVudCwgYXZhaWxhYmxlRE9NRWxlbWVudHMpO1xuICAgICAgICAgICAgaWYgKGJlc3RNYXRjaCAmJiBiZXN0TWF0Y2gubWF0Y2hTY29yZSA+IDAuMykge1xuICAgICAgICAgICAgICAgIC8vIEdvb2QgbWF0Y2ggZm91bmRcbiAgICAgICAgICAgICAgICBtYXRjaGVkLnB1c2goYmVzdE1hdGNoKTtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbWF0Y2hlZCBET00gZWxlbWVudCBmcm9tIGF2YWlsYWJsZSBsaXN0XG4gICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBhdmFpbGFibGVET01FbGVtZW50cy5maW5kSW5kZXgoZWwgPT4gZWwuaWQgPT09IGJlc3RNYXRjaC5kb21FbGVtZW50Py5pZCk7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVET01FbGVtZW50cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vIGdvb2QgbWF0Y2ggZm91bmQgLSBlbGVtZW50IG9ubHkgaW4gc2NyZWVuc2hvdFxuICAgICAgICAgICAgICAgIHVubWF0Y2hlZFNjcmVlbnNob3QucHVzaChzY3JlZW5zaG90RWxlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVtYWluaW5nIERPTSBlbGVtZW50cyBhcmUgdW5tYXRjaGVkIChvbmx5IGluIERPTSwgbm90IHZpc2libGUpXG4gICAgICAgIHVubWF0Y2hlZERPTS5wdXNoKC4uLmF2YWlsYWJsZURPTUVsZW1lbnRzKTtcbiAgICAgICAgLy8gQW5hbHl6ZSBtYXRjaGVzIGZvciBpc3N1ZXNcbiAgICAgICAgdGhpcy5hbmFseXplTWF0Y2hlcyhtYXRjaGVkKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG1hdGNoZWQsXG4gICAgICAgICAgICB1bm1hdGNoZWRTY3JlZW5zaG90LFxuICAgICAgICAgICAgdW5tYXRjaGVkRE9NXG4gICAgICAgIH07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEZpbmQgYmVzdCBtYXRjaGluZyBET00gZWxlbWVudCBmb3IgYSBzY3JlZW5zaG90IGVsZW1lbnRcbiAgICAgKi9cbiAgICBmaW5kQmVzdE1hdGNoKHNjcmVlbnNob3RFbGVtZW50LCBkb21FbGVtZW50cykge1xuICAgICAgICBpZiAoZG9tRWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgYmVzdE1hdGNoID0gbnVsbDtcbiAgICAgICAgbGV0IGJlc3RTY29yZSA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgZG9tRWxlbWVudCBvZiBkb21FbGVtZW50cykge1xuICAgICAgICAgICAgY29uc3Qgc2NvcmUgPSB0aGlzLmNhbGN1bGF0ZU1hdGNoU2NvcmUoc2NyZWVuc2hvdEVsZW1lbnQsIGRvbUVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKHNjb3JlID4gYmVzdFNjb3JlKSB7XG4gICAgICAgICAgICAgICAgYmVzdFNjb3JlID0gc2NvcmU7XG4gICAgICAgICAgICAgICAgYmVzdE1hdGNoID0ge1xuICAgICAgICAgICAgICAgICAgICBzY3JlZW5zaG90RWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgZG9tRWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hTY29yZTogc2NvcmUsXG4gICAgICAgICAgICAgICAgICAgIGlzc3VlczogW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBiZXN0TWF0Y2g7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBtYXRjaCBzY29yZSBiZXR3ZWVuIHNjcmVlbnNob3QgYW5kIERPTSBlbGVtZW50XG4gICAgICogUmV0dXJucyB2YWx1ZSBiZXR3ZWVuIDAgYW5kIDFcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVNYXRjaFNjb3JlKHNjcmVlbnNob3RFbGVtZW50LCBkb21FbGVtZW50KSB7XG4gICAgICAgIGxldCBzY29yZSA9IDA7XG4gICAgICAgIGxldCBmYWN0b3JzID0gMDtcbiAgICAgICAgLy8gRmFjdG9yIDE6IFBvc2l0aW9uIG92ZXJsYXAgKDQwJSB3ZWlnaHQpXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uU2NvcmUgPSB0aGlzLmNhbGN1bGF0ZVBvc2l0aW9uT3ZlcmxhcChzY3JlZW5zaG90RWxlbWVudC5iYm94LCBkb21FbGVtZW50LmJib3gpO1xuICAgICAgICBzY29yZSArPSBwb3NpdGlvblNjb3JlICogMC40O1xuICAgICAgICBmYWN0b3JzICs9IDAuNDtcbiAgICAgICAgLy8gRmFjdG9yIDI6IFR5cGUgbWF0Y2ggKDMwJSB3ZWlnaHQpXG4gICAgICAgIGNvbnN0IHR5cGVTY29yZSA9IHRoaXMuY2FsY3VsYXRlVHlwZU1hdGNoKHNjcmVlbnNob3RFbGVtZW50LnR5cGUsIGRvbUVsZW1lbnQudGFnTmFtZSwgZG9tRWxlbWVudC5pc0dlbmVyaWMsIGRvbUVsZW1lbnQuZ2VuZXJpY1R5cGUpO1xuICAgICAgICBzY29yZSArPSB0eXBlU2NvcmUgKiAwLjM7XG4gICAgICAgIGZhY3RvcnMgKz0gMC4zO1xuICAgICAgICAvLyBGYWN0b3IgMzogVGV4dCBjb250ZW50IG1hdGNoICgyMCUgd2VpZ2h0KVxuICAgICAgICBjb25zdCB0ZXh0U2NvcmUgPSB0aGlzLmNhbGN1bGF0ZVRleHRNYXRjaChzY3JlZW5zaG90RWxlbWVudC50ZXh0LCBkb21FbGVtZW50LnRleHQpO1xuICAgICAgICBzY29yZSArPSB0ZXh0U2NvcmUgKiAwLjI7XG4gICAgICAgIGZhY3RvcnMgKz0gMC4yO1xuICAgICAgICAvLyBGYWN0b3IgNDogU2l6ZSBzaW1pbGFyaXR5ICgxMCUgd2VpZ2h0KVxuICAgICAgICBjb25zdCBzaXplU2NvcmUgPSB0aGlzLmNhbGN1bGF0ZVNpemVTaW1pbGFyaXR5KHNjcmVlbnNob3RFbGVtZW50LmJib3gsIGRvbUVsZW1lbnQuYmJveCk7XG4gICAgICAgIHNjb3JlICs9IHNpemVTY29yZSAqIDAuMTtcbiAgICAgICAgZmFjdG9ycyArPSAwLjE7XG4gICAgICAgIC8vIE5vcm1hbGl6ZSBzY29yZVxuICAgICAgICByZXR1cm4gZmFjdG9ycyA+IDAgPyBzY29yZSAvIGZhY3RvcnMgOiAwO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgcG9zaXRpb24gb3ZlcmxhcCBiZXR3ZWVuIHR3byBib3VuZGluZyBib3hlc1xuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBvc2l0aW9uT3ZlcmxhcChiYm94MSwgYmJveDIpIHtcbiAgICAgICAgLy8gU2tpcCBpZiBlaXRoZXIgYmJveCBpcyBpbnZhbGlkICh6ZXJvIHNpemUpXG4gICAgICAgIGlmIChiYm94MS53aWR0aCA9PT0gMCB8fCBiYm94MS5oZWlnaHQgPT09IDAgfHwgYmJveDIud2lkdGggPT09IDAgfHwgYmJveDIuaGVpZ2h0ID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICAvLyBDYWxjdWxhdGUgaW50ZXJzZWN0aW9uXG4gICAgICAgIGNvbnN0IHgxID0gTWF0aC5tYXgoYmJveDEueCwgYmJveDIueCk7XG4gICAgICAgIGNvbnN0IHkxID0gTWF0aC5tYXgoYmJveDEueSwgYmJveDIueSk7XG4gICAgICAgIGNvbnN0IHgyID0gTWF0aC5taW4oYmJveDEueCArIGJib3gxLndpZHRoLCBiYm94Mi54ICsgYmJveDIud2lkdGgpO1xuICAgICAgICBjb25zdCB5MiA9IE1hdGgubWluKGJib3gxLnkgKyBiYm94MS5oZWlnaHQsIGJib3gyLnkgKyBiYm94Mi5oZWlnaHQpO1xuICAgICAgICBpZiAoeDIgPD0geDEgfHwgeTIgPD0geTEpIHtcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBObyBvdmVybGFwXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaW50ZXJzZWN0aW9uQXJlYSA9ICh4MiAtIHgxKSAqICh5MiAtIHkxKTtcbiAgICAgICAgY29uc3QgYmJveDFBcmVhID0gYmJveDEud2lkdGggKiBiYm94MS5oZWlnaHQ7XG4gICAgICAgIGNvbnN0IGJib3gyQXJlYSA9IGJib3gyLndpZHRoICogYmJveDIuaGVpZ2h0O1xuICAgICAgICBjb25zdCB1bmlvbkFyZWEgPSBiYm94MUFyZWEgKyBiYm94MkFyZWEgLSBpbnRlcnNlY3Rpb25BcmVhO1xuICAgICAgICAvLyBJb1UgKEludGVyc2VjdGlvbiBvdmVyIFVuaW9uKVxuICAgICAgICByZXR1cm4gdW5pb25BcmVhID4gMCA/IGludGVyc2VjdGlvbkFyZWEgLyB1bmlvbkFyZWEgOiAwO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgdHlwZSBtYXRjaCBzY29yZVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVR5cGVNYXRjaChzY3JlZW5zaG90VHlwZSwgZG9tVGFnTmFtZSwgaXNHZW5lcmljLCBnZW5lcmljVHlwZSkge1xuICAgICAgICAvLyBNYXAgc2NyZWVuc2hvdCB0eXBlcyB0byBET00gdGFnIG5hbWVzXG4gICAgICAgIGNvbnN0IHR5cGVNYXAgPSB7XG4gICAgICAgICAgICAnYnV0dG9uJzogWydidXR0b24nXSxcbiAgICAgICAgICAgICdsaW5rJzogWydhJ10sXG4gICAgICAgICAgICAnaW5wdXQnOiBbJ2lucHV0JywgJ3RleHRhcmVhJ10sXG4gICAgICAgICAgICAnaGVhZGluZyc6IFsnaDEnLCAnaDInLCAnaDMnLCAnaDQnLCAnaDUnLCAnaDYnXSxcbiAgICAgICAgICAgICdpbWFnZSc6IFsnaW1nJ10sXG4gICAgICAgICAgICAndGV4dCc6IFsncCcsICdzcGFuJywgJ2RpdicsICdsaScsICd0ZCcsICd0aCddLFxuICAgICAgICAgICAgJ25hdmlnYXRpb24nOiBbJ25hdiddLFxuICAgICAgICAgICAgJ2Zvcm0nOiBbJ2Zvcm0nLCAnc2VsZWN0JywgJ29wdGlvbiddLFxuICAgICAgICAgICAgJ2xpc3QnOiBbJ3VsJywgJ29sJywgJ2xpJ11cbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgZXhwZWN0ZWRUYWdzID0gdHlwZU1hcFtzY3JlZW5zaG90VHlwZV0gfHwgW107XG4gICAgICAgIC8vIEV4YWN0IG1hdGNoXG4gICAgICAgIGlmIChleHBlY3RlZFRhZ3MuaW5jbHVkZXMoZG9tVGFnTmFtZS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgICAgcmV0dXJuIDEuMDtcbiAgICAgICAgfVxuICAgICAgICAvLyBHZW5lcmljIGVsZW1lbnQgbWF0Y2hcbiAgICAgICAgaWYgKGlzR2VuZXJpYykge1xuICAgICAgICAgICAgaWYgKHNjcmVlbnNob3RUeXBlID09PSAnYnV0dG9uJyAmJiBnZW5lcmljVHlwZSA9PT0gJ2J1dHRvbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMC43OyAvLyBHZW5lcmljIGJ1dHRvbiBtYXRjaGVzIHNjcmVlbnNob3QgYnV0dG9uXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc2NyZWVuc2hvdFR5cGUgPT09ICdsaW5rJyAmJiBnZW5lcmljVHlwZSA9PT0gJ2xpbmsnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDAuNzsgLy8gR2VuZXJpYyBsaW5rIG1hdGNoZXMgc2NyZWVuc2hvdCBsaW5rXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc2NyZWVuc2hvdFR5cGUgPT09ICdpbnB1dCcgJiYgZ2VuZXJpY1R5cGUgPT09ICdmb3JtLWNvbnRyb2wnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDAuNzsgLy8gR2VuZXJpYyBmb3JtIGNvbnRyb2wgbWF0Y2hlcyBzY3JlZW5zaG90IGlucHV0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZ2VuZXJpY1R5cGUgPT09ICdpbnRlcmFjdGl2ZScgJiYgWydidXR0b24nLCAnbGluaycsICdpbnB1dCddLmluY2x1ZGVzKHNjcmVlbnNob3RUeXBlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwLjU7IC8vIEdlbmVyaWMgaW50ZXJhY3RpdmUgZWxlbWVudFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFBhcnRpYWwgbWF0Y2hlc1xuICAgICAgICBpZiAoc2NyZWVuc2hvdFR5cGUgPT09ICd0ZXh0JyAmJiBbJ3AnLCAnc3BhbicsICdkaXYnLCAnbGknXS5pbmNsdWRlcyhkb21UYWdOYW1lLnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgICAgICByZXR1cm4gMC42O1xuICAgICAgICB9XG4gICAgICAgIC8vIE5vIG1hdGNoXG4gICAgICAgIHJldHVybiAwLjE7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSB0ZXh0IGNvbnRlbnQgbWF0Y2ggc2NvcmVcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVUZXh0TWF0Y2godGV4dDEsIHRleHQyKSB7XG4gICAgICAgIGlmICghdGV4dDEgJiYgIXRleHQyKSB7XG4gICAgICAgICAgICByZXR1cm4gMC41OyAvLyBCb3RoIGVtcHR5IC0gbmV1dHJhbCBzY29yZVxuICAgICAgICB9XG4gICAgICAgIGlmICghdGV4dDEgfHwgIXRleHQyKSB7XG4gICAgICAgICAgICByZXR1cm4gMC4yOyAvLyBPbmUgaXMgZW1wdHkgLSBsb3cgc2NvcmVcbiAgICAgICAgfVxuICAgICAgICAvLyBOb3JtYWxpemUgdGV4dCAobG93ZXJjYXNlLCB0cmltKVxuICAgICAgICBjb25zdCBub3JtYWxpemVkMSA9IHRleHQxLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuICAgICAgICBjb25zdCBub3JtYWxpemVkMiA9IHRleHQyLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuICAgICAgICAvLyBFeGFjdCBtYXRjaFxuICAgICAgICBpZiAobm9ybWFsaXplZDEgPT09IG5vcm1hbGl6ZWQyKSB7XG4gICAgICAgICAgICByZXR1cm4gMS4wO1xuICAgICAgICB9XG4gICAgICAgIC8vIENvbnRhaW5zIG1hdGNoXG4gICAgICAgIGlmIChub3JtYWxpemVkMS5pbmNsdWRlcyhub3JtYWxpemVkMikgfHwgbm9ybWFsaXplZDIuaW5jbHVkZXMobm9ybWFsaXplZDEpKSB7XG4gICAgICAgICAgICByZXR1cm4gMC43O1xuICAgICAgICB9XG4gICAgICAgIC8vIFdvcmQgb3ZlcmxhcFxuICAgICAgICBjb25zdCB3b3JkczEgPSBub3JtYWxpemVkMS5zcGxpdCgvXFxzKy8pO1xuICAgICAgICBjb25zdCB3b3JkczIgPSBub3JtYWxpemVkMi5zcGxpdCgvXFxzKy8pO1xuICAgICAgICBjb25zdCBjb21tb25Xb3JkcyA9IHdvcmRzMS5maWx0ZXIodyA9PiB3b3JkczIuaW5jbHVkZXModykpO1xuICAgICAgICBjb25zdCB0b3RhbFdvcmRzID0gTWF0aC5tYXgod29yZHMxLmxlbmd0aCwgd29yZHMyLmxlbmd0aCk7XG4gICAgICAgIGlmICh0b3RhbFdvcmRzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbW1vbldvcmRzLmxlbmd0aCAvIHRvdGFsV29yZHM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDAuMTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIHNpemUgc2ltaWxhcml0eSBzY29yZVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVNpemVTaW1pbGFyaXR5KGJib3gxLCBiYm94Mikge1xuICAgICAgICBpZiAoYmJveDEud2lkdGggPT09IDAgfHwgYmJveDEuaGVpZ2h0ID09PSAwIHx8IGJib3gyLndpZHRoID09PSAwIHx8IGJib3gyLmhlaWdodCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYXJlYTEgPSBiYm94MS53aWR0aCAqIGJib3gxLmhlaWdodDtcbiAgICAgICAgY29uc3QgYXJlYTIgPSBiYm94Mi53aWR0aCAqIGJib3gyLmhlaWdodDtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHNpemUgcmF0aW9cbiAgICAgICAgY29uc3QgcmF0aW8gPSBNYXRoLm1pbihhcmVhMSwgYXJlYTIpIC8gTWF0aC5tYXgoYXJlYTEsIGFyZWEyKTtcbiAgICAgICAgcmV0dXJuIHJhdGlvO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBbmFseXplIG1hdGNoZWQgcGFpcnMgZm9yIGFjY2Vzc2liaWxpdHkgaXNzdWVzXG4gICAgICovXG4gICAgYW5hbHl6ZU1hdGNoZXMobWF0Y2hlZCkge1xuICAgICAgICBmb3IgKGNvbnN0IHBhaXIgb2YgbWF0Y2hlZCkge1xuICAgICAgICAgICAgY29uc3QgaXNzdWVzID0gW107XG4gICAgICAgICAgICBpZiAoIXBhaXIuZG9tRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgc2NyZWVuc2hvdCA9IHBhaXIuc2NyZWVuc2hvdEVsZW1lbnQ7XG4gICAgICAgICAgICBjb25zdCBkb20gPSBwYWlyLmRvbUVsZW1lbnQ7XG4gICAgICAgICAgICAvLyBDaGVjayBmb3Igc2VtYW50aWMgbWlzbWF0Y2hlc1xuICAgICAgICAgICAgaWYgKGRvbS5pc0dlbmVyaWMpIHtcbiAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaChgR2VuZXJpYyAke2RvbS50YWdOYW1lfSBlbGVtZW50IHVzZWQgaW5zdGVhZCBvZiBzZW1hbnRpYyAke3NjcmVlbnNob3QudHlwZX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBtaXNzaW5nIGFjY2Vzc2libGUgbmFtZXNcbiAgICAgICAgICAgIGlmIChzY3JlZW5zaG90LnRleHQgJiYgIWRvbS50ZXh0ICYmICFkb20uYXJpYUxhYmVsKSB7XG4gICAgICAgICAgICAgICAgaXNzdWVzLnB1c2goJ0VsZW1lbnQgdmlzaWJsZSBpbiBzY3JlZW5zaG90IGJ1dCBtaXNzaW5nIGFjY2Vzc2libGUgbmFtZSBpbiBET00nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENoZWNrIGZvciB0eXBlIG1pc21hdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IHR5cGVNaXNtYXRjaCA9IHRoaXMuY2hlY2tUeXBlTWlzbWF0Y2goc2NyZWVuc2hvdC50eXBlLCBkb20udGFnTmFtZSwgZG9tLmlzR2VuZXJpYywgZG9tLmdlbmVyaWNUeXBlKTtcbiAgICAgICAgICAgIGlmICh0eXBlTWlzbWF0Y2gpIHtcbiAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCh0eXBlTWlzbWF0Y2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHBvc2l0aW9uIG1pc21hdGNoZXMgKGlmIG1hdGNoIHNjb3JlIGlzIGxvdylcbiAgICAgICAgICAgIGlmIChwYWlyLm1hdGNoU2NvcmUgPCAwLjUpIHtcbiAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCgnUG9zaXRpb24gbWlzbWF0Y2ggYmV0d2VlbiBzY3JlZW5zaG90IGFuZCBET00gZWxlbWVudCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQWRkIERPTSBlbGVtZW50J3MgZXhpc3RpbmcgaXNzdWVzXG4gICAgICAgICAgICBpZiAoZG9tLnJlY29tbWVuZGF0aW9ucy5pc3N1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKC4uLmRvbS5yZWNvbW1lbmRhdGlvbnMuaXNzdWVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhaXIuaXNzdWVzID0gaXNzdWVzO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENoZWNrIGZvciB0eXBlIG1pc21hdGNoZXNcbiAgICAgKi9cbiAgICBjaGVja1R5cGVNaXNtYXRjaChzY3JlZW5zaG90VHlwZSwgZG9tVGFnTmFtZSwgaXNHZW5lcmljLCBnZW5lcmljVHlwZSkge1xuICAgICAgICBpZiAoc2NyZWVuc2hvdFR5cGUgPT09ICdidXR0b24nICYmIGRvbVRhZ05hbWUgIT09ICdidXR0b24nICYmICEoaXNHZW5lcmljICYmIGdlbmVyaWNUeXBlID09PSAnYnV0dG9uJykpIHtcbiAgICAgICAgICAgIHJldHVybiBgQnV0dG9uIGRldGVjdGVkIGluIHNjcmVlbnNob3QgYnV0IERPTSBoYXMgJHtkb21UYWdOYW1lfSBlbGVtZW50YDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2NyZWVuc2hvdFR5cGUgPT09ICdsaW5rJyAmJiBkb21UYWdOYW1lICE9PSAnYScgJiYgIShpc0dlbmVyaWMgJiYgZ2VuZXJpY1R5cGUgPT09ICdsaW5rJykpIHtcbiAgICAgICAgICAgIHJldHVybiBgTGluayBkZXRlY3RlZCBpbiBzY3JlZW5zaG90IGJ1dCBET00gaGFzICR7ZG9tVGFnTmFtZX0gZWxlbWVudGA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNjcmVlbnNob3RUeXBlID09PSAnaW5wdXQnICYmICFbJ2lucHV0JywgJ3RleHRhcmVhJ10uaW5jbHVkZXMoZG9tVGFnTmFtZSkgJiZcbiAgICAgICAgICAgICEoaXNHZW5lcmljICYmIGdlbmVyaWNUeXBlID09PSAnZm9ybS1jb250cm9sJykpIHtcbiAgICAgICAgICAgIHJldHVybiBgSW5wdXQgZmllbGQgZGV0ZWN0ZWQgaW4gc2NyZWVuc2hvdCBidXQgRE9NIGhhcyAke2RvbVRhZ05hbWV9IGVsZW1lbnRgO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cbiIsIi8vIGNvcmUvYW5hbHl6ZXJzL3JlY29tbWVuZGF0aW9uRW5naW5lLnRzIC0gQUktcG93ZXJlZCByZWNvbW1lbmRhdGlvbiBlbmdpbmVcbi8qKlxuICogQUktcG93ZXJlZCByZWNvbW1lbmRhdGlvbiBlbmdpbmVcbiAqIENvbWJpbmVzIGFsbCBhbmFseXNpcyByZXN1bHRzIGFuZCBnZW5lcmF0ZXMgY29udGV4dHVhbCByZWNvbW1lbmRhdGlvbnNcbiAqL1xuZXhwb3J0IGNsYXNzIFJlY29tbWVuZGF0aW9uRW5naW5lIHtcbiAgICBjb25zdHJ1Y3Rvcihwcm92aWRlciwgb2xsYW1hQ2xpZW50LCBnb29nbGVXZWJBSUNsaWVudCkge1xuICAgICAgICB0aGlzLnByb3ZpZGVyID0gcHJvdmlkZXI7XG4gICAgICAgIHRoaXMub2xsYW1hQ2xpZW50ID0gb2xsYW1hQ2xpZW50O1xuICAgICAgICB0aGlzLmdvb2dsZVdlYkFJQ2xpZW50ID0gZ29vZ2xlV2ViQUlDbGllbnQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGNvbXByZWhlbnNpdmUgYWNjZXNzaWJpbGl0eSByZXBvcnQgZnJvbSBhbGwgYW5hbHlzaXMgcmVzdWx0c1xuICAgICAqL1xuICAgIGFzeW5jIGdlbmVyYXRlUmVwb3J0KHNjcmVlbnNob3RBbmFseXNpcywgZG9tQW5hbHlzaXMsIGNvbG9yQW5hbHlzaXMsIG1hdGNoaW5nUmVzdWx0KSB7XG4gICAgICAgIC8vIEZpcnN0LCBnZW5lcmF0ZSBzdHJ1Y3R1cmVkIHJlY29tbWVuZGF0aW9ucyB3aXRob3V0IEFJXG4gICAgICAgIGNvbnN0IHN0cnVjdHVyZWRSZWNvbW1lbmRhdGlvbnMgPSB0aGlzLmdlbmVyYXRlU3RydWN0dXJlZFJlY29tbWVuZGF0aW9ucyhzY3JlZW5zaG90QW5hbHlzaXMsIGRvbUFuYWx5c2lzLCBjb2xvckFuYWx5c2lzLCBtYXRjaGluZ1Jlc3VsdCk7XG4gICAgICAgIC8vIFRoZW4sIGVuaGFuY2Ugd2l0aCBBSS1wb3dlcmVkIGNvbnRleHR1YWwgcmVjb21tZW5kYXRpb25zXG4gICAgICAgIGNvbnN0IGFpUmVjb21tZW5kYXRpb25zID0gYXdhaXQgdGhpcy5nZW5lcmF0ZUFJUmVjb21tZW5kYXRpb25zKHN0cnVjdHVyZWRSZWNvbW1lbmRhdGlvbnMsIHNjcmVlbnNob3RBbmFseXNpcywgZG9tQW5hbHlzaXMsIGNvbG9yQW5hbHlzaXMsIG1hdGNoaW5nUmVzdWx0KTtcbiAgICAgICAgLy8gQ29tYmluZSBhbmQgcHJpb3JpdGl6ZVxuICAgICAgICBjb25zdCBhbGxSZWNvbW1lbmRhdGlvbnMgPSBbLi4uc3RydWN0dXJlZFJlY29tbWVuZGF0aW9ucywgLi4uYWlSZWNvbW1lbmRhdGlvbnNdO1xuICAgICAgICBjb25zdCBwcmlvcml0aXplZCA9IHRoaXMucHJpb3JpdGl6ZVJlY29tbWVuZGF0aW9ucyhhbGxSZWNvbW1lbmRhdGlvbnMpO1xuICAgICAgICAvLyBHZW5lcmF0ZSBzdW1tYXJ5XG4gICAgICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLmdlbmVyYXRlU3VtbWFyeShwcmlvcml0aXplZCwgY29sb3JBbmFseXNpcyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdW1tYXJ5LFxuICAgICAgICAgICAgcmVjb21tZW5kYXRpb25zOiBwcmlvcml0aXplZCxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBzdHJ1Y3R1cmVkIHJlY29tbWVuZGF0aW9ucyBmcm9tIGFuYWx5c2lzIHJlc3VsdHNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVN0cnVjdHVyZWRSZWNvbW1lbmRhdGlvbnMoc2NyZWVuc2hvdEFuYWx5c2lzLCBkb21BbmFseXNpcywgY29sb3JBbmFseXNpcywgbWF0Y2hpbmdSZXN1bHQpIHtcbiAgICAgICAgY29uc3QgcmVjb21tZW5kYXRpb25zID0gW107XG4gICAgICAgIC8vIFJlY29tbWVuZGF0aW9ucyBmcm9tIGdlbmVyaWMgZWxlbWVudHNcbiAgICAgICAgLy8gTk9URTogZG9tQW5hbHlzaXMuZWxlbWVudHMgYWxyZWFkeSBjb250YWlucyBvbmx5IGVsZW1lbnRzIHdpdGggaXNzdWVzIG9yIGdlbmVyaWMgZWxlbWVudHNcbiAgICAgICAgLy8gKGZpbHRlcmVkIGF0IGdlbmVyYXRpb24gdGltZSBpbiBhbmFseXplRE9NT25QYWdlKSwgc28gd2UgY2FuIHNhZmVseSBwcm9jZXNzIGFsbCBlbGVtZW50c1xuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZG9tQW5hbHlzaXMuZWxlbWVudHMpIHtcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmlzR2VuZXJpYykge1xuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIGVsZW1lbnQgaWRlbnRpZmllclxuICAgICAgICAgICAgICAgIGNvbnN0IGlkZW50aWZpZXIgPSB0aGlzLmJ1aWxkRWxlbWVudElkZW50aWZpZXIoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGNvb3JkaW5hdGVzXG4gICAgICAgICAgICAgICAgY29uc3QgYmJveCA9IGVsZW1lbnQuYmJveDtcbiAgICAgICAgICAgICAgICBjb25zdCBjb29yZGluYXRlcyA9IGBQb3NpdGlvbjogKCR7TWF0aC5yb3VuZChiYm94LngpfSwgJHtNYXRoLnJvdW5kKGJib3gueSl9KSwgU2l6ZTogJHtNYXRoLnJvdW5kKGJib3gud2lkdGgpfcOXJHtNYXRoLnJvdW5kKGJib3guaGVpZ2h0KX1weGA7XG4gICAgICAgICAgICAgICAgcmVjb21tZW5kYXRpb25zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBpZDogYGdlbmVyaWMtJHtlbGVtZW50LmlkfWAsXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiAnY3JpdGljYWwnLFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogJ2dlbmVyaWMnLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogYFJlcGxhY2UgZ2VuZXJpYyAke2VsZW1lbnQudGFnTmFtZX0gd2l0aCBzZW1hbnRpYyBlbGVtZW50YCxcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGBHZW5lcmljICR7ZWxlbWVudC50YWdOYW1lfSBlbGVtZW50IGlzIHVzZWQgYXMgJHtlbGVtZW50LmdlbmVyaWNUeXBlIHx8ICdpbnRlcmFjdGl2ZSd9IGNvbXBvbmVudC4gVGhpcyB2aW9sYXRlcyBXQ0FHIDQuMS4yIChOYW1lLCBSb2xlLCBWYWx1ZSkuXFxuXFxuRWxlbWVudDogJHtpZGVudGlmaWVyfVxcbiR7Y29vcmRpbmF0ZXN9YCxcbiAgICAgICAgICAgICAgICAgICAgd2NhZ0NyaXRlcmlhOiBbJzQuMS4yJ10sXG4gICAgICAgICAgICAgICAgICAgIGFmZmVjdGVkRWxlbWVudHM6IFtlbGVtZW50LmlkXSxcbiAgICAgICAgICAgICAgICAgICAgZml4OiBgUmVwbGFjZSA8JHtlbGVtZW50LnRhZ05hbWV9PiB3aXRoIDwke2VsZW1lbnQucmVjb21tZW5kYXRpb25zLnNlbWFudGljIHx8ICdidXR0b24nfT4gZWxlbWVudGAsXG4gICAgICAgICAgICAgICAgICAgIGV4YW1wbGU6IGBCZWZvcmU6IDxkaXYgb25jbGljaz1cInN1Ym1pdCgpXCIgcm9sZT1cImJ1dHRvblwiPlN1Ym1pdDwvZGl2PlxcbkFmdGVyOiA8YnV0dG9uIG9uY2xpY2s9XCJzdWJtaXQoKVwiPlN1Ym1pdDwvYnV0dG9uPmBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE1pc3NpbmcgYWNjZXNzaWJsZSBuYW1lc1xuICAgICAgICAgICAgLy8gT25seSBjaGVjayBpZiBlbGVtZW50IGhhcyBpc3N1ZXMgKGFscmVhZHkgZmlsdGVyZWQsIGJ1dCBkb3VibGUtY2hlY2sgZm9yIHNhZmV0eSlcbiAgICAgICAgICAgIGlmIChlbGVtZW50LnJlY29tbWVuZGF0aW9ucz8uaXNzdWVzPy5sZW5ndGggPiAwICYmXG4gICAgICAgICAgICAgICAgZWxlbWVudC5yZWNvbW1lbmRhdGlvbnMuaXNzdWVzLnNvbWUoaXNzdWUgPT4gaXNzdWUuaW5jbHVkZXMoJ21pc3NpbmcgYWNjZXNzaWJsZSBuYW1lJykpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaWRlbnRpZmllciA9IHRoaXMuYnVpbGRFbGVtZW50SWRlbnRpZmllcihlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAvLyBBZGQgY29vcmRpbmF0ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBiYm94ID0gZWxlbWVudC5iYm94O1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvb3JkaW5hdGVzID0gYFBvc2l0aW9uOiAoJHtNYXRoLnJvdW5kKGJib3gueCl9LCAke01hdGgucm91bmQoYmJveC55KX0pLCBTaXplOiAke01hdGgucm91bmQoYmJveC53aWR0aCl9w5cke01hdGgucm91bmQoYmJveC5oZWlnaHQpfXB4YDtcbiAgICAgICAgICAgICAgICByZWNvbW1lbmRhdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGlkOiBgbmFtZS0ke2VsZW1lbnQuaWR9YCxcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6ICdjcml0aWNhbCcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiAnbGFiZWwnLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogYEFkZCBhY2Nlc3NpYmxlIG5hbWUgdG8gJHtlbGVtZW50LnRhZ05hbWV9IGVsZW1lbnRgLFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogYEVsZW1lbnQgaXMgbWlzc2luZyBhY2Nlc3NpYmxlIG5hbWUgKHRleHQgY29udGVudCBvciBhcmlhLWxhYmVsKS4gUmVxdWlyZWQgZm9yIHNjcmVlbiByZWFkZXJzLlxcblxcbkVsZW1lbnQ6ICR7aWRlbnRpZmllcn1cXG4ke2Nvb3JkaW5hdGVzfWAsXG4gICAgICAgICAgICAgICAgICAgIHdjYWdDcml0ZXJpYTogWyc0LjEuMiddLFxuICAgICAgICAgICAgICAgICAgICBhZmZlY3RlZEVsZW1lbnRzOiBbZWxlbWVudC5pZF0sXG4gICAgICAgICAgICAgICAgICAgIGZpeDogYEFkZCB0ZXh0IGNvbnRlbnQgb3IgYXJpYS1sYWJlbCBhdHRyaWJ1dGU6IDwke2VsZW1lbnQudGFnTmFtZX0gYXJpYS1sYWJlbD1cIkRlc2NyaXB0aW9uXCI+YFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFJlY29tbWVuZGF0aW9ucyBmcm9tIG1hdGNoaW5nIHJlc3VsdHNcbiAgICAgICAgZm9yIChjb25zdCBtYXRjaCBvZiBtYXRjaGluZ1Jlc3VsdC5tYXRjaGVkKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2guaXNzdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBCdWlsZCBlbGVtZW50IGlkZW50aWZpZXJcbiAgICAgICAgICAgICAgICBsZXQgaWRlbnRpZmllciA9ICcnO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaC5kb21FbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXIgPSB0aGlzLmJ1aWxkRWxlbWVudElkZW50aWZpZXIobWF0Y2guZG9tRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyID0gYCR7bWF0Y2guc2NyZWVuc2hvdEVsZW1lbnQudHlwZX0gZWxlbWVudGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEFkZCBjb29yZGluYXRlcyBmcm9tIHNjcmVlbnNob3RcbiAgICAgICAgICAgICAgICBjb25zdCBiYm94ID0gbWF0Y2guc2NyZWVuc2hvdEVsZW1lbnQuYmJveDtcbiAgICAgICAgICAgICAgICBjb25zdCBjb29yZGluYXRlcyA9IGBQb3NpdGlvbjogKCR7TWF0aC5yb3VuZChiYm94LngpfSwgJHtNYXRoLnJvdW5kKGJib3gueSl9KSwgU2l6ZTogJHtNYXRoLnJvdW5kKGJib3gud2lkdGgpfcOXJHtNYXRoLnJvdW5kKGJib3guaGVpZ2h0KX1weGA7XG4gICAgICAgICAgICAgICAgcmVjb21tZW5kYXRpb25zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBpZDogYG1hdGNoLSR7bWF0Y2guc2NyZWVuc2hvdEVsZW1lbnQuaWR9YCxcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IG1hdGNoLm1hdGNoU2NvcmUgPCAwLjUgPyAnaGlnaCcgOiAnbWVkaXVtJyxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6ICdzZW1hbnRpYycsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBgU2VtYW50aWMgbWlzbWF0Y2ggZGV0ZWN0ZWRgLFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogYCR7bWF0Y2guaXNzdWVzLmpvaW4oJy4gJyl9XFxuXFxuRWxlbWVudDogJHtpZGVudGlmaWVyfVxcbiR7Y29vcmRpbmF0ZXN9YCxcbiAgICAgICAgICAgICAgICAgICAgd2NhZ0NyaXRlcmlhOiBbJzQuMS4yJ10sXG4gICAgICAgICAgICAgICAgICAgIGFmZmVjdGVkRWxlbWVudHM6IFttYXRjaC5zY3JlZW5zaG90RWxlbWVudC5pZCwgbWF0Y2guZG9tRWxlbWVudD8uaWQgfHwgJyddLFxuICAgICAgICAgICAgICAgICAgICBmaXg6ICdFbnN1cmUgdmlzdWFsIGVsZW1lbnQgbWF0Y2hlcyBzZW1hbnRpYyBIVE1MIHN0cnVjdHVyZSdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBSZWNvbW1lbmRhdGlvbnMgZnJvbSB1bm1hdGNoZWQgZWxlbWVudHNcbiAgICAgICAgZm9yIChjb25zdCB1bm1hdGNoZWQgb2YgbWF0Y2hpbmdSZXN1bHQudW5tYXRjaGVkU2NyZWVuc2hvdCkge1xuICAgICAgICAgICAgLy8gQWRkIGNvb3JkaW5hdGVzIGZyb20gc2NyZWVuc2hvdFxuICAgICAgICAgICAgY29uc3QgYmJveCA9IHVubWF0Y2hlZC5iYm94O1xuICAgICAgICAgICAgY29uc3QgY29vcmRpbmF0ZXMgPSBgUG9zaXRpb246ICgke01hdGgucm91bmQoYmJveC54KX0sICR7TWF0aC5yb3VuZChiYm94LnkpfSksIFNpemU6ICR7TWF0aC5yb3VuZChiYm94LndpZHRoKX3DlyR7TWF0aC5yb3VuZChiYm94LmhlaWdodCl9cHhgO1xuICAgICAgICAgICAgLy8gQnVpbGQgaWRlbnRpZmllciBmcm9tIGF2YWlsYWJsZSBkYXRhXG4gICAgICAgICAgICBsZXQgaWRlbnRpZmllciA9IGAke3VubWF0Y2hlZC50eXBlfSBlbGVtZW50YDtcbiAgICAgICAgICAgIGlmICh1bm1hdGNoZWQudGV4dCkge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXIgKz0gYCB3aXRoIHRleHQ6IFwiJHt1bm1hdGNoZWQudGV4dC5sZW5ndGggPiA1MCA/IHVubWF0Y2hlZC50ZXh0LnN1YnN0cmluZygwLCA1MCkgKyAnLi4uJyA6IHVubWF0Y2hlZC50ZXh0fVwiYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICBpZDogYHVubWF0Y2hlZC1zY3JlZW5zaG90LSR7dW5tYXRjaGVkLmlkfWAsXG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6ICdtZWRpdW0nLFxuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiAnb3RoZXInLFxuICAgICAgICAgICAgICAgIHRpdGxlOiBgRWxlbWVudCB2aXNpYmxlIGJ1dCBub3QgYWNjZXNzaWJsZSBpbiBET01gLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBgJHt1bm1hdGNoZWQudHlwZX0gZWxlbWVudCBpcyB2aXNpYmxlIGluIHNjcmVlbnNob3QgYnV0IG5vdCBwcm9wZXJseSBhY2Nlc3NpYmxlIGluIERPTSBzdHJ1Y3R1cmUuXFxuXFxuRWxlbWVudDogJHtpZGVudGlmaWVyfVxcbiR7Y29vcmRpbmF0ZXN9YCxcbiAgICAgICAgICAgICAgICB3Y2FnQ3JpdGVyaWE6IFsnNC4xLjInXSxcbiAgICAgICAgICAgICAgICBhZmZlY3RlZEVsZW1lbnRzOiBbdW5tYXRjaGVkLmlkXSxcbiAgICAgICAgICAgICAgICBmaXg6ICdFbnN1cmUgYWxsIHZpc2libGUgaW50ZXJhY3RpdmUgZWxlbWVudHMgaGF2ZSBwcm9wZXIgRE9NIHJlcHJlc2VudGF0aW9uJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVjb21tZW5kYXRpb25zIGZyb20gY29sb3IgYW5hbHlzaXMgKGF4ZS1jb3JlICsgQUkpXG4gICAgICAgIGZvciAoY29uc3QgaXNzdWUgb2YgY29sb3JBbmFseXNpcy5pc3N1ZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHByaW9yaXR5ID0gaXNzdWUuc2V2ZXJpdHkgPT09ICdjcml0aWNhbCcgPyAnY3JpdGljYWwnIDpcbiAgICAgICAgICAgICAgICBpc3N1ZS5zZXZlcml0eSA9PT0gJ3NlcmlvdXMnID8gJ2hpZ2gnIDpcbiAgICAgICAgICAgICAgICAgICAgaXNzdWUuc2V2ZXJpdHkgPT09ICdtb2RlcmF0ZScgPyAnbWVkaXVtJyA6ICdsb3cnO1xuICAgICAgICAgICAgLy8gQWRkIHNvdXJjZSBpbmZvcm1hdGlvbiB0byBkZXNjcmlwdGlvbiBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGxldCBkZXNjcmlwdGlvbiA9IGlzc3VlLnJlY29tbWVuZGF0aW9uO1xuICAgICAgICAgICAgaWYgKGlzc3VlLnNvdXJjZSA9PT0gJ2JvdGgnKSB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb24gKz0gJyAoRGV0ZWN0ZWQgYnkgYm90aCBheGUtY29yZSBhbmQgQUkgdmlzaW9uIGFuYWx5c2lzKSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChpc3N1ZS5zb3VyY2UgPT09ICdhaScpIHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbiArPSAnIChEZXRlY3RlZCBieSBBSSB2aXNpb24gYW5hbHlzaXMpJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFkZCBlc3RpbWF0ZWQgY29udHJhc3QgaWYgYXZhaWxhYmxlIGZyb20gQUlcbiAgICAgICAgICAgIGlmIChpc3N1ZS5lc3RpbWF0ZWRDb250cmFzdCkge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uICs9IGAgRXN0aW1hdGVkIGNvbnRyYXN0IHJhdGlvOiAke2lzc3VlLmVzdGltYXRlZENvbnRyYXN0fToxLmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBUcnkgdG8gZmluZCBtYXRjaGluZyBET00gZWxlbWVudCBmb3IgY29vcmRpbmF0ZXMgYW5kIGJldHRlciBpZGVudGlmaWNhdGlvblxuICAgICAgICAgICAgbGV0IGVsZW1lbnRJbmZvID0gYEVsZW1lbnQ6ICR7aXNzdWUuZWxlbWVudH1gO1xuICAgICAgICAgICAgbGV0IGNvb3JkaW5hdGVzID0gJyc7XG4gICAgICAgICAgICAvLyBGb3IgYXhlLWNvcmUgaXNzdWVzLCB0cnkgdG8gZmluZCBET00gZWxlbWVudCBieSBzZWxlY3RvclxuICAgICAgICAgICAgaWYgKGlzc3VlLnNvdXJjZSA9PT0gJ2F4ZS1jb3JlJyB8fCBpc3N1ZS5zb3VyY2UgPT09ICdib3RoJykge1xuICAgICAgICAgICAgICAgIC8vIFRyeSBleGFjdCBzZWxlY3RvciBtYXRjaCBmaXJzdFxuICAgICAgICAgICAgICAgIGxldCBkb21FbGVtZW50ID0gZG9tQW5hbHlzaXMuZWxlbWVudHMuZmluZChlID0+IGUuc2VsZWN0b3IgPT09IGlzc3VlLmVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIC8vIElmIG5vdCBmb3VuZCwgdHJ5IHBhcnRpYWwgbWF0Y2ggKGUuZy4sIFwiI2lkXCIgbWF0Y2hlcyBlbGVtZW50IHdpdGggdGhhdCBpZClcbiAgICAgICAgICAgICAgICBpZiAoIWRvbUVsZW1lbnQgJiYgaXNzdWUuZWxlbWVudC5zdGFydHNXaXRoKCcjJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSBpc3N1ZS5lbGVtZW50LnJlcGxhY2UoJyMnLCAnJykudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICBkb21FbGVtZW50ID0gZG9tQW5hbHlzaXMuZWxlbWVudHMuZmluZChlID0+IGUuZWxlbWVudElkID09PSBpZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRyeSBjbGFzcyBtYXRjaFxuICAgICAgICAgICAgICAgIGlmICghZG9tRWxlbWVudCAmJiBpc3N1ZS5lbGVtZW50LmluY2x1ZGVzKCcuJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xhc3NNYXRjaCA9IGlzc3VlLmVsZW1lbnQubWF0Y2goL1xcLihbXFx3LV0rKS8pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2xhc3NNYXRjaCAmJiBjbGFzc01hdGNoWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb21FbGVtZW50ID0gZG9tQW5hbHlzaXMuZWxlbWVudHMuZmluZChlID0+IGUuY2xhc3NOYW1lICYmIGUuY2xhc3NOYW1lLnNwbGl0KCcgJykuaW5jbHVkZXMoY2xhc3NNYXRjaFsxXSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkb21FbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBidWlsZEVsZW1lbnRJZGVudGlmaWVyIGZvciBiZXR0ZXIgaWRlbnRpZmljYXRpb25cbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudEluZm8gPSBgRWxlbWVudDogJHt0aGlzLmJ1aWxkRWxlbWVudElkZW50aWZpZXIoZG9tRWxlbWVudCl9YDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmJveCA9IGRvbUVsZW1lbnQuYmJveDtcbiAgICAgICAgICAgICAgICAgICAgY29vcmRpbmF0ZXMgPSBgXFxuUG9zaXRpb246ICgke01hdGgucm91bmQoYmJveC54KX0sICR7TWF0aC5yb3VuZChiYm94LnkpfSksIFNpemU6ICR7TWF0aC5yb3VuZChiYm94LndpZHRoKX3DlyR7TWF0aC5yb3VuZChiYm94LmhlaWdodCl9cHhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZvciBBSS1kZXRlY3RlZCBpc3N1ZXMsIHRyeSB0byBmaW5kIGluIHNjcmVlbnNob3Qgb3IgbWF0Y2hlZCBlbGVtZW50c1xuICAgICAgICAgICAgaWYgKGlzc3VlLnNvdXJjZSA9PT0gJ2FpJyB8fCAoIWNvb3JkaW5hdGVzICYmIGlzc3VlLnNvdXJjZSAhPT0gJ2F4ZS1jb3JlJykpIHtcbiAgICAgICAgICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIGZpbmQgaW4gbWF0Y2hlZCBwYWlycyAobW9zdCBhY2N1cmF0ZSlcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaGVkUGFpciA9IG1hdGNoaW5nUmVzdWx0Lm1hdGNoZWQuZmluZChtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG0uZG9tRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRlbnRpZmllciA9IHRoaXMuYnVpbGRFbGVtZW50SWRlbnRpZmllcihtLmRvbUVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlkZW50aWZpZXIudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhpc3N1ZS5lbGVtZW50LnRvTG93ZXJDYXNlKCkpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNzdWUuZWxlbWVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKG0uc2NyZWVuc2hvdEVsZW1lbnQudHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlzc3VlLmVsZW1lbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhtLnNjcmVlbnNob3RFbGVtZW50LnR5cGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaGVkUGFpcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2hlZFBhaXIuZG9tRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudEluZm8gPSBgRWxlbWVudDogJHt0aGlzLmJ1aWxkRWxlbWVudElkZW50aWZpZXIobWF0Y2hlZFBhaXIuZG9tRWxlbWVudCl9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJib3ggPSBtYXRjaGVkUGFpci5kb21FbGVtZW50LmJib3g7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb29yZGluYXRlcyA9IGBcXG5Qb3NpdGlvbjogKCR7TWF0aC5yb3VuZChiYm94LngpfSwgJHtNYXRoLnJvdW5kKGJib3gueSl9KSwgU2l6ZTogJHtNYXRoLnJvdW5kKGJib3gud2lkdGgpfcOXJHtNYXRoLnJvdW5kKGJib3guaGVpZ2h0KX1weGA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiYm94ID0gbWF0Y2hlZFBhaXIuc2NyZWVuc2hvdEVsZW1lbnQuYmJveDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzID0gYFxcblBvc2l0aW9uOiAoJHtNYXRoLnJvdW5kKGJib3gueCl9LCAke01hdGgucm91bmQoYmJveC55KX0pLCBTaXplOiAke01hdGgucm91bmQoYmJveC53aWR0aCl9w5cke01hdGgucm91bmQoYmJveC5oZWlnaHQpfXB4YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGZpbmQgaW4gc2NyZWVuc2hvdCBlbGVtZW50cyBkaXJlY3RseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5zaG90RWxlbWVudCA9IHNjcmVlbnNob3RBbmFseXNpcy5lbGVtZW50cy5maW5kKGUgPT4gZS50ZXh0ICYmIGlzc3VlLmVsZW1lbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhlLnRleHQudG9Mb3dlckNhc2UoKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzc3VlLmVsZW1lbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhlLnR5cGUpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoZS50ZXh0ICYmIGUudGV4dC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGlzc3VlLmVsZW1lbnQudG9Mb3dlckNhc2UoKSkpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjcmVlbnNob3RFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiYm94ID0gc2NyZWVuc2hvdEVsZW1lbnQuYmJveDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGVzID0gYFxcblBvc2l0aW9uOiAoJHtNYXRoLnJvdW5kKGJib3gueCl9LCAke01hdGgucm91bmQoYmJveC55KX0pLCBTaXplOiAke01hdGgucm91bmQoYmJveC53aWR0aCl9w5cke01hdGgucm91bmQoYmJveC5oZWlnaHQpfXB4YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVuaGFuY2UgZWxlbWVudCBpbmZvIHdpdGggc2NyZWVuc2hvdCBkYXRhXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2NyZWVuc2hvdEVsZW1lbnQudGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRJbmZvID0gYEVsZW1lbnQ6ICR7c2NyZWVuc2hvdEVsZW1lbnQudHlwZX0gd2l0aCB0ZXh0IFwiJHtzY3JlZW5zaG90RWxlbWVudC50ZXh0Lmxlbmd0aCA+IDUwID8gc2NyZWVuc2hvdEVsZW1lbnQudGV4dC5zdWJzdHJpbmcoMCwgNTApICsgJy4uLicgOiBzY3JlZW5zaG90RWxlbWVudC50ZXh0fVwiYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRJbmZvID0gYEVsZW1lbnQ6ICR7c2NyZWVuc2hvdEVsZW1lbnQudHlwZX0gZWxlbWVudGA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZXNjcmlwdGlvbiArPSBgXFxuXFxuJHtlbGVtZW50SW5mb30ke2Nvb3JkaW5hdGVzfWA7XG4gICAgICAgICAgICByZWNvbW1lbmRhdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgaWQ6IGAke2lzc3VlLnNvdXJjZSB8fCAnY29sb3InfS0ke2lzc3VlLnJ1bGVJZCB8fCBpc3N1ZS5lbGVtZW50fWAsXG4gICAgICAgICAgICAgICAgcHJpb3JpdHksXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IHRoaXMubWFwQXhlQ2F0ZWdvcnkoaXNzdWUpLFxuICAgICAgICAgICAgICAgIHRpdGxlOiBpc3N1ZS5pc3N1ZSxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICB3Y2FnQ3JpdGVyaWE6IGlzc3VlLndjYWdDcml0ZXJpYSB8fCBbXSxcbiAgICAgICAgICAgICAgICBhZmZlY3RlZEVsZW1lbnRzOiBbaXNzdWUuZWxlbWVudF0sXG4gICAgICAgICAgICAgICAgZml4OiBpc3N1ZS5yZWNvbW1lbmRhdGlvblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlY29tbWVuZGF0aW9ucztcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgQUktcG93ZXJlZCBjb250ZXh0dWFsIHJlY29tbWVuZGF0aW9uc1xuICAgICAqL1xuICAgIGFzeW5jIGdlbmVyYXRlQUlSZWNvbW1lbmRhdGlvbnMoc3RydWN0dXJlZFJlY29tbWVuZGF0aW9ucywgc2NyZWVuc2hvdEFuYWx5c2lzLCBkb21BbmFseXNpcywgY29sb3JBbmFseXNpcywgbWF0Y2hpbmdSZXN1bHQpIHtcbiAgICAgICAgLy8gUHJlcGFyZSBjb250ZXh0IGZvciBBSVxuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5wcmVwYXJlQUlDb250ZXh0KHN0cnVjdHVyZWRSZWNvbW1lbmRhdGlvbnMsIHNjcmVlbnNob3RBbmFseXNpcywgZG9tQW5hbHlzaXMsIGNvbG9yQW5hbHlzaXMsIG1hdGNoaW5nUmVzdWx0KTtcbiAgICAgICAgY29uc3QgcHJvbXB0ID0gdGhpcy5idWlsZFJlY29tbWVuZGF0aW9uUHJvbXB0KGNvbnRleHQpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IGFpUmVzcG9uc2U7XG4gICAgICAgICAgICBpZiAodGhpcy5wcm92aWRlciA9PT0gJ29sbGFtYScgJiYgdGhpcy5vbGxhbWFDbGllbnQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMub2xsYW1hQ2xpZW50LmFuYWx5emVJbWFnZSh7XG4gICAgICAgICAgICAgICAgICAgIGltYWdlRGF0YVVybDogc2NyZWVuc2hvdEFuYWx5c2lzLmltYWdlRGF0YVVybCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0LFxuICAgICAgICAgICAgICAgICAgICBtb2RlbE5hbWU6ICdnZW1tYTM6MTJiJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGFpUmVzcG9uc2UgPSByZXNwb25zZS5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMucHJvdmlkZXIgPT09ICdnb29nbGUtd2ViLWFpJyAmJiB0aGlzLmdvb2dsZVdlYkFJQ2xpZW50KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmdvb2dsZVdlYkFJQ2xpZW50LmFuYWx5emVJbWFnZSh7XG4gICAgICAgICAgICAgICAgICAgIGltYWdlRGF0YVVybDogc2NyZWVuc2hvdEFuYWx5c2lzLmltYWdlRGF0YVVybCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYWlSZXNwb25zZSA9IHJlc3BvbnNlLmRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtdOyAvLyBObyBBSSBwcm92aWRlciBhdmFpbGFibGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFBhcnNlIEFJIHJlc3BvbnNlIGludG8gcmVjb21tZW5kYXRpb25zXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZUFJUmVjb21tZW5kYXRpb25zKGFpUmVzcG9uc2UpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2VuZXJhdGluZyBBSSByZWNvbW1lbmRhdGlvbnM6JywgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgY29udGV4dCBmb3IgQUkgYW5hbHlzaXNcbiAgICAgKi9cbiAgICBwcmVwYXJlQUlDb250ZXh0KHN0cnVjdHVyZWRSZWNvbW1lbmRhdGlvbnMsIHNjcmVlbnNob3RBbmFseXNpcywgZG9tQW5hbHlzaXMsIGNvbG9yQW5hbHlzaXMsIG1hdGNoaW5nUmVzdWx0KSB7XG4gICAgICAgIGNvbnN0IGdlbmVyaWNDb3VudCA9IGRvbUFuYWx5c2lzLmVsZW1lbnRzLmZpbHRlcihlID0+IGUuaXNHZW5lcmljKS5sZW5ndGg7XG4gICAgICAgIGNvbnN0IHVubWF0Y2hlZENvdW50ID0gbWF0Y2hpbmdSZXN1bHQudW5tYXRjaGVkU2NyZWVuc2hvdC5sZW5ndGggKyBtYXRjaGluZ1Jlc3VsdC51bm1hdGNoZWRET00ubGVuZ3RoO1xuICAgICAgICBjb25zdCBheGVWaW9sYXRpb25zID0gY29sb3JBbmFseXNpcy5pc3N1ZXMubGVuZ3RoO1xuICAgICAgICByZXR1cm4gYFxuQWNjZXNzaWJpbGl0eSBBbmFseXNpcyBTdW1tYXJ5OlxuLSBTY3JlZW5zaG90IGVsZW1lbnRzIGZvdW5kOiAke3NjcmVlbnNob3RBbmFseXNpcy5lbGVtZW50cy5sZW5ndGh9XG4tIERPTSBlbGVtZW50cyBhbmFseXplZDogJHtkb21BbmFseXNpcy5lbGVtZW50cy5sZW5ndGh9XG4tIEdlbmVyaWMgZWxlbWVudHMgKGRpdi9zcGFuIHVzZWQgYXMgaW50ZXJhY3RpdmUpOiAke2dlbmVyaWNDb3VudH1cbi0gQXhlLWNvcmUgdmlvbGF0aW9uczogJHtheGVWaW9sYXRpb25zfVxuLSBNYXRjaGVkIGVsZW1lbnRzOiAke21hdGNoaW5nUmVzdWx0Lm1hdGNoZWQubGVuZ3RofVxuLSBVbm1hdGNoZWQgc2NyZWVuc2hvdCBlbGVtZW50czogJHttYXRjaGluZ1Jlc3VsdC51bm1hdGNoZWRTY3JlZW5zaG90Lmxlbmd0aH1cbi0gVW5tYXRjaGVkIERPTSBlbGVtZW50czogJHttYXRjaGluZ1Jlc3VsdC51bm1hdGNoZWRET00ubGVuZ3RofVxuXG5LZXkgSXNzdWVzOlxuJHtzdHJ1Y3R1cmVkUmVjb21tZW5kYXRpb25zLnNsaWNlKDAsIDEwKS5tYXAociA9PiBgLSAke3IudGl0bGV9OiAke3IuZGVzY3JpcHRpb259YCkuam9pbignXFxuJyl9XG5gO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBCdWlsZCBwcm9tcHQgZm9yIEFJIHJlY29tbWVuZGF0aW9uIGdlbmVyYXRpb25cbiAgICAgKi9cbiAgICBidWlsZFJlY29tbWVuZGF0aW9uUHJvbXB0KGNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuIGBZb3UgYXJlIGFuIGFjY2Vzc2liaWxpdHkgZXhwZXJ0IGFuYWx5emluZyBhIHdlYnBhZ2UgZm9yIFdDQUcgMi4xIGNvbXBsaWFuY2UuXG5cbiR7Y29udGV4dH1cblxuUHJvdmlkZSBPTkxZIGFjY2Vzc2liaWxpdHkgcmVjb21tZW5kYXRpb25zIGluIHRoZSBFWEFDVCBmb3JtYXQgYmVsb3cuIERvIE5PVCBhZGQgYW55IGludHJvZHVjdG9yeSB0ZXh0LCBleHBsYW5hdGlvbnMsIG9yIGNvbW1lbnRzLiBTdGFydCBkaXJlY3RseSB3aXRoIHRoZSByZWNvbW1lbmRhdGlvbnMuXG5cblJFUVVJUkVEIEZPUk1BVCAoZm9sbG93IGV4YWN0bHkpOlxuXG4xLiBQcmlvcml0eTogaGlnaFxuQ2F0ZWdvcnk6IHNlbWFudGljXG5UaXRsZTogTWlzc2luZyBzZW1hbnRpYyBIVE1MIGZvciBpbnRlcmFjdGl2ZSBlbGVtZW50XG5EZXNjcmlwdGlvbjogVGhlIGJ1dHRvbiBpcyBpbXBsZW1lbnRlZCBhcyBhIGRpdiBlbGVtZW50IGluc3RlYWQgb2YgdXNpbmcgdGhlIHNlbWFudGljIGJ1dHRvbiB0YWcsIHdoaWNoIHJlZHVjZXMgYWNjZXNzaWJpbGl0eSBmb3Igc2NyZWVuIHJlYWRlcnMuXG5XQ0FHIGNyaXRlcmlhOiBXQ0FHIDQuMS4yXG5GaXg6IFJlcGxhY2UgdGhlIGRpdiBlbGVtZW50IHdpdGggYSBwcm9wZXIgYnV0dG9uIGVsZW1lbnQgYW5kIGVuc3VyZSBpdCBoYXMgcHJvcGVyIEFSSUEgYXR0cmlidXRlcyBpZiBuZWVkZWQuXG5cbjIuIFByaW9yaXR5OiBjcml0aWNhbFxuQ2F0ZWdvcnk6IGNvbG9yXG5UaXRsZTogSW5zdWZmaWNpZW50IGNvbG9yIGNvbnRyYXN0IGZvciB0ZXh0XG5EZXNjcmlwdGlvbjogVGhlIHRleHQgY29sb3IgZG9lcyBub3QgbWVldCBXQ0FHIEFBIGNvbnRyYXN0IHJlcXVpcmVtZW50cywgbWFraW5nIGl0IGRpZmZpY3VsdCBmb3IgdXNlcnMgd2l0aCB2aXN1YWwgaW1wYWlybWVudHMgdG8gcmVhZC5cbldDQUcgY3JpdGVyaWE6IFdDQUcgMS40LjNcbkZpeDogSW5jcmVhc2UgdGhlIGNvbnRyYXN0IHJhdGlvIGJldHdlZW4gdGV4dCBhbmQgYmFja2dyb3VuZCBjb2xvcnMgdG8gYXQgbGVhc3QgNC41OjEgZm9yIG5vcm1hbCB0ZXh0LlxuXG5TVFJJQ1QgUlVMRVM6XG4tIFN0YXJ0IGltbWVkaWF0ZWx5IHdpdGggXCIxLlwiIC0gbm8gcHJlYW1ibGVcbi0gVXNlIE9OTFkgdGhlIGZvcm1hdCBzaG93biBhYm92ZVxuLSBEbyBOT1QgaW5jbHVkZSBIVE1MIGNvZGUgaW4gdGl0bGVzIG9yIGRlc2NyaXB0aW9uc1xuLSBVc2UgcGxhaW4gdGV4dCBvbmx5IC0gbm8gbWFya2Rvd24sIG5vIEhUTUwgdGFnc1xuLSBFYWNoIHJlY29tbWVuZGF0aW9uIG11c3QgYmUgbnVtYmVyZWQgKDEuLCAyLiwgMy4sIGV0Yy4pXG4tIERvIE5PVCBhZGQgYW55IHRleHQgYmVmb3JlIG9yIGFmdGVyIHRoZSBudW1iZXJlZCBsaXN0XG4tIERvIE5PVCBpbmNsdWRlIHBocmFzZXMgbGlrZSBcIkhlcmUgYXJlIHJlY29tbWVuZGF0aW9uczpcIiBvciBcIkJhc2VkIG9uIHRoZSBhbmFseXNpczpcIlxuLSBUaXRsZSBtdXN0IGJlIGEgY2xlYXIsIGRlc2NyaXB0aXZlIHNlbnRlbmNlICg1LTE1IHdvcmRzKVxuLSBEZXNjcmlwdGlvbiBtdXN0IGJlIGEgZGV0YWlsZWQgZXhwbGFuYXRpb24gKDIwLTEwMCB3b3Jkcylcbi0gUHJpb3JpdHkgbXVzdCBiZSBvbmUgb2Y6IGNyaXRpY2FsLCBoaWdoLCBtZWRpdW0sIGxvd1xuLSBDYXRlZ29yeSBtdXN0IGJlIG9uZSBvZjogc2VtYW50aWMsIGNvbG9yLCBhcmlhLCBrZXlib2FyZCwgZm9jdXMsIG90aGVyXG5cblByb3ZpZGUgeW91ciByZWNvbW1lbmRhdGlvbnMgbm93LCBzdGFydGluZyB3aXRoIFwiMS5cIjpgO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQYXJzZSBBSSByZXNwb25zZSBpbnRvIHN0cnVjdHVyZWQgcmVjb21tZW5kYXRpb25zXG4gICAgICovXG4gICAgcGFyc2VBSVJlY29tbWVuZGF0aW9ucyhhaVJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnN0IHJlY29tbWVuZGF0aW9ucyA9IFtdO1xuICAgICAgICAvLyBIZWxwZXIgdG8gc3RyaXAgSFRNTCB0YWdzIGFuZCBjbGVhbiB0ZXh0XG4gICAgICAgIGNvbnN0IHN0cmlwSHRtbCA9ICh0ZXh0KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGV4dFxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC88W14+XSo+L2csICcnKSAvLyBSZW1vdmUgSFRNTCB0YWdzXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoLyZbYS16XSs7L2dpLCAnJykgLy8gUmVtb3ZlIEhUTUwgZW50aXRpZXNcbiAgICAgICAgICAgICAgICAudHJpbSgpO1xuICAgICAgICB9O1xuICAgICAgICAvLyBIZWxwZXIgdG8gdmFsaWRhdGUgcmVjb21tZW5kYXRpb25cbiAgICAgICAgY29uc3QgaXNWYWxpZFJlY29tbWVuZGF0aW9uID0gKHJlYykgPT4ge1xuICAgICAgICAgICAgaWYgKCFyZWMudGl0bGUgfHwgcmVjLnRpdGxlLmxlbmd0aCA8IDUpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgLy8gUmVqZWN0IGlmIHRpdGxlIGxvb2tzIGxpa2UgSFRNTCBjb2RlXG4gICAgICAgICAgICBpZiAocmVjLnRpdGxlLmluY2x1ZGVzKCc8JykgJiYgcmVjLnRpdGxlLmluY2x1ZGVzKCc+JykpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgLy8gUmVqZWN0IGlmIHRpdGxlIGlzIGp1c3QgSFRNTCB0YWdcbiAgICAgICAgICAgIGlmIChyZWMudGl0bGUubWF0Y2goL148W14+XSs+JC8pKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIC8vIFJlamVjdCBpZiBkZXNjcmlwdGlvbiBpcyBqdXN0IEhUTUwgY29kZVxuICAgICAgICAgICAgaWYgKHJlYy5kZXNjcmlwdGlvbiAmJiByZWMuZGVzY3JpcHRpb24ubWF0Y2goL148W14+XSs+JC8pKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIC8vIFJlamVjdCBpZiB0aXRsZSBjb250YWlucyBtYXJrZG93biBmb3JtYXR0aW5nICgqKiwgKiwgIywgZXRjLilcbiAgICAgICAgICAgIGlmIChyZWMudGl0bGUubWF0Y2goL15cXCorXFxzKltcXGQuXStcXHMqXFwqK3xeXFwqezIsfXxeI3sxLDZ9XFxzLykpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgLy8gUmVqZWN0IGlmIHRpdGxlIGxvb2tzIGxpa2UgYSBzZWN0aW9uIGhlYWRlciAoc3RhcnRzIHdpdGggbnVtYmVyIGFuZCBhc3Rlcmlza3MpXG4gICAgICAgICAgICBpZiAocmVjLnRpdGxlLm1hdGNoKC9eXFwqP1xccypbXFxkLl0rXFxzKlsuKl18XltcXGQuXStcXHMqWy4qXS8pKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIC8vIFJlamVjdCBpZiB0aXRsZSBhbmQgZGVzY3JpcHRpb24gYXJlIHRoZSBzYW1lIChsaWtlbHkgYSBwYXJzaW5nIGVycm9yKVxuICAgICAgICAgICAgaWYgKHJlYy50aXRsZSA9PT0gcmVjLmRlc2NyaXB0aW9uKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIC8vIFJlamVjdCBpZiB0aXRsZSBjb250YWlucyBcIkFkZGl0aW9uYWwgQ29udGV4dHVhbFwiLCBcIlByaW9yaXR5LUJhc2VkXCIsIGV0Yy4gKHNlY3Rpb24gaGVhZGVycylcbiAgICAgICAgICAgIGNvbnN0IGxvd2VyVGl0bGUgPSByZWMudGl0bGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmIChsb3dlclRpdGxlLmluY2x1ZGVzKCdhZGRpdGlvbmFsIGNvbnRleHR1YWwnKSB8fFxuICAgICAgICAgICAgICAgIGxvd2VyVGl0bGUuaW5jbHVkZXMoJ3ByaW9yaXR5LWJhc2VkJykgfHxcbiAgICAgICAgICAgICAgICBsb3dlclRpdGxlLmluY2x1ZGVzKCdhY3Rpb24gcGxhbicpIHx8XG4gICAgICAgICAgICAgICAgbG93ZXJUaXRsZS5pbmNsdWRlcygnc3BlY2lmaWMgd2NhZycpIHx8XG4gICAgICAgICAgICAgICAgbG93ZXJUaXRsZS5pbmNsdWRlcygncHJhY3RpY2FsIGZpeCcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTXVzdCBoYXZlIGEgbWVhbmluZ2Z1bCBkZXNjcmlwdGlvblxuICAgICAgICAgICAgaWYgKCFyZWMuZGVzY3JpcHRpb24gfHwgcmVjLmRlc2NyaXB0aW9uLmxlbmd0aCA8IDEwKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgICAvLyBUcnkgdG8gZXh0cmFjdCByZWNvbW1lbmRhdGlvbnMgZnJvbSBBSSByZXNwb25zZVxuICAgICAgICBjb25zdCBsaW5lcyA9IGFpUmVzcG9uc2Uuc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpKTtcbiAgICAgICAgbGV0IGN1cnJlbnRSZWMgPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGNsZWFuTGluZSA9IHN0cmlwSHRtbChsaW5lKTtcbiAgICAgICAgICAgIGNvbnN0IGxvd2VyTGluZSA9IGNsZWFuTGluZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgLy8gU2tpcCBpbnRyb2R1Y3RvcnkgdGV4dCBvciBjb21tZW50cyBiZWZvcmUgcmVjb21tZW5kYXRpb25zXG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRSZWMgJiYgKGxvd2VyTGluZS5pbmNsdWRlcygnaGVyZSBhcmUnKSB8fFxuICAgICAgICAgICAgICAgIGxvd2VyTGluZS5pbmNsdWRlcygnYmFzZWQgb24nKSB8fFxuICAgICAgICAgICAgICAgIGxvd2VyTGluZS5pbmNsdWRlcygncmVjb21tZW5kYXRpb25zOicpIHx8XG4gICAgICAgICAgICAgICAgbG93ZXJMaW5lLmluY2x1ZGVzKCdmb2xsb3dpbmcgcmVjb21tZW5kYXRpb25zJykgfHxcbiAgICAgICAgICAgICAgICBsb3dlckxpbmUuc3RhcnRzV2l0aCgncHJvdmlkZScpIHx8XG4gICAgICAgICAgICAgICAgbG93ZXJMaW5lLnN0YXJ0c1dpdGgoJ2kgd2lsbCcpKSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlOyAvLyBTa2lwIHByZWFtYmxlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBMb29rIGZvciByZWNvbW1lbmRhdGlvbiBwYXR0ZXJucyAtIG11c3Qgc3RhcnQgd2l0aCBudW1iZXJcbiAgICAgICAgICAgIGlmIChsaW5lLm1hdGNoKC9eXFxkK1xcLi8pKSB7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRSZWMgJiYgaXNWYWxpZFJlY29tbWVuZGF0aW9uKGN1cnJlbnRSZWMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKGN1cnJlbnRSZWMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXJyZW50UmVjID0ge1xuICAgICAgICAgICAgICAgICAgICBpZDogYGFpLSR7RGF0ZS5ub3coKX0tJHtyZWNvbW1lbmRhdGlvbnMubGVuZ3RofWAsXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiAnbWVkaXVtJyxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6ICdvdGhlcicsXG4gICAgICAgICAgICAgICAgICAgIHdjYWdDcml0ZXJpYTogW10sXG4gICAgICAgICAgICAgICAgICAgIGFmZmVjdGVkRWxlbWVudHM6IFtdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjdXJyZW50UmVjKSB7XG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBwcmlvcml0eSAobXVzdCBiZSBvbiBhIGxpbmUgc3RhcnRpbmcgd2l0aCBcIlByaW9yaXR5OlwiKVxuICAgICAgICAgICAgICAgIGlmIChsb3dlckxpbmUuc3RhcnRzV2l0aCgncHJpb3JpdHk6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJpb3JpdHlNYXRjaCA9IGxvd2VyTGluZS5tYXRjaCgvcHJpb3JpdHk6XFxzKihjcml0aWNhbHxoaWdofG1lZGl1bXxsb3cpLyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmlvcml0eU1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50UmVjLnByaW9yaXR5ID0gcHJpb3JpdHlNYXRjaFsxXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGNhdGVnb3J5IChtdXN0IGJlIG9uIGEgbGluZSBzdGFydGluZyB3aXRoIFwiQ2F0ZWdvcnk6XCIpXG4gICAgICAgICAgICAgICAgaWYgKGxvd2VyTGluZS5zdGFydHNXaXRoKCdjYXRlZ29yeTonKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeU1hdGNoID0gbG93ZXJMaW5lLm1hdGNoKC9jYXRlZ29yeTpcXHMqKFxcdyspLyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeU1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXQgPSBjYXRlZ29yeU1hdGNoWzFdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBNYXAgQUkgY2F0ZWdvcmllcyB0byBvdXIgYWxsb3dlZCBjYXRlZ29yaWVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeU1hcCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc2VtYW50aWMnOiAnc2VtYW50aWMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjb2xvcic6ICdjb250cmFzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRyYXN0JzogJ2NvbnRyYXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnYXJpYSc6ICdhcmlhJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAna2V5Ym9hcmQnOiAna2V5Ym9hcmQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdmb2N1cyc6ICdrZXlib2FyZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2dlbmVyaWMnOiAnZ2VuZXJpYycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2xhYmVsJzogJ2xhYmVsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnb3RoZXInOiAnb3RoZXInXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhdCBpbiBjYXRlZ29yeU1hcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRSZWMuY2F0ZWdvcnkgPSBjYXRlZ29yeU1hcFtjYXRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFJlYy5jYXRlZ29yeSA9ICdvdGhlcic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCB0aXRsZSAobXVzdCBiZSBvbiBhIGxpbmUgc3RhcnRpbmcgd2l0aCBcIlRpdGxlOlwiKVxuICAgICAgICAgICAgICAgIGlmIChsb3dlckxpbmUuc3RhcnRzV2l0aCgndGl0bGU6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGl0bGUgPSBjbGVhbkxpbmUucmVwbGFjZSgvXnRpdGxlOlxccyovaSwgJycpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRpdGxlLmxlbmd0aCA+IDUgJiYgISh0aXRsZS5pbmNsdWRlcygnPCcpICYmIHRpdGxlLmluY2x1ZGVzKCc+JykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50UmVjLnRpdGxlID0gdGl0bGUuc3Vic3RyaW5nKDAsIDIwMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBkZXNjcmlwdGlvbiAobXVzdCBiZSBvbiBhIGxpbmUgc3RhcnRpbmcgd2l0aCBcIkRlc2NyaXB0aW9uOlwiKVxuICAgICAgICAgICAgICAgIGlmIChsb3dlckxpbmUuc3RhcnRzV2l0aCgnZGVzY3JpcHRpb246JykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVzYyA9IGNsZWFuTGluZS5yZXBsYWNlKC9eZGVzY3JpcHRpb246XFxzKi9pLCAnJykudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVzYy5sZW5ndGggPiAxMCAmJiAhZGVzYy5tYXRjaCgvXjxbXj5dKz4kLykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRSZWMuZGVzY3JpcHRpb24gPSBkZXNjLnN1YnN0cmluZygwLCA1MDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgV0NBRyBjcml0ZXJpYSAobXVzdCBiZSBvbiBhIGxpbmUgc3RhcnRpbmcgd2l0aCBcIldDQUcgY3JpdGVyaWE6XCIpXG4gICAgICAgICAgICAgICAgaWYgKGxvd2VyTGluZS5zdGFydHNXaXRoKCd3Y2FnIGNyaXRlcmlhOicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdjYWdNYXRjaCA9IGNsZWFuTGluZS5tYXRjaCgvV0NBR1xccyooXFxkK1xcLlxcZCtcXC5cXGQrKS9pKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdjYWdNYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFJlYy53Y2FnQ3JpdGVyaWEgPSBjdXJyZW50UmVjLndjYWdDcml0ZXJpYSB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRSZWMud2NhZ0NyaXRlcmlhLnB1c2god2NhZ01hdGNoWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGZpeCAobXVzdCBiZSBvbiBhIGxpbmUgc3RhcnRpbmcgd2l0aCBcIkZpeDpcIilcbiAgICAgICAgICAgICAgICBpZiAobG93ZXJMaW5lLnN0YXJ0c1dpdGgoJ2ZpeDonKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXggPSBjbGVhbkxpbmUucmVwbGFjZSgvXmZpeDpcXHMqL2ksICcnKS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaXgubGVuZ3RoID4gNSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFJlYy5maXggPSBmaXguc3Vic3RyaW5nKDAsIDUwMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gQWRkIGZpbmFsIHJlY29tbWVuZGF0aW9uIGlmIHZhbGlkXG4gICAgICAgIGlmIChjdXJyZW50UmVjICYmIGlzVmFsaWRSZWNvbW1lbmRhdGlvbihjdXJyZW50UmVjKSkge1xuICAgICAgICAgICAgcmVjb21tZW5kYXRpb25zLnB1c2goY3VycmVudFJlYyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlY29tbWVuZGF0aW9ucztcbiAgICB9XG4gICAgLyoqXG4gICAgICogUHJpb3JpdGl6ZSByZWNvbW1lbmRhdGlvbnNcbiAgICAgKi9cbiAgICBwcmlvcml0aXplUmVjb21tZW5kYXRpb25zKHJlY29tbWVuZGF0aW9ucykge1xuICAgICAgICBjb25zdCBwcmlvcml0eU9yZGVyID0geyBjcml0aWNhbDogMCwgaGlnaDogMSwgbWVkaXVtOiAyLCBsb3c6IDMgfTtcbiAgICAgICAgcmV0dXJuIHJlY29tbWVuZGF0aW9ucy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwcmlvcml0eURpZmYgPSBwcmlvcml0eU9yZGVyW2EucHJpb3JpdHldIC0gcHJpb3JpdHlPcmRlcltiLnByaW9yaXR5XTtcbiAgICAgICAgICAgIGlmIChwcmlvcml0eURpZmYgIT09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByaW9yaXR5RGlmZjtcbiAgICAgICAgICAgIC8vIElmIHNhbWUgcHJpb3JpdHksIHNvcnQgYnkgV0NBRyBsZXZlbCAoQSA+IEFBID4gQUFBKVxuICAgICAgICAgICAgY29uc3QgYUxldmVsID0gdGhpcy5nZXRXQ0FHTGV2ZWwoYS53Y2FnQ3JpdGVyaWEpO1xuICAgICAgICAgICAgY29uc3QgYkxldmVsID0gdGhpcy5nZXRXQ0FHTGV2ZWwoYi53Y2FnQ3JpdGVyaWEpO1xuICAgICAgICAgICAgcmV0dXJuIGFMZXZlbCAtIGJMZXZlbDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEdldCBXQ0FHIGxldmVsIChBPTEsIEFBPTIsIEFBQT0zKVxuICAgICAqL1xuICAgIGdldFdDQUdMZXZlbChjcml0ZXJpYSkge1xuICAgICAgICAvLyBTaW1wbGlmaWVkIC0gaW4gcHJvZHVjdGlvbiwgbWFwIGFjdHVhbCBjcml0ZXJpYSB0byBsZXZlbHNcbiAgICAgICAgaWYgKGNyaXRlcmlhLnNvbWUoYyA9PiBjLmluY2x1ZGVzKCdBQUEnKSkpXG4gICAgICAgICAgICByZXR1cm4gMztcbiAgICAgICAgaWYgKGNyaXRlcmlhLnNvbWUoYyA9PiBjLmluY2x1ZGVzKCdBQScpKSlcbiAgICAgICAgICAgIHJldHVybiAyO1xuICAgICAgICByZXR1cm4gMTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgc3VtbWFyeSBzdGF0aXN0aWNzXG4gICAgICovXG4gICAgZ2VuZXJhdGVTdW1tYXJ5KHJlY29tbWVuZGF0aW9ucywgY29sb3JBbmFseXNpcykge1xuICAgICAgICBjb25zdCBjcml0aWNhbCA9IHJlY29tbWVuZGF0aW9ucy5maWx0ZXIociA9PiByLnByaW9yaXR5ID09PSAnY3JpdGljYWwnKS5sZW5ndGg7XG4gICAgICAgIGNvbnN0IHNlcmlvdXMgPSByZWNvbW1lbmRhdGlvbnMuZmlsdGVyKHIgPT4gci5wcmlvcml0eSA9PT0gJ2hpZ2gnKS5sZW5ndGg7XG4gICAgICAgIGNvbnN0IG1vZGVyYXRlID0gcmVjb21tZW5kYXRpb25zLmZpbHRlcihyID0+IHIucHJpb3JpdHkgPT09ICdtZWRpdW0nKS5sZW5ndGg7XG4gICAgICAgIGNvbnN0IG1pbm9yID0gcmVjb21tZW5kYXRpb25zLmZpbHRlcihyID0+IHIucHJpb3JpdHkgPT09ICdsb3cnKS5sZW5ndGg7XG4gICAgICAgIC8vIENvdW50IFdDQUcgbGV2ZWxzIGZyb20gYXhlIHZpb2xhdGlvbnNcbiAgICAgICAgY29uc3Qgd2NhZ0xldmVsQSA9IGNvbG9yQW5hbHlzaXMuaXNzdWVzLmZpbHRlcihpID0+IGkud2NhZ0NyaXRlcmlhPy5zb21lKGMgPT4gYy5pbmNsdWRlcygnd2NhZzJhJykgfHwgYy5pbmNsdWRlcygnd2NhZzIxYScpKSkubGVuZ3RoO1xuICAgICAgICBjb25zdCB3Y2FnTGV2ZWxBQSA9IGNvbG9yQW5hbHlzaXMuaXNzdWVzLmZpbHRlcihpID0+IGkud2NhZ0NyaXRlcmlhPy5zb21lKGMgPT4gYy5pbmNsdWRlcygnd2NhZzJhYScpIHx8IGMuaW5jbHVkZXMoJ3djYWcyMWFhJykpKS5sZW5ndGg7XG4gICAgICAgIGNvbnN0IHdjYWdMZXZlbEFBQSA9IGNvbG9yQW5hbHlzaXMuaXNzdWVzLmZpbHRlcihpID0+IGkud2NhZ0NyaXRlcmlhPy5zb21lKGMgPT4gYy5pbmNsdWRlcygnd2NhZzJhYWEnKSB8fCBjLmluY2x1ZGVzKCd3Y2FnMjFhYWEnKSkpLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvdGFsSXNzdWVzOiByZWNvbW1lbmRhdGlvbnMubGVuZ3RoLFxuICAgICAgICAgICAgY3JpdGljYWxJc3N1ZXM6IGNyaXRpY2FsLFxuICAgICAgICAgICAgc2VyaW91c0lzc3Vlczogc2VyaW91cyxcbiAgICAgICAgICAgIG1vZGVyYXRlSXNzdWVzOiBtb2RlcmF0ZSxcbiAgICAgICAgICAgIG1pbm9ySXNzdWVzOiBtaW5vcixcbiAgICAgICAgICAgIHdjYWdMZXZlbEEsXG4gICAgICAgICAgICB3Y2FnTGV2ZWxBQSxcbiAgICAgICAgICAgIHdjYWdMZXZlbEFBQVxuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBCdWlsZCBodW1hbi1yZWFkYWJsZSBlbGVtZW50IGlkZW50aWZpZXJcbiAgICAgKi9cbiAgICBidWlsZEVsZW1lbnRJZGVudGlmaWVyKGVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgcGFydHMgPSBbXTtcbiAgICAgICAgLy8gQWRkIHNlbGVjdG9yIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAoZWxlbWVudC5zZWxlY3Rvcikge1xuICAgICAgICAgICAgcGFydHMucHVzaChgU2VsZWN0b3I6ICR7ZWxlbWVudC5zZWxlY3Rvcn1gKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgSUQgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChlbGVtZW50LmVsZW1lbnRJZCkge1xuICAgICAgICAgICAgcGFydHMucHVzaChgSUQ6ICMke2VsZW1lbnQuZWxlbWVudElkfWApO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCBjbGFzcyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKGVsZW1lbnQuY2xhc3NOYW1lKSB7XG4gICAgICAgICAgICBjb25zdCBjbGFzc2VzID0gZWxlbWVudC5jbGFzc05hbWUuc3BsaXQoL1xccysvKS5zbGljZSgwLCAyKS5qb2luKCcsICcpO1xuICAgICAgICAgICAgcGFydHMucHVzaChgQ2xhc3M6IC4ke2NsYXNzZXN9YCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQWRkIHRleHQgY29udGVudCBpZiBhdmFpbGFibGUgKHRydW5jYXRlZClcbiAgICAgICAgaWYgKGVsZW1lbnQudGV4dCkge1xuICAgICAgICAgICAgY29uc3QgdGV4dFByZXZpZXcgPSBlbGVtZW50LnRleHQubGVuZ3RoID4gNTBcbiAgICAgICAgICAgICAgICA/IGVsZW1lbnQudGV4dC5zdWJzdHJpbmcoMCwgNTApICsgJy4uLidcbiAgICAgICAgICAgICAgICA6IGVsZW1lbnQudGV4dDtcbiAgICAgICAgICAgIHBhcnRzLnB1c2goYFRleHQ6IFwiJHt0ZXh0UHJldmlld31cImApO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCBBUklBIGxhYmVsIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAoZWxlbWVudC5hcmlhTGFiZWwpIHtcbiAgICAgICAgICAgIHBhcnRzLnB1c2goYEFSSUEgTGFiZWw6IFwiJHtlbGVtZW50LmFyaWFMYWJlbH1cImApO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCByb2xlIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAoZWxlbWVudC5hcmlhUm9sZSkge1xuICAgICAgICAgICAgcGFydHMucHVzaChgUm9sZTogJHtlbGVtZW50LmFyaWFSb2xlfWApO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIG5vIHNwZWNpZmljIGlkZW50aWZpZXJzLCB1c2UgdGFnIG5hbWUgYW5kIHBvc2l0aW9uXG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHBhcnRzLnB1c2goYFRhZzogPCR7ZWxlbWVudC50YWdOYW1lfT5gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFydHMuam9pbignIHwgJyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIE1hcCBheGUgaXNzdWUgdG8gcmVjb21tZW5kYXRpb24gY2F0ZWdvcnlcbiAgICAgKi9cbiAgICBtYXBBeGVDYXRlZ29yeShpc3N1ZSkge1xuICAgICAgICBjb25zdCBydWxlSWQgPSBpc3N1ZS5ydWxlSWQ/LnRvTG93ZXJDYXNlKCkgfHwgJyc7XG4gICAgICAgIGNvbnN0IGlzc3VlVGV4dCA9IGlzc3VlLmlzc3VlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChydWxlSWQuaW5jbHVkZXMoJ2NvbG9yJykgfHwgaXNzdWVUZXh0LmluY2x1ZGVzKCdjb250cmFzdCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2NvbnRyYXN0JztcbiAgICAgICAgfVxuICAgICAgICBpZiAocnVsZUlkLmluY2x1ZGVzKCdrZXlib2FyZCcpIHx8IGlzc3VlVGV4dC5pbmNsdWRlcygna2V5Ym9hcmQnKSkge1xuICAgICAgICAgICAgcmV0dXJuICdrZXlib2FyZCc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJ1bGVJZC5pbmNsdWRlcygnYXJpYScpIHx8IGlzc3VlVGV4dC5pbmNsdWRlcygnYXJpYScpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2FyaWEnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc3N1ZVRleHQuaW5jbHVkZXMoJ2xhYmVsJykgfHwgaXNzdWVUZXh0LmluY2x1ZGVzKCduYW1lJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnbGFiZWwnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnb3RoZXInO1xuICAgIH1cbn1cbiIsIi8vIGNvcmUvYW5hbHl6ZXJzL3NjcmVlbnNob3RBbmFseXplci50cyAtIFNjcmVlbnNob3QgYW5hbHlzaXMgdXNpbmcgZXh0ZXJuYWwgQVBJXG4vKipcbiAqIEFuYWx5emVyIGZvciB3ZWJwYWdlIHNjcmVlbnNob3RzXG4gKiBTdXBwb3J0cyBib3RoIE9sbGFtYSBhbmQgR29vZ2xlIFdlYiBBSSBBUElzXG4gKi9cbmV4cG9ydCBjbGFzcyBTY3JlZW5zaG90QW5hbHl6ZXIge1xuICAgIGNvbnN0cnVjdG9yKHByb3ZpZGVyLCBvbGxhbWFDbGllbnQsIGdvb2dsZVdlYkFJQ2xpZW50LCBkZWZhdWx0TW9kZWxOYW1lID0gJ2dlbW1hMzoxMmInKSB7XG4gICAgICAgIHRoaXMucHJvdmlkZXIgPSBwcm92aWRlcjtcbiAgICAgICAgdGhpcy5vbGxhbWFDbGllbnQgPSBvbGxhbWFDbGllbnQ7XG4gICAgICAgIHRoaXMuZ29vZ2xlV2ViQUlDbGllbnQgPSBnb29nbGVXZWJBSUNsaWVudDtcbiAgICAgICAgdGhpcy5kZWZhdWx0TW9kZWxOYW1lID0gZGVmYXVsdE1vZGVsTmFtZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQW5hbHl6ZSBzY3JlZW5zaG90IGFuZCBleHRyYWN0IFVJIGVsZW1lbnRzXG4gICAgICovXG4gICAgYXN5bmMgYW5hbHl6ZShpbWFnZURhdGFVcmwsIG1vZGVsTmFtZSkge1xuICAgICAgICBjb25zdCBwcm9tcHQgPSB0aGlzLmdldEFuYWx5c2lzUHJvbXB0KCk7XG4gICAgICAgIGxldCBkZXNjcmlwdGlvbjtcbiAgICAgICAgaWYgKHRoaXMucHJvdmlkZXIgPT09ICdvbGxhbWEnKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMub2xsYW1hQ2xpZW50KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbGxhbWEgY2xpZW50IGlzIG5vdCBjb25maWd1cmVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMub2xsYW1hQ2xpZW50LmFuYWx5emVJbWFnZSh7XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhVXJsLFxuICAgICAgICAgICAgICAgIHByb21wdCxcbiAgICAgICAgICAgICAgICBtb2RlbE5hbWU6IG1vZGVsTmFtZSB8fCB0aGlzLmRlZmF1bHRNb2RlbE5hbWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZGVzY3JpcHRpb24gPSByZXNwb25zZS5kZXNjcmlwdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLnByb3ZpZGVyID09PSAnZ29vZ2xlLXdlYi1haScpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5nb29nbGVXZWJBSUNsaWVudCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignR29vZ2xlIFdlYiBBSSBjbGllbnQgaXMgbm90IGNvbmZpZ3VyZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5nb29nbGVXZWJBSUNsaWVudC5hbmFseXplSW1hZ2Uoe1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YVVybCxcbiAgICAgICAgICAgICAgICBwcm9tcHRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZGVzY3JpcHRpb24gPSByZXNwb25zZS5kZXNjcmlwdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgcHJvdmlkZXI6ICR7dGhpcy5wcm92aWRlcn1gKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBQYXJzZSBkZXNjcmlwdGlvbiB0byBleHRyYWN0IFVJIGVsZW1lbnRzXG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0gdGhpcy5wYXJzZURlc2NyaXB0aW9uVG9FbGVtZW50cyhkZXNjcmlwdGlvbik7XG4gICAgICAgIC8vIEZpbHRlciBvdXQgZWxlbWVudHMgd2l0aCBtZXRhZGF0YSBvciBpbnZhbGlkIGNvbnRlbnRcbiAgICAgICAgY29uc3QgZmlsdGVyZWRFbGVtZW50cyA9IGVsZW1lbnRzLmZpbHRlcihlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIC8vIFNraXAgZWxlbWVudHMgd2l0aCBtZXRhZGF0YSB0ZXh0XG4gICAgICAgICAgICBpZiAoZWxlbWVudC50ZXh0ICYmIHRoaXMuaXNNZXRhZGF0YVRleHQoZWxlbWVudC50ZXh0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFNraXAgZWxlbWVudHMgd2l0aG91dCBtZWFuaW5nZnVsIHRleHRcbiAgICAgICAgICAgIGlmICghZWxlbWVudC50ZXh0IHx8IGVsZW1lbnQudGV4dC5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWxlbWVudHM6IGZpbHRlcmVkRWxlbWVudHMsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICAgICAgICBpbWFnZURhdGFVcmwsXG4gICAgICAgICAgICBkZXNjcmlwdGlvblxuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZXQgcHJvbXB0IGZvciBzY3JlZW5zaG90IGFuYWx5c2lzIChhY2Nlc3NpYmlsaXR5LWZvY3VzZWQpXG4gICAgICogSU1QT1JUQU5UOiBSZXR1cm4gb25seSBhY3R1YWwgVUkgZWxlbWVudHMsIG5vdCBtZXRhZGF0YSBvciBzdHJ1Y3R1cmVkIGRlc2NyaXB0aW9uc1xuICAgICAqL1xuICAgIGdldEFuYWx5c2lzUHJvbXB0KCkge1xuICAgICAgICByZXR1cm4gYEFuYWx5emUgdGhpcyB3ZWJwYWdlIHNjcmVlbnNob3QgZm9yIGFjY2Vzc2liaWxpdHkgdGVzdGluZy4gTGlzdCBPTkxZIHRoZSBhY3R1YWwgaW50ZXJhY3RpdmUgVUkgZWxlbWVudHMgYW5kIHRleHQgY29udGVudCB2aXNpYmxlIG9uIHRoZSBwYWdlLlxuXG5Gb3IgZWFjaCBlbGVtZW50LCBwcm92aWRlIE9OTFk6XG4tIFRoZSBhY3R1YWwgdmlzaWJsZSB0ZXh0IGNvbnRlbnQgb3IgbGFiZWwgKGUuZy4sIFwiU3VibWl0XCIsIFwiU2VhcmNoXCIsIFwiSG9tZVwiLCBcIldlbGNvbWUgdG8gb3VyIHNpdGVcIilcbi0gVGhlIGVsZW1lbnQgdHlwZSBpbiBuYXR1cmFsIGxhbmd1YWdlIChlLmcuLCBcImJ1dHRvblwiLCBcImxpbmtcIiwgXCJpbnB1dCBmaWVsZFwiLCBcImhlYWRpbmdcIiwgXCJ0ZXh0XCIpXG5cbkRPIE5PVCBpbmNsdWRlOlxuLSBNZXRhZGF0YSBsYWJlbHMgbGlrZSBcIkVsZW1lbnQgVHlwZTpcIiwgXCJWaXNpYmxlIFRleHQgQ29udGVudDpcIiwgXCJBcHByb3hpbWF0ZSBQb3NpdGlvbjpcIiwgXCJBY2Nlc3NpYmlsaXR5IE5vdGVzOlwiXG4tIFN0cnVjdHVyZWQgbWFya2Rvd24gZm9ybWF0dGluZyB3aXRoIGFzdGVyaXNrcyBvciBidWxsZXRzXG4tIFBvc2l0aW9uIGRlc2NyaXB0aW9ucyB1bmxlc3MgdGhleSBhcmUgcGFydCBvZiB0aGUgYWN0dWFsIHRleHQgY29udGVudFxuLSBBbmFseXNpcyBub3RlcyBvciByZWNvbW1lbmRhdGlvbnNcblxuRm9ybWF0IGFzIGEgc2ltcGxlIGxpc3QsIG9uZSBlbGVtZW50IHBlciBsaW5lLiBFeGFtcGxlOlxuLSBcIlN1Ym1pdFwiIGJ1dHRvblxuLSBcIlNlYXJjaFwiIGlucHV0IGZpZWxkXG4tIFwiV2VsY29tZVwiIGhlYWRpbmdcbi0gXCJDbGljayBoZXJlIHRvIGxlYXJuIG1vcmVcIiBsaW5rXG5cbkZvY3VzIG9uIGVsZW1lbnRzIHRoYXQgYXJlIGltcG9ydGFudCBmb3IgYWNjZXNzaWJpbGl0eSB0ZXN0aW5nLmA7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEdldCBwcm9tcHQgZm9yIGNvbG9yIGFuZCBjb250cmFzdCBhbmFseXNpc1xuICAgICAqL1xuICAgIGdldENvbG9yQW5hbHlzaXNQcm9tcHQoKSB7XG4gICAgICAgIHJldHVybiBgQW5hbHl6ZSB0aGlzIHdlYnBhZ2Ugc2NyZWVuc2hvdCBmb3IgY29sb3IgYW5kIGNvbnRyYXN0IGFjY2Vzc2liaWxpdHkgaXNzdWVzIGFjY29yZGluZyB0byBXQ0FHIDIuMSBndWlkZWxpbmVzLlxuXG5Gb3IgZWFjaCB0ZXh0IGVsZW1lbnQsIGV2YWx1YXRlOlxuMS4gVmlzdWFsIGNvbnRyYXN0IGJldHdlZW4gdGV4dCBhbmQgYmFja2dyb3VuZCAoZXN0aW1hdGUgY29udHJhc3QgcmF0aW86IDQuNToxIG1pbmltdW0gZm9yIG5vcm1hbCB0ZXh0LCAzOjEgZm9yIGxhcmdlIHRleHQpXG4yLiBUZXh0IHNpemUgYW5kIHJlYWRhYmlsaXR5XG4zLiBDb2xvciB1c2FnZSBhcyB0aGUgb25seSBpbmRpY2F0b3IgKGUuZy4sIHJlZCBmb3IgZXJyb3JzIHdpdGhvdXQgaWNvbi90ZXh0KVxuXG5Gb3IgZWFjaCBpbnRlcmFjdGl2ZSBlbGVtZW50IChidXR0b25zLCBsaW5rcywgaW5wdXRzKTpcbjEuIFZpc3VhbCBjb250cmFzdCBvZiB0ZXh0L2xhYmVscyBhZ2FpbnN0IGJhY2tncm91bmRcbjIuIEJvcmRlciBjb250cmFzdCAoaWYgdmlzaWJsZSlcbjMuIEZvY3VzIGluZGljYXRvciB2aXNpYmlsaXR5IChpZiBhbnkgZm9jdXMgc3RhdGUgaXMgc2hvd24pXG40LiBIb3ZlciBzdGF0ZSB2aXNpYmlsaXR5IChpZiBhbnkgaG92ZXIgc3RhdGUgaXMgc2hvd24pXG41LiBEaXNhYmxlZCBzdGF0ZSBkaXN0aW5jdGlvbiBmcm9tIGVuYWJsZWQgc3RhdGVcblxuRm9yIGdlbmVyaWMgZWxlbWVudHMgKGRpdnMvc3BhbnMgc3R5bGVkIGFzIGJ1dHRvbnMvbGlua3MpOlxuMS4gVmlzdWFsIGFwcGVhcmFuY2UgKGRvZXMgaXQgbG9vayBsaWtlIGEgYnV0dG9uL2xpbms/KVxuMi4gQ29udHJhc3QgaXNzdWVzXG4zLiBNaXNzaW5nIHZpc3VhbCBpbmRpY2F0b3JzXG5cbkZsYWcgaXNzdWVzIHdpdGggc2V2ZXJpdHk6XG4tIENSSVRJQ0FMOiBWZXJ5IGxvdyBjb250cmFzdCAoZXN0aW1hdGVkIDwgMzoxKSwgY29sb3Itb25seSBpbmRpY2F0b3JzIHdpdGhvdXQgdGV4dC9pY29uXG4tIFNFUklPVVM6IExvdyBjb250cmFzdCAoZXN0aW1hdGVkIDM6MS00LjU6MSksIG1pc3NpbmcgZm9jdXMgaW5kaWNhdG9yc1xuLSBNT0RFUkFURTogQm9yZGVybGluZSBjb250cmFzdCAoZXN0aW1hdGVkIDQuNToxLTU6MSksIHVuY2xlYXIgaG92ZXIgc3RhdGVzXG4tIE1JTk9SOiBTbGlnaHQgY29udHJhc3QgaXNzdWVzLCBtaW5vciB2aXN1YWwgcHJvYmxlbXNcblxuRm9yIGVhY2ggaXNzdWUsIHByb3ZpZGU6XG4tIEVsZW1lbnQgZGVzY3JpcHRpb24gYW5kIGxvY2F0aW9uXG4tIElzc3VlIHR5cGUgKGNvbnRyYXN0LCBjb2xvci1vbmx5IGluZGljYXRvciwgbWlzc2luZyBmb2N1cywgZXRjLilcbi0gRXN0aW1hdGVkIGNvbnRyYXN0IHJhdGlvIChpZiBhcHBsaWNhYmxlKVxuLSBXQ0FHIGNyaXRlcmlhIGFmZmVjdGVkIChlLmcuLCAxLjQuMyBDb250cmFzdCwgMS40LjEgVXNlIG9mIENvbG9yLCAyLjQuNyBGb2N1cyBWaXNpYmxlKVxuLSBSZWNvbW1lbmRhdGlvbiBmb3IgZml4aW5nXG5cbkZvcm1hdCBhcyBhIHN0cnVjdHVyZWQgbGlzdCBvZiBpc3N1ZXMuYDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQW5hbHl6ZSBzY3JlZW5zaG90IGZvciBjb2xvciBhbmQgY29udHJhc3QgaXNzdWVzIHVzaW5nIEFJXG4gICAgICovXG4gICAgYXN5bmMgYW5hbHl6ZUNvbG9ycyhpbWFnZURhdGFVcmwsIG1vZGVsTmFtZSkge1xuICAgICAgICBjb25zdCBwcm9tcHQgPSB0aGlzLmdldENvbG9yQW5hbHlzaXNQcm9tcHQoKTtcbiAgICAgICAgbGV0IGRlc2NyaXB0aW9uO1xuICAgICAgICBpZiAodGhpcy5wcm92aWRlciA9PT0gJ29sbGFtYScpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5vbGxhbWFDbGllbnQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ09sbGFtYSBjbGllbnQgaXMgbm90IGNvbmZpZ3VyZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5vbGxhbWFDbGllbnQuYW5hbHl6ZUltYWdlKHtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGFVcmwsXG4gICAgICAgICAgICAgICAgcHJvbXB0LFxuICAgICAgICAgICAgICAgIG1vZGVsTmFtZTogbW9kZWxOYW1lIHx8IHRoaXMuZGVmYXVsdE1vZGVsTmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IHJlc3BvbnNlLmRlc2NyaXB0aW9uO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMucHJvdmlkZXIgPT09ICdnb29nbGUtd2ViLWFpJykge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmdvb2dsZVdlYkFJQ2xpZW50KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdHb29nbGUgV2ViIEFJIGNsaWVudCBpcyBub3QgY29uZmlndXJlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmdvb2dsZVdlYkFJQ2xpZW50LmFuYWx5emVJbWFnZSh7XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhVXJsLFxuICAgICAgICAgICAgICAgIHByb21wdFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IHJlc3BvbnNlLmRlc2NyaXB0aW9uO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBwcm92aWRlcjogJHt0aGlzLnByb3ZpZGVyfWApO1xuICAgICAgICB9XG4gICAgICAgIC8vIFBhcnNlIGRlc2NyaXB0aW9uIHRvIGV4dHJhY3QgY29sb3IgaXNzdWVzXG4gICAgICAgIGNvbnN0IGlzc3VlcyA9IHRoaXMucGFyc2VDb2xvcklzc3VlcyhkZXNjcmlwdGlvbik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgICAgIGlzc3Vlc1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQYXJzZSBBSSBkZXNjcmlwdGlvbiB0byBleHRyYWN0IGNvbG9yIGFuZCBjb250cmFzdCBpc3N1ZXNcbiAgICAgKi9cbiAgICBwYXJzZUNvbG9ySXNzdWVzKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgIGNvbnN0IGlzc3VlcyA9IFtdO1xuICAgICAgICAvLyBUcnkgdG8gZXh0cmFjdCBpc3N1ZXMgZnJvbSBzdHJ1Y3R1cmVkIGZvcm1hdFxuICAgICAgICBjb25zdCBpc3N1ZVBhdHRlcm5zID0gW1xuICAgICAgICAgICAgLyg/OkNSSVRJQ0FMfFNFUklPVVN8TU9ERVJBVEV8TUlOT1IpWzpcXHNdKyguKj8pKD89KD86Q1JJVElDQUx8U0VSSU9VU3xNT0RFUkFURXxNSU5PUnwkKSkvZ2lzLFxuICAgICAgICAgICAgLyg/Oklzc3VlfFByb2JsZW0pWzpcXHNdKyguKj8pKD89KD86SXNzdWV8UHJvYmxlbXwkKSkvZ2lzLFxuICAgICAgICAgICAgLyg/OkNvbnRyYXN0fENvbG9yKVs6XFxzXSsoLio/KSg/PSg/OkNvbnRyYXN0fENvbG9yfCQpKS9naXNcbiAgICAgICAgXTtcbiAgICAgICAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIGlzc3VlUGF0dGVybnMpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoZXMgPSBkZXNjcmlwdGlvbi5tYXRjaEFsbChwYXR0ZXJuKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbWF0Y2hlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzc3VlVGV4dCA9IG1hdGNoWzFdPy50cmltKCk7XG4gICAgICAgICAgICAgICAgaWYgKGlzc3VlVGV4dCAmJiBpc3N1ZVRleHQubGVuZ3RoID4gMjApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIHNldmVyaXR5XG4gICAgICAgICAgICAgICAgICAgIGxldCBzZXZlcml0eSA9ICdtb2RlcmF0ZSc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvd2VyVGV4dCA9IGlzc3VlVGV4dC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobG93ZXJUZXh0LmluY2x1ZGVzKCdjcml0aWNhbCcpIHx8IGxvd2VyVGV4dC5pbmNsdWRlcygndmVyeSBsb3cnKSB8fCBsb3dlclRleHQuaW5jbHVkZXMoJzwgMzoxJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldmVyaXR5ID0gJ2NyaXRpY2FsJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChsb3dlclRleHQuaW5jbHVkZXMoJ3NlcmlvdXMnKSB8fCBsb3dlclRleHQuaW5jbHVkZXMoJ2xvdyBjb250cmFzdCcpIHx8IGxvd2VyVGV4dC5pbmNsdWRlcygnMzoxLTQuNToxJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldmVyaXR5ID0gJ3NlcmlvdXMnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxvd2VyVGV4dC5pbmNsdWRlcygnbW9kZXJhdGUnKSB8fCBsb3dlclRleHQuaW5jbHVkZXMoJ2JvcmRlcmxpbmUnKSB8fCBsb3dlclRleHQuaW5jbHVkZXMoJzQuNToxLTU6MScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXZlcml0eSA9ICdtb2RlcmF0ZSc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobG93ZXJUZXh0LmluY2x1ZGVzKCdtaW5vcicpIHx8IGxvd2VyVGV4dC5pbmNsdWRlcygnc2xpZ2h0JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldmVyaXR5ID0gJ21pbm9yJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IFdDQUcgY3JpdGVyaWFcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2NhZ0NyaXRlcmlhID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmIChsb3dlclRleHQuaW5jbHVkZXMoJzEuNC4zJykgfHwgbG93ZXJUZXh0LmluY2x1ZGVzKCdjb250cmFzdCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3Y2FnQ3JpdGVyaWEucHVzaCgnMS40LjMgQ29udHJhc3QgKE1pbmltdW0pJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvd2VyVGV4dC5pbmNsdWRlcygnMS40LjEnKSB8fCBsb3dlclRleHQuaW5jbHVkZXMoJ2NvbG9yJykgJiYgbG93ZXJUZXh0LmluY2x1ZGVzKCdvbmx5JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdjYWdDcml0ZXJpYS5wdXNoKCcxLjQuMSBVc2Ugb2YgQ29sb3InKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobG93ZXJUZXh0LmluY2x1ZGVzKCcyLjQuNycpIHx8IGxvd2VyVGV4dC5pbmNsdWRlcygnZm9jdXMnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2NhZ0NyaXRlcmlhLnB1c2goJzIuNC43IEZvY3VzIFZpc2libGUnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobG93ZXJUZXh0LmluY2x1ZGVzKCcxLjQuNicpIHx8IGxvd2VyVGV4dC5pbmNsdWRlcygnZW5oYW5jZWQgY29udHJhc3QnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2NhZ0NyaXRlcmlhLnB1c2goJzEuNC42IENvbnRyYXN0IChFbmhhbmNlZCknKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGVzdGltYXRlZCBjb250cmFzdFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250cmFzdE1hdGNoID0gaXNzdWVUZXh0Lm1hdGNoKC8oXFxkK1xcLj9cXGQqKToxfGNvbnRyYXN0Lio/KFxcZCtcXC4/XFxkKikvaSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVzdGltYXRlZENvbnRyYXN0ID0gY29udHJhc3RNYXRjaCA/IHBhcnNlRmxvYXQoY29udHJhc3RNYXRjaFsxXSB8fCBjb250cmFzdE1hdGNoWzJdKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgaXNzdWVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogdGhpcy5leHRyYWN0RWxlbWVudERlc2NyaXB0aW9uKGlzc3VlVGV4dCksXG4gICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZTogaXNzdWVUZXh0LnN1YnN0cmluZygwLCAyMDApLCAvLyBMaW1pdCBsZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldmVyaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb21tZW5kYXRpb246IHRoaXMuZXh0cmFjdFJlY29tbWVuZGF0aW9uKGlzc3VlVGV4dCksXG4gICAgICAgICAgICAgICAgICAgICAgICB3Y2FnQ3JpdGVyaWE6IHdjYWdDcml0ZXJpYS5sZW5ndGggPiAwID8gd2NhZ0NyaXRlcmlhIDogWycxLjQuMyBDb250cmFzdCAoTWluaW11bSknXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVzdGltYXRlZENvbnRyYXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiAnYWknIC8vIE1hcmsgYXMgQUktZGV0ZWN0ZWRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIElmIG5vIHN0cnVjdHVyZWQgaXNzdWVzIGZvdW5kLCB0cnkgc2ltcGxlIGxpbmUtYnktbGluZSBwYXJzaW5nXG4gICAgICAgIGlmIChpc3N1ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBsaW5lcyA9IGRlc2NyaXB0aW9uLnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAyMCAmJlxuICAgICAgICAgICAgICAgIChsaW5lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2NvbnRyYXN0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgbGluZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdjb2xvcicpIHx8XG4gICAgICAgICAgICAgICAgICAgIGxpbmUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnZm9jdXMnKSB8fFxuICAgICAgICAgICAgICAgICAgICBsaW5lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2lzc3VlJykpKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxvd2VyTGluZSA9IGxpbmUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBsZXQgc2V2ZXJpdHkgPSAnbW9kZXJhdGUnO1xuICAgICAgICAgICAgICAgIGlmIChsb3dlckxpbmUuaW5jbHVkZXMoJ2NyaXRpY2FsJykgfHwgbG93ZXJMaW5lLmluY2x1ZGVzKCd2ZXJ5IGxvdycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldmVyaXR5ID0gJ2NyaXRpY2FsJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobG93ZXJMaW5lLmluY2x1ZGVzKCdzZXJpb3VzJykgfHwgbG93ZXJMaW5lLmluY2x1ZGVzKCdsb3cnKSkge1xuICAgICAgICAgICAgICAgICAgICBzZXZlcml0eSA9ICdzZXJpb3VzJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobG93ZXJMaW5lLmluY2x1ZGVzKCdtaW5vcicpIHx8IGxvd2VyTGluZS5pbmNsdWRlcygnc2xpZ2h0JykpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V2ZXJpdHkgPSAnbWlub3InO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCB3Y2FnQ3JpdGVyaWEgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAobG93ZXJMaW5lLmluY2x1ZGVzKCdjb250cmFzdCcpKVxuICAgICAgICAgICAgICAgICAgICB3Y2FnQ3JpdGVyaWEucHVzaCgnMS40LjMgQ29udHJhc3QgKE1pbmltdW0pJyk7XG4gICAgICAgICAgICAgICAgaWYgKGxvd2VyTGluZS5pbmNsdWRlcygnY29sb3InKSAmJiBsb3dlckxpbmUuaW5jbHVkZXMoJ29ubHknKSlcbiAgICAgICAgICAgICAgICAgICAgd2NhZ0NyaXRlcmlhLnB1c2goJzEuNC4xIFVzZSBvZiBDb2xvcicpO1xuICAgICAgICAgICAgICAgIGlmIChsb3dlckxpbmUuaW5jbHVkZXMoJ2ZvY3VzJykpXG4gICAgICAgICAgICAgICAgICAgIHdjYWdDcml0ZXJpYS5wdXNoKCcyLjQuNyBGb2N1cyBWaXNpYmxlJyk7XG4gICAgICAgICAgICAgICAgaXNzdWVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnVmlzdWFsIGVsZW1lbnQnLFxuICAgICAgICAgICAgICAgICAgICBpc3N1ZTogbGluZS50cmltKCksXG4gICAgICAgICAgICAgICAgICAgIHNldmVyaXR5LFxuICAgICAgICAgICAgICAgICAgICByZWNvbW1lbmRhdGlvbjogJ1JldmlldyBhbmQgaW1wcm92ZSBjb250cmFzdC9jb2xvciB1c2FnZScsXG4gICAgICAgICAgICAgICAgICAgIHdjYWdDcml0ZXJpYTogd2NhZ0NyaXRlcmlhLmxlbmd0aCA+IDAgPyB3Y2FnQ3JpdGVyaWEgOiBbJzEuNC4zIENvbnRyYXN0IChNaW5pbXVtKSddLFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2U6ICdhaSdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXNzdWVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0IGVsZW1lbnQgZGVzY3JpcHRpb24gZnJvbSBpc3N1ZSB0ZXh0XG4gICAgICovXG4gICAgZXh0cmFjdEVsZW1lbnREZXNjcmlwdGlvbih0ZXh0KSB7XG4gICAgICAgIC8vIFRyeSB0byBmaW5kIGVsZW1lbnQgZGVzY3JpcHRpb25cbiAgICAgICAgY29uc3QgcGF0dGVybnMgPSBbXG4gICAgICAgICAgICAvKD86YnV0dG9ufGxpbmt8aW5wdXR8dGV4dHxoZWFkaW5nfGVsZW1lbnQpW14uXSovaSxcbiAgICAgICAgICAgIC8oPzppbnxvbnxhdClcXHMrKFteLF0rKS9pLFxuICAgICAgICAgICAgL14oW146XSspOi9pXG4gICAgICAgIF07XG4gICAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBwYXR0ZXJucykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSB0ZXh0Lm1hdGNoKHBhdHRlcm4pO1xuICAgICAgICAgICAgaWYgKG1hdGNoICYmIG1hdGNoWzBdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoWzBdLnRyaW0oKS5zdWJzdHJpbmcoMCwgMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ1Zpc3VhbCBlbGVtZW50JztcbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdCByZWNvbW1lbmRhdGlvbiBmcm9tIGlzc3VlIHRleHRcbiAgICAgKi9cbiAgICBleHRyYWN0UmVjb21tZW5kYXRpb24odGV4dCkge1xuICAgICAgICBjb25zdCBsb3dlclRleHQgPSB0ZXh0LnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChsb3dlclRleHQuaW5jbHVkZXMoJ2NvbnRyYXN0JykpIHtcbiAgICAgICAgICAgIGlmIChsb3dlclRleHQuaW5jbHVkZXMoJ2luY3JlYXNlJykgfHwgbG93ZXJUZXh0LmluY2x1ZGVzKCdpbXByb3ZlJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0luY3JlYXNlIGNvbnRyYXN0IGJldHdlZW4gdGV4dCBhbmQgYmFja2dyb3VuZCB0byBtZWV0IFdDQUcgMi4xIEFBIHN0YW5kYXJkcyAobWluaW11bSA0LjU6MSBmb3Igbm9ybWFsIHRleHQsIDM6MSBmb3IgbGFyZ2UgdGV4dCknO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICdJbXByb3ZlIGNvbG9yIGNvbnRyYXN0IHRvIG1lZXQgV0NBRyAyLjEgQUEgc3RhbmRhcmRzJztcbiAgICAgICAgfVxuICAgICAgICBpZiAobG93ZXJUZXh0LmluY2x1ZGVzKCdjb2xvcicpICYmIGxvd2VyVGV4dC5pbmNsdWRlcygnb25seScpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ0FkZCBhZGRpdGlvbmFsIHZpc3VhbCBpbmRpY2F0b3JzIChpY29ucywgdGV4dCwgcGF0dGVybnMpIGJleW9uZCBjb2xvciBhbG9uZSc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxvd2VyVGV4dC5pbmNsdWRlcygnZm9jdXMnKSkge1xuICAgICAgICAgICAgcmV0dXJuICdBZGQgdmlzaWJsZSBmb2N1cyBpbmRpY2F0b3IgKG91dGxpbmUsIGJvcmRlciwgYmFja2dyb3VuZCBjaGFuZ2UpJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ1JldmlldyBhbmQgaW1wcm92ZSBhY2Nlc3NpYmlsaXR5IGJhc2VkIG9uIFdDQUcgMi4xIGd1aWRlbGluZXMnO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0ZXh0IGNvbnRhaW5zIG1ldGFkYXRhIHBhdHRlcm5zIChzaG91bGQgYmUgZmlsdGVyZWQgb3V0KVxuICAgICAqL1xuICAgIGlzTWV0YWRhdGFUZXh0KHRleHQpIHtcbiAgICAgICAgaWYgKCF0ZXh0KVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBjb25zdCBsb3dlclRleHQgPSB0ZXh0LnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIC8vIENoZWNrIGZvciBtZXRhZGF0YSBsYWJlbHNcbiAgICAgICAgY29uc3QgbWV0YWRhdGFQYXR0ZXJucyA9IFtcbiAgICAgICAgICAgIC9cXCpcXHMqXFwqXFwqRWxlbWVudCBUeXBlOlxcKlxcKi8sXG4gICAgICAgICAgICAvXFwqXFxzKlxcKlxcKlZpc2libGUgVGV4dCBDb250ZW50OlxcKlxcKi8sXG4gICAgICAgICAgICAvXFwqXFxzKlxcKlxcKkFwcHJveGltYXRlIFBvc2l0aW9uOlxcKlxcKi8sXG4gICAgICAgICAgICAvXFwqXFxzKlxcKlxcKkFjY2Vzc2liaWxpdHkgTm90ZXM6XFwqXFwqLyxcbiAgICAgICAgICAgIC9cXCpcXHMqXFwqXFwqVmlzaWJsZSBTdGF0ZSBJbmRpY2F0b3JzOlxcKlxcKi8sXG4gICAgICAgICAgICAvXkVsZW1lbnQgVHlwZTovaSxcbiAgICAgICAgICAgIC9eVmlzaWJsZSBUZXh0IENvbnRlbnQ6L2ksXG4gICAgICAgICAgICAvXkFwcHJveGltYXRlIFBvc2l0aW9uOi9pLFxuICAgICAgICAgICAgL15BY2Nlc3NpYmlsaXR5IE5vdGVzOi9pLFxuICAgICAgICAgICAgL15WaXNpYmxlIFN0YXRlIEluZGljYXRvcnM6L2ksXG4gICAgICAgIF07XG4gICAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBtZXRhZGF0YVBhdHRlcm5zKSB7XG4gICAgICAgICAgICBpZiAocGF0dGVybi50ZXN0KHRleHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2hlY2sgZm9yIG1hcmtkb3duIGZvcm1hdHRpbmcgdGhhdCBpbmRpY2F0ZXMgbWV0YWRhdGFcbiAgICAgICAgaWYgKHRleHQuc3RhcnRzV2l0aCgnKicpICYmIHRleHQuaW5jbHVkZXMoJyoqJykpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIENoZWNrIGZvciBjb21tb24gbWV0YWRhdGEgcGhyYXNlc1xuICAgICAgICBpZiAobG93ZXJUZXh0LmluY2x1ZGVzKCduL2EnKSAmJiBsb3dlclRleHQubGVuZ3RoIDwgMjApIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYW4gdGV4dCBjb250ZW50IGJ5IHJlbW92aW5nIG1ldGFkYXRhIGFuZCBmb3JtYXR0aW5nXG4gICAgICovXG4gICAgY2xlYW5UZXh0Q29udGVudCh0ZXh0KSB7XG4gICAgICAgIGlmICghdGV4dClcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgLy8gUmVtb3ZlIG1hcmtkb3duIGZvcm1hdHRpbmdcbiAgICAgICAgbGV0IGNsZWFuZWQgPSB0ZXh0XG4gICAgICAgICAgICAucmVwbGFjZSgvXFwqXFwqL2csICcnKSAvLyBSZW1vdmUgYm9sZCBtYXJrZXJzXG4gICAgICAgICAgICAucmVwbGFjZSgvXFwqL2csICcnKSAvLyBSZW1vdmUgYXN0ZXJpc2tzXG4gICAgICAgICAgICAucmVwbGFjZSgvXltcXHNcXC3igKJdXFxzKi8sICcnKSAvLyBSZW1vdmUgbGlzdCBtYXJrZXJzXG4gICAgICAgICAgICAudHJpbSgpO1xuICAgICAgICAvLyBSZW1vdmUgbWV0YWRhdGEgcHJlZml4ZXNcbiAgICAgICAgY2xlYW5lZCA9IGNsZWFuZWRcbiAgICAgICAgICAgIC5yZXBsYWNlKC9eRWxlbWVudCBUeXBlOlxccyovaSwgJycpXG4gICAgICAgICAgICAucmVwbGFjZSgvXlZpc2libGUgVGV4dCBDb250ZW50OlxccyovaSwgJycpXG4gICAgICAgICAgICAucmVwbGFjZSgvXkFwcHJveGltYXRlIFBvc2l0aW9uOlxccyovaSwgJycpXG4gICAgICAgICAgICAucmVwbGFjZSgvXkFjY2Vzc2liaWxpdHkgTm90ZXM6XFxzKi9pLCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9eVmlzaWJsZSBTdGF0ZSBJbmRpY2F0b3JzOlxccyovaSwgJycpXG4gICAgICAgICAgICAudHJpbSgpO1xuICAgICAgICByZXR1cm4gY2xlYW5lZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUGFyc2UgdGV4dCBkZXNjcmlwdGlvbiB0byBleHRyYWN0IFVJIGVsZW1lbnRzXG4gICAgICogRmlsdGVycyBvdXQgbWV0YWRhdGEgYW5kIGVsZW1lbnRzIHdpdGggbm8gcmVhbCBjb250ZW50XG4gICAgICovXG4gICAgcGFyc2VEZXNjcmlwdGlvblRvRWxlbWVudHMoZGVzY3JpcHRpb24pIHtcbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSBbXTtcbiAgICAgICAgLy8gU3BsaXQgYnkgbGluZXMgYW5kIHByb2Nlc3MgZWFjaFxuICAgICAgICBjb25zdCBsaW5lcyA9IGRlc2NyaXB0aW9uLnNwbGl0KC9cXG4vKS5tYXAobGluZSA9PiBsaW5lLnRyaW0oKSkuZmlsdGVyKGxpbmUgPT4gbGluZS5sZW5ndGggPiAwKTtcbiAgICAgICAgbGV0IGVsZW1lbnRJbmRleCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgICAgICAgLy8gU2tpcCBtZXRhZGF0YSBsaW5lc1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNNZXRhZGF0YVRleHQobGluZSkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFNraXAgdmVyeSBzaG9ydCBsaW5lcyBvciBnZW5lcmljIHJlc3BvbnNlc1xuICAgICAgICAgICAgaWYgKGxpbmUubGVuZ3RoIDwgMyB8fFxuICAgICAgICAgICAgICAgIGxpbmUudG9Mb3dlckNhc2UoKSA9PT0gJ25vbmUnIHx8XG4gICAgICAgICAgICAgICAgbGluZS50b0xvd2VyQ2FzZSgpID09PSAnbi9hJyB8fFxuICAgICAgICAgICAgICAgIGxpbmUudG9Mb3dlckNhc2UoKS5zdGFydHNXaXRoKCdvdmVyYWxsJykgfHxcbiAgICAgICAgICAgICAgICBsaW5lLnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aCgndGhlIHNjcmVlbnNob3QnKSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbG93ZXJMaW5lID0gbGluZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGVsZW1lbnQgdHlwZVxuICAgICAgICAgICAgbGV0IHR5cGUgPSAnb3RoZXInO1xuICAgICAgICAgICAgbGV0IGNvbmZpZGVuY2UgPSAwLjc7XG4gICAgICAgICAgICAvLyBFeHRyYWN0IHR5cGUgZnJvbSBsaW5lIChlLmcuLCBcIlN1Ym1pdFwiIGJ1dHRvbiwgXCJTZWFyY2hcIiBpbnB1dClcbiAgICAgICAgICAgIGlmIChsb3dlckxpbmUuaW5jbHVkZXMoJyBidXR0b24nKSB8fCBsb3dlckxpbmUuZW5kc1dpdGgoJyBidXR0b24nKSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnYnV0dG9uJztcbiAgICAgICAgICAgICAgICBjb25maWRlbmNlID0gMC44NTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGxvd2VyTGluZS5pbmNsdWRlcygnIGlucHV0JykgfHwgbG93ZXJMaW5lLmluY2x1ZGVzKCcgaW5wdXQgZmllbGQnKSB8fCBsb3dlckxpbmUuZW5kc1dpdGgoJyBpbnB1dCcpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdpbnB1dCc7XG4gICAgICAgICAgICAgICAgY29uZmlkZW5jZSA9IDAuODU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChsb3dlckxpbmUuaW5jbHVkZXMoJyBsaW5rJykgfHwgbG93ZXJMaW5lLmVuZHNXaXRoKCcgbGluaycpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdsaW5rJztcbiAgICAgICAgICAgICAgICBjb25maWRlbmNlID0gMC44O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobG93ZXJMaW5lLmluY2x1ZGVzKCcgaGVhZGluZycpIHx8IGxvd2VyTGluZS5lbmRzV2l0aCgnIGhlYWRpbmcnKSB8fCBsb3dlckxpbmUubWF0Y2goL2hbMS02XS8pKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdoZWFkaW5nJztcbiAgICAgICAgICAgICAgICBjb25maWRlbmNlID0gMC44NTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGxvd2VyTGluZS5pbmNsdWRlcygnIGltYWdlJykgfHwgbG93ZXJMaW5lLmluY2x1ZGVzKCcgaWNvbicpIHx8IGxvd2VyTGluZS5lbmRzV2l0aCgnIGltYWdlJykpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ2ltYWdlJztcbiAgICAgICAgICAgICAgICBjb25maWRlbmNlID0gMC44O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobG93ZXJMaW5lLmluY2x1ZGVzKCcgbWVudScpIHx8IGxvd2VyTGluZS5pbmNsdWRlcygnIG5hdmlnYXRpb24nKSB8fCBsb3dlckxpbmUuaW5jbHVkZXMoJyBuYXYnKSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnbmF2aWdhdGlvbic7XG4gICAgICAgICAgICAgICAgY29uZmlkZW5jZSA9IDAuODU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChsb3dlckxpbmUuaW5jbHVkZXMoJyB0ZXh0JykgfHwgbG93ZXJMaW5lLmluY2x1ZGVzKCcgcGFyYWdyYXBoJykgfHwgbG93ZXJMaW5lLmVuZHNXaXRoKCcgdGV4dCcpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICd0ZXh0JztcbiAgICAgICAgICAgICAgICBjb25maWRlbmNlID0gMC43O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobG93ZXJMaW5lLmluY2x1ZGVzKCcgZm9ybScpIHx8IGxvd2VyTGluZS5pbmNsdWRlcygnIGRyb3Bkb3duJykgfHwgbG93ZXJMaW5lLmluY2x1ZGVzKCcgY2hlY2tib3gnKSB8fCBsb3dlckxpbmUuaW5jbHVkZXMoJyByYWRpbycpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdmb3JtJztcbiAgICAgICAgICAgICAgICBjb25maWRlbmNlID0gMC44O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGluZmVyIHR5cGUgZnJvbSBjb250ZW50XG4gICAgICAgICAgICAgICAgaWYgKGxvd2VyTGluZS5pbmNsdWRlcygnYnV0dG9uJykgfHwgbG93ZXJMaW5lLmluY2x1ZGVzKCdidG4nKSB8fCBsb3dlckxpbmUuaW5jbHVkZXMoJ3N1Ym1pdCcpIHx8IGxvd2VyTGluZS5pbmNsdWRlcygnY2xpY2snKSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ2J1dHRvbic7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZGVuY2UgPSAwLjg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxvd2VyTGluZS5pbmNsdWRlcygnc2VhcmNoJykgfHwgbG93ZXJMaW5lLmluY2x1ZGVzKCdpbnB1dCcpIHx8IGxvd2VyTGluZS5pbmNsdWRlcygnZmllbGQnKSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ2lucHV0JztcbiAgICAgICAgICAgICAgICAgICAgY29uZmlkZW5jZSA9IDAuODtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobG93ZXJMaW5lLmluY2x1ZGVzKCdsaW5rJykgfHwgbG93ZXJMaW5lLmluY2x1ZGVzKCdhbmNob3InKSB8fCBsb3dlckxpbmUuaW5jbHVkZXMoJ2hyZWYnKSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ2xpbmsnO1xuICAgICAgICAgICAgICAgICAgICBjb25maWRlbmNlID0gMC43NTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobG93ZXJMaW5lLmluY2x1ZGVzKCdoZWFkaW5nJykgfHwgbG93ZXJMaW5lLmluY2x1ZGVzKCd0aXRsZScpIHx8IGxvd2VyTGluZS5tYXRjaCgvXmhbMS02XS8pKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnaGVhZGluZyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZGVuY2UgPSAwLjg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxvd2VyTGluZS5pbmNsdWRlcygnaW1hZ2UnKSB8fCBsb3dlckxpbmUuaW5jbHVkZXMoJ2ljb24nKSB8fCBsb3dlckxpbmUuaW5jbHVkZXMoJ2F2YXRhcicpIHx8IGxvd2VyTGluZS5pbmNsdWRlcygndGh1bWJuYWlsJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdpbWFnZSc7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZGVuY2UgPSAwLjc1O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChsb3dlckxpbmUuaW5jbHVkZXMoJ21lbnUnKSB8fCBsb3dlckxpbmUuaW5jbHVkZXMoJ25hdmlnYXRpb24nKSB8fCBsb3dlckxpbmUuaW5jbHVkZXMoJ25hdicpIHx8IGxvd2VyTGluZS5pbmNsdWRlcygndG9vbGJhcicpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnbmF2aWdhdGlvbic7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZGVuY2UgPSAwLjg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZWZhdWx0IHRvIHRleHQgZm9yIGxvbmdlciBjb250ZW50XG4gICAgICAgICAgICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA+IDEwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ3RleHQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlkZW5jZSA9IDAuNztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlOyAvLyBTa2lwIHZlcnkgc2hvcnQgbGluZXMgd2l0aG91dCBjbGVhciB0eXBlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFeHRyYWN0IGFuZCBjbGVhbiB0ZXh0IGNvbnRlbnRcbiAgICAgICAgICAgIGxldCB0ZXh0ID0gdGhpcy5jbGVhblRleHRDb250ZW50KGxpbmUpO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHR5cGUgc3VmZml4IGlmIHByZXNlbnQgKGUuZy4sIFwiU3VibWl0XCIgYnV0dG9uIC0+IFwiU3VibWl0XCIpXG4gICAgICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXHMrKGJ1dHRvbnxpbnB1dHxsaW5rfGhlYWRpbmd8dGV4dHxpbWFnZXxtZW51fG5hdmlnYXRpb258Zm9ybSkkL2ksICcnKS50cmltKCk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgcXVvdGVzXG4gICAgICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9eW1wiJ118W1wiJ10kL2csICcnKS50cmltKCk7XG4gICAgICAgICAgICAvLyBTa2lwIGlmIG5vIG1lYW5pbmdmdWwgdGV4dCBsZWZ0XG4gICAgICAgICAgICBpZiAoIXRleHQgfHwgdGV4dC5sZW5ndGggPCAyIHx8IHRleHQudG9Mb3dlckNhc2UoKSA9PT0gJ25vbmUnIHx8IHRleHQudG9Mb3dlckNhc2UoKSA9PT0gJ24vYScpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFNraXAgaWYgdGV4dCBpcyBqdXN0IGEgdHlwZSBkZXNjcmlwdGlvblxuICAgICAgICAgICAgaWYgKHRleHQudG9Mb3dlckNhc2UoKSA9PT0gdHlwZS50b0xvd2VyQ2FzZSgpIHx8IHRleHQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnZWxlbWVudCB0eXBlJykpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goe1xuICAgICAgICAgICAgICAgIGlkOiBgc2NyZWVuc2hvdC0ke2VsZW1lbnRJbmRleCsrfS0ke0RhdGUubm93KCl9YCxcbiAgICAgICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgICAgIHRleHQ6IHRleHQubGVuZ3RoID4gMCA/IHRleHQgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgYmJveDoge1xuICAgICAgICAgICAgICAgICAgICB4OiAwLFxuICAgICAgICAgICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogMCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAwLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY29uZmlkZW5jZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZpbHRlciBvdXQgZHVwbGljYXRlIGVsZW1lbnRzIChzYW1lIHRleHQgYW5kIHR5cGUpXG4gICAgICAgIGNvbnN0IHVuaXF1ZUVsZW1lbnRzID0gZWxlbWVudHMuZmlsdGVyKChlbGVtZW50LCBpbmRleCwgc2VsZikgPT4gaW5kZXggPT09IHNlbGYuZmluZEluZGV4KGUgPT4gZS50ZXh0ID09PSBlbGVtZW50LnRleHQgJiZcbiAgICAgICAgICAgIGUudHlwZSA9PT0gZWxlbWVudC50eXBlKSk7XG4gICAgICAgIHJldHVybiB1bmlxdWVFbGVtZW50cztcbiAgICB9XG59XG4iLCIvLyBjb3JlL2FwaS9leHRlcm5hbEFwaUNsaWVudC50cyAtIENsaWVudCBmb3IgZXh0ZXJuYWwgTExNIEFQSXMgKE9sbGFtYSwgZXRjLilcbi8qKlxuICogQ2xpZW50IGZvciBleHRlcm5hbCB2aXNpb24tbGFuZ3VhZ2UgbW9kZWwgQVBJc1xuICogU3VwcG9ydHMgT2xsYW1hIGFuZCBzaW1pbGFyIEFQSXNcbiAqL1xuZXhwb3J0IGNsYXNzIEV4dGVybmFsQVBJQ2xpZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFuYWx5emUgaW1hZ2UgdXNpbmcgZXh0ZXJuYWwgQVBJXG4gICAgICogVHJpZXMgL2FwaS9jaGF0IGZpcnN0LCBmYWxscyBiYWNrIHRvIC9hcGkvZ2VuZXJhdGUgaWYgbmVlZGVkXG4gICAgICovXG4gICAgYXN5bmMgYW5hbHl6ZUltYWdlKHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyBpbWFnZURhdGFVcmwsIHByb21wdCwgbW9kZWxOYW1lIH0gPSByZXF1ZXN0O1xuICAgICAgICAvLyBDb252ZXJ0IGRhdGEgVVJMIHRvIGJhc2U2NFxuICAgICAgICBjb25zdCBiYXNlNjRJbWFnZSA9IGltYWdlRGF0YVVybC5zcGxpdCgnLCcpWzFdO1xuICAgICAgICAvLyBUcnkgL2FwaS9jaGF0IGZpcnN0IChwcmVmZXJyZWQgZm9yIHZpc2lvbiBtb2RlbHMpXG4gICAgICAgIGxldCB1cmwgPSBgJHt0aGlzLmNvbmZpZy5hcGlVcmwucmVwbGFjZSgvXFwvJC8sICcnKX0vYXBpL2NoYXRgO1xuICAgICAgICBsZXQgcmVxdWVzdEJvZHkgPSB7XG4gICAgICAgICAgICBtb2RlbDogbW9kZWxOYW1lLFxuICAgICAgICAgICAgbWVzc2FnZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHJvbGU6ICd1c2VyJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogcHJvbXB0LFxuICAgICAgICAgICAgICAgICAgICBpbWFnZXM6IFtiYXNlNjRJbWFnZV1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgc3RyZWFtOiBmYWxzZVxuICAgICAgICB9O1xuICAgICAgICBjb25zb2xlLmxvZygnU2VuZGluZyByZXF1ZXN0IHRvOicsIHVybCk7XG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5jb25maWcuYXBpS2V5KSB7XG4gICAgICAgICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dGhpcy5jb25maWcuYXBpS2V5fWA7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGhlYWRlcnM6IGhlYWRlcnMsXG4gICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXF1ZXN0Qm9keSksXG4gICAgICAgIH0pO1xuICAgICAgICAvLyBJZiAvYXBpL2NoYXQgZmFpbHMgd2l0aCA0MDQgb3IgNDA1LCB0cnkgL2FwaS9nZW5lcmF0ZSBhcyBmYWxsYmFja1xuICAgICAgICBpZiAoIXJlc3BvbnNlLm9rICYmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwNSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUcnlpbmcgL2FwaS9nZW5lcmF0ZSBhcyBmYWxsYmFjay4uLicpO1xuICAgICAgICAgICAgdXJsID0gYCR7dGhpcy5jb25maWcuYXBpVXJsLnJlcGxhY2UoL1xcLyQvLCAnJyl9L2FwaS9nZW5lcmF0ZWA7XG4gICAgICAgICAgICByZXF1ZXN0Qm9keSA9IHtcbiAgICAgICAgICAgICAgICBtb2RlbDogbW9kZWxOYW1lLFxuICAgICAgICAgICAgICAgIHByb21wdDogcHJvbXB0LFxuICAgICAgICAgICAgICAgIGltYWdlczogW2Jhc2U2NEltYWdlXSxcbiAgICAgICAgICAgICAgICBzdHJlYW06IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiBoZWFkZXJzLFxuICAgICAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlcXVlc3RCb2R5KSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICAgICAgICAgIGxldCBlcnJvck1lc3NhZ2UgPSBgQVBJIHJlcXVlc3QgZmFpbGVkOiAke3Jlc3BvbnNlLnN0YXR1c31gO1xuICAgICAgICAgICAgLy8gUHJvdmlkZSBoZWxwZnVsIGVycm9yIG1lc3NhZ2VzXG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgKz0gYFxcblxcbtCe0YjQuNCx0LrQsCDQtNC+0YHRgtGD0L/QsCAoNDAzKS4g0JTQu9GPIE9sbGFtYSDQvdC10L7QsdGF0L7QtNC40LzQviDQvdCw0YHRgtGA0L7QuNGC0YwgQ09SUzpcXG5gICtcbiAgICAgICAgICAgICAgICAgICAgYDEuINCe0YHRgtCw0L3QvtCy0LjRgtC1IE9sbGFtYVxcbmAgK1xuICAgICAgICAgICAgICAgICAgICBgMi4g0JfQsNC/0YPRgdGC0LjRgtC1INGBINC/0LXRgNC10LzQtdC90L3QvtC5INC+0LrRgNGD0LbQtdC90LjRjzpcXG5gICtcbiAgICAgICAgICAgICAgICAgICAgYCAgIE9MTEFNQV9PUklHSU5TPWNocm9tZS1leHRlbnNpb246Ly8qIG9sbGFtYSBzZXJ2ZVxcbmAgK1xuICAgICAgICAgICAgICAgICAgICBgICAg0LjQu9C4INGN0LrRgdC/0L7RgNGC0LjRgNGD0LnRgtC1INC/0LXRgNC10LzQtdC90L3Rg9GOOlxcbmAgK1xuICAgICAgICAgICAgICAgICAgICBgICAgZXhwb3J0IE9MTEFNQV9PUklHSU5TPWNocm9tZS1leHRlbnNpb246Ly8qXFxuYCArXG4gICAgICAgICAgICAgICAgICAgIGAgICBvbGxhbWEgc2VydmVcXG5cXG5gICtcbiAgICAgICAgICAgICAgICAgICAgYNCU0LXRgtCw0LvQuCDQvtGI0LjQsdC60Lg6ICR7ZXJyb3JUZXh0fWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgXFxuXFxu0K3QvdC00L/QvtC40L3RgiDQvdC1INC90LDQudC00LXQvS4g0J/RgNC+0LLQtdGA0YzRgtC1IFVSTCBBUEkg0Lgg0YPQsdC10LTQuNGC0LXRgdGMLCDRh9GC0L4g0YHQtdGA0LLQtdGAINC30LDQv9GD0YnQtdC9LlxcbtCU0LXRgtCw0LvQuDogJHtlcnJvclRleHR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSArPSBgXFxuXFxu0JTQtdGC0LDQu9C4OiAke2Vycm9yVGV4dH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgICAvLyBFeHRyYWN0IHJlc3BvbnNlIHRleHQgLSBPbGxhbWEgL2FwaS9jaGF0IHJldHVybnMgbWVzc2FnZS5jb250ZW50LCAvYXBpL2dlbmVyYXRlIHJldHVybnMgcmVzcG9uc2VcbiAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSByZXN1bHQubWVzc2FnZT8uY29udGVudCB8fCByZXN1bHQucmVzcG9uc2UgfHwgcmVzdWx0LnRleHQgfHwgSlNPTi5zdHJpbmdpZnkocmVzdWx0KTtcbiAgICAgICAgY29uc29sZS5sb2coJ0V4dGVybmFsIEFQSSByZXNwb25zZTonLCBkZXNjcmlwdGlvbik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgICAgIHJhd1Jlc3BvbnNlOiByZXN1bHRcbiAgICAgICAgfTtcbiAgICB9XG59XG4iLCIvLyBjb3JlL2FwaS9nb29nbGVXZWJBSUNsaWVudC50cyAtIENsaWVudCBmb3IgR29vZ2xlIFdlYiBBSSAoUHJvbXB0IEFQSSlcbi8qKlxuICogQ2xpZW50IGZvciBHb29nbGUgV2ViIEFJIChQcm9tcHQgQVBJKVxuICogVXNlcyBidWlsdC1pbiBMYW5ndWFnZU1vZGVsIEFQSSBpbiBDaHJvbWVcbiAqL1xuZXhwb3J0IGNsYXNzIEdvb2dsZVdlYkFJQ2xpZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgICAgICB0aGlzLmNvbmZpZyA9IHtcbiAgICAgICAgICAgIG91dHB1dExhbmd1YWdlOiBjb25maWcub3V0cHV0TGFuZ3VhZ2UgfHwgJ2VuJ1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBHb29nbGUgV2ViIEFJIGlzIGF2YWlsYWJsZVxuICAgICAqL1xuICAgIHN0YXRpYyBhc3luYyBpc0F2YWlsYWJsZSgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBMYW5ndWFnZU1vZGVsID09PSAndW5kZWZpbmVkJyB8fCAhTGFuZ3VhZ2VNb2RlbC5hdmFpbGFiaWxpdHkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXZhaWxhYmlsaXR5ID0gYXdhaXQgTGFuZ3VhZ2VNb2RlbC5hdmFpbGFiaWxpdHkoKTtcbiAgICAgICAgICAgIHJldHVybiBhdmFpbGFiaWxpdHkgPT09ICdhdmFpbGFibGUnIHx8IGF2YWlsYWJpbGl0eSA9PT0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQW5hbHl6ZSBpbWFnZSB1c2luZyBHb29nbGUgV2ViIEFJIChQcm9tcHQgQVBJKVxuICAgICAqL1xuICAgIGFzeW5jIGFuYWx5emVJbWFnZShyZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgaW1hZ2VEYXRhVXJsLCBwcm9tcHQgfSA9IHJlcXVlc3Q7XG4gICAgICAgIC8vIENoZWNrIGlmIEFQSSBpcyBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBMYW5ndWFnZU1vZGVsID09PSAndW5kZWZpbmVkJyB8fCAhTGFuZ3VhZ2VNb2RlbC5jcmVhdGUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignR29vZ2xlIFdlYiBBSSAoTGFuZ3VhZ2VNb2RlbCBBUEkpIGlzIG5vdCBhdmFpbGFibGUuIE1ha2Ugc3VyZSB5b3UgaGF2ZSBDaHJvbWUgMTM5KyB3aXRoIHRoZSByZXF1aXJlZCBmbGFncyBlbmFibGVkLicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIENvbnZlcnQgZGF0YSBVUkwgdG8gRmlsZS9CbG9iXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goaW1hZ2VEYXRhVXJsKTtcbiAgICAgICAgY29uc3QgYmxvYiA9IGF3YWl0IHJlc3BvbnNlLmJsb2IoKTtcbiAgICAgICAgY29uc3QgZmlsZSA9IG5ldyBGaWxlKFtibG9iXSwgJ3NjcmVlbnNob3QucG5nJywgeyB0eXBlOiAnaW1hZ2UvcG5nJyB9KTtcbiAgICAgICAgLy8gQ3JlYXRlIHNlc3Npb24gd2l0aCBpbWFnZSBhbmQgdGV4dCBpbnB1dHNcbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IGF3YWl0IExhbmd1YWdlTW9kZWwuY3JlYXRlKHtcbiAgICAgICAgICAgIGV4cGVjdGVkSW5wdXRzOiBbXG4gICAgICAgICAgICAgICAgeyB0eXBlOiAnaW1hZ2UnIH0sXG4gICAgICAgICAgICAgICAgeyB0eXBlOiAndGV4dCcgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG91dHB1dExhbmd1YWdlOiB0aGlzLmNvbmZpZy5vdXRwdXRMYW5ndWFnZVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gUHJlcGFyZSB1c2VyIG1lc3NhZ2VcbiAgICAgICAgY29uc3QgdXNlck1lc3NhZ2UgPSB7XG4gICAgICAgICAgICByb2xlOiAndXNlcicsXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICAgeyB0eXBlOiAndGV4dCcsIHZhbHVlOiBwcm9tcHQgfSxcbiAgICAgICAgICAgICAgICB7IHR5cGU6ICdpbWFnZScsIHZhbHVlOiBmaWxlIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICAgICAgLy8gU2VuZCBwcm9tcHRcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2Vzc2lvbi5wcm9tcHQoW3VzZXJNZXNzYWdlXSk7XG4gICAgICAgIC8vIEV4dHJhY3QgZGVzY3JpcHRpb24gZnJvbSByZXNwb25zZVxuICAgICAgICBsZXQgZGVzY3JpcHRpb24gPSAnJztcbiAgICAgICAgaWYgKHR5cGVvZiByZXN1bHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyZXN1bHQ/LlswXT8uY29udGVudCkge1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHJlc3VsdFswXS5jb250ZW50O1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY29udGVudCkpIHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbiA9IGNvbnRlbnQubWFwKGMgPT4gYy50ZXh0IHx8IEpTT04uc3RyaW5naWZ5KGMpKS5qb2luKCdcXG4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uID0gY29udGVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uID0gSlNPTi5zdHJpbmdpZnkoY29udGVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocmVzdWx0Py5vdXRwdXRUZXh0KSB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IHJlc3VsdC5vdXRwdXRUZXh0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJlc3VsdD8uY2hvaWNlcyAmJiByZXN1bHQuY2hvaWNlc1swXT8ubWVzc2FnZT8uY29udGVudCkge1xuICAgICAgICAgICAgZGVzY3JpcHRpb24gPSByZXN1bHQuY2hvaWNlc1swXS5tZXNzYWdlLmNvbnRlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocmVzdWx0Py50ZXh0KSB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IHJlc3VsdC50ZXh0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmVzdWx0KSAmJiByZXN1bHQubGVuZ3RoID4gMCAmJiB0eXBlb2YgcmVzdWx0WzBdID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGVzY3JpcHRpb24gPSByZXN1bHRbMF07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IEpTT04uc3RyaW5naWZ5KHJlc3VsdCwgbnVsbCwgMik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgcmF3UmVzcG9uc2U6IHJlc3VsdFxuICAgICAgICB9O1xuICAgIH1cbn1cbiIsIi8vIGNvcmUvaW5kZXgudHMgLSBBY2Nlc3NpYmlsaXR5IEFJIEFuYWx5emVyIGNsYXNzXG5pbXBvcnQgeyBFeHRlcm5hbEFQSUNsaWVudCB9IGZyb20gJy4vYXBpL2V4dGVybmFsQXBpQ2xpZW50JztcbmltcG9ydCB7IEdvb2dsZVdlYkFJQ2xpZW50IH0gZnJvbSAnLi9hcGkvZ29vZ2xlV2ViQUlDbGllbnQnO1xuaW1wb3J0IHsgU2NyZWVuc2hvdEFuYWx5emVyIH0gZnJvbSAnLi9hbmFseXplcnMvc2NyZWVuc2hvdEFuYWx5emVyJztcbmltcG9ydCB7IERPTUFuYWx5emVyIH0gZnJvbSAnLi9hbmFseXplcnMvZG9tQW5hbHl6ZXInO1xuaW1wb3J0IHsgQ29sb3JBbmFseXplciB9IGZyb20gJy4vYW5hbHl6ZXJzL2NvbG9yQW5hbHl6ZXInO1xuaW1wb3J0IHsgRWxlbWVudE1hdGNoZXIgfSBmcm9tICcuL2FuYWx5emVycy9lbGVtZW50TWF0Y2hlcic7XG5pbXBvcnQgeyBSZWNvbW1lbmRhdGlvbkVuZ2luZSB9IGZyb20gJy4vYW5hbHl6ZXJzL3JlY29tbWVuZGF0aW9uRW5naW5lJztcbi8qKlxuICogQWNjZXNzaWJpbGl0eSBBSSBBbmFseXplclxuICogUHJvdmlkZXMgdW5pZmllZCBpbnRlcmZhY2UgZm9yIEFJLXBvd2VyZWQgYWNjZXNzaWJpbGl0eSBhbmFseXNpc1xuICogU3VwcG9ydHMgYm90aCBPbGxhbWEgYW5kIEdvb2dsZSBXZWIgQUlcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gVXNpbmcgT2xsYW1hXG4gKiBjb25zdCBhbmFseXplciA9IG5ldyBBY2Nlc3NpYmlsaXR5QUlBbmFseXplcih7XG4gKiAgIHByb3ZpZGVyOiAnb2xsYW1hJyxcbiAqICAgYXBpVXJsOiAnaHR0cDovL2xvY2FsaG9zdDoxMTQzNCcsXG4gKiAgIGFwaUtleTogJ29wdGlvbmFsLWtleScsXG4gKiAgIG1vZGVsTmFtZTogJ2dlbW1hMzoxMmInXG4gKiB9KTtcbiAqXG4gKiAvLyBVc2luZyBHb29nbGUgV2ViIEFJXG4gKiBjb25zdCBhbmFseXplciA9IG5ldyBBY2Nlc3NpYmlsaXR5QUlBbmFseXplcih7XG4gKiAgIHByb3ZpZGVyOiAnZ29vZ2xlLXdlYi1haScsXG4gKiAgIG91dHB1dExhbmd1YWdlOiAnZW4nXG4gKiB9KTtcbiAqXG4gKiBjb25zdCBzY3JlZW5zaG90QW5hbHlzaXMgPSBhd2FpdCBhbmFseXplci5hbmFseXplU2NyZWVuc2hvdChpbWFnZURhdGFVcmwpO1xuICogY29uc3QgZG9tQW5hbHlzaXMgPSBhd2FpdCBhbmFseXplci5hbmFseXplRE9NKGh0bWxTdHJpbmcpO1xuICogY29uc3QgY29sb3JBbmFseXNpcyA9IGF3YWl0IGFuYWx5emVyLmFuYWx5emVDb2xvcnMocGFnZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEFjY2Vzc2liaWxpdHlBSUFuYWx5emVyIHtcbiAgICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgICAgIC8vIEluaXRpYWxpemUgQVBJIGNsaWVudHMgYmFzZWQgb24gcHJvdmlkZXJcbiAgICAgICAgaWYgKGNvbmZpZy5wcm92aWRlciA9PT0gJ29sbGFtYScpIHtcbiAgICAgICAgICAgIGlmICghY29uZmlnLmFwaVVybCB8fCAhY29uZmlnLm1vZGVsTmFtZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignT2xsYW1hIHByb3ZpZGVyIHJlcXVpcmVzIGFwaVVybCBhbmQgbW9kZWxOYW1lJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm9sbGFtYUNsaWVudCA9IG5ldyBFeHRlcm5hbEFQSUNsaWVudCh7XG4gICAgICAgICAgICAgICAgYXBpVXJsOiBjb25maWcuYXBpVXJsLFxuICAgICAgICAgICAgICAgIGFwaUtleTogY29uZmlnLmFwaUtleVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY29uZmlnLnByb3ZpZGVyID09PSAnZ29vZ2xlLXdlYi1haScpIHtcbiAgICAgICAgICAgIHRoaXMuZ29vZ2xlV2ViQUlDbGllbnQgPSBuZXcgR29vZ2xlV2ViQUlDbGllbnQoe1xuICAgICAgICAgICAgICAgIG91dHB1dExhbmd1YWdlOiBjb25maWcub3V0cHV0TGFuZ3VhZ2UgfHwgJ2VuJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIHByb3ZpZGVyOiAke2NvbmZpZy5wcm92aWRlcn1gKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJbml0aWFsaXplIGFuYWx5emVyc1xuICAgICAgICB0aGlzLnNjcmVlbnNob3RBbmFseXplciA9IG5ldyBTY3JlZW5zaG90QW5hbHl6ZXIoY29uZmlnLnByb3ZpZGVyLCB0aGlzLm9sbGFtYUNsaWVudCwgdGhpcy5nb29nbGVXZWJBSUNsaWVudCwgY29uZmlnLm1vZGVsTmFtZSB8fCAnZ2VtbWEzOjEyYicpO1xuICAgICAgICB0aGlzLmRvbUFuYWx5emVyID0gbmV3IERPTUFuYWx5emVyKCk7XG4gICAgICAgIHRoaXMuY29sb3JBbmFseXplciA9IG5ldyBDb2xvckFuYWx5emVyKCk7XG4gICAgICAgIHRoaXMuZWxlbWVudE1hdGNoZXIgPSBuZXcgRWxlbWVudE1hdGNoZXIoKTtcbiAgICAgICAgdGhpcy5yZWNvbW1lbmRhdGlvbkVuZ2luZSA9IG5ldyBSZWNvbW1lbmRhdGlvbkVuZ2luZShjb25maWcucHJvdmlkZXIsIHRoaXMub2xsYW1hQ2xpZW50LCB0aGlzLmdvb2dsZVdlYkFJQ2xpZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQW5hbHl6ZSBzY3JlZW5zaG90IGFuZCBleHRyYWN0IFVJIGVsZW1lbnRzXG4gICAgICogQHBhcmFtIGltYWdlRGF0YVVybCAtIERhdGEgVVJMIG9mIHRoZSBzY3JlZW5zaG90XG4gICAgICogQHBhcmFtIG1vZGVsTmFtZSAtIE9wdGlvbmFsIG1vZGVsIG5hbWUgb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBhc3luYyBhbmFseXplU2NyZWVuc2hvdChpbWFnZURhdGFVcmwsIG1vZGVsTmFtZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zY3JlZW5zaG90QW5hbHl6ZXIuYW5hbHl6ZShpbWFnZURhdGFVcmwsIG1vZGVsTmFtZSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFuYWx5emUgRE9NIHRyZWUgZm9yIGFjY2Vzc2liaWxpdHkgaXNzdWVzXG4gICAgICogQHBhcmFtIGh0bWxPckVsZW1lbnQgLSBIVE1MIHN0cmluZyBvciBET00gZWxlbWVudFxuICAgICAqL1xuICAgIGFzeW5jIGFuYWx5emVET00oaHRtbE9yRWxlbWVudCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kb21BbmFseXplci5hbmFseXplKGh0bWxPckVsZW1lbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBbmFseXplIGNvbG9yIGNvbnRyYXN0IGFuZCBhY2Nlc3NpYmlsaXR5IHVzaW5nIGF4ZS1jb3JlXG4gICAgICogQHBhcmFtIHRhYklkIC0gQ2hyb21lIHRhYiBJRCAoZm9yIGV4dGVuc2lvbiBjb250ZXh0KVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gRE9NIGVsZW1lbnQsIGRvY3VtZW50LCBvciB3aW5kb3cgb2JqZWN0IChmb3IgZGlyZWN0IERPTSBhY2Nlc3MpXG4gICAgICogQHBhcmFtIGV4ZWN1dGVTY3JpcHRGdW5jIC0gT3B0aW9uYWwgZnVuY3Rpb24gdG8gZXhlY3V0ZSBzY3JpcHQgb24gcGFnZSAoZm9yIGZhbGxiYWNrKVxuICAgICAqL1xuICAgIGFzeW5jIGFuYWx5emVDb2xvcnModGFiSWQsIGNvbnRleHQsIGV4ZWN1dGVTY3JpcHRGdW5jKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbG9yQW5hbHl6ZXIuYW5hbHl6ZSh0YWJJZCwgY29udGV4dCwgZXhlY3V0ZVNjcmlwdEZ1bmMpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBbmFseXplIGNvbG9ycyBhbmQgY29udHJhc3QgdXNpbmcgQUkgdmlzaW9uIG1vZGVsXG4gICAgICogQHBhcmFtIGltYWdlRGF0YVVybCAtIFNjcmVlbnNob3QgZGF0YSBVUkxcbiAgICAgKiBAcGFyYW0gbW9kZWxOYW1lIC0gT3B0aW9uYWwgbW9kZWwgbmFtZSBvdmVycmlkZVxuICAgICAqL1xuICAgIGFzeW5jIGFuYWx5emVDb2xvcnNXaXRoQUkoaW1hZ2VEYXRhVXJsLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgY29uc3QgYWlBbmFseXNpcyA9IGF3YWl0IHRoaXMuc2NyZWVuc2hvdEFuYWx5emVyLmFuYWx5emVDb2xvcnMoaW1hZ2VEYXRhVXJsLCBtb2RlbE5hbWUpO1xuICAgICAgICAvLyBDb252ZXJ0IEFJIGlzc3VlcyB0byBDb2xvcklzc3VlIGZvcm1hdFxuICAgICAgICBjb25zdCBpc3N1ZXMgPSBhaUFuYWx5c2lzLmlzc3Vlcy5tYXAoKGlzc3VlLCBpbmRleCkgPT4gKHtcbiAgICAgICAgICAgIGVsZW1lbnQ6IGlzc3VlLmVsZW1lbnQsXG4gICAgICAgICAgICBpc3N1ZTogaXNzdWUuaXNzdWUsXG4gICAgICAgICAgICBzZXZlcml0eTogaXNzdWUuc2V2ZXJpdHksXG4gICAgICAgICAgICByZWNvbW1lbmRhdGlvbjogaXNzdWUucmVjb21tZW5kYXRpb24sXG4gICAgICAgICAgICB3Y2FnQ3JpdGVyaWE6IGlzc3VlLndjYWdDcml0ZXJpYSxcbiAgICAgICAgICAgIHJ1bGVJZDogYGFpLSR7aXNzdWUuc2V2ZXJpdHl9LSR7RGF0ZS5ub3coKX0tJHtpbmRleH1gLCAvLyBHZW5lcmF0ZSB1bmlxdWUgSURcbiAgICAgICAgICAgIHNvdXJjZTogJ2FpJywgLy8gTWFyayBhcyBBSS1kZXRlY3RlZFxuICAgICAgICAgICAgZXN0aW1hdGVkQ29udHJhc3Q6IGlzc3VlLmVzdGltYXRlZENvbnRyYXN0IC8vIFByZXNlcnZlIGVzdGltYXRlZCBjb250cmFzdCBmcm9tIEFJXG4gICAgICAgIH0pKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlzc3VlcyxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBNYXRjaCBzY3JlZW5zaG90IGVsZW1lbnRzIHdpdGggRE9NIGVsZW1lbnRzXG4gICAgICogSWRlbnRpZmllcyBtYXRjaGVzLCBtaXNtYXRjaGVzLCBhbmQgYWNjZXNzaWJpbGl0eSBpc3N1ZXNcbiAgICAgKiBAcGFyYW0gc2NyZWVuc2hvdEFuYWx5c2lzIC0gUmVzdWx0cyBmcm9tIHNjcmVlbnNob3QgYW5hbHlzaXNcbiAgICAgKiBAcGFyYW0gZG9tQW5hbHlzaXMgLSBSZXN1bHRzIGZyb20gRE9NIGFuYWx5c2lzXG4gICAgICovXG4gICAgbWF0Y2hFbGVtZW50cyhzY3JlZW5zaG90QW5hbHlzaXMsIGRvbUFuYWx5c2lzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmVsZW1lbnRNYXRjaGVyLm1hdGNoKHNjcmVlbnNob3RBbmFseXNpcy5lbGVtZW50cywgZG9tQW5hbHlzaXMuZWxlbWVudHMpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBjb21wcmVoZW5zaXZlIGFjY2Vzc2liaWxpdHkgcmVwb3J0XG4gICAgICogQ29tYmluZXMgYWxsIGFuYWx5c2lzIHJlc3VsdHMgYW5kIGdlbmVyYXRlcyBBSS1wb3dlcmVkIHJlY29tbWVuZGF0aW9uc1xuICAgICAqIEBwYXJhbSBzY3JlZW5zaG90QW5hbHlzaXMgLSBSZXN1bHRzIGZyb20gc2NyZWVuc2hvdCBhbmFseXNpc1xuICAgICAqIEBwYXJhbSBkb21BbmFseXNpcyAtIFJlc3VsdHMgZnJvbSBET00gYW5hbHlzaXNcbiAgICAgKiBAcGFyYW0gY29sb3JBbmFseXNpcyAtIFJlc3VsdHMgZnJvbSBheGUtY29yZSBhbmFseXNpc1xuICAgICAqIEBwYXJhbSBtYXRjaGluZ1Jlc3VsdCAtIFJlc3VsdHMgZnJvbSBlbGVtZW50IG1hdGNoaW5nXG4gICAgICovXG4gICAgYXN5bmMgZ2VuZXJhdGVSZXBvcnQoc2NyZWVuc2hvdEFuYWx5c2lzLCBkb21BbmFseXNpcywgY29sb3JBbmFseXNpcywgbWF0Y2hpbmdSZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVjb21tZW5kYXRpb25FbmdpbmUuZ2VuZXJhdGVSZXBvcnQoc2NyZWVuc2hvdEFuYWx5c2lzLCBkb21BbmFseXNpcywgY29sb3JBbmFseXNpcywgbWF0Y2hpbmdSZXN1bHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIHVwZGF0ZUNvbmZpZyhjb25maWcpIHtcbiAgICAgICAgY29uc3QgbmV3Q29uZmlnID0geyAuLi50aGlzLmNvbmZpZywgLi4uY29uZmlnIH07XG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBpZiBwcm92aWRlciBjaGFuZ2VkIG9yIHJlbGV2YW50IGNvbmZpZyBjaGFuZ2VkXG4gICAgICAgIGlmIChjb25maWcucHJvdmlkZXIgfHwgY29uZmlnLmFwaVVybCB8fCBjb25maWcuYXBpS2V5ICE9PSB1bmRlZmluZWQgfHwgY29uZmlnLm91dHB1dExhbmd1YWdlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnID0gbmV3Q29uZmlnO1xuICAgICAgICAgICAgaWYgKG5ld0NvbmZpZy5wcm92aWRlciA9PT0gJ29sbGFtYScpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW5ld0NvbmZpZy5hcGlVcmwgfHwgIW5ld0NvbmZpZy5tb2RlbE5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbGxhbWEgcHJvdmlkZXIgcmVxdWlyZXMgYXBpVXJsIGFuZCBtb2RlbE5hbWUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5vbGxhbWFDbGllbnQgPSBuZXcgRXh0ZXJuYWxBUElDbGllbnQoe1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmw6IG5ld0NvbmZpZy5hcGlVcmwsXG4gICAgICAgICAgICAgICAgICAgIGFwaUtleTogbmV3Q29uZmlnLmFwaUtleVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuZ29vZ2xlV2ViQUlDbGllbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChuZXdDb25maWcucHJvdmlkZXIgPT09ICdnb29nbGUtd2ViLWFpJykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ29vZ2xlV2ViQUlDbGllbnQgPSBuZXcgR29vZ2xlV2ViQUlDbGllbnQoe1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXRMYW5ndWFnZTogbmV3Q29uZmlnLm91dHB1dExhbmd1YWdlIHx8ICdlbidcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLm9sbGFtYUNsaWVudCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2NyZWVuc2hvdEFuYWx5emVyID0gbmV3IFNjcmVlbnNob3RBbmFseXplcihuZXdDb25maWcucHJvdmlkZXIsIHRoaXMub2xsYW1hQ2xpZW50LCB0aGlzLmdvb2dsZVdlYkFJQ2xpZW50LCBuZXdDb25maWcubW9kZWxOYW1lIHx8ICdnZW1tYTM6MTJiJyk7XG4gICAgICAgICAgICB0aGlzLnJlY29tbWVuZGF0aW9uRW5naW5lID0gbmV3IFJlY29tbWVuZGF0aW9uRW5naW5lKG5ld0NvbmZpZy5wcm92aWRlciwgdGhpcy5vbGxhbWFDbGllbnQsIHRoaXMuZ29vZ2xlV2ViQUlDbGllbnQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jb25maWcgPSBuZXdDb25maWc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGdldENvbmZpZygpIHtcbiAgICAgICAgcmV0dXJuIHsgLi4udGhpcy5jb25maWcgfTtcbiAgICB9XG59XG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsIi8vIGJhY2tncm91bmQudHMgLSBIYW5kbGVzIHJlcXVlc3RzIGZyb20gdGhlIFVJLCBjYXB0dXJlcyBzY3JlZW5zaG90cyBhbmQgc2VuZHMgdGhlbSB0byBleHRlcm5hbCBBUElcbmltcG9ydCB7IEFjY2Vzc2liaWxpdHlBSUFuYWx5emVyIH0gZnJvbSAnLi9jb3JlL2luZGV4Jztcbi8vIEZ1bmN0aW9uIHRvIGFuYWx5emUgRE9NIG9uIHRoZSBwYWdlIChleGVjdXRlZCB2aWEgZXhlY3V0ZVNjcmlwdClcbi8vIFRoaXMgZnVuY3Rpb24gcnVucyBpbiB0aGUgcGFnZSBjb250ZXh0IHdoZXJlIERPTSBBUEkgaXMgYXZhaWxhYmxlXG5mdW5jdGlvbiBhbmFseXplRE9NT25QYWdlKCkge1xuICAgIGNvbnN0IGVsZW1lbnRzID0gW107XG4gICAgbGV0IGVsZW1lbnRJZENvdW50ZXIgPSAwO1xuICAgIGZ1bmN0aW9uIHNob3VsZFNraXBFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgdGFnTmFtZSA9IGVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICByZXR1cm4gWydzY3JpcHQnLCAnc3R5bGUnLCAnbm9zY3JpcHQnLCAnbWV0YScsICdsaW5rJywgJ3RpdGxlJywgJ2hlYWQnXS5pbmNsdWRlcyh0YWdOYW1lKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0Qm91bmRpbmdCb3goZWxlbWVudCkge1xuICAgICAgICBjb25zdCByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHJlY3QueCxcbiAgICAgICAgICAgIHk6IHJlY3QueSxcbiAgICAgICAgICAgIHdpZHRoOiByZWN0LndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0OiByZWN0LmhlaWdodFxuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRUZXh0Q29udGVudChlbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGFyaWFMYWJlbCA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJyk7XG4gICAgICAgIGlmIChhcmlhTGFiZWwpXG4gICAgICAgICAgICByZXR1cm4gYXJpYUxhYmVsO1xuICAgICAgICBjb25zdCBhcmlhTGFiZWxsZWRCeSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsbGVkYnknKTtcbiAgICAgICAgaWYgKGFyaWFMYWJlbGxlZEJ5KSB7XG4gICAgICAgICAgICBjb25zdCBsYWJlbGxlZEJ5RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGFyaWFMYWJlbGxlZEJ5KTtcbiAgICAgICAgICAgIGlmIChsYWJlbGxlZEJ5RWxlbWVudClcbiAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxsZWRCeUVsZW1lbnQudGV4dENvbnRlbnQ/LnRyaW0oKSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdGV4dCA9IGVsZW1lbnQudGV4dENvbnRlbnQ/LnRyaW0oKTtcbiAgICAgICAgcmV0dXJuIHRleHQgJiYgdGV4dC5sZW5ndGggPiAwID8gdGV4dCA6IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZnVuY3Rpb24gZXh0cmFjdEFyaWFBdHRyaWJ1dGVzKGVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgYXJpYUF0dHJzID0ge307XG4gICAgICAgIEFycmF5LmZyb20oZWxlbWVudC5hdHRyaWJ1dGVzKS5mb3JFYWNoKGF0dHIgPT4ge1xuICAgICAgICAgICAgaWYgKGF0dHIubmFtZS5zdGFydHNXaXRoKCdhcmlhLScpKSB7XG4gICAgICAgICAgICAgICAgYXJpYUF0dHJzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGFyaWFBdHRycztcbiAgICB9XG4gICAgZnVuY3Rpb24gZGV0ZWN0R2VuZXJpY0VsZW1lbnQoZWxlbWVudCkge1xuICAgICAgICBjb25zdCB0YWdOYW1lID0gZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmICghWydkaXYnLCAnc3BhbiddLmluY2x1ZGVzKHRhZ05hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4geyBpc0dlbmVyaWM6IGZhbHNlIH07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaGFzT25DbGljayA9IGVsZW1lbnQuaGFzQXR0cmlidXRlKCdvbmNsaWNrJykgfHxcbiAgICAgICAgICAgIEFycmF5LmZyb20oZWxlbWVudC5hdHRyaWJ1dGVzKS5zb21lKGF0dHIgPT4gYXR0ci5uYW1lLnN0YXJ0c1dpdGgoJ29uJykgJiYgYXR0ci5uYW1lICE9PSAnb25sb2FkJyk7XG4gICAgICAgIGNvbnN0IGhhc1RhYmluZGV4ID0gZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ3RhYmluZGV4Jyk7XG4gICAgICAgIGNvbnN0IGhhc1JvbGUgPSBlbGVtZW50Lmhhc0F0dHJpYnV0ZSgncm9sZScpO1xuICAgICAgICBjb25zdCBjb21wdXRlZFN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWxlbWVudCk7XG4gICAgICAgIGNvbnN0IGhhc1BvaW50ZXJDdXJzb3IgPSBjb21wdXRlZFN0eWxlLmN1cnNvciA9PT0gJ3BvaW50ZXInO1xuICAgICAgICBjb25zdCBpc0NvbnRlbnRFZGl0YWJsZSA9IGVsZW1lbnQuaGFzQXR0cmlidXRlKCdjb250ZW50ZWRpdGFibGUnKTtcbiAgICAgICAgaWYgKGhhc09uQ2xpY2sgfHwgKGhhc1JvbGUgJiYgZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3JvbGUnKSA9PT0gJ2J1dHRvbicpIHx8IChoYXNUYWJpbmRleCAmJiBoYXNQb2ludGVyQ3Vyc29yKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgaXNHZW5lcmljOiB0cnVlLCB0eXBlOiAnYnV0dG9uJyB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChoYXNPbkNsaWNrICYmIChoYXNSb2xlICYmIGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdyb2xlJykgPT09ICdsaW5rJykgfHwgaGFzUG9pbnRlckN1cnNvcikge1xuICAgICAgICAgICAgcmV0dXJuIHsgaXNHZW5lcmljOiB0cnVlLCB0eXBlOiAnbGluaycgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNDb250ZW50RWRpdGFibGUgJiYgKGhhc1JvbGUgJiYgZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3JvbGUnKSA9PT0gJ3RleHRib3gnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgaXNHZW5lcmljOiB0cnVlLCB0eXBlOiAnZm9ybS1jb250cm9sJyB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IGlzR2VuZXJpYzogZmFsc2UgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVTZWxlY3RvcihlbGVtZW50KSB7XG4gICAgICAgIC8vIFRyeSBJRCBmaXJzdCAobW9zdCBzcGVjaWZpYylcbiAgICAgICAgaWYgKGVsZW1lbnQuaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBgIyR7ZWxlbWVudC5pZH1gO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRyeSBjbGFzc1xuICAgICAgICBpZiAoZWxlbWVudC5jbGFzc05hbWUgJiYgdHlwZW9mIGVsZW1lbnQuY2xhc3NOYW1lID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc3QgY2xhc3NlcyA9IGVsZW1lbnQuY2xhc3NOYW1lLnRyaW0oKS5zcGxpdCgvXFxzKy8pLmZpbHRlcihjID0+IGMubGVuZ3RoID4gMCk7XG4gICAgICAgICAgICBpZiAoY2xhc3Nlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGZpcnN0IG1lYW5pbmdmdWwgY2xhc3NcbiAgICAgICAgICAgICAgICBjb25zdCBmaXJzdENsYXNzID0gY2xhc3Nlc1swXTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YWdOYW1lID0gZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGAke3RhZ05hbWV9LiR7Zmlyc3RDbGFzc31gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFRyeSB0byBidWlsZCBwYXRoIHdpdGggcGFyZW50XG4gICAgICAgIGNvbnN0IHRhZ05hbWUgPSBlbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgY29uc3QgcGFyZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50O1xuICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICBjb25zdCBzaWJsaW5ncyA9IEFycmF5LmZyb20ocGFyZW50LmNoaWxkcmVuKTtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc2libGluZ3MuaW5kZXhPZihlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IHNhbWVUYWdTaWJsaW5ncyA9IHNpYmxpbmdzLmZpbHRlcihzID0+IHMudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSB0YWdOYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IHNhbWVUYWdJbmRleCA9IHNhbWVUYWdTaWJsaW5ncy5pbmRleE9mKGVsZW1lbnQpO1xuICAgICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG11bHRpcGxlIHNhbWUgdGFncywgdXNlIG50aC1vZi10eXBlXG4gICAgICAgICAgICBpZiAoc2FtZVRhZ1NpYmxpbmdzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnRTZWxlY3RvciA9IHBhcmVudC5pZCA/IGAjJHtwYXJlbnQuaWR9YCA6XG4gICAgICAgICAgICAgICAgICAgIChwYXJlbnQuY2xhc3NOYW1lICYmIHR5cGVvZiBwYXJlbnQuY2xhc3NOYW1lID09PSAnc3RyaW5nJyAmJiBwYXJlbnQuY2xhc3NOYW1lLnRyaW0oKSlcbiAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7cGFyZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKX0uJHtwYXJlbnQuY2xhc3NOYW1lLnRyaW0oKS5zcGxpdCgvXFxzKy8pWzBdfWBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogcGFyZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYCR7cGFyZW50U2VsZWN0b3J9ID4gJHt0YWdOYW1lfTpudGgtb2YtdHlwZSgke3NhbWVUYWdJbmRleCArIDF9KWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBTaW1wbGUgcGFyZW50ID4gY2hpbGRcbiAgICAgICAgICAgIGNvbnN0IHBhcmVudFNlbGVjdG9yID0gcGFyZW50LmlkID8gYCMke3BhcmVudC5pZH1gIDogcGFyZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIHJldHVybiBgJHtwYXJlbnRTZWxlY3Rvcn0gPiAke3RhZ05hbWV9YDtcbiAgICAgICAgfVxuICAgICAgICAvLyBGYWxsYmFjazoganVzdCB0YWcgbmFtZVxuICAgICAgICByZXR1cm4gdGFnTmFtZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gYW5hbHl6ZUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgICBjb25zdCB0YWdOYW1lID0gZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChzaG91bGRTa2lwRWxlbWVudChlbGVtZW50KSlcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBjb25zdCBpZCA9IGBkb20tJHtlbGVtZW50SWRDb3VudGVyKyt9LSR7RGF0ZS5ub3coKX1gO1xuICAgICAgICBjb25zdCBiYm94ID0gZ2V0Qm91bmRpbmdCb3goZWxlbWVudCk7XG4gICAgICAgIGNvbnN0IHRleHQgPSBnZXRUZXh0Q29udGVudChlbGVtZW50KTtcbiAgICAgICAgY29uc3QgYXJpYUxhYmVsID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnKSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGFyaWFSb2xlID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3JvbGUnKSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGFyaWFBdHRyaWJ1dGVzID0gZXh0cmFjdEFyaWFBdHRyaWJ1dGVzKGVsZW1lbnQpO1xuICAgICAgICBjb25zdCBnZW5lcmljSW5mbyA9IGRldGVjdEdlbmVyaWNFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICAvLyBHZW5lcmF0ZSBzZWxlY3RvciBhbmQgaWRlbnRpZmllcnNcbiAgICAgICAgY29uc3Qgc2VsZWN0b3IgPSBnZW5lcmF0ZVNlbGVjdG9yKGVsZW1lbnQpO1xuICAgICAgICBjb25zdCBlbGVtZW50SWQgPSBlbGVtZW50LmlkIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gKGVsZW1lbnQuY2xhc3NOYW1lICYmIHR5cGVvZiBlbGVtZW50LmNsYXNzTmFtZSA9PT0gJ3N0cmluZycpXG4gICAgICAgICAgICA/IGVsZW1lbnQuY2xhc3NOYW1lLnRyaW0oKVxuICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IHJlY29tbWVuZGF0aW9ucyA9IHtcbiAgICAgICAgICAgIGlzc3VlczogW10sXG4gICAgICAgICAgICB3Y2FnQ3JpdGVyaWE6IFtdXG4gICAgICAgIH07XG4gICAgICAgIC8vIEJhc2ljIHNlbWFudGljIGNoZWNrc1xuICAgICAgICBpZiAoWydkaXYnLCAnc3BhbiddLmluY2x1ZGVzKHRhZ05hbWUpICYmIGFyaWFSb2xlKSB7XG4gICAgICAgICAgICByZWNvbW1lbmRhdGlvbnMuaXNzdWVzLnB1c2goYEdlbmVyaWMgZWxlbWVudCA8JHt0YWdOYW1lfT4gdXNlZCB3aXRoIEFSSUEgcm9sZSBcIiR7YXJpYVJvbGV9XCIuIENvbnNpZGVyIHVzaW5nIGEgbmF0aXZlIHNlbWFudGljIGVsZW1lbnQuYCk7XG4gICAgICAgICAgICByZWNvbW1lbmRhdGlvbnMud2NhZ0NyaXRlcmlhLnB1c2goJzQuMS4yIE5hbWUsIFJvbGUsIFZhbHVlJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdpbWcnICYmICFhcmlhTGFiZWwgJiYgIWVsZW1lbnQuZ2V0QXR0cmlidXRlKCdhbHQnKSkge1xuICAgICAgICAgICAgcmVjb21tZW5kYXRpb25zLmlzc3Vlcy5wdXNoKCdJbWFnZSBlbGVtZW50IGlzIG1pc3NpbmcgYW4gYWNjZXNzaWJsZSBuYW1lIChhbHQgYXR0cmlidXRlIG9yIGFyaWEtbGFiZWwpLicpO1xuICAgICAgICAgICAgcmVjb21tZW5kYXRpb25zLndjYWdDcml0ZXJpYS5wdXNoKCcxLjEuMSBOb24tdGV4dCBDb250ZW50Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdhJyAmJiAoIWVsZW1lbnQuZ2V0QXR0cmlidXRlKCdocmVmJykgfHwgZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2hyZWYnKT8udHJpbSgpID09PSAnIycpICYmICFhcmlhTGFiZWwpIHtcbiAgICAgICAgICAgIHJlY29tbWVuZGF0aW9ucy5pc3N1ZXMucHVzaCgnTGluayBlbGVtZW50IGhhcyBubyB2YWxpZCBocmVmIG9yIGFjY2Vzc2libGUgbmFtZS4nKTtcbiAgICAgICAgICAgIHJlY29tbWVuZGF0aW9ucy53Y2FnQ3JpdGVyaWEucHVzaCgnMi40LjQgTGluayBQdXJwb3NlIChJbiBDb250ZXh0KScsICc0LjEuMiBOYW1lLCBSb2xlLCBWYWx1ZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0YWdOYW1lID09PSAnYnV0dG9uJyAmJiAhYXJpYUxhYmVsICYmICF0ZXh0KSB7XG4gICAgICAgICAgICByZWNvbW1lbmRhdGlvbnMuaXNzdWVzLnB1c2goJ0J1dHRvbiBlbGVtZW50IGhhcyBubyBhY2Nlc3NpYmxlIG5hbWUgKHRleHQgY29udGVudCBvciBhcmlhLWxhYmVsKS4nKTtcbiAgICAgICAgICAgIHJlY29tbWVuZGF0aW9ucy53Y2FnQ3JpdGVyaWEucHVzaCgnNC4xLjIgTmFtZSwgUm9sZSwgVmFsdWUnKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBHZW5lcmljIGVsZW1lbnQgY2hlY2tzXG4gICAgICAgIGlmIChnZW5lcmljSW5mby5pc0dlbmVyaWMpIHtcbiAgICAgICAgICAgIHJlY29tbWVuZGF0aW9ucy5pc3N1ZXMucHVzaChgR2VuZXJpYyA8JHt0YWdOYW1lfT4gZWxlbWVudCB1c2VkIGFzICR7Z2VuZXJpY0luZm8udHlwZX0uYCk7XG4gICAgICAgICAgICByZWNvbW1lbmRhdGlvbnMud2NhZ0NyaXRlcmlhLnB1c2goJzQuMS4yIE5hbWUsIFJvbGUsIFZhbHVlJywgJzIuMS4xIEtleWJvYXJkJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2tpcCBlbGVtZW50cyB3aXRob3V0IGFueSBwcm9ibGVtcyAobm8gaXNzdWVzLCBubyBXQ0FHIGNyaXRlcmlhKVxuICAgICAgICAvLyBFbGVtZW50cyB3aXRob3V0IHByb2JsZW1zIGhhdmUgbm8gdmFsdWUgZm9yIGFjY2Vzc2liaWxpdHkgYW5hbHlzaXNcbiAgICAgICAgLy8gRXhjZXB0aW9uOiBpbmNsdWRlIGdlbmVyaWMgZWxlbWVudHMgYXMgdGhleSBhbHdheXMgbmVlZCBhdHRlbnRpb25cbiAgICAgICAgaWYgKCFnZW5lcmljSW5mby5pc0dlbmVyaWMgJiZcbiAgICAgICAgICAgIHJlY29tbWVuZGF0aW9ucy5pc3N1ZXMubGVuZ3RoID09PSAwICYmXG4gICAgICAgICAgICByZWNvbW1lbmRhdGlvbnMud2NhZ0NyaXRlcmlhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgdGFnTmFtZSxcbiAgICAgICAgICAgIHNlbGVjdG9yLFxuICAgICAgICAgICAgZWxlbWVudElkLFxuICAgICAgICAgICAgY2xhc3NOYW1lLFxuICAgICAgICAgICAgdGV4dDogdGV4dCB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICBhcmlhTGFiZWwsXG4gICAgICAgICAgICBhcmlhUm9sZSxcbiAgICAgICAgICAgIGFyaWFBdHRyaWJ1dGVzOiBPYmplY3Qua2V5cyhhcmlhQXR0cmlidXRlcykubGVuZ3RoID4gMCA/IGFyaWFBdHRyaWJ1dGVzIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgYmJveCxcbiAgICAgICAgICAgIGlzR2VuZXJpYzogZ2VuZXJpY0luZm8uaXNHZW5lcmljLFxuICAgICAgICAgICAgZ2VuZXJpY1R5cGU6IGdlbmVyaWNJbmZvLnR5cGUsXG4gICAgICAgICAgICByZWNvbW1lbmRhdGlvbnNcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLy8gQW5hbHl6ZSBhbGwgZWxlbWVudHNcbiAgICBjb25zdCBhbGxFbGVtZW50cyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnKicpKTtcbiAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgYWxsRWxlbWVudHMpIHtcbiAgICAgICAgY29uc3QgZG9tRWxlbWVudCA9IGFuYWx5emVFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICBpZiAoZG9tRWxlbWVudCkge1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChkb21FbGVtZW50KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBlbGVtZW50cyxcbiAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgfTtcbn1cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gMS4gRXh0ZW5zaW9uIEljb24gQ2xpY2sgSGFuZGxlciAvLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIE9wZW4gd2luZG93IHdoZW4gZXh0ZW5zaW9uIGljb24gaXMgY2xpY2tlZFxuY2hyb21lLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoYXN5bmMgKCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHdpbmRvdyBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBjb25zdCB3aW5kb3dzID0gYXdhaXQgY2hyb21lLndpbmRvd3MuZ2V0QWxsKCk7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nV2luZG93ID0gd2luZG93cy5maW5kKHcgPT4ge1xuICAgICAgICAgICAgaWYgKHcudHlwZSAhPT0gJ3BvcHVwJylcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICBjb25zdCB1cmwgPSB3LnVybDtcbiAgICAgICAgICAgIHJldHVybiB1cmwgJiYgdHlwZW9mIHVybCA9PT0gJ3N0cmluZycgJiYgdXJsLmluY2x1ZGVzKCd3aW5kb3cuaHRtbCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGV4aXN0aW5nV2luZG93KSB7XG4gICAgICAgICAgICAvLyBGb2N1cyBleGlzdGluZyB3aW5kb3dcbiAgICAgICAgICAgIGF3YWl0IGNocm9tZS53aW5kb3dzLnVwZGF0ZShleGlzdGluZ1dpbmRvdy5pZCwgeyBmb2N1c2VkOiB0cnVlIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIENyZWF0ZSBuZXcgd2luZG93IHdpdGggZGVmYXVsdCBjb25maWdcbiAgICAgICAgY29uc3QgZGVmYXVsdENvbmZpZyA9IHtcbiAgICAgICAgICAgIHByb3ZpZGVyOiAnZ29vZ2xlLXdlYi1haScsXG4gICAgICAgICAgICBvdXRwdXRMYW5ndWFnZTogJ2VuJ1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBuZXdXaW5kb3cgPSBhd2FpdCBjaHJvbWUud2luZG93cy5jcmVhdGUoe1xuICAgICAgICAgICAgdXJsOiBjaHJvbWUucnVudGltZS5nZXRVUkwoJ3dpbmRvdy5odG1sJyksXG4gICAgICAgICAgICB0eXBlOiAncG9wdXAnLFxuICAgICAgICAgICAgd2lkdGg6IDYwMCxcbiAgICAgICAgICAgIGhlaWdodDogODAwLFxuICAgICAgICAgICAgZm9jdXNlZDogdHJ1ZVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKG5ld1dpbmRvdyAmJiBuZXdXaW5kb3cuaWQpIHtcbiAgICAgICAgICAgIC8vIFN0b3JlIGRlZmF1bHQgY29uZmlnIGZvciB0aGUgd2luZG93XG4gICAgICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoe1xuICAgICAgICAgICAgICAgIHdpbmRvd0NvbmZpZzogZGVmYXVsdENvbmZpZ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIG9wZW5pbmcgd2luZG93IG9uIGljb24gY2xpY2s6JywgZXJyb3IpO1xuICAgIH1cbn0pO1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyAyLiBNZXNzYWdlIEV2ZW50cyAvLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFxuLy8gTGlzdGVuIGZvciBtZXNzYWdlcyBmcm9tIHRoZSBVSSwgcHJvY2VzcyBpdCwgYW5kIHNlbmQgdGhlIHJlc3VsdCBiYWNrLlxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKCdzZW5kZXInLCBzZW5kZXIpO1xuICAgIC8vIEhhbmRsZSBzY3JlZW5zaG90IGNhcHR1cmVcbiAgICBpZiAobWVzc2FnZS5hY3Rpb24gPT09ICdjYXB0dXJlU2NyZWVuc2hvdCcpIHtcbiAgICAgICAgKGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSBhY3RpdmUgdGFiIC0gdXNlIGxhc3RGb2N1c2VkV2luZG93IHRvIHdvcmsgd2l0aCBib3RoIHBvcHVwIGFuZCBzZXBhcmF0ZSB3aW5kb3dcbiAgICAgICAgICAgICAgICAvLyBXaXRoICd0YWJzJyBwZXJtaXNzaW9uLCB3ZSBjYW4gcXVlcnkgdGFicyBmcm9tIGFueSBjb250ZXh0XG4gICAgICAgICAgICAgICAgY29uc3QgW2FjdGl2ZVRhYl0gPSBhd2FpdCBjaHJvbWUudGFicy5xdWVyeSh7XG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdEZvY3VzZWRXaW5kb3c6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoIWFjdGl2ZVRhYiB8fCAhYWN0aXZlVGFiLmlkIHx8ICFhY3RpdmVUYWIud2luZG93SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBhY3RpdmUgdGFiIGZvdW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEZvciBzZXBhcmF0ZSB3aW5kb3dzLCBhY3RpdmVUYWIgcGVybWlzc2lvbiBkb2Vzbid0IGFjdGl2YXRlIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgICAgICAgICAvLyBXZSBuZWVkIHRvIHVzZSB0YWJzIHBlcm1pc3Npb24gZGlyZWN0bHkuIFRyeSB0byBjYXB0dXJlIHVzaW5nIHdpbmRvd0lkLlxuICAgICAgICAgICAgICAgIC8vIElmIHRoYXQgZmFpbHMsIHdlJ2xsIHRyeSB3aXRob3V0IHdpbmRvd0lkICh1c2VzIGN1cnJlbnQgd2luZG93KVxuICAgICAgICAgICAgICAgIGxldCBkYXRhVXJsO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSB3aXRoIGV4cGxpY2l0IHdpbmRvd0lkIGZpcnN0ICh3b3JrcyB3aXRoIHRhYnMgcGVybWlzc2lvbilcbiAgICAgICAgICAgICAgICAgICAgZGF0YVVybCA9IGF3YWl0IGNocm9tZS50YWJzLmNhcHR1cmVWaXNpYmxlVGFiKGFjdGl2ZVRhYi53aW5kb3dJZCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiAncG5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1YWxpdHk6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKHdpbmRvd0lkRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHRyeSB3aXRob3V0IHdpbmRvd0lkICh1c2VzIHRoZSB3aW5kb3cgdGhhdCBjb250YWlucyB0aGUgYWN0aXZlIHRhYilcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBtaWdodCB3b3JrIGlmIHRoZSB0YWIncyB3aW5kb3cgaXMgc3RpbGwgYWNjZXNzaWJsZVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byBjYXB0dXJlIHdpdGggd2luZG93SWQsIHRyeWluZyB3aXRob3V0OicsIHdpbmRvd0lkRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBkYXRhVXJsID0gYXdhaXQgY2hyb21lLnRhYnMuY2FwdHVyZVZpc2libGVUYWIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiAncG5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1YWxpdHk6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGFVcmw6IGRhdGFVcmxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjYXB0dXJpbmcgc2NyZWVuc2hvdDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBJbmRpY2F0ZSBhc3luYyByZXNwb25zZVxuICAgIH1cbiAgICAvLyBIYW5kbGUgZXh0ZXJuYWwgQVBJIHNjcmVlbnNob3QgYW5hbHlzaXMgKE9sbGFtYSBvciBHb29nbGUgV2ViIEFJKVxuICAgIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gJ2FuYWx5emVTY3JlZW5zaG90RXh0ZXJuYWwnKSB7XG4gICAgICAgIChhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTdGFydGluZyBzY3JlZW5zaG90IGFuYWx5c2lzLi4uJywgbWVzc2FnZS5jb25maWcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgaW1hZ2VEYXRhVXJsLCBjb25maWcgfSA9IG1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBBY2Nlc3NpYmlsaXR5IEFJIEFuYWx5emVyIHdpdGggcHJvdmlkZWQgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IGFuYWx5emVyID0gbmV3IEFjY2Vzc2liaWxpdHlBSUFuYWx5emVyKGNvbmZpZyk7XG4gICAgICAgICAgICAgICAgLy8gQW5hbHl6ZSBzY3JlZW5zaG90IHVzaW5nIGNvcmUgYW5hbHl6ZXJcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlbE5hbWUgPSBjb25maWcucHJvdmlkZXIgPT09ICdvbGxhbWEnID8gY29uZmlnLm1vZGVsTmFtZSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBjb25zdCBhbmFseXNpcyA9IGF3YWl0IGFuYWx5emVyLmFuYWx5emVTY3JlZW5zaG90KGltYWdlRGF0YVVybCwgbW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU2NyZWVuc2hvdCBhbmFseXNpcyBjb21wbGV0ZWQ6JywgYW5hbHlzaXMpO1xuICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBhbmFseXNpcy5kZXNjcmlwdGlvbiB8fCBKU09OLnN0cmluZ2lmeShhbmFseXNpcy5lbGVtZW50cywgbnVsbCwgMiksXG4gICAgICAgICAgICAgICAgICAgIGFuYWx5c2lzOiBhbmFseXNpcyxcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHNGb3VuZDogYW5hbHlzaXMuZWxlbWVudHMubGVuZ3RoXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBhbmFseXppbmcgc2NyZWVuc2hvdDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gSW5kaWNhdGUgYXN5bmMgcmVzcG9uc2VcbiAgICB9XG4gICAgLy8gSGFuZGxlIGZ1bGwgYWNjZXNzaWJpbGl0eSBhbmFseXNpcyAoc2NyZWVuc2hvdCArIERPTSArIGF4ZSArIG1hdGNoaW5nICsgQUkgcmVjb21tZW5kYXRpb25zKVxuICAgIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gJ2FuYWx5emVBY2Nlc3NpYmlsaXR5Jykge1xuICAgICAgICAoYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICAgICAgICBjb25zdCBzdGVwVGltZXMgPSB7fTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgScpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5qAIFN0YXJ0aW5nIGZ1bGwgYWNjZXNzaWJpbGl0eSBhbmFseXNpcy4uLicpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb25maWc6JywgbWVzc2FnZS5jb25maWcpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIEnKTtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGltYWdlRGF0YVVybCwgY29uZmlnIH0gPSBtZXNzYWdlO1xuICAgICAgICAgICAgICAgIC8vIEdldCBhY3RpdmUgd2ViIHBhZ2UgdGFiIChleGNsdWRlIGV4dGVuc2lvbiBwYWdlcylcbiAgICAgICAgICAgICAgICAvLyBRdWVyeSBhbGwgYWN0aXZlIHRhYnMgYWNyb3NzIGFsbCB3aW5kb3dzIHRvIGZpbmQgYSB3ZWIgcGFnZVxuICAgICAgICAgICAgICAgIGNvbnN0IGFsbFRhYnMgPSBhd2FpdCBjaHJvbWUudGFicy5xdWVyeSh7IGFjdGl2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YWIgPSBhbGxUYWJzLmZpbmQodCA9PiB0LnVybCAmJlxuICAgICAgICAgICAgICAgICAgICAhdC51cmwuc3RhcnRzV2l0aCgnY2hyb21lOi8vJykgJiZcbiAgICAgICAgICAgICAgICAgICAgIXQudXJsLnN0YXJ0c1dpdGgoJ2Nocm9tZS1leHRlbnNpb246Ly8nKSAmJlxuICAgICAgICAgICAgICAgICAgICAhdC51cmwuc3RhcnRzV2l0aCgnYWJvdXQ6JykgJiZcbiAgICAgICAgICAgICAgICAgICAgKHQudXJsLnN0YXJ0c1dpdGgoJ2h0dHA6Ly8nKSB8fCB0LnVybC5zdGFydHNXaXRoKCdodHRwczovLycpKSk7XG4gICAgICAgICAgICAgICAgaWYgKCF0YWIgfHwgIXRhYi5pZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGFjdGl2ZSB3ZWIgcGFnZSB0YWIgZm91bmQuIFBsZWFzZSBvcGVuIGEgd2ViIHBhZ2UgKGh0dHA6Ly8gb3IgaHR0cHM6Ly8pIGluIHlvdXIgYnJvd3NlciBhbmQgdHJ5IGFnYWluLicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIEFjY2Vzc2liaWxpdHkgQUkgQW5hbHl6ZXJcbiAgICAgICAgICAgICAgICBjb25zdCBhbmFseXplciA9IG5ldyBBY2Nlc3NpYmlsaXR5QUlBbmFseXplcihjb25maWcpO1xuICAgICAgICAgICAgICAgIC8vIFN0ZXAgMTogQW5hbHl6ZSBzY3JlZW5zaG90XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RlcDFTdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG7wn5O4IFN0ZXAgMTogQW5hbHl6aW5nIHNjcmVlbnNob3QuLi4nKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlbE5hbWUgPSBjb25maWcucHJvdmlkZXIgPT09ICdvbGxhbWEnID8gY29uZmlnLm1vZGVsTmFtZSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5zaG90QW5hbHlzaXMgPSBhd2FpdCBhbmFseXplci5hbmFseXplU2NyZWVuc2hvdChpbWFnZURhdGFVcmwsIG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RlcDFUaW1lID0gcGVyZm9ybWFuY2Uubm93KCkgLSBzdGVwMVN0YXJ0O1xuICAgICAgICAgICAgICAgIHN0ZXBUaW1lc1snU3RlcCAxOiBTY3JlZW5zaG90IEFuYWx5c2lzJ10gPSBzdGVwMVRpbWU7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOKchSBTdGVwIDEgY29tcGxldGVkIGluICR7KHN0ZXAxVGltZSAvIDEwMDApLnRvRml4ZWQoMil9c2ApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICBGb3VuZCAke3NjcmVlbnNob3RBbmFseXNpcy5lbGVtZW50cy5sZW5ndGh9IGVsZW1lbnRzYCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgIERlc2NyaXB0aW9uIGxlbmd0aDogJHtzY3JlZW5zaG90QW5hbHlzaXMuZGVzY3JpcHRpb24/Lmxlbmd0aCB8fCAwfSBjaGFyc2ApO1xuICAgICAgICAgICAgICAgIC8vIFN0ZXAgMjogR2V0IERPTSBhbmQgYW5hbHl6ZVxuICAgICAgICAgICAgICAgIGNvbnN0IHN0ZXAyU3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnXFxu8J+MsyBTdGVwIDI6IEFuYWx5emluZyBET00uLi4nKTtcbiAgICAgICAgICAgICAgICBsZXQgZG9tQW5hbHlzaXM7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIGV4ZWN1dGVTY3JpcHQgdG8gYW5hbHl6ZSBET00gZGlyZWN0bHkgb24gdGhlIHBhZ2VcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyB3b3JrcyBldmVyeXdoZXJlIGFuZCBoYXMgYWNjZXNzIHRvIERPTSBBUElcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IGNocm9tZS5zY3JpcHRpbmcuZXhlY3V0ZVNjcmlwdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHsgdGFiSWQ6IHRhYi5pZCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuYzogYW5hbHl6ZURPTU9uUGFnZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdHMgJiYgcmVzdWx0c1swXSAmJiByZXN1bHRzWzBdLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9tQW5hbHlzaXMgPSByZXN1bHRzWzBdLnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGFuYWx5emUgRE9NIHZpYSBleGVjdXRlU2NyaXB0Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGV4ZWN1dGVFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBhbmFseXplIERPTTogJHtleGVjdXRlRXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGV4ZWN1dGVFcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfS4gTWFrZSBzdXJlIHlvdSdyZSBvbiBhIHdlYiBwYWdlIChub3QgY2hyb21lOi8vIG9yIGFib3V0OiBwYWdlcykuYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHN0ZXAyVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpIC0gc3RlcDJTdGFydDtcbiAgICAgICAgICAgICAgICBzdGVwVGltZXNbJ1N0ZXAgMjogRE9NIEFuYWx5c2lzJ10gPSBzdGVwMlRpbWU7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOKchSBTdGVwIDIgY29tcGxldGVkIGluICR7KHN0ZXAyVGltZSAvIDEwMDApLnRvRml4ZWQoMil9c2ApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICBGb3VuZCAke2RvbUFuYWx5c2lzLmVsZW1lbnRzLmxlbmd0aH0gRE9NIGVsZW1lbnRzYCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZ2VuZXJpY0NvdW50ID0gZG9tQW5hbHlzaXMuZWxlbWVudHMuZmlsdGVyKChlKSA9PiBlLmlzR2VuZXJpYykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGlmIChnZW5lcmljQ291bnQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICDimqDvuI8gIEZvdW5kICR7Z2VuZXJpY0NvdW50fSBnZW5lcmljIGludGVyYWN0aXZlIGVsZW1lbnRzYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgMzogUnVuIGNvbG9yIGFuYWx5c2lzIChheGUtY29yZSArIEFJKVxuICAgICAgICAgICAgICAgIGNvbnN0IHN0ZXAzU3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnXFxu8J+OqCBTdGVwIDM6IFJ1bm5pbmcgY29sb3IgYW5hbHlzaXMuLi4nKTtcbiAgICAgICAgICAgICAgICBsZXQgY29sb3JBbmFseXNpcztcbiAgICAgICAgICAgICAgICBsZXQgc3RlcDNhVGltZSA9IDA7XG4gICAgICAgICAgICAgICAgbGV0IHN0ZXAzYlRpbWUgPSAwO1xuICAgICAgICAgICAgICAgIGxldCBzdGVwM2NUaW1lID0gMDtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdGVwIDNhOiBSdW4gYXhlLWNvcmUgYW5hbHlzaXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RlcDNhU3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJyAgIPCfk4ogU3RlcCAzYTogUnVubmluZyBheGUtY29yZSBhbmFseXNpcy4uLicpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgYXhlQ29sb3JBbmFseXNpcztcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF4ZUNvbG9yQW5hbHlzaXMgPSBhd2FpdCBhbmFseXplci5hbmFseXplQ29sb3JzKHRhYi5pZCwgdW5kZWZpbmVkLCBhc3luYyAoZnVuYykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBjaHJvbWUuc2NyaXB0aW5nLmV4ZWN1dGVTY3JpcHQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHsgdGFiSWQ6IHRhYi5pZCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jOiBmdW5jXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHNbMF0/LnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RlcDNhVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpIC0gc3RlcDNhU3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAg4pyFIFN0ZXAgM2EgY29tcGxldGVkIGluICR7KHN0ZXAzYVRpbWUgLyAxMDAwKS50b0ZpeGVkKDIpfXNgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICAgICBGb3VuZCAke2F4ZUNvbG9yQW5hbHlzaXMuaXNzdWVzLmxlbmd0aH0gaXNzdWVzIGZyb20gYXhlLWNvcmVgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ZXAzYVRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKSAtIHN0ZXAzYVN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGAgICDimqDvuI8gIFN0ZXAgM2EgZmFpbGVkIGFmdGVyICR7KHN0ZXAzYVRpbWUgLyAxMDAwKS50b0ZpeGVkKDIpfXM6YCwgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXhlQ29sb3JBbmFseXNpcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZXM6IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBTdGVwIDNiOiBSdW4gQUkgY29sb3IgYW5hbHlzaXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RlcDNiU3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJyAgIPCfpJYgU3RlcCAzYjogUnVubmluZyBBSSBjb2xvciBhbmFseXNpcy4uLicpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgYWlDb2xvckFuYWx5c2lzO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWlDb2xvckFuYWx5c2lzID0gYXdhaXQgYW5hbHl6ZXIuYW5hbHl6ZUNvbG9yc1dpdGhBSShpbWFnZURhdGFVcmwsIG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGVwM2JUaW1lID0gcGVyZm9ybWFuY2Uubm93KCkgLSBzdGVwM2JTdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICDinIUgU3RlcCAzYiBjb21wbGV0ZWQgaW4gJHsoc3RlcDNiVGltZSAvIDEwMDApLnRvRml4ZWQoMil9c2ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgICAgIEZvdW5kICR7YWlDb2xvckFuYWx5c2lzLmlzc3Vlcy5sZW5ndGh9IGlzc3VlcyBmcm9tIEFJYCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGVwM2JUaW1lID0gcGVyZm9ybWFuY2Uubm93KCkgLSBzdGVwM2JTdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgICAg4pqg77iPICBTdGVwIDNiIGZhaWxlZCBhZnRlciAkeyhzdGVwM2JUaW1lIC8gMTAwMCkudG9GaXhlZCgyKX1zOmAsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFpQ29sb3JBbmFseXNpcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZXM6IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBTdGVwIDNjOiBDb21iaW5lIHJlc3VsdHNcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RlcDNjU3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJyAgIPCflIQgU3RlcCAzYzogQ29tYmluaW5nIGNvbG9yIGFuYWx5c2lzIHJlc3VsdHMuLi4nKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sb3JBbmFseXplciA9IGFuYWx5emVyLmNvbG9yQW5hbHl6ZXI7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yQW5hbHlzaXMgPSBjb2xvckFuYWx5emVyLmNvbWJpbmVXaXRoQUkoYXhlQ29sb3JBbmFseXNpcywgYWlDb2xvckFuYWx5c2lzKTtcbiAgICAgICAgICAgICAgICAgICAgc3RlcDNjVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpIC0gc3RlcDNjU3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0ZXAzVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpIC0gc3RlcDNTdGFydDtcbiAgICAgICAgICAgICAgICAgICAgc3RlcFRpbWVzWydTdGVwIDM6IENvbG9yIEFuYWx5c2lzJ10gPSBzdGVwM1RpbWU7XG4gICAgICAgICAgICAgICAgICAgIHN0ZXBUaW1lc1snICAtIDNhOiBBeGUtY29yZSddID0gc3RlcDNhVGltZTtcbiAgICAgICAgICAgICAgICAgICAgc3RlcFRpbWVzWycgIC0gM2I6IEFJIEFuYWx5c2lzJ10gPSBzdGVwM2JUaW1lO1xuICAgICAgICAgICAgICAgICAgICBzdGVwVGltZXNbJyAgLSAzYzogQ29tYmluZSddID0gc3RlcDNjVGltZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgIOKchSBTdGVwIDNjIGNvbXBsZXRlZCBpbiAkeyhzdGVwM2NUaW1lIC8gMTAwMCkudG9GaXhlZCgyKX1zYCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDinIUgU3RlcCAzIGNvbXBsZXRlZCBpbiAkeyhzdGVwM1RpbWUgLyAxMDAwKS50b0ZpeGVkKDIpfXNgKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgIFRvdGFsIGNvbG9yIGlzc3VlczogJHtjb2xvckFuYWx5c2lzLmlzc3Vlcy5sZW5ndGh9YCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGF4ZUlzc3VlcyA9IGNvbG9yQW5hbHlzaXMuaXNzdWVzLmZpbHRlcigoaSkgPT4gaS5zb3VyY2UgPT09ICdheGUtY29yZScpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWlJc3N1ZXMgPSBjb2xvckFuYWx5c2lzLmlzc3Vlcy5maWx0ZXIoKGkpID0+IGkuc291cmNlID09PSAnYWknKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvdGhJc3N1ZXMgPSBjb2xvckFuYWx5c2lzLmlzc3Vlcy5maWx0ZXIoKGkpID0+IGkuc291cmNlID09PSAnYm90aCcpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgIC0gQXhlLWNvcmU6ICR7YXhlSXNzdWVzfSwgQUk6ICR7YWlJc3N1ZXN9LCBCb3RoOiAke2JvdGhJc3N1ZXN9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGVwM1RpbWUgPSBwZXJmb3JtYW5jZS5ub3coKSAtIHN0ZXAzU3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIHN0ZXBUaW1lc1snU3RlcCAzOiBDb2xvciBBbmFseXNpcyddID0gc3RlcDNUaW1lO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYOKaoO+4jyAgU3RlcCAzIGZhaWxlZCBhZnRlciAkeyhzdGVwM1RpbWUgLyAxMDAwKS50b0ZpeGVkKDIpfXM6YCwgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAvLyBDb250aW51ZSB3aXRob3V0IGNvbG9yIGFuYWx5c2lzIGlmIGl0IGZhaWxzXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yQW5hbHlzaXMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZXM6IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgNDogTWF0Y2ggZWxlbWVudHNcbiAgICAgICAgICAgICAgICBjb25zdCBzdGVwNFN0YXJ0ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1xcbvCflJcgU3RlcCA0OiBNYXRjaGluZyBlbGVtZW50cy4uLicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoaW5nUmVzdWx0ID0gYW5hbHl6ZXIubWF0Y2hFbGVtZW50cyhzY3JlZW5zaG90QW5hbHlzaXMsIGRvbUFuYWx5c2lzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGVwNFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKSAtIHN0ZXA0U3RhcnQ7XG4gICAgICAgICAgICAgICAgc3RlcFRpbWVzWydTdGVwIDQ6IEVsZW1lbnQgTWF0Y2hpbmcnXSA9IHN0ZXA0VGltZTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg4pyFIFN0ZXAgNCBjb21wbGV0ZWQgaW4gJHsoc3RlcDRUaW1lIC8gMTAwMCkudG9GaXhlZCgyKX1zYCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgIE1hdGNoZWQ6ICR7bWF0Y2hpbmdSZXN1bHQubWF0Y2hlZC5sZW5ndGh9YCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgIFVubWF0Y2hlZCBzY3JlZW5zaG90OiAke21hdGNoaW5nUmVzdWx0LnVubWF0Y2hlZFNjcmVlbnNob3QubGVuZ3RofWApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICBVbm1hdGNoZWQgRE9NOiAke21hdGNoaW5nUmVzdWx0LnVubWF0Y2hlZERPTS5sZW5ndGh9YCk7XG4gICAgICAgICAgICAgICAgLy8gU3RlcCA1OiBHZW5lcmF0ZSBjb21wcmVoZW5zaXZlIHJlcG9ydFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0ZXA1U3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnXFxu8J+TnSBTdGVwIDU6IEdlbmVyYXRpbmcgQUktcG93ZXJlZCByZXBvcnQuLi4nKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXBvcnQgPSBhd2FpdCBhbmFseXplci5nZW5lcmF0ZVJlcG9ydChzY3JlZW5zaG90QW5hbHlzaXMsIGRvbUFuYWx5c2lzLCBjb2xvckFuYWx5c2lzLCBtYXRjaGluZ1Jlc3VsdCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RlcDVUaW1lID0gcGVyZm9ybWFuY2Uubm93KCkgLSBzdGVwNVN0YXJ0O1xuICAgICAgICAgICAgICAgIHN0ZXBUaW1lc1snU3RlcCA1OiBSZXBvcnQgR2VuZXJhdGlvbiddID0gc3RlcDVUaW1lO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDinIUgU3RlcCA1IGNvbXBsZXRlZCBpbiAkeyhzdGVwNVRpbWUgLyAxMDAwKS50b0ZpeGVkKDIpfXNgKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAgVG90YWwgcmVjb21tZW5kYXRpb25zOiAke3JlcG9ydC5yZWNvbW1lbmRhdGlvbnMubGVuZ3RofWApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICBTdW1tYXJ5OiAke3JlcG9ydC5zdW1tYXJ5LnRvdGFsSXNzdWVzfSB0b3RhbCBpc3N1ZXNgKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAgLSBDcml0aWNhbDogJHtyZXBvcnQuc3VtbWFyeS5jcml0aWNhbElzc3Vlc31gKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAgLSBTZXJpb3VzOiAke3JlcG9ydC5zdW1tYXJ5LnNlcmlvdXNJc3N1ZXN9YCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgIC0gTW9kZXJhdGU6ICR7cmVwb3J0LnN1bW1hcnkubW9kZXJhdGVJc3N1ZXN9YCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgIC0gTWlub3I6ICR7cmVwb3J0LnN1bW1hcnkubWlub3JJc3N1ZXN9YCk7XG4gICAgICAgICAgICAgICAgLy8gVG90YWwgdGltZVxuICAgICAgICAgICAgICAgIGNvbnN0IHRvdGFsVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpIC0gc3RhcnRUaW1lO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG7ilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIEnKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pyoIEZ1bGwgYWNjZXNzaWJpbGl0eSBhbmFseXNpcyBjb21wbGV0ZWQhJyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgScpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG7ij7HvuI8gIFBlcmZvcm1hbmNlIFN1bW1hcnk6Jyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgScpO1xuICAgICAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKHN0ZXBUaW1lcykuZm9yRWFjaCgoW3N0ZXAsIHRpbWVdKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlY29uZHMgPSAodGltZSAvIDEwMDApLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBlcmNlbnRhZ2UgPSAoKHRpbWUgLyB0b3RhbFRpbWUpICogMTAwKS50b0ZpeGVkKDEpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAgJHtzdGVwLnBhZEVuZCgzMCl9ICR7c2Vjb25kcy5wYWRTdGFydCg2KX1zICgke3BlcmNlbnRhZ2UucGFkU3RhcnQoNSl9JSlgKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSBJyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgICR7J1RPVEFMJy5wYWRFbmQoMzApfSAkeyh0b3RhbFRpbWUgLyAxMDAwKS50b0ZpeGVkKDIpLnBhZFN0YXJ0KDYpfXMgKDEwMC4wJSlgKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSB4pSBXFxuJyk7XG4gICAgICAgICAgICAgICAgLy8gRmlsdGVyIG91dCBlbGVtZW50cyB3aXRob3V0IGlzc3VlcyBmcm9tIGRvbUFuYWx5c2lzXG4gICAgICAgICAgICAgICAgLy8gTk9URTogRWxlbWVudHMgd2l0aG91dCBwcm9ibGVtcyBhcmUgYWxyZWFkeSBmaWx0ZXJlZCBhdCBnZW5lcmF0aW9uIHRpbWUgKGFuYWx5emVET01PblBhZ2UpLFxuICAgICAgICAgICAgICAgIC8vIGJ1dCB3ZSBzdGlsbCBuZWVkIHRvIGZpbHRlciBiYXNlZCBvbiBtYXRjaGluZyByZXN1bHRzIGFuZCBjb2xvciBpc3N1ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBmaWx0ZXJlZERvbUFuYWx5c2lzID0ge1xuICAgICAgICAgICAgICAgICAgICAuLi5kb21BbmFseXNpcyxcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHM6IGRvbUFuYWx5c2lzLmVsZW1lbnRzLmZpbHRlcigoZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWxsIGVsZW1lbnRzIGluIGRvbUFuYWx5c2lzIGFscmVhZHkgaGF2ZSBpc3N1ZXMgb3IgYXJlIGdlbmVyaWMgKGZpbHRlcmVkIGF0IGdlbmVyYXRpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBCdXQgd2UgbmVlZCB0byBjaGVjayBpZiBlbGVtZW50IGlzIGludm9sdmVkIGluIG1hdGNoaW5nL2NvbG9yIGlzc3Vlc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5jbHVkZSBlbGVtZW50IGlmIGl0IGhhcyBpc3N1ZXMgaW4gcmVjb21tZW5kYXRpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYXNJc3N1ZXMgPSBlbGVtZW50LnJlY29tbWVuZGF0aW9ucz8uaXNzdWVzPy5sZW5ndGggPiAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5jbHVkZSBnZW5lcmljIGVsZW1lbnRzICh0aGV5IGFsd2F5cyBuZWVkIGZpeGluZylcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzR2VuZXJpYyA9IGVsZW1lbnQuaXNHZW5lcmljID09PSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5jbHVkZSBpZiBlbGVtZW50IGlzIGluIHVubWF0Y2hlZCBsaXN0IEFORCBoYXMgaXNzdWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAodW5tYXRjaGVkIGFsb25lIGRvZXNuJ3QgbWVhbiBwcm9ibGVtYXRpYyAtIGVsZW1lbnQgbWlnaHQganVzdCBub3QgYmUgdmlzaWJsZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElNUE9SVEFOVDogQ2hlY2sgdGhlIG9yaWdpbmFsIGVsZW1lbnQgZnJvbSBkb21BbmFseXNpcywgbm90IGZyb20gdW5tYXRjaGVkRE9NXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIHVubWF0Y2hlZERPTSBjb250YWlucyBjb3BpZXMgdGhhdCBtaWdodCBoYXZlIGRpZmZlcmVudCBkYXRhXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1bm1hdGNoZWRFbGVtZW50ID0gbWF0Y2hpbmdSZXN1bHQudW5tYXRjaGVkRE9NLmZpbmQoKGUpID0+IGUuaWQgPT09IGVsZW1lbnQuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRWxlbWVudCBtdXN0IGJlIGluIHVubWF0Y2hlZERPTSBBTkQgaGF2ZSBpc3N1ZXMgb3IgYmUgZ2VuZXJpY1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCByb290IGVsZW1lbnRzIChodG1sLCBib2R5KSB0aGF0IGFyZSBhbHdheXMgdW5tYXRjaGVkIGJ1dCB1c3VhbGx5IGRvbid0IGhhdmUgaXNzdWVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1Jvb3RFbGVtZW50ID0gZWxlbWVudC50YWdOYW1lID09PSAnaHRtbCcgfHwgZWxlbWVudC50YWdOYW1lID09PSAnYm9keSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1VubWF0Y2hlZFdpdGhJc3N1ZXMgPSB1bm1hdGNoZWRFbGVtZW50ICE9PSB1bmRlZmluZWQgJiYgIWlzUm9vdEVsZW1lbnQgJiYgKGVsZW1lbnQucmVjb21tZW5kYXRpb25zPy5pc3N1ZXM/Lmxlbmd0aCA+IDAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmlzR2VuZXJpYyA9PT0gdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbmNsdWRlIGlmIGVsZW1lbnQgaXMgaW4gbWF0Y2hlZCBwYWlycyB3aXRoIGlzc3VlcyAob25seSBpZiB0aGVyZSBhcmUgYWN0dWFsIGlzc3VlcylcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsc28gY2hlY2sgdGhhdCB0aGUgRE9NIGVsZW1lbnQgaXRzZWxmIGhhcyBpc3N1ZXMsIG5vdCBqdXN0IHRoZSBtYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNNYXRjaGVkV2l0aElzc3VlcyA9IG1hdGNoaW5nUmVzdWx0Lm1hdGNoZWQuc29tZSgobSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtLmRvbUVsZW1lbnQ/LmlkICE9PSBlbGVtZW50LmlkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWF0Y2ggbXVzdCBoYXZlIGlzc3Vlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbS5pc3N1ZXMgfHwgbS5pc3N1ZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRE9NIGVsZW1lbnQgbXVzdCBhbHNvIGhhdmUgaXNzdWVzIG9yIGJlIGdlbmVyaWNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkb21IYXNJc3N1ZXMgPSBtLmRvbUVsZW1lbnQ/LnJlY29tbWVuZGF0aW9ucz8uaXNzdWVzPy5sZW5ndGggPiAwIHx8IG0uZG9tRWxlbWVudD8uaXNHZW5lcmljID09PSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkb21IYXNJc3N1ZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluY2x1ZGUgaWYgZWxlbWVudCBoYXMgY29sb3IgaXNzdWVzIChjaGVjayBieSBzZWxlY3RvciwgaWQsIG9yIGNsYXNzKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQmUgbW9yZSBwcmVjaXNlIHRvIGF2b2lkIGZhbHNlIHBvc2l0aXZlcyAtIG9ubHkgbWF0Y2ggQ1NTIHNlbGVjdG9ycywgbm90IHRleHQgZGVzY3JpcHRpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYXNDb2xvcklzc3VlcyA9IGNvbG9yQW5hbHlzaXMuaXNzdWVzLnNvbWUoKGlzc3VlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNzdWVFbGVtZW50ID0gaXNzdWUuZWxlbWVudCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIGlmIGlzc3VlLmVsZW1lbnQgbG9va3MgbGlrZSBhIHRleHQgZGVzY3JpcHRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDU1Mgc2VsZWN0b3JzIGFyZSB0eXBpY2FsbHkgc2hvcnQsIGRvbid0IGNvbnRhaW4gcXVvdGVzLCBhbmQgZm9sbG93IHNwZWNpZmljIHBhdHRlcm5zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGV4dCBkZXNjcmlwdGlvbnMgb2Z0ZW4gY29udGFpbiBxdW90ZXMsIHNwYWNlcywgb3IgYXJlIHZlcnkgbG9uZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc3N1ZUVsZW1lbnQubGVuZ3RoID4gNTAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNzdWVFbGVtZW50LmluY2x1ZGVzKCdcIicpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzc3VlRWxlbWVudC5pbmNsdWRlcyhcIidcIikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGlzc3VlRWxlbWVudC5pbmNsdWRlcygnICcpICYmICFpc3N1ZUVsZW1lbnQuaW5jbHVkZXMoJ1snKSAmJiAhaXNzdWVFbGVtZW50LmluY2x1ZGVzKCc6JykpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzc3VlRWxlbWVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd0ZXh0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNzdWVFbGVtZW50LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2VsZW1lbnQgZGVzY3JpcHRpb24nKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZUVsZW1lbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygncHJlc2VudGVkIGluJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBMaWtlbHkgYSB0ZXh0IGRlc2NyaXB0aW9uLCBub3QgYSBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGNoZWNrIGlmIGlzc3VlLmVsZW1lbnQgbG9va3MgbGlrZSBhIENTUyBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENTUyBzZWxlY3RvcnMgdHlwaWNhbGx5IHN0YXJ0IHdpdGggIywgLiwgdGFnIG5hbWUsIG9yIGNvbnRhaW4gW2F0dHJpYnV0ZV1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsb29rc0xpa2VTZWxlY3RvciA9IC9eWyMuYS16QS1aXXxcXFsvLnRlc3QoaXNzdWVFbGVtZW50LnRyaW0oKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFsb29rc0xpa2VTZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIE5vdCBhIENTUyBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBFeGFjdCBzZWxlY3RvciBtYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc3N1ZUVsZW1lbnQgPT09IGVsZW1lbnQuc2VsZWN0b3IpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElEIG1hdGNoIChleGFjdClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5lbGVtZW50SWQgJiYgaXNzdWVFbGVtZW50ID09PSBgIyR7ZWxlbWVudC5lbGVtZW50SWR9YClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xhc3MgbWF0Y2ggLSBvbmx5IGlmIHRoZSBpc3N1ZSBlbGVtZW50IGV4cGxpY2l0bHkgY29udGFpbnMgdGhlIGNsYXNzIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXZvaWQgbWF0Y2hpbmcgZ2VuZXJpYyBjbGFzcyBuYW1lcyB0aGF0IG1pZ2h0IGFwcGVhciBpbiBvdGhlciBjb250ZXh0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmNsYXNzTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjbGFzc2VzID0gZWxlbWVudC5jbGFzc05hbWUuc3BsaXQoL1xccysvKS5maWx0ZXIoKGNscykgPT4gY2xzLmxlbmd0aCA+IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNscyBvZiBjbGFzc2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IG1hdGNoIGlmIGlzc3VlLmVsZW1lbnQgY29udGFpbnMgdGhlIGNsYXNzIGFzIGEgQ1NTIHNlbGVjdG9yIChlLmcuLCBcIi5saWdodFwiIG9yIFwiaHRtbC5saWdodFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm90IGp1c3QgdGhlIGNsYXNzIG5hbWUgYXMgYSBzdWJzdHJpbmcgKHRvIGF2b2lkIGZhbHNlIG1hdGNoZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNzdWVFbGVtZW50LmluY2x1ZGVzKGAuJHtjbHN9YCkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoaXNzdWVFbGVtZW50LnN0YXJ0c1dpdGgoYC4ke2Nsc31gKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZUVsZW1lbnQuaW5jbHVkZXMoYCAke2Nsc31gKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZUVsZW1lbnQuaW5jbHVkZXMoYCR7ZWxlbWVudC50YWdOYW1lfS4ke2Nsc31gKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIGVsZW1lbnRzIGFyZSBhbHJlYWR5IGZpbHRlcmVkIGF0IGdlbmVyYXRpb24sIHdlIG9ubHkgbmVlZCB0byBjaGVja1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgZWxlbWVudCBpcyBpbnZvbHZlZCBpbiBtYXRjaGluZy9jb2xvciBpc3N1ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsbCBlbGVtZW50cyBoZXJlIGFscmVhZHkgaGF2ZSBpc3N1ZXMgb3IgYXJlIGdlbmVyaWNcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYXNJc3N1ZXMgfHwgaXNHZW5lcmljIHx8IGlzVW5tYXRjaGVkV2l0aElzc3VlcyB8fCBpc01hdGNoZWRXaXRoSXNzdWVzIHx8IGhhc0NvbG9ySXNzdWVzO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0OiByZXBvcnQsXG4gICAgICAgICAgICAgICAgICAgIHNjcmVlbnNob3RBbmFseXNpcyxcbiAgICAgICAgICAgICAgICAgICAgZG9tQW5hbHlzaXM6IGZpbHRlcmVkRG9tQW5hbHlzaXMsXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yQW5hbHlzaXMsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoaW5nUmVzdWx0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3RhbFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKSAtIHN0YXJ0VGltZTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdcXG7ilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIEnKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRXJyb3IgaW4gZnVsbCBhY2Nlc3NpYmlsaXR5IGFuYWx5c2lzJyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgICAgRmFpbGVkIGFmdGVyICR7KHRvdGFsVGltZSAvIDEwMDApLnRvRml4ZWQoMil9c2ApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgeKUgScpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIHilIFcXG4nKTtcbiAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBJbmRpY2F0ZSBhc3luYyByZXNwb25zZVxuICAgIH1cbiAgICAvLyBIYW5kbGUgb3BlbiB3aW5kb3cgcmVxdWVzdFxuICAgIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gJ29wZW5XaW5kb3cnKSB7XG4gICAgICAgIChhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgY29uZmlnIH0gPSBtZXNzYWdlO1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHdpbmRvdyBhbHJlYWR5IGV4aXN0c1xuICAgICAgICAgICAgICAgIGNvbnN0IHdpbmRvd3MgPSBhd2FpdCBjaHJvbWUud2luZG93cy5nZXRBbGwoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ1dpbmRvdyA9IHdpbmRvd3MuZmluZCh3ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHcudHlwZSAhPT0gJ3BvcHVwJylcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2luZG93IFVSTCBjb250YWlucyAnd2luZG93Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IHcudXJsO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXJsICYmIHR5cGVvZiB1cmwgPT09ICdzdHJpbmcnICYmIHVybC5pbmNsdWRlcygnd2luZG93Lmh0bWwnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9jdXMgZXhpc3Rpbmcgd2luZG93XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGNocm9tZS53aW5kb3dzLnVwZGF0ZShleGlzdGluZ1dpbmRvdy5pZCwgeyBmb2N1c2VkOiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCB3aW5kb3dJZDogZXhpc3RpbmdXaW5kb3cuaWQgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyB3aW5kb3dcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdXaW5kb3cgPSBhd2FpdCBjaHJvbWUud2luZG93cy5jcmVhdGUoe1xuICAgICAgICAgICAgICAgICAgICB1cmw6IGNocm9tZS5ydW50aW1lLmdldFVSTCgnd2luZG93Lmh0bWwnKSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3BvcHVwJyxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDYwMCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiA4MDAsXG4gICAgICAgICAgICAgICAgICAgIGZvY3VzZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoIW5ld1dpbmRvdyB8fCAhbmV3V2luZG93LmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNyZWF0ZSB3aW5kb3cnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgY29uZmlnIGZvciB0aGUgd2luZG93ICh1c2UgYSBzaW5nbGUga2V5LCB3aW5kb3cgd2lsbCBsb2FkIGl0IG9uIGluaXQpXG4gICAgICAgICAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93Q29uZmlnOiBjb25maWdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCB3aW5kb3dJZDogbmV3V2luZG93LmlkIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igb3BlbmluZyB3aW5kb3c6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIEluZGljYXRlIGFzeW5jIHJlc3BvbnNlXG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn0pO1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==