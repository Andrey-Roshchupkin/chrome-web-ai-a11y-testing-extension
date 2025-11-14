// shared/uiHelpers.ts - Shared UI helper functions for the extension window

/**
 * Escapes HTML to prevent XSS and display issues
 */
export function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Formats accessibility report results for copying to clipboard
 */
export function formatResultsForCopy(results: any): string {
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
            report.recommendations.forEach((rec: any, index: number) => {
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
export function renderAccessibilityReport(
    report: any,
    targetElement: HTMLElement
): void {
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
                ${recommendations.map((rec: any, index: number) => `
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
                                rec.wcagCriteria.map((c: string) => `<span class="wcag-badge">WCAG ${escapeHtml(c)}</span>`).join(' ') 
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

