// core/analyzers/recommendationEngine.ts - AI-powered recommendation engine

import { ExternalAPIClient } from '../api/externalApiClient';
import { GoogleWebAIClient } from '../api/googleWebAIClient';
import type { ScreenshotAnalysis, DOMAnalysis, ColorAnalysis, MatchingResult, APIProvider } from '../types';

export interface AccessibilityReport {
    summary: {
        totalIssues: number;
        criticalIssues: number;
        seriousIssues: number;
        moderateIssues: number;
        minorIssues: number;
        wcagLevelA: number;
        wcagLevelAA: number;
        wcagLevelAAA: number;
    };
    recommendations: AccessibilityRecommendation[];
    timestamp: number;
}

export interface AccessibilityRecommendation {
    id: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: 'semantic' | 'aria' | 'contrast' | 'keyboard' | 'generic' | 'label' | 'other';
    title: string;
    description: string;
    wcagCriteria: string[];
    affectedElements: string[];
    fix: string;
    example?: string;
}

/**
 * AI-powered recommendation engine
 * Combines all analysis results and generates contextual recommendations
 */
export class RecommendationEngine {
    private ollamaClient?: ExternalAPIClient;
    private googleWebAIClient?: GoogleWebAIClient;
    private provider: APIProvider;

    constructor(
        provider: APIProvider,
        ollamaClient?: ExternalAPIClient,
        googleWebAIClient?: GoogleWebAIClient
    ) {
        this.provider = provider;
        this.ollamaClient = ollamaClient;
        this.googleWebAIClient = googleWebAIClient;
    }

