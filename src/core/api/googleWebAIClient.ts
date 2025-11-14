// core/api/googleWebAIClient.ts - Client for Google Web AI (Prompt API)

// Declare global LanguageModel API (available in Chrome 139+)
declare global {
    interface LanguageModel {
        create(options: {
            expectedInputs: Array<{ type: 'image' | 'text' }>;
            outputLanguage?: string;
        }): Promise<LanguageModelSession>;
        availability(): Promise<string | boolean>;
    }

    interface LanguageModelSession {
        prompt(messages: Array<{
            role: 'user';
            content: Array<{ type: 'text' | 'image'; value: string | File }>;
        }>): Promise<any>;
    }

    var LanguageModel: LanguageModel | undefined;
}

export interface GoogleWebAIConfig {
    outputLanguage?: string; // 'en', 'es', 'ja' - default 'en'
}

export interface VisionAnalysisRequest {
    imageDataUrl: string;
    prompt: string;
}

export interface GoogleWebAIResponse {
    description: string;
    rawResponse: any;
}

/**
 * Client for Google Web AI (Prompt API)
 * Uses built-in LanguageModel API in Chrome
 */
export class GoogleWebAIClient {
    private config: GoogleWebAIConfig;

    constructor(config: GoogleWebAIConfig = {}) {
        this.config = {
            outputLanguage: config.outputLanguage || 'en'
        };
    }

    /**
     * Check if Google Web AI is available
     */
    static async isAvailable(): Promise<boolean> {
        if (typeof LanguageModel === 'undefined' || !LanguageModel.availability) {
            return false;
        }
        try {
            const availability = await LanguageModel.availability();
            return availability === 'available' || availability === true;
        } catch {
            return false;
        }
    }

    /**
     * Analyze image using Google Web AI (Prompt API)
     */
    async analyzeImage(request: VisionAnalysisRequest): Promise<GoogleWebAIResponse> {
        const { imageDataUrl, prompt } = request;

        // Check if API is available
        if (typeof LanguageModel === 'undefined' || !LanguageModel.create) {
            throw new Error('Google Web AI (LanguageModel API) is not available. Make sure you have Chrome 139+ with the required flags enabled.');
        }

        // Convert data URL to File/Blob
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'screenshot.png', { type: 'image/png' });

        // Create session with image and text inputs
        const session = await LanguageModel.create({
            expectedInputs: [
                { type: 'image' },
                { type: 'text' }
            ],
            outputLanguage: this.config.outputLanguage
        });

        // Prepare user message
        const userMessage: {
            role: 'user';
            content: Array<{ type: 'text' | 'image'; value: string | File }>;
        } = {
            role: 'user' as const,
            content: [
                { type: 'text' as const, value: prompt },
                { type: 'image' as const, value: file }
            ]
        };

        // Send prompt
        const result = await session.prompt([userMessage]);

        // Extract description from response
        let description = '';
        
        if (typeof result === 'string') {
            description = result;
        } else if (result?.[0]?.content) {
            const content = result[0].content;
            if (Array.isArray(content)) {
                description = content.map(c => c.text || JSON.stringify(c)).join('\n');
            } else if (typeof content === 'string') {
                description = content;
            } else {
                description = JSON.stringify(content);
            }
        } else if (result?.outputText) {
            description = result.outputText;
        } else if (result?.choices && result.choices[0]?.message?.content) {
            description = result.choices[0].message.content;
        } else if (result?.text) {
            description = result.text;
        } else if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'string') {
            description = result[0];
        } else {
            description = JSON.stringify(result, null, 2);
        }

        return {
            description,
            rawResponse: result
        };
    }
}

