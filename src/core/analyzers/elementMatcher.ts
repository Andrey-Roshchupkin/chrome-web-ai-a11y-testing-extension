// core/analyzers/elementMatcher.ts - Matches screenshot elements with DOM elements

import type { ScreenshotElement, DOMElement, MatchedPair, MatchingResult, BoundingBox } from '../types';

/**
 * Matches visual elements from screenshots with DOM elements
 * Identifies mismatches, missing elements, and accessibility issues
 */
export class ElementMatcher {
    /**
     * Match screenshot elements with DOM elements
     * @param screenshotElements - Elements detected from screenshot
     * @param domElements - Elements from DOM analysis
     */
    match(screenshotElements: ScreenshotElement[], domElements: DOMElement[]): MatchingResult {
        const matched: MatchedPair[] = [];
        const unmatchedScreenshot: ScreenshotElement[] = [];
        const unmatchedDOM: DOMElement[] = [];
        
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
            } else {
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
    private findBestMatch(
        screenshotElement: ScreenshotElement,
        domElements: DOMElement[]
    ): MatchedPair | null {
        if (domElements.length === 0) {
            return null;
        }
        
        let bestMatch: MatchedPair | null = null;
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
    private calculateMatchScore(
        screenshotElement: ScreenshotElement,
        domElement: DOMElement
    ): number {
        let score = 0;
        let factors = 0;
        
        // Factor 1: Position overlap (40% weight)
        const positionScore = this.calculatePositionOverlap(
            screenshotElement.bbox,
            domElement.bbox
        );
        score += positionScore * 0.4;
        factors += 0.4;
        
        // Factor 2: Type match (30% weight)
        const typeScore = this.calculateTypeMatch(
            screenshotElement.type,
            domElement.tagName,
            domElement.isGeneric,
            domElement.genericType
        );
        score += typeScore * 0.3;
        factors += 0.3;
        
        // Factor 3: Text content match (20% weight)
        const textScore = this.calculateTextMatch(
            screenshotElement.text,
            domElement.text
        );
        score += textScore * 0.2;
        factors += 0.2;
        
        // Factor 4: Size similarity (10% weight)
        const sizeScore = this.calculateSizeSimilarity(
            screenshotElement.bbox,
            domElement.bbox
        );
        score += sizeScore * 0.1;
        factors += 0.1;
        
        // Normalize score
        return factors > 0 ? score / factors : 0;
    }

    /**
     * Calculate position overlap between two bounding boxes
     */
    private calculatePositionOverlap(bbox1: BoundingBox, bbox2: BoundingBox): number {
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
    private calculateTypeMatch(
        screenshotType: ScreenshotElement['type'],
        domTagName: string,
        isGeneric?: boolean,
        genericType?: DOMElement['genericType']
    ): number {
        // Map screenshot types to DOM tag names
        const typeMap: Record<string, string[]> = {
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
    private calculateTextMatch(text1?: string, text2?: string): number {
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
    private calculateSizeSimilarity(bbox1: BoundingBox, bbox2: BoundingBox): number {
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
    private analyzeMatches(matched: MatchedPair[]): void {
        for (const pair of matched) {
            const issues: string[] = [];
            
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
    private checkTypeMismatch(
        screenshotType: ScreenshotElement['type'],
        domTagName: string,
        isGeneric?: boolean,
        genericType?: DOMElement['genericType']
    ): string | null {
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

