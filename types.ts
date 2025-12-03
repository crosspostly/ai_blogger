
export interface BloggerParams {
  gender: string;
  ethnicity: string;
  age: number;
  style: string;
  audience: string;
  customTheme: string;
  referenceImage?: string; // Base64 string of an existing avatar (optional)
  planWeeks: number; // Number of weeks for the content plan (1-6)
  autoGenerateWeeks: number; // Number of weeks to generate media for automatically
  outputLanguage: string; // Global output language
  
  // New specific physical and personality controls
  bodyType: string;
  chestSize: string; // New field for specific bust size
  personality: string;
  traits: string[]; // e.g. ["Freckles", "Blue Eyes", "Tattoos"]
}

export interface ContentPlanItem {
  id: string; // Unique ID for finding items to update
  day: number;
  type: 'Post' | 'Reel' | 'Story';
  title: string;
  description: string;
  caption: string;
  hashtags: string[];
  mediaUrl?: string; // Linked generated asset (main image or video thumbnail)
  mediaType?: 'image' | 'video' | 'slideshow';
  mediaHandle?: any; // For video extension
  
  // Script for voiceover/selfie
  script?: string;

  // Slideshow/Audio specific
  slideshowImages?: string[]; // Array of base64 images
  slideshowAudio?: string; // URL/Blob of voiceover (also used for video voiceover)

  isGenerating?: boolean;
}

export interface WeeklyPlan {
    weekNumber: number;
    theme?: string; // Specific theme for this week
    items: ContentPlanItem[];
}

export interface VideoAsset {
    url: string;
    resourceHandle?: any;
    mimeType: string;
}

export interface GenerationResults {
  wardrobe: string[]; // Array of base64 avatars (Portrait, Casual, Active, Glam)
  audioUrl: string | null; 
  voiceScript: string | null; 
  contentPlan: WeeklyPlan[] | null;
  creativeBrief?: any; // Store brief for consistency during regeneration
}

export interface LogEntry {
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
}

export type GenerationStep = 'idle' | 'review_identity' | 'campaign_complete';

// Handlers interface for props
export type UpdatePlanItemHandler = (weekIndex: number, itemIndex: number, field: keyof ContentPlanItem, value: string) => void;
export type AddWardrobeItemHandler = (description: string) => Promise<void>;
export type ExtendVideoHandler = (weekIndex: number, itemIndex: number) => Promise<void>;
export type RegenerateWeekHandler = (weekIndex: number, theme: string) => Promise<void>;
export type GenerateSelfieHandler = (weekIndex: number, itemIndex: number) => Promise<void>;
export type AnimatePhotoHandler = (weekIndex: number, itemIndex: number) => Promise<void>;

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // window.aistudio is already declared as AIStudio in global scope
  }

  interface ImportMetaEnv {
    readonly VITE_GOOGLE_CLIENT_ID?: string;
    readonly VITE_GOOGLE_CLIENT_SECRET?: string;
    readonly VITE_GOOGLE_API_KEY?: string; 
    readonly VITE_OPENROUTER_API_KEY?: string;
    readonly VITE_REPLICATE_API_KEY?: string;
    readonly VITE_SEAART_API_KEY?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}