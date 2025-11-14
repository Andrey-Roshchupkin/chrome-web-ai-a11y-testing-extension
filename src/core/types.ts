// core/types.ts - Common types for accessibility analysis

// Screenshot analysis types
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type UIElementType = 
    | 'button' 
    | 'input' 
    | 'text' 
    | 'image' 
    | 'link' 
    | 'heading' 
    | 'list' 
    | 'navigation'
    | 'form'
    | 'other';

export interface ScreenshotElement {
    id: string;
    type: UIElementType;
    text?: string;           // Extracted text from OCR
    bbox: BoundingBox;
    confidence: number;
}

export interface ScreenshotAnalysis {
    elements: ScreenshotElement[];
    timestamp: number;
    imageDataUrl: string;
    description?: string;    // Raw description from API
}

// DOM analysis types
export interface DOMElement {
    id: string;
    tagName: string;
    selector?: string;       // CSS selector for the element (e.g., "#submit-btn", ".button-primary", "div.nav > a")
    elementId?: string;      // HTML id attribute (if exists)
    className?: string;      // HTML class attribute (if exists)
    semanticTag?: string;    // Recommended semantic tag
    text?: string;
    ariaLabel?: string;
    ariaRole?: string;
    ariaAttributes?: Record<string, string>;
    bbox: BoundingBox;
    isGeneric?: boolean;     // True if element is generic (div/span) used as interactive
    genericType?: 'button' | 'link' | 'form-control' | 'interactive'; // Type of generic element
    recommendations: {
        semantic?: string;   // Semantic recommendation
        aria?: string[];      // ARIA recommendations
        issues: string[];    // Found issues
        wcagCriteria?: string[]; // Related WCAG 2.1 criteria
    };
}

export interface DOMAnalysis {
    elements: DOMElement[];
    timestamp: number;
}

// Color analysis types (using axe-core)
export interface ColorIssue {
    element: string;         // Selector or description
    issue: string;           // Description of the issue
    severity: 'minor' | 'moderate' | 'serious' | 'critical';
    recommendation: string;
    wcagCriteria?: string[]; // WCAG criteria tags (e.g., ['wcag2a', 'wcag21aa'])
    ruleId?: string;         // Axe-core rule ID or AI-generated ID
    source?: 'axe-core' | 'ai' | 'both'; // Source of detection
    estimatedContrast?: number; // Estimated contrast ratio (from AI)
}

export interface ColorAnalysis {
    issues: ColorIssue[];
    timestamp: number;
}

// Matching types
export interface MatchedPair {
    screenshotElement: ScreenshotElement;
    domElement?: DOMElement;  // undefined if no match found
    matchScore: number;        // 0-1
    issues: string[];          // Found mismatches
}

export interface MatchingResult {
    matched: MatchedPair[];
    unmatchedScreenshot: ScreenshotElement[];  // Elements only in screenshot
    unmatchedDOM: DOMElement[];                // Elements only in DOM
}

// Configuration
export type APIProvider = 'ollama' | 'google-web-ai';

export interface AccessibilityAIConfig {
    provider: APIProvider;
    // Ollama-specific config
    apiUrl?: string;          // Required for Ollama
    apiKey?: string;          // Optional for Ollama
    modelName?: string;       // Required for Ollama
    // Google Web AI-specific config
    outputLanguage?: string;  // Optional for Google Web AI (default: 'en')
}

