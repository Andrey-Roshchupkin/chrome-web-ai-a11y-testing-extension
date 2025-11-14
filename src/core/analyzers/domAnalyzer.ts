// core/analyzers/domAnalyzer.ts - DOM tree analysis for accessibility

import type { DOMAnalysis, DOMElement, BoundingBox } from '../types';

/**
 * Analyzer for DOM tree accessibility
 * Extracts semantic information, ARIA attributes, detects generic elements, and provides recommendations
 */
export class DOMAnalyzer {
    /**
     * Analyze DOM tree from HTML string or DOM element
     * Works in content script context where DOM is available
     */
    async analyze(htmlOrElement: string | Element): Promise<DOMAnalysis> {
        let rootElement: Element;
        
        if (typeof htmlOrElement === 'string') {
            // Parse HTML string
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlOrElement, 'text/html');
            rootElement = doc.documentElement;
        } else {
            rootElement = htmlOrElement;
        }
        
        const elements: DOMElement[] = [];
        
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
    private analyzeElement(element: Element): DOMElement | null {
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
    private detectGenericElement(element: Element): { isGeneric: boolean; type?: 'button' | 'link' | 'form-control' | 'interactive' } {
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
        } catch (e) {
            // Can't access computed style in some contexts
        }
        
        // Determine if generic and what type
        if (hasOnClick || hasRole || hasTabIndex || hasKeyboardHandler || hasPointerCursor || isContentEditable) {
            let type: 'button' | 'link' | 'form-control' | 'interactive' = 'interactive';
            
            // Determine specific type
            if (role === 'button' || (hasOnClick && !role)) {
                type = 'button';
            } else if (role === 'link' || role === 'tab') {
                type = 'link';
            } else if (isContentEditable || role === 'textbox' || role === 'combobox') {
                type = 'form-control';
            }
            
            return { isGeneric: true, type };
        }
        
        return { isGeneric: false };
    }

    /**
     * Analyze element for accessibility issues
     */
    private analyzeAccessibility(
        element: Element, 
        genericInfo: { isGeneric: boolean; type?: string }
    ): DOMElement['recommendations'] {
        const issues: string[] = [];
        const ariaRecommendations: string[] = [];
        const wcagCriteria: string[] = [];
        let semanticRecommendation: string | undefined;
        
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
        
        if (element.hasAttribute('role') && !this.isValidAriaRole(element.getAttribute('role')!)) {
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
    private getSemanticRecommendation(
        element: Element, 
        genericInfo: { isGeneric: boolean; type?: string }
    ): string | undefined {
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
    private hasAssociatedLabel(element: Element): boolean {
        // Check for id and label with for attribute
        const id = element.getAttribute('id');
        if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label) return true;
        }
        
        // Check for label parent
        const labelParent = element.closest('label');
        if (labelParent) return true;
        
        // Check for aria-label or aria-labelledby
        if (element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby')) {
            return true;
        }
        
        return false;
    }

    /**
     * Check if ARIA role is valid
     */
    private isValidAriaRole(role: string): boolean {
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
    private extractAriaAttributes(element: Element): Record<string, string> {
        const ariaAttrs: Record<string, string> = {};
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
    private extractTextContent(element: Element): string | null {
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
    private generateElementId(element: Element): string {
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
    private getBoundingBox(element: Element): BoundingBox {
        try {
            const rect = element.getBoundingClientRect();
            return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
        } catch (e) {
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
    private shouldSkipElement(element: Element): boolean {
        const tagName = element.tagName.toLowerCase();
        const skipTags = ['script', 'style', 'meta', 'link', 'noscript', 'template'];
        return skipTags.includes(tagName);
    }
}
