// core/analyzers/colorAnalyzer.ts - Color contrast and WCAG analysis using axe-core

import type { ColorAnalysis, ColorIssue } from '../types';

// Import axe-core types
interface AxeResults {
    violations: AxeViolation[];
    passes: AxeRule[];
    incomplete: AxeRule[];
    inapplicable: AxeRule[];
}

interface AxeViolation {
    id: string;
    impact: 'minor' | 'moderate' | 'serious' | 'critical';
    description: string;
    help: string;
    helpUrl: string;
    tags: string[];
    nodes: AxeNode[];
}

interface AxeRule {
    id: string;
    impact?: 'minor' | 'moderate' | 'serious' | 'critical';
    description: string;
    help: string;
    helpUrl: string;
    tags: string[];
    nodes: AxeNode[];
}

interface AxeNode {
    html: string;
    target: string[];
    failureSummary?: string;
    any: AxeCheck[];
    all: AxeCheck[];
    none: AxeCheck[];
}

interface AxeCheck {
    id: string;
    impact: string;
    message: string;
    data: any;
    relatedNodes?: AxeNode[];
}

/**
 * Analyzer for color contrast and accessibility using axe-core
 * Runs automated WCAG 2.1 checks
 */
export class ColorAnalyzer {
    private axeLoaded: boolean = false;

    /**
     * Analyze accessibility issues on a page using axe-core
     * In Chrome extension context, this should be called from background script
     * which communicates with content script where axe-core runs
     * @param tabId - Chrome tab ID (for extension context)
     * @param context - DOM element, document, or window object (for direct DOM access)
     * @param executeScriptFunc - Optional function to execute script on page (for fallback)
     */
    async analyze(tabId?: number, context?: any, executeScriptFunc?: (func: () => any) => Promise<any>): Promise<ColorAnalysis> {
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
                } catch (error) {
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
            } catch (error) {
                // Fallback to executeScript if content script is not available
                if (executeScriptFunc) {
                    try {
                        // Define the function inline to be executed on the page
                        const runAxeOnPage = (): Promise<any> => {
                            return new Promise((resolve) => {
                                // Check if axe-core is already available
                                if (typeof (window as any).axe !== 'undefined') {
                                    const axe = (window as any).axe;
                                    axe.run(document, {
                                        runOnly: {
                                            type: 'tag',
                                            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
                                        }
                                    }, (err: Error | null, results: any) => {
                                        if (err) {
                                            resolve({ violations: [], passes: [], incomplete: [], inapplicable: [] });
                                        } else {
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
                                        if (typeof (window as any).axe !== 'undefined') {
                                            const axe = (window as any).axe;
                                            axe.run(document, {
                                                runOnly: {
                                                    type: 'tag',
                                                    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
                                                }
                                            }, (err: Error | null, results: any) => {
                                                if (err) {
                                                    resolve({ violations: [], passes: [], incomplete: [], inapplicable: [] });
                                                } else {
                                                    resolve(results);
                                                }
                                            });
                                        } else {
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
                    } catch (executeError) {
                        console.error('Error running axe-core via executeScript:', executeError);
                    }
                } else {
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
    private async runAxeViaContentScript(tabId: number): Promise<AxeResults> {
        // Try content script first
        try {
            return await new Promise<AxeResults>((resolve, reject) => {
                chrome.tabs.sendMessage(tabId, { action: 'runAxeAnalysis' }, (response) => {
                    if (chrome.runtime.lastError) {
                        // Content script not available, will use executeScript fallback
                        reject(new Error('Content script not available'));
                        return;
                    }
                    
                    if (response && response.success) {
                        resolve(response.results);
                    } else {
                        reject(new Error(response?.error || 'Unknown error'));
                    }
                });
            });
        } catch (error) {
            // Fallback: use executeScript to run axe-core directly on the page
            // This requires the function to be passed from background script
            throw new Error('Content script not available, use executeScript fallback');
        }
    }

    /**
     * Run axe-core analysis
     */
    private async runAxe(context: any): Promise<AxeResults> {
        // Check if we're in a browser context with axe-core
        if (typeof window !== 'undefined' && (window as any).axe) {
            const axe = (window as any).axe;
            return new Promise((resolve, reject) => {
                axe.run(context, {
                    runOnly: {
                        type: 'tag',
                        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
                    }
                }, (err: Error | null, results: AxeResults) => {
                    if (err) {
                        reject(err);
                    } else {
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
    combineWithAI(axeAnalysis: ColorAnalysis, aiAnalysis: ColorAnalysis): ColorAnalysis {
        const combinedIssues: ColorIssue[] = [];
        const seenIssues = new Set<string>();

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
                } else {
                    combinedIssues.push({
                        ...issue,
                        source: 'ai'
                    });
                }
                seenIssues.add(key);
            } else {
                // If both found the same issue, mark as confirmed and increase severity
                const existingIndex = combinedIssues.findIndex(i => 
                    i.element === issue.element && 
                    i.issue.substring(0, 50) === issue.issue.substring(0, 50)
                );
                if (existingIndex !== -1) {
                    const existing = combinedIssues[existingIndex];
                    // Upgrade severity if both detected it
                    if (existing.severity === 'minor' && issue.severity !== 'minor') {
                        existing.severity = issue.severity;
                    } else if (existing.severity === 'moderate' && 
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
    private convertAxeViolationsToIssues(results: AxeResults): ColorIssue[] {
        const issues: ColorIssue[] = [];
        
        for (const violation of results.violations) {
            for (const node of violation.nodes) {
                // Extract WCAG criteria from tags
                const wcagTags = violation.tags.filter(tag => 
                    tag.startsWith('wcag') || tag.startsWith('wcag2')
                );
                
                // Map impact to severity
                const severity = this.mapImpactToSeverity(violation.impact);
                
                // Create issue description
                const description = `${violation.description}. ${node.failureSummary || ''}`;
                
                // Create recommendation
                const recommendation = `${violation.help}. See: ${violation.helpUrl}`;
                
                issues.push({
                    element: node.target.join(' '), // CSS selector
                    issue: description,
                    source: 'axe-core' as const, // Mark as axe-core detected
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
    private mapImpactToSeverity(impact?: 'minor' | 'moderate' | 'serious' | 'critical'): ColorIssue['severity'] {
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
    private isAxeAvailable(): boolean {
        if (typeof window !== 'undefined') {
            return typeof (window as any).axe !== 'undefined';
        }
        return false;
    }

    /**
     * Ensure axe-core is loaded
     * In Chrome extension context, axe-core should be injected via content script
     */
    private async ensureAxeCore(): Promise<void> {
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
            } catch (error) {
                console.warn('Could not load axe-core:', error);
            }
        }
    }
}
