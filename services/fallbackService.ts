
// Alternative AI Service Provider
// Provides fallback options when Google Generative Language API is unavailable

export interface AlternativeProvider {
  name: string;
  generateText: (prompt: string, options?: any) => Promise<string>;
  generateImage: (prompt: string, options?: any) => Promise<string>;
  supported?: boolean;
}

// OpenRouter Provider - Multiple LLMs in one API
export class OpenRouterProvider implements AlternativeProvider {
  name = 'OpenRouter';
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(prompt: string, options: any = {}): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'google/gemini-pro',
        messages: [{ role: 'user', content: prompt }],
        ...options
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async generateImage(prompt: string, options: any = {}): Promise<string> {
    // OpenRouter doesn't support image generation directly
    throw new Error('OpenRouter does not support image generation. Use Replicate or another provider.');
  }

  get supported(): boolean {
    return !!this.apiKey;
  }
}

// Replicate Provider - ML models as API
export class ReplicateProvider implements AlternativeProvider {
  name = 'Replicate';
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(prompt: string, options: any = {}): Promise<string> {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'a80c0ce602642421a8d5a6bbf77a7a1a0b9e7b0e7e7e6e6e6e6e6e6e6e6e6e6', // Example model version
        input: {
          prompt,
          ...options
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    const prediction = await response.json();
    
    // Poll for completion
    let result = prediction;
    while (result.status === 'processing' || result.status === 'starting') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
        }
      });
      result = await pollResponse.json();
    }

    return result.output?.[0] || '';
  }

  async generateImage(prompt: string, options: any = {}): Promise<string> {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4', // Stable Diffusion
        input: {
          prompt,
          width: options.width || 512,
          height: options.height || 512,
          num_outputs: 1,
          ...options
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    const prediction = await response.json();
    
    // Poll for completion
    let result = prediction;
    while (result.status === 'processing' || result.status === 'starting') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
        }
      });
      result = await pollResponse.json();
    }

    return result.output?.[0] || '';
  }

  get supported(): boolean {
    return !!this.apiKey;
  }
}

// SeaArt Provider - Free tier available
export class SeaArtProvider implements AlternativeProvider {
  name = 'SeaArt';
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(prompt: string, options: any = {}): Promise<string> {
    // SeaArt primarily focuses on image generation
    throw new Error('SeaArt does not support text generation. Use OpenRouter or another provider.');
  }

  async generateImage(prompt: string, options: any = {}): Promise<string> {
    const response = await fetch('https://api.seaart.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        style: options.style || 'realistic',
        ...options
      })
    });

    if (!response.ok) {
      throw new Error(`SeaArt API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.image_url;
  }

  get supported(): boolean {
    return !!this.apiKey;
  }
}

// Fallback Service Manager
export class FallbackService {
  private providers: AlternativeProvider[] = [];
  private initialized = false;

  constructor() {
    // Defer initialization to avoid accessing import.meta.env at module load time.
  }

  private initialize() {
    if (this.initialized) return;

    // Initialize providers with API keys from environment
    // Safe access to import.meta.env
    const openRouterKey = import.meta.env?.VITE_OPENROUTER_API_KEY;
    const replicateKey = import.meta.env?.VITE_REPLICATE_API_KEY;
    const seaArtKey = import.meta.env?.VITE_SEAART_API_KEY;

    if (openRouterKey) {
      this.providers.push(new OpenRouterProvider(openRouterKey));
    }

    if (replicateKey) {
      this.providers.push(new ReplicateProvider(replicateKey));
    }

    if (seaArtKey) {
      this.providers.push(new SeaArtProvider(seaArtKey));
    }
    this.initialized = true;
  }
  
  async generateContentPlan(params: any): Promise<any> {
    this.initialize();
    const prompt = `Create a 30-day content plan for a new AI influencer.
    Characteristics:
    - Gender: ${params.gender}
    - Ethnicity: ${params.ethnicity}
    - Style: ${params.style}
    - Target Audience: ${params.audience}

    Generate 5 diverse and engaging post ideas. For each idea, provide a catchy title, a short description, and 3 relevant hashtags.
    Respond in JSON format with this structure:
    [
      {
        "title": "Post title",
        "description": "Post description", 
        "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
      }
    ]`;

    for (const provider of this.providers) {
      if (!provider.supported) continue;
      
      try {
        const response = await provider.generateText(prompt);
        return JSON.parse(response);
      } catch (error) {
        console.warn(`Failed to generate content plan with ${provider.name}:`, error);
        continue;
      }
    }

    throw new Error('All fallback providers failed to generate content plan');
  }

  async generateAvatar(params: any): Promise<string> {
    this.initialize();
    const prompt = `A professional, photorealistic headshot of a ${params.age}-year-old ${params.ethnicity} ${params.gender}, ${params.style} aesthetic. Looking directly at the camera, studio lighting, 4K, high quality, sharp focus.`;

    for (const provider of this.providers) {
      if (!provider.supported) continue;
      
      try {
        const imageUrl = await provider.generateImage(prompt);
        // Convert image URL to base64 if needed
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.warn(`Failed to generate avatar with ${provider.name}:`, error);
        continue;
      }
    }

    throw new Error('All fallback providers failed to generate avatar');
  }

  async generatePhoto(base64Avatar: string, scenario: string, params: any): Promise<string> {
    this.initialize();
    const prompt = `Create a photorealistic image of this person ${scenario}. Maintain their facial features, age (${params.age}), ethnicity (${params.ethnicity}), and gender (${params.gender}). The style should be high-quality, 4k, cinematic.`;

    for (const provider of this.providers) {
      if (!provider.supported) continue;
      
      try {
        const imageUrl = await provider.generateImage(prompt);
        // Convert image URL to base64 if needed
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.warn(`Failed to generate photo with ${provider.name}:`, error);
        continue;
      }
    }

    throw new Error('All fallback providers failed to generate photo');
  }

  getAvailableProviders(): string[] {
    this.initialize();
    return this.providers.filter(p => p.supported).map(p => p.name);
  }

  hasFallbacks(): boolean {
    this.initialize();
    return this.providers.some(p => p.supported);
  }
}

export const fallbackService = new FallbackService();
