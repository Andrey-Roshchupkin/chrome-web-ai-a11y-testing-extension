// shared/types.ts - Common types and interfaces used across the extension UI components

export interface ScreenshotResponse {
    success: boolean;
    dataUrl?: string;
    error?: string;
}

export type APIProvider = 'ollama' | 'google-web-ai';

// Message types for communication between UI and background
export interface CaptureScreenshotMessage {
    action: 'captureScreenshot';
}

export interface OpenWindowMessage {
    action: 'openWindow';
    config: {
        provider: APIProvider;
        apiUrl?: string;
        apiKey?: string;
        modelName?: string;
        outputLanguage?: string;
    };
}

export interface AnalyzeScreenshotExternalMessage {
    action: 'analyzeScreenshotExternal';
    imageDataUrl: string;
    config: {
        provider: APIProvider;
        apiUrl?: string;
        apiKey?: string;
        modelName?: string;
        outputLanguage?: string;
    };
}

export interface AnalyzeAccessibilityMessage {
    action: 'analyzeAccessibility';
    imageDataUrl: string;
    config: {
        provider: APIProvider;
        apiUrl?: string;
        apiKey?: string;
        modelName?: string;
        outputLanguage?: string;
    };
}

export type ExtensionMessage = 
    | CaptureScreenshotMessage 
    | AnalyzeScreenshotExternalMessage 
    | AnalyzeAccessibilityMessage 
    | OpenWindowMessage;