    /**
     * Generate comprehensive accessibility report from all analysis results
     */
    async generateReport(
        screenshotAnalysis: ScreenshotAnalysis,
        domAnalysis: DOMAnalysis,
        colorAnalysis: ColorAnalysis,
        matchingResult: MatchingResult
    ): Promise<AccessibilityReport> {
        // First, generate structured recommendations without AI
        const structuredRecommendations = this.generateStructuredRecommendations(
            screenshotAnalysis,
            domAnalysis,
            colorAnalysis,
            matchingResult
        );

        // Then, enhance with AI-powered contextual recommendations
        const aiRecommendations = await this.generateAIRecommendations(
            structuredRecommendations,
            screenshotAnalysis,
            domAnalysis,
            colorAnalysis,
            matchingResult
        );

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
    private generateStructuredRecommendations(
        screenshotAnalysis: ScreenshotAnalysis,
        domAnalysis: DOMAnalysis,
        colorAnalysis: ColorAnalysis,
        matchingResult: MatchingResult
    ): AccessibilityRecommendation[] {
        const recommendations: AccessibilityRecommendation[] = [];

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
                } else {
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
            } else if (issue.source === 'ai') {
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
                        domElement = domAnalysis.elements.find(e => 
                            e.className && e.className.split(' ').includes(classMatch[1])
                        );
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
                    } else {
                        const bbox = matchedPair.screenshotElement.bbox;
                        coordinates = `\nPosition: (${Math.round(bbox.x)}, ${Math.round(bbox.y)}), Size: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px`;
                    }
                } else {
                    // Try to find in screenshot elements directly
                    const screenshotElement = screenshotAnalysis.elements.find(e => 
                        e.text && issue.element.toLowerCase().includes(e.text.toLowerCase()) ||
                        issue.element.toLowerCase().includes(e.type) ||
                        (e.text && e.text.toLowerCase().includes(issue.element.toLowerCase()))
                    );
                    
                    if (screenshotElement) {
                        const bbox = screenshotElement.bbox;
                        coordinates = `\nPosition: (${Math.round(bbox.x)}, ${Math.round(bbox.y)}), Size: ${Math.round(bbox.width)}×${Math.round(bbox.height)}px`;
                        
                        // Enhance element info with screenshot data
                        if (screenshotElement.text) {
                            elementInfo = `Element: ${screenshotElement.type} with text "${screenshotElement.text.length > 50 ? screenshotElement.text.substring(0, 50) + '...' : screenshotElement.text}"`;
                        } else {
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
    private async generateAIRecommendations(
        structuredRecommendations: AccessibilityRecommendation[],
        screenshotAnalysis: ScreenshotAnalysis,
        domAnalysis: DOMAnalysis,
        colorAnalysis: ColorAnalysis,
        matchingResult: MatchingResult
    ): Promise<AccessibilityRecommendation[]> {
        // Prepare context for AI
        const context = this.prepareAIContext(
            structuredRecommendations,
            screenshotAnalysis,
            domAnalysis,
            colorAnalysis,
            matchingResult
        );

        const prompt = this.buildRecommendationPrompt(context);

        try {
            let aiResponse: string;
            
            if (this.provider === 'ollama' && this.ollamaClient) {
                const response = await this.ollamaClient.analyzeImage({
                    imageDataUrl: screenshotAnalysis.imageDataUrl,
                    prompt,
                    modelName: 'gemma3:12b'
                });
                aiResponse = response.description;
            } else if (this.provider === 'google-web-ai' && this.googleWebAIClient) {
                const response = await this.googleWebAIClient.analyzeImage({
                    imageDataUrl: screenshotAnalysis.imageDataUrl,
                    prompt
                });
                aiResponse = response.description;
            } else {
                return []; // No AI provider available
            }

            // Parse AI response into recommendations
            return this.parseAIRecommendations(aiResponse);
        } catch (error) {
            console.error('Error generating AI recommendations:', error);
            return [];
        }
    }

    /**
     * Prepare context for AI analysis
     */
    private prepareAIContext(
        structuredRecommendations: AccessibilityRecommendation[],
        screenshotAnalysis: ScreenshotAnalysis,
        domAnalysis: DOMAnalysis,
        colorAnalysis: ColorAnalysis,
        matchingResult: MatchingResult
    ): string {
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
    private buildRecommendationPrompt(context: string): string {
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
    private parseAIRecommendations(aiResponse: string): AccessibilityRecommendation[] {
        const recommendations: AccessibilityRecommendation[] = [];
        
        // Helper to strip HTML tags and clean text
        const stripHtml = (text: string): string => {
            return text
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/&[a-z]+;/gi, '') // Remove HTML entities
                .trim();
        };
        
        // Helper to validate recommendation
        const isValidRecommendation = (rec: Partial<AccessibilityRecommendation>): boolean => {
            if (!rec.title || rec.title.length < 5) return false;
            // Reject if title looks like HTML code
            if (rec.title.includes('<') && rec.title.includes('>')) return false;
            // Reject if title is just HTML tag
            if (rec.title.match(/^<[^>]+>$/)) return false;
            // Reject if description is just HTML code
            if (rec.description && rec.description.match(/^<[^>]+>$/)) return false;
            // Reject if title contains markdown formatting (**, *, #, etc.)
            if (rec.title.match(/^\*+\s*[\d.]+\s*\*+|^\*{2,}|^#{1,6}\s/)) return false;
            // Reject if title looks like a section header (starts with number and asterisks)
            if (rec.title.match(/^\*?\s*[\d.]+\s*[.*]|^[\d.]+\s*[.*]/)) return false;
            // Reject if title and description are the same (likely a parsing error)
            if (rec.title === rec.description) return false;
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
            if (!rec.description || rec.description.length < 10) return false;
            return true;
        };
        
        // Try to extract recommendations from AI response
        const lines = aiResponse.split('\n').filter(line => line.trim());
        
        let currentRec: Partial<AccessibilityRecommendation> | null = null;
        
        for (const line of lines) {
            const cleanLine = stripHtml(line);
            const lowerLine = cleanLine.toLowerCase();
            
            // Skip introductory text or comments before recommendations
            if (!currentRec && (
                lowerLine.includes('here are') || 
                lowerLine.includes('based on') ||
                lowerLine.includes('recommendations:') ||
                lowerLine.includes('following recommendations') ||
                lowerLine.startsWith('provide') ||
                lowerLine.startsWith('i will')
            )) {
                continue; // Skip preamble
            }
            
            // Look for recommendation patterns - must start with number
            if (line.match(/^\d+\./)) {
                if (currentRec && isValidRecommendation(currentRec)) {
                    recommendations.push(currentRec as AccessibilityRecommendation);
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
                        currentRec.priority = priorityMatch[1] as 'critical' | 'high' | 'medium' | 'low';
                    }
                }
                
                // Extract category (must be on a line starting with "Category:")
                if (lowerLine.startsWith('category:')) {
                    const categoryMatch = lowerLine.match(/category:\s*(\w+)/);
                    if (categoryMatch) {
                        const cat = categoryMatch[1].toLowerCase();
                        // Map AI categories to our allowed categories
                        const categoryMap: Record<string, 'semantic' | 'aria' | 'contrast' | 'keyboard' | 'generic' | 'label' | 'other'> = {
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
                        } else {
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
            recommendations.push(currentRec as AccessibilityRecommendation);
        }
        
        return recommendations;
    }

    /**
     * Prioritize recommendations
     */
    private prioritizeRecommendations(
        recommendations: AccessibilityRecommendation[]
    ): AccessibilityRecommendation[] {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        
        return recommendations.sort((a, b) => {
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            
            // If same priority, sort by WCAG level (A > AA > AAA)
            const aLevel = this.getWCAGLevel(a.wcagCriteria);
            const bLevel = this.getWCAGLevel(b.wcagCriteria);
            return aLevel - bLevel;
        });
    }

    /**
     * Get WCAG level (A=1, AA=2, AAA=3)
     */
    private getWCAGLevel(criteria: string[]): number {
        // Simplified - in production, map actual criteria to levels
        if (criteria.some(c => c.includes('AAA'))) return 3;
        if (criteria.some(c => c.includes('AA'))) return 2;
        return 1;
    }

    /**
     * Generate summary statistics
     */
    private generateSummary(
        recommendations: AccessibilityRecommendation[],
        colorAnalysis: ColorAnalysis
    ): AccessibilityReport['summary'] {
        const critical = recommendations.filter(r => r.priority === 'critical').length;
        const serious = recommendations.filter(r => r.priority === 'high').length;
        const moderate = recommendations.filter(r => r.priority === 'medium').length;
        const minor = recommendations.filter(r => r.priority === 'low').length;

        // Count WCAG levels from axe violations
        const wcagLevelA = colorAnalysis.issues.filter(i => 
            i.wcagCriteria?.some(c => c.includes('wcag2a') || c.includes('wcag21a'))
        ).length;
        const wcagLevelAA = colorAnalysis.issues.filter(i => 
            i.wcagCriteria?.some(c => c.includes('wcag2aa') || c.includes('wcag21aa'))
        ).length;
        const wcagLevelAAA = colorAnalysis.issues.filter(i => 
            i.wcagCriteria?.some(c => c.includes('wcag2aaa') || c.includes('wcag21aaa'))
        ).length;

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
    private buildElementIdentifier(element: any): string {
        const parts: string[] = [];
        
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
    private mapAxeCategory(issue: { ruleId?: string; issue: string }): AccessibilityRecommendation['category'] {
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

