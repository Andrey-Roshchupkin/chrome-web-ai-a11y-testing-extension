// core/analyzers/screenshotAnalyzer.ts - Screenshot analysis using external API

import { ExternalAPIClient } from '../api/externalApiClient';
import { GoogleWebAIClient } from '../api/googleWebAIClient';
import type { ScreenshotAnalysis, ScreenshotElement, UIElementType, APIProvider } from '../types';

/**
 * Analyzer for webpage screenshots
 * Supports both Ollama and Google Web AI APIs
 */
export class ScreenshotAnalyzer {
    private ollamaClient?: ExternalAPIClient;
    private googleWebAIClient?: GoogleWebAIClient;
    private defaultModelName: string;
    private provider: APIProvider;

    constructor(
        provider: APIProvider,
        ollamaClient?: ExternalAPIClient,
        googleWebAIClient?: GoogleWebAIClient,
        defaultModelName: string = 'gemma3:12b'
    ) {
        this.provider = provider;
        this.ollamaClient = ollamaClient;
        this.googleWebAIClient = googleWebAIClient;
        this.defaultModelName = defaultModelName;
    }

    /**
     * Analyze screenshot and extract UI elements
     */
    async analyze(imageDataUrl: string, modelName?: string): Promise<ScreenshotAnalysis> {
        const prompt = this.getAnalysisPrompt();
        
        let description: string;
        
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
        } else if (this.provider === 'google-web-ai') {
            if (!this.googleWebAIClient) {
                throw new Error('Google Web AI client is not configured');
            }
            const response = await this.googleWebAIClient.analyzeImage({
                imageDataUrl,
                prompt
            });
            description = response.description;
        } else {
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
    private getAnalysisPrompt(): string {
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
    private getColorAnalysisPrompt(): string {
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
    async analyzeColors(imageDataUrl: string, modelName?: string): Promise<{ description: string; issues: any[] }> {
        const prompt = this.getColorAnalysisPrompt();
        
        let description: string;
        
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
        } else if (this.provider === 'google-web-ai') {
            if (!this.googleWebAIClient) {
                throw new Error('Google Web AI client is not configured');
            }
            const response = await this.googleWebAIClient.analyzeImage({
                imageDataUrl,
                prompt
            });
            description = response.description;
        } else {
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
    private parseColorIssues(description: string): any[] {
        const issues: any[] = [];
        
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
                    let severity: 'critical' | 'serious' | 'moderate' | 'minor' = 'moderate';
                    const lowerText = issueText.toLowerCase();
                    if (lowerText.includes('critical') || lowerText.includes('very low') || lowerText.includes('< 3:1')) {
                        severity = 'critical';
                    } else if (lowerText.includes('serious') || lowerText.includes('low contrast') || lowerText.includes('3:1-4.5:1')) {
                        severity = 'serious';
                    } else if (lowerText.includes('moderate') || lowerText.includes('borderline') || lowerText.includes('4.5:1-5:1')) {
                        severity = 'moderate';
                    } else if (lowerText.includes('minor') || lowerText.includes('slight')) {
                        severity = 'minor';
                    }

                    // Extract WCAG criteria
                    const wcagCriteria: string[] = [];
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
            const lines = description.split('\n').filter(line => 
                line.trim().length > 20 && 
                (line.toLowerCase().includes('contrast') || 
                 line.toLowerCase().includes('color') || 
                 line.toLowerCase().includes('focus') ||
                 line.toLowerCase().includes('issue'))
            );

            for (const line of lines) {
                const lowerLine = line.toLowerCase();
                let severity: 'critical' | 'serious' | 'moderate' | 'minor' = 'moderate';
                
                if (lowerLine.includes('critical') || lowerLine.includes('very low')) {
                    severity = 'critical';
                } else if (lowerLine.includes('serious') || lowerLine.includes('low')) {
                    severity = 'serious';
                } else if (lowerLine.includes('minor') || lowerLine.includes('slight')) {
                    severity = 'minor';
                }

                const wcagCriteria: string[] = [];
                if (lowerLine.includes('contrast')) wcagCriteria.push('1.4.3 Contrast (Minimum)');
                if (lowerLine.includes('color') && lowerLine.includes('only')) wcagCriteria.push('1.4.1 Use of Color');
                if (lowerLine.includes('focus')) wcagCriteria.push('2.4.7 Focus Visible');

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
    private extractElementDescription(text: string): string {
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
    private extractRecommendation(text: string): string {
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
    private isMetadataText(text: string): boolean {
        if (!text) return false;
        
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
    private cleanTextContent(text: string): string {
        if (!text) return '';
        
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
    private parseDescriptionToElements(description: string): ScreenshotElement[] {
        const elements: ScreenshotElement[] = [];
        
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
            let type: UIElementType = 'other';
            let confidence = 0.7;
            
            // Extract type from line (e.g., "Submit" button, "Search" input)
            if (lowerLine.includes(' button') || lowerLine.endsWith(' button')) {
                type = 'button';
                confidence = 0.85;
            } else if (lowerLine.includes(' input') || lowerLine.includes(' input field') || lowerLine.endsWith(' input')) {
                type = 'input';
                confidence = 0.85;
            } else if (lowerLine.includes(' link') || lowerLine.endsWith(' link')) {
                type = 'link';
                confidence = 0.8;
            } else if (lowerLine.includes(' heading') || lowerLine.endsWith(' heading') || lowerLine.match(/h[1-6]/)) {
                type = 'heading';
                confidence = 0.85;
            } else if (lowerLine.includes(' image') || lowerLine.includes(' icon') || lowerLine.endsWith(' image')) {
                type = 'image';
                confidence = 0.8;
            } else if (lowerLine.includes(' menu') || lowerLine.includes(' navigation') || lowerLine.includes(' nav')) {
                type = 'navigation';
                confidence = 0.85;
            } else if (lowerLine.includes(' text') || lowerLine.includes(' paragraph') || lowerLine.endsWith(' text')) {
                type = 'text';
                confidence = 0.7;
            } else if (lowerLine.includes(' form') || lowerLine.includes(' dropdown') || lowerLine.includes(' checkbox') || lowerLine.includes(' radio')) {
                type = 'form';
                confidence = 0.8;
            } else {
                // Try to infer type from content
                if (lowerLine.includes('button') || lowerLine.includes('btn') || lowerLine.includes('submit') || lowerLine.includes('click')) {
                    type = 'button';
                    confidence = 0.8;
                } else if (lowerLine.includes('search') || lowerLine.includes('input') || lowerLine.includes('field')) {
                    type = 'input';
                    confidence = 0.8;
                } else if (lowerLine.includes('link') || lowerLine.includes('anchor') || lowerLine.includes('href')) {
                    type = 'link';
                    confidence = 0.75;
                } else if (lowerLine.includes('heading') || lowerLine.includes('title') || lowerLine.match(/^h[1-6]/)) {
                    type = 'heading';
                    confidence = 0.8;
                } else if (lowerLine.includes('image') || lowerLine.includes('icon') || lowerLine.includes('avatar') || lowerLine.includes('thumbnail')) {
                    type = 'image';
                    confidence = 0.75;
                } else if (lowerLine.includes('menu') || lowerLine.includes('navigation') || lowerLine.includes('nav') || lowerLine.includes('toolbar')) {
                    type = 'navigation';
                    confidence = 0.8;
                } else {
                    // Default to text for longer content
                    if (line.length > 10) {
                        type = 'text';
                        confidence = 0.7;
                    } else {
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
        const uniqueElements = elements.filter((element, index, self) => 
            index === self.findIndex(e => 
                e.text === element.text && 
                e.type === element.type
            )
        );
        
        return uniqueElements;
    }
}

