// core/index.ts - Accessibility AI Analyzer class

import { ExternalAPIClient } from './api/externalApiClient';
import { GoogleWebAIClient } from './api/googleWebAIClient';
import { ScreenshotAnalyzer } from './analyzers/screenshotAnalyzer';
import { DOMAnalyzer } from './analyzers/domAnalyzer';
import { ColorAnalyzer } from './analyzers/colorAnalyzer';
import { ElementMatcher } from './analyzers/elementMatcher';
import { RecommendationEngine, type AccessibilityReport } from './analyzers/recommendationEngine';
import type { AccessibilityAIConfig, ScreenshotAnalysis, DOMAnalysis, ColorAnalysis, MatchingResult, ColorIssue } from './types';

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
export class AccessibilityAIAnalyzer {
    private config: AccessibilityAIConfig;
    private ollamaClient?: ExternalAPIClient;
    private googleWebAIClient?: GoogleWebAIClient;
    private screenshotAnalyzer: ScreenshotAnalyzer;
    private domAnalyzer: DOMAnalyzer;
    private colorAnalyzer: ColorAnalyzer;
    private elementMatcher: ElementMatcher;
    private recommendationEngine: RecommendationEngine;

    constructor(config: AccessibilityAIConfig) {
        this.config = config;
        
        // Initialize API clients based on provider
        if (config.provider === 'ollama') {
            if (!config.apiUrl || !config.modelName) {
                throw new Error('Ollama provider requires apiUrl and modelName');
            }
            this.ollamaClient = new ExternalAPIClient({
                apiUrl: config.apiUrl,
                apiKey: config.apiKey
            });
        } else if (config.provider === 'google-web-ai') {
            this.googleWebAIClient = new GoogleWebAIClient({
                outputLanguage: config.outputLanguage || 'en'
            });
        } else {
            throw new Error(`Unsupported provider: ${config.provider}`);
        }
        
        // Initialize analyzers
        this.screenshotAnalyzer = new ScreenshotAnalyzer(
            config.provider,
            this.ollamaClient,
            this.googleWebAIClient,
            config.modelName || 'gemma3:12b'
        );
        this.domAnalyzer = new DOMAnalyzer();
        this.colorAnalyzer = new ColorAnalyzer();
        this.elementMatcher = new ElementMatcher();
        this.recommendationEngine = new RecommendationEngine(
            config.provider,
            this.ollamaClient,
            this.googleWebAIClient
        );
    }

    /**
     * Analyze screenshot and extract UI elements
     * @param imageDataUrl - Data URL of the screenshot
     * @param modelName - Optional model name override
     */
    async analyzeScreenshot(imageDataUrl: string, modelName?: string): Promise<ScreenshotAnalysis> {
        return this.screenshotAnalyzer.analyze(imageDataUrl, modelName);
    }

    /**
     * Analyze DOM tree for accessibility issues
     * @param htmlOrElement - HTML string or DOM element
     */
    async analyzeDOM(htmlOrElement: string | Element): Promise<DOMAnalysis> {
        return this.domAnalyzer.analyze(htmlOrElement);
    }

    /**
     * Analyze color contrast and accessibility using axe-core
     * @param tabId - Chrome tab ID (for extension context)
     * @param context - DOM element, document, or window object (for direct DOM access)
     * @param executeScriptFunc - Optional function to execute script on page (for fallback)
     */
    async analyzeColors(tabId?: number, context?: any, executeScriptFunc?: (func: () => any) => Promise<any>): Promise<ColorAnalysis> {
        return this.colorAnalyzer.analyze(tabId, context, executeScriptFunc);
    }

    /**
     * Analyze colors and contrast using AI vision model
     * @param imageDataUrl - Screenshot data URL
     * @param modelName - Optional model name override
     */
    async analyzeColorsWithAI(imageDataUrl: string, modelName?: string): Promise<ColorAnalysis> {
        const aiAnalysis = await this.screenshotAnalyzer.analyzeColors(imageDataUrl, modelName);
        
        // Convert AI issues to ColorIssue format
        const issues: ColorIssue[] = aiAnalysis.issues.map((issue: any, index: number) => ({
            element: issue.element,
            issue: issue.issue,
            severity: issue.severity,
            recommendation: issue.recommendation,
            wcagCriteria: issue.wcagCriteria,
            ruleId: `ai-${issue.severity}-${Date.now()}-${index}`, // Generate unique ID
            source: 'ai' as const, // Mark as AI-detected
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
    matchElements(screenshotAnalysis: ScreenshotAnalysis, domAnalysis: DOMAnalysis): MatchingResult {
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
    async generateReport(
        screenshotAnalysis: ScreenshotAnalysis,
        domAnalysis: DOMAnalysis,
        colorAnalysis: ColorAnalysis,
        matchingResult: MatchingResult
    ): Promise<AccessibilityReport> {
        return this.recommendationEngine.generateReport(
            screenshotAnalysis,
            domAnalysis,
            colorAnalysis,
            matchingResult
        );
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<AccessibilityAIConfig>): void {
        const newConfig = { ...this.config, ...config };
        
        // Reinitialize if provider changed or relevant config changed
        if (config.provider || config.apiUrl || config.apiKey !== undefined || config.outputLanguage !== undefined) {
            this.config = newConfig;
            
            if (newConfig.provider === 'ollama') {
                if (!newConfig.apiUrl || !newConfig.modelName) {
                    throw new Error('Ollama provider requires apiUrl and modelName');
                }
                this.ollamaClient = new ExternalAPIClient({
                    apiUrl: newConfig.apiUrl!,
                    apiKey: newConfig.apiKey
                });
                this.googleWebAIClient = undefined;
            } else if (newConfig.provider === 'google-web-ai') {
                this.googleWebAIClient = new GoogleWebAIClient({
                    outputLanguage: newConfig.outputLanguage || 'en'
                });
                this.ollamaClient = undefined;
            }
            
            this.screenshotAnalyzer = new ScreenshotAnalyzer(
                newConfig.provider,
                this.ollamaClient,
                this.googleWebAIClient,
                newConfig.modelName || 'gemma3:12b'
            );
            this.recommendationEngine = new RecommendationEngine(
                newConfig.provider,
                this.ollamaClient,
                this.googleWebAIClient
            );
        } else {
            this.config = newConfig;
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): AccessibilityAIConfig {
        return { ...this.config };
    }
}

// Export types
export type * from './types';
export type { AccessibilityReport, AccessibilityRecommendation } from './analyzers/recommendationEngine';

