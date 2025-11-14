// core/api/externalApiClient.ts - Client for external LLM APIs (Ollama, etc.)

export interface ExternalAPIConfig {
    apiUrl: string;
    apiKey?: string;
}

export interface VisionAnalysisRequest {
    imageDataUrl: string;
    prompt: string;
    modelName: string;
}

export interface ExternalAPIResponse {
    description: string;
    rawResponse: any;
}

/**
 * Client for external vision-language model APIs
 * Supports Ollama and similar APIs
 */
export class ExternalAPIClient {
    private config: ExternalAPIConfig;

    constructor(config: ExternalAPIConfig) {
        this.config = config;
    }

    /**
     * Analyze image using external API
     * Tries /api/chat first, falls back to /api/generate if needed
     */
    async analyzeImage(request: VisionAnalysisRequest): Promise<ExternalAPIResponse> {
        const { imageDataUrl, prompt, modelName } = request;
        
        // Convert data URL to base64
        const base64Image = imageDataUrl.split(',')[1];
        
        // Try /api/chat first (preferred for vision models)
        let url = `${this.config.apiUrl.replace(/\/$/, '')}/api/chat`;
        let requestBody = {
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                    images: [base64Image]
                }
            ],
            stream: false
        };
        
        console.log('Sending request to:', url);
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        let response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
        });

        // If /api/chat fails with 404 or 405, try /api/generate as fallback
        if (!response.ok && (response.status === 404 || response.status === 405)) {
            console.log('Trying /api/generate as fallback...');
            url = `${this.config.apiUrl.replace(/\/$/, '')}/api/generate`;
            requestBody = {
                model: modelName,
                prompt: prompt,
                images: [base64Image],
                stream: false
            } as any;
            
            response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API request failed: ${response.status}`;
            
            // Provide helpful error messages
            if (response.status === 403) {
                errorMessage += `\n\nОшибка доступа (403). Для Ollama необходимо настроить CORS:\n` +
                    `1. Остановите Ollama\n` +
                    `2. Запустите с переменной окружения:\n` +
                    `   OLLAMA_ORIGINS=chrome-extension://* ollama serve\n` +
                    `   или экспортируйте переменную:\n` +
                    `   export OLLAMA_ORIGINS=chrome-extension://*\n` +
                    `   ollama serve\n\n` +
                    `Детали ошибки: ${errorText}`;
            } else if (response.status === 404) {
                errorMessage += `\n\nЭндпоинт не найден. Проверьте URL API и убедитесь, что сервер запущен.\nДетали: ${errorText}`;
            } else {
                errorMessage += `\n\nДетали: ${errorText}`;
            }
            
            throw new Error(errorMessage);
        }

        const result = await response.json();
        
        // Extract response text - Ollama /api/chat returns message.content, /api/generate returns response
        const description = result.message?.content || result.response || result.text || JSON.stringify(result);
        
        console.log('External API response:', description);
        
        return {
            description,
            rawResponse: result
        };
    }
}

