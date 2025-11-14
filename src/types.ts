// types.ts - Common types for accessibility analysis

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
}

// DOM analysis types
export interface DOMElement {
    id: string;
    tagName: string;
    semanticTag?: string;    // Recommended semantic tag
    text?: string;
    ariaLabel?: string;
    ariaRole?: string;
    ariaAttributes?: Record<string, string>;
    bbox: BoundingBox;
    recommendations: {
        semantic?: string;   // Semantic recommendation
        aria?: string[];      // ARIA recommendations
        issues: string[];    // Found issues
    };
}

export interface DOMAnalysis {
    elements: DOMElement[];
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

// Message types
export interface AnalyzeScreenshotMessage {
    action: 'analyzeScreenshot';
    imageDataUrl: string;
}

export interface AnalyzeDOMMessage {
    action: 'analyzeDOM';
    tabId: number;
}

export interface MatchElementsMessage {
    action: 'matchElements';
    screenshotAnalysis: ScreenshotAnalysis;
    domAnalysis: DOMAnalysis;
}

export type AnalysisMessage = 
    | AnalyzeScreenshotMessage 
    | AnalyzeDOMMessage 
    | MatchElementsMessage;

