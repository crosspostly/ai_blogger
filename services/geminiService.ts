import { GoogleGenAI, Type, Modality } from "@google/genai";
import { base64ToUint8Array, pcmToWav } from "./audioUtils";
import type { BloggerParams, WeeklyPlan, ContentPlanItem, VideoAsset } from '../types';
import { getApiKey } from '../config/apiConfig';

type LogCallback = (message: string, type?: 'info' | 'warning' | 'error' | 'success') => void;

async function getAiClient() {
    const apiKey = getApiKey('gemini');
    if (!apiKey) {
        throw new Error("API Key is missing. Please select a key via the AI Studio button.");
    }
    return new GoogleGenAI({ apiKey });
}

// Retry helper
async function retry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 3000, onLog?: LogCallback): Promise<T> {
    try {
        return await fn();
    } catch (e: any) {
        const isStrictQuota = e.message?.includes('limit: 0') || e.message?.includes('limit of 0');
        if (isStrictQuota) {
            if (onLog) onLog("Billing Check Failed: API Limit is 0. Please enable billing.", 'error');
            throw new Error("Billing required or Quota Exceeded (Limit 0). Please check your Google Cloud Billing or Select a different API Key.");
        }
        const isRateLimit = e.status === 429 || e.code === 429 || e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('RESOURCE_EXHAUSTED') || e.status === 503 || e.code === 503;
        if (isRateLimit && retries > 0) {
            if (onLog) onLog(`Rate limit hit (429). Retrying in ${baseDelay/1000}s...`, 'warning');
            await new Promise(resolve => setTimeout(resolve, baseDelay));
            return retry(fn, retries - 1, baseDelay * 2, onLog);
        }
        throw e;
    }
}

const NEGATIVE_PROMPT = "Do not include: user interface elements, instagram overlay, buttons, hearts, likes, comments, text overlay, app icons, split screen, collage, grid, multiple panels, blurry, low quality, distorted face, holding camera, visible camera device, phone in hand. Do not change facial features. Avoid plastic skin, heavy makeup, airbrushed look, doll-like face.";

const SKIN_TEXTURE_PROMPT = "High fidelity skin texture, visible pores, natural skin imperfections, realistic lighting falloff, authentic look.";

interface CreativeBrief {
    avatarPrompt: string;
    wardrobePrompts: { casual: string, active: string, glam: string };
    voiceScript: string; 
}

function selectVoiceProfile(params: BloggerParams): string {
    if (!params) return 'Kore'; 
    const gender = (params.gender || 'female').toLowerCase();
    const isMale = gender === 'male';
    const age = params.age || 25;
    const isYoung = age < 30;
    const style = (params.style || 'casual').toLowerCase();
    
    if (isMale) {
        if (style.includes('fitness') || style.includes('active')) return 'Fenrir';
        if (style.includes('professional') || !isYoung) return 'Charon';
        return 'Puck'; 
    } else {
        if (style.includes('fitness') || style.includes('sporty') || isYoung) return 'Zephyr';
        return 'Kore'; 
    }
}

// Helper to get consistent aesthetic string
function getAestheticPrompt(style: string): string {
    const s = style.toLowerCase();
    if (s.includes('old money')) return "Old money aesthetic, film grain, vintage soft focus, elegant, neutral tones, 35mm film style, high-end fashion editorial.";
    if (s.includes('clean girl')) return "Clean girl aesthetic, studio lighting, sharp focus, minimalist, glowy skin, sleek, modern, neutral palette.";
    if (s.includes('y2k')) return "Y2K aesthetic, vibrant, flash photography look, digital camera style, high contrast, glossy.";
    if (s.includes('dark academia')) return "Dark academia aesthetic, moody, library tones, rich texture, cinematic shadow, intellectual.";
    if (s.includes('travel lifestyle')) return "High-end Luxury Travel Lifestyle aesthetic, bright, vibrant, saturated colors, golden hour lighting, magazine editorial style, sharp 4k, crystal clear, vacation vibes.";
    if (s.includes('cottagecore')) return "Cottagecore aesthetic, soft natural light, pastel tones, dreamy, ethereal, flower field vibe.";
    return "High quality social media aesthetic, professional lighting, sharp focus.";
}

export async function generateCreativeBrief(params: BloggerParams, onLog?: LogCallback): Promise<CreativeBrief> {
    return retry(async () => {
        if (onLog) onLog("Generating creative brief and visual identity...");
        const ai = await getAiClient();
        const themeContext = params.customTheme ? `Focus heavily on the specific theme: "${params.customTheme}".` : "";
        const lang = params.outputLanguage || "English";
        const traits = params.traits && params.traits.length > 0 ? `Distinctive Features: ${params.traits.join(", ")}.` : "";
        
        // Ensure chest size is part of the core definition
        const bodyContext = `Physical Build: ${params.bodyType}, ${params.chestSize} chest.`;
        const vibeContext = params.personality ? `Personality Vibe: ${params.personality}.` : "";
        
        // Aesthetic Influence
        const aestheticInst = `Visual Style: ${getAestheticPrompt(params.style)}`;

        const systemInstruction = `You are a creative director for a top-tier viral social media agency. 
        Design a unique visual identity for a new AI influencer.
        Influencer Specs: ${params.gender}, ${params.ethnicity}, Age ${params.age}.
        ${aestheticInst}
        ${bodyContext}
        ${vibeContext}
        ${traits}
        ${themeContext}
        Provide output in ${lang}.
        Output JSON only.`;

        const prompt = `Generate a creative brief:
        1. 'avatarPrompt': Detailed prompt for a photorealistic close-up face portrait (neutral expression, high end). MUST explicitly include physical build (${params.bodyType}, ${params.chestSize}) and ALL distinguishing features (${params.traits.join(", ")}) to ensure consistency.
        2. 'wardrobePrompts': An object with 3 distinct prompts for the SAME character in different outfits:
        - 'casual': Everyday lifestyle outfit. Minimal makeup.
        - 'active': Sporty or Professional work outfit. Natural look, sweat/texture if sporty.
        - 'glam': Evening or Creative outfit.
        3. 'voiceScript': A short, catchy 1-2 sentence spoken intro (max 15 words) in ${lang}.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        avatarPrompt: { type: Type.STRING },
                        wardrobePrompts: {
                            type: Type.OBJECT,
                            properties: {
                                casual: { type: Type.STRING },
                                active: { type: Type.STRING },
                                glam: { type: Type.STRING }
                            },
                            required: ["casual", "active", "glam"]
                        },
                        voiceScript: { type: Type.STRING },
                    },
                    required: ["avatarPrompt", "wardrobePrompts", "voiceScript"]
                }
            }
        });

        try {
            return JSON.parse(response.text || "{}");
        } catch (e) {
            return {
                avatarPrompt: `Portrait of ${params.age}yo ${params.ethnicity} ${params.gender}, ${params.style}, ${params.bodyType}.`,
                wardrobePrompts: { casual: "Casual outfit", active: "Active outfit", glam: "Elegant outfit" },
                voiceScript: "Hello world, welcome to my blog!"
            };
        }
    }, 3, 3000, onLog);
}

// Safe image generation helper with fallback to standard model
async function generateImageSafe(
    prompt: string, 
    referenceImageBase64: string | undefined, 
    config: any, 
    onLog?: LogCallback
): Promise<string> {
    const ai = await getAiClient();
    
    // Attempt with Pro model first
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [
                     ...(referenceImageBase64 ? [{ inlineData: { mimeType: 'image/jpeg', data: referenceImageBase64.replace(/^data:image\/\w+;base64,/, "") } }] : []),
                    { text: prompt },
                ],
            },
            config: config,
        });
        const imgData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!imgData) throw new Error("No image data returned from Pro model");
        return `data:image/jpeg;base64,${imgData}`;

    } catch (e: any) {
        // Check for Quota/Limit errors specific to the Pro model
        const isQuotaError = e.message?.includes('limit: 0') || e.message?.includes('quota') || e.message?.includes('RESOURCE_EXHAUSTED') || e.status === 429;
        
        if (isQuotaError) {
             if (onLog) onLog("Pro model quota exceeded. Falling back to Standard model...", 'warning');
             
             // Fallback to Flash/Standard Image model
             try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image', // Fallback model
                    contents: {
                        parts: [
                             ...(referenceImageBase64 ? [{ inlineData: { mimeType: 'image/jpeg', data: referenceImageBase64.replace(/^data:image\/\w+;base64,/, "") } }] : []),
                            { text: prompt },
                        ],
                    },
                    config: { ...config }, // Reuse config (aspect ratio etc)
                });
                const imgData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (!imgData) throw new Error("No image data returned from Standard model");
                return `data:image/jpeg;base64,${imgData}`;
             } catch (fallbackError: any) {
                 console.error("Fallback generation failed", fallbackError);
                 throw e; // Throw original error if fallback also fails or to trigger higher level catch
             }
        }
        throw e;
    }
}

export async function generateWardrobe(brief: CreativeBrief, params: BloggerParams, onLog?: LogCallback): Promise<string[]> {
    return retry(async () => {
        const results: string[] = [];

        // STRICT CONSISTENCY ENFORCEMENT
        const strictTraits = params.traits && params.traits.length > 0 ? `Visible features: ${params.traits.join(", ")}.` : "";
        const consistencyBase = `Character consistency check: ${params.ethnicity} ${params.gender}. Body: ${params.bodyType}, ${params.chestSize} chest. Distinctive features: ${strictTraits}`;
        
        const aestheticPrompt = getAestheticPrompt(params.style);

        // 1. Generate the ANCHOR image (Portrait)
        if (onLog) onLog("Generating anchor portrait...");
        const portraitPrompt = `${brief.avatarPrompt}. ${consistencyBase}. Photorealistic, 8k, highly detailed, studio lighting, looking at camera. ${SKIN_TEXTURE_PROMPT}. Vertical 9:16 portrait. Single full frame image. ${aestheticPrompt} ${NEGATIVE_PROMPT}`;
        
        try {
            const portraitBase64 = await generateImageSafe(
                portraitPrompt, 
                undefined, 
                { responseModalities: [Modality.IMAGE], imageConfig: { aspectRatio: "9:16" } },
                onLog
            );
            
            results.push(portraitBase64);
            const cleanPortraitBytes = portraitBase64; // already base64 string with prefix

            if (onLog) onLog("Anchor portrait generated. Creating lookbook...");

            // 2. Generate subsequent looks using the Portrait as a REFERENCE
            const lookPrompts = [
                { type: 'Casual', text: brief.wardrobePrompts.casual },
                { type: 'Active', text: brief.wardrobePrompts.active },
                { type: 'Glam', text: brief.wardrobePrompts.glam }
            ];

            for (const look of lookPrompts) {
                if (onLog) onLog(`Generating ${look.type} look...`);
                // Force strict traits in every prompt
                const consistencyPrompt = `Full body shot of the SAME person in the reference image. Wearing: ${look.text}. ${consistencyBase}. Maintain facial features, skin tone, hair color, and age EXACTLY as the reference. Photorealistic, 8k, fashion photography. ${SKIN_TEXTURE_PROMPT}. Vertical 9:16 portrait. Single full frame image. ${aestheticPrompt} ${NEGATIVE_PROMPT}`;
                
                try {
                     const lookBase64 = await generateImageSafe(
                        consistencyPrompt,
                        cleanPortraitBytes,
                        { responseModalities: [Modality.IMAGE], imageConfig: { aspectRatio: "9:16" } },
                        onLog
                     );
                     results.push(lookBase64);
                } catch (e) {
                    if (onLog) onLog(`Failed to generate ${look.type} look`, 'warning');
                    console.error(`Failed to generate ${look.type} look`, e);
                }
            }

        } catch (e) {
            console.error("Wardrobe generation failed", e);
            throw e;
        }
        
        if (results.length === 0) throw new Error("Failed to generate wardrobe.");
        return results;
    }, 3, 3000, onLog);
}

export async function generateSingleWardrobeItem(referenceAvatar: string, description: string, params: BloggerParams, onLog?: LogCallback): Promise<string> {
    return retry(async () => {
        if (onLog) onLog(`Generating custom look: ${description}`);
        
        const strictTraits = params.traits && params.traits.length > 0 ? `Visible features: ${params.traits.join(", ")}.` : "";
        const consistencyBase = `Character consistency check: ${params.ethnicity} ${params.gender}. Body: ${params.bodyType}, ${params.chestSize} chest. Distinctive features: ${strictTraits}`;
        const aestheticPrompt = getAestheticPrompt(params.style);

        const prompt = `Full body shot of this person wearing: ${description}. ${consistencyBase}. Photorealistic, 8k, fashion photography. ${SKIN_TEXTURE_PROMPT}. Maintain consistency with the reference face. Vertical 9:16 portrait. Single full frame image. ${aestheticPrompt} ${NEGATIVE_PROMPT}`;
        
        return await generateImageSafe(
            prompt,
            referenceAvatar,
            { responseModalities: [Modality.IMAGE], imageConfig: { aspectRatio: "9:16" } },
            onLog
        );
    }, 3, 3000, onLog);
}

export async function regenerateWeekPlan(
    weekNumber: number,
    currentPlanItems: ContentPlanItem[],
    theme: string,
    params: BloggerParams,
    onLog?: LogCallback
): Promise<ContentPlanItem[]> {
    return retry(async () => {
        if (onLog) onLog(`Regenerating Week ${weekNumber} with theme: ${theme}`);
        const ai = await getAiClient();
        const lang = params.outputLanguage || "English";
        
        const prompt = `Rewrite the content plan for Week ${weekNumber} for a ${params.style} influencer.
        NEW THEME for this week: "${theme}".
        The output must contain exactly ${currentPlanItems.length} items.
        Keep the same types (Post/Reel/Story) as the original plan.
        OUTPUT LANGUAGE: ${lang}. All Titles and Captions must be in ${lang}.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: { type: Type.INTEGER },
                            type: { type: Type.STRING },
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            caption: { type: Type.STRING },
                            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            }
        });

        const newItemsData = JSON.parse(response.text);
        
        // Merge new data with existing IDs
        return newItemsData.map((newItem: any, index: number) => ({
            ...currentPlanItems[index], 
            title: newItem.title,
            description: newItem.description,
            caption: newItem.caption,
            hashtags: newItem.hashtags
        }));
    }, 3, 3000, onLog);
}

export async function generateContentPlan(params: BloggerParams, onLog?: LogCallback): Promise<WeeklyPlan[]> {
    return retry(async () => {
        if (onLog) onLog(`Developing ${params.planWeeks}-week content strategy (${params.marketingStrategy})...`);
        const ai = await getAiClient();
        const themeContext = params.customTheme ? `Focus specifically on: ${params.customTheme}` : "";
        const lang = params.outputLanguage || "English";
        
        // Strategy Injection
        let strategyInstructions = "";
        if (params.marketingStrategy === 'POV / Relatable') {
            strategyInstructions = "STRATEGY: VIRAL POV. Focus heavily on 'POV' (Point of View) formats. Titles MUST be Hook-driven (e.g. 'POV: You quit your 9-5', 'That friend who...'). Scenarios should be relatable, funny, or shocking.";
        } else if (params.marketingStrategy === 'Visual Aesthetic') {
             strategyInstructions = "STRATEGY: AESTHETIC VIBES. Focus on mood, visual beauty, atmosphere, and 'vibes'. Titles should be poetic or short mood identifiers. (e.g., 'Morning light', 'Dreamy days').";
        } else {
             strategyInstructions = "STRATEGY: EDUCATIONAL VALUE. Focus on tips, tricks, how-tos, and saving value. Titles should promise a benefit (e.g., '3 Tips for...', 'How to...').";
        }

        const prompt = `Create a ${params.planWeeks}-week social media content calendar.
        Specs: ${params.gender}, ${params.ethnicity}, ${params.style}, Audience: ${params.audience}.
        Physical Attributes: ${params.bodyType}, ${params.chestSize}. Personality: ${params.personality}.
        ${strategyInstructions}
        ${themeContext}
        OUTPUT LANGUAGE: ${lang}. All Titles, Captions, and Descriptions must be in ${lang}.
        For each week, provide 4 diverse pieces of content.
        IMPORTANT: 
        1. Ensure at least one item per week is a "Selfie" photo.
        2. Ensure at least one item is a "Vlog" style video where they talk to camera.
        3. Mix in diverse social content: parties, intimate dinners, serious conversations with friends, shared activities (hiking, shopping), and group candids. Ensure variety in expressions (not just smiling).
        4. Include "Natural/Candid" moments: no makeup, morning routine, relaxing.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            weekNumber: { type: Type.INTEGER },
                            items: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        day: { type: Type.INTEGER },
                                        type: { type: Type.STRING, enum: ["Post", "Reel", "Story"] },
                                        title: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        caption: { type: Type.STRING },
                                        hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                                    },
                                    required: ["day", "type", "title", "description", "caption", "hashtags"]
                                }
                            }
                        },
                        required: ["weekNumber", "items"]
                    }
                }
            }
        });
        const plan = JSON.parse(response.text.trim());
        return plan.map((w: any) => ({
            ...w,
            items: w.items.map((i: any) => ({ ...i, id: crypto.randomUUID() }))
        }));
    }, 3, 3000, onLog);
}

// Fallback logic for slideshow (omitted specific update for brevity, functionality persists)
async function generateSlideshowFallback(
    item: ContentPlanItem, 
    referenceAvatarBase64: string, 
    params: BloggerParams,
    onLog?: LogCallback
): Promise<{ url: string; type: 'slideshow'; slideshowImages: string[]; slideshowAudio: string }> {
    try {
        if (onLog) onLog("Falling back to Slideshow generation...", 'warning');
        const ai = await getAiClient();
        const cleanBase64 = referenceAvatarBase64.replace(/^data:image\/\w+;base64,/, "");
        
        const strictTraits = params.traits && params.traits.length > 0 ? `Visible features: ${params.traits.join(", ")}.` : "";
        const subjectDesc = `${params.gender} ${params.style}, ${params.bodyType}, ${params.chestSize}. ${strictTraits}.`;
        const aestheticPrompt = getAestheticPrompt(params.style);

        const basePrompt = `Professional photography. ${item.description}. Character: ${subjectDesc}. Photorealistic, 4k. Vertical 9:16 aspect ratio. Single full frame. ${aestheticPrompt} ${NEGATIVE_PROMPT}`;
        const prompts = [
            basePrompt + " Scene 1: Introduction shot.",
            basePrompt + " Scene 2: Action close up.",
            basePrompt + " Scene 3: Wide angle context.",
        ];

        const images: string[] = [];
        for (const p of prompts) {
            try {
                // Use safe generator here too if needed, but for now fallback logic is specific
                // Keeping simple for fallback
                const res = await ai.models.generateContent({
                    model: 'gemini-3-pro-image-preview',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
                            { text: p },
                        ],
                    },
                    config: { 
                        responseModalities: [Modality.IMAGE],
                        imageConfig: { aspectRatio: "9:16" }
                    },
                });
                const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (data) images.push(`data:image/jpeg;base64,${data}`);
                await new Promise(r => setTimeout(r, 1000));
            } catch (e: any) { console.error("Slide gen part failed", e); }
        }
        if (images.length === 0) throw new Error("Could not generate slideshow images.");

        const voiceName = selectVoiceProfile(params);
        let audioUrl = "";
        try { audioUrl = await generateSpeech(item.caption, voiceName, onLog); } catch (e) { }
        
        return { url: images[0], type: 'slideshow', slideshowImages: images, slideshowAudio: audioUrl };
    } catch (e) { throw e; }
}

export async function generateMediaForPlanItem(
    item: ContentPlanItem,
    referenceAvatarBase64: string,
    params: BloggerParams,
    onLog?: LogCallback
): Promise<{ url: string; type: 'image' | 'video' | 'slideshow'; resourceHandle?: any; slideshowImages?: string[]; slideshowAudio?: string }> {
    
    return retry(async () => {
        const ai = await getAiClient();
        const cleanReferenceBase64 = referenceAvatarBase64.replace(/^data:image\/\w+;base64,/, "");

        const lowerDesc = item.description.toLowerCase();
        const isSocial = lowerDesc.includes('friends') || lowerDesc.includes('party') || lowerDesc.includes('group') || lowerDesc.includes('together') || lowerDesc.includes('dinner') || lowerDesc.includes('club') || lowerDesc.includes('crowd');
        const isNatural = lowerDesc.includes('natural') || lowerDesc.includes('no makeup') || lowerDesc.includes('casual') || lowerDesc.includes('routine') || lowerDesc.includes('waking up');

        // Aesthetic Filter Application
        const aestheticPrompt = getAestheticPrompt(params.style);

        let promptSuffix = "Single full frame image.";
        
        // STRICT CONSISTENCY INJECTION
        const strictTraits = params.traits && params.traits.length > 0 ? `Visible features: ${params.traits.join(", ")}.` : "";
        // Inject chest size early in the subject context
        let subjectContext = `The character is a ${params.gender}, ${params.bodyType} with ${params.chestSize} chest, ${params.style}. Personality: ${params.personality}. ${strictTraits}. Maintain facial features, hair, and body type EXACTLY as reference image.`;
        
        if (isSocial) {
            // New Robust Social Prompting to ensure variety and integration
            promptSuffix = "Authentic social moment. Main character is naturally integrated into the group/crowd (not just standing in front). Varied composition: over-the-shoulder, side profile, laughing, listening, or talking. Candid, not overly posed.";
            subjectContext += " The main character is socializing.";
            
            // Add Contextual nuances
            if (lowerDesc.includes('party') || lowerDesc.includes('club') || lowerDesc.includes('dancing')) {
                promptSuffix += " Dynamic motion, lively atmosphere, fun expressions.";
            } else if (lowerDesc.includes('dinner') || lowerDesc.includes('cafe') || lowerDesc.includes('eating')) {
                promptSuffix += " Intimate setting, seated at table, conversation, shared meal, ambient lighting.";
            } else if (lowerDesc.includes('walking') || lowerDesc.includes('shopping')) {
                promptSuffix += " Walking with friends, action shot, interaction.";
            }
        }

        if (isNatural) {
            promptSuffix += " Authentic, candid, natural skin texture (visible pores/imperfections), less posed, minimal makeup, relaxed posture. " + SKIN_TEXTURE_PROMPT;
        } else {
             // For standard shots, still ensure texture
             promptSuffix += " " + SKIN_TEXTURE_PROMPT;
        }

        if (item.type === 'Reel') {
            if (onLog) onLog(`Starting Video Workflow for: ${item.title}`);
            
            // POV Check
            const isPOV = item.title.toLowerCase().startsWith('pov') || params.marketingStrategy === 'POV / Relatable';
            const povPrompt = isPOV ? "POV shot, or selfie angle, engaging directly with viewer." : "";

            // Step 1: Generate STATIC image
            if (onLog) onLog("Step 1/2: Generating scene-specific base photo...");
            const scenePrompt = `Professional photography for social media. ${item.description}. 
            ${subjectContext}
            ${aestheticPrompt}
            Photorealistic, 4k, cinematic lighting. Vertical 9:16 portrait. ${promptSuffix} ${povPrompt}
            ${NEGATIVE_PROMPT}
            NO USER INTERFACE.`;

            // Use SAFE generator with fallback
            const sceneImageData = await generateImageSafe(
                scenePrompt,
                cleanReferenceBase64,
                 { responseModalities: [Modality.IMAGE], imageConfig: { aspectRatio: "9:16" } },
                 onLog
            );
            
            const cleanSceneData = sceneImageData.replace(/^data:image\/\w+;base64,/, "");
            
            // Step 2: Animate with Veo
            if (onLog) onLog("Step 2/2: Animating scene with Veo...");
            const videoPrompt = `Cinematic video, ${item.description}. Vertical 9:16 portrait. High quality. ${aestheticPrompt} ${isSocial ? 'Lively atmosphere, social interaction' : ''} ${isPOV ? 'First person point of view' : ''} ${NEGATIVE_PROMPT}`;
            
            try {
                let operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: videoPrompt,
                    image: { imageBytes: cleanSceneData, mimeType: 'image/jpeg' },
                    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' },
                });

                if (onLog) onLog("Video generation started. Waiting for render...");
                while (!operation.done) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    operation = await ai.operations.getVideosOperation({ operation: operation });
                }
                
                const videoResource = operation.response?.generatedVideos?.[0]?.video;
                const downloadLink = videoResource?.uri;
                if (!downloadLink) throw new Error("Video generation failed");

                const apiKey = getApiKey('gemini');
                const finalUrl = `${downloadLink}${downloadLink.includes('?') ? '&' : '?'}key=${apiKey}`;
                const videoResponse = await fetch(finalUrl);
                const videoBlob = await videoResponse.blob();

                return { url: URL.createObjectURL(videoBlob), type: 'video', resourceHandle: videoResource };

            } catch (error: any) {
                console.warn("Video generation failed, falling back to Slideshow:", error);
                if (error.message?.includes("limit: 0")) throw error; 
                return await generateSlideshowFallback(item, referenceAvatarBase64, params, onLog);
            }
        } 
        else {
            const ratio = item.type === 'Post' ? '3:4' : '9:16';
            const ratioDesc = item.type === 'Post' ? 'Rectangular 3:4 portrait' : 'Vertical 9:16 portrait';
            if (onLog) onLog(`Generating Image for: ${item.title} (${ratio})`);
            
            const prompt = `Professional photography for social media. ${item.description}. 
            ${subjectContext}
            ${aestheticPrompt}
            Photorealistic, 4k, cinematic lighting. ${ratioDesc}. ${promptSuffix}
            ${NEGATIVE_PROMPT}
            NO USER INTERFACE.`;
            
            const imgData = await generateImageSafe(
                prompt,
                cleanReferenceBase64,
                { responseModalities: [Modality.IMAGE], imageConfig: { aspectRatio: ratio } },
                onLog
            );

            return { url: imgData, type: 'image' };
        }
    }, 3, 3000, onLog);
}

// Ensure generateSelfieVideo also uses strict traits
export async function generateSelfieVideo(
    script: string,
    referenceAvatarBase64: string,
    params: BloggerParams,
    onLog?: LogCallback
): Promise<{ videoUrl: string, audioUrl: string, resourceHandle: any }> {
    return retry(async () => {
        const ai = await getAiClient();
        const cleanReferenceBase64 = referenceAvatarBase64.replace(/^data:image\/\w+;base64,/, "");
        if (onLog) onLog("Starting Selfie Generation...");

        const voiceName = selectVoiceProfile(params);
        let audioUrl = "";
        try { audioUrl = await generateSpeech(script, voiceName, onLog); } catch(e) {}

        if (onLog) onLog("Step 1/2: Generating specific selfie base frame...");
        const strictTraits = params.traits && params.traits.length > 0 ? `Visible features: ${params.traits.join(", ")}.` : "";
        
        const aestheticPrompt = getAestheticPrompt(params.style);

        const selfiePrompt = `Close up selfie photo of ${params?.gender}. ${params.bodyType}, ${params.chestSize}. ${strictTraits}. Holding camera with extended arm (POV). Looking directly at lens. ${SKIN_TEXTURE_PROMPT}. Vertical 9:16 portrait. High quality vlog style. ${aestheticPrompt} ${NEGATIVE_PROMPT}`;
        
        const selfieImageData = await generateImageSafe(
            selfiePrompt,
            cleanReferenceBase64,
            { responseModalities: [Modality.IMAGE], imageConfig: { aspectRatio: "9:16" } },
            onLog
        );

        const cleanSelfieData = selfieImageData.replace(/^data:image\/\w+;base64,/, "");

        if (onLog) onLog("Step 2/2: Animating selfie video with Veo...");
        const videoPrompt = `Video selfie, talking to camera, arm held out, vlogging. Vertical 9:16 portrait. ${aestheticPrompt} ${script.substring(0, 100)}...`;

        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: videoPrompt,
            image: { imageBytes: cleanSelfieData, mimeType: 'image/jpeg' },
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' },
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        const videoResource = operation.response?.generatedVideos?.[0]?.video;
        const downloadLink = videoResource?.uri;
        if (!downloadLink) throw new Error("Video generation failed");

        const apiKey = getApiKey('gemini');
        const finalUrl = `${downloadLink}${downloadLink.includes('?') ? '&' : '?'}key=${apiKey}`;
        const videoResponse = await fetch(finalUrl);
        const videoBlob = await videoResponse.blob();

        return { videoUrl: URL.createObjectURL(videoBlob), audioUrl, resourceHandle: videoResource };
    }, 3, 3000, onLog);
}

// ... extendVideo, generateSingleContentItem, animatePhoto, generateSpeech remain largely the same
// Re-exporting them to ensure file validity
export async function extendVideo(videoHandle: any, prompt: string, onLog?: LogCallback): Promise<VideoAsset> {
    return retry(async () => {
        if (onLog) onLog("Extending video clip (+5s)...");
        const ai = await getAiClient();
        let operation = await ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: prompt || 'continue action',
          video: videoHandle, 
          config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
        });
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({operation: operation});
        }
        const videoResource = operation.response?.generatedVideos?.[0]?.video;
        const downloadLink = videoResource?.uri;
        if (!downloadLink) throw new Error("Extension failed");
        const apiKey = getApiKey('gemini');
        const finalUrl = `${downloadLink}${downloadLink.includes('?') ? '&' : '?'}key=${apiKey}`;
        const videoResponse = await fetch(finalUrl);
        const videoBlob = await videoResponse.blob();
        return { url: URL.createObjectURL(videoBlob), resourceHandle: videoResource, mimeType: 'video/mp4' };
    }, 3, 3000, onLog);
}

export async function generateSingleContentItem(params: BloggerParams, type: 'Post' | 'Reel' | 'Story', onLog?: LogCallback): Promise<ContentPlanItem> {
    return retry(async () => {
        if (onLog) onLog(`Generating single ${type} idea...`);
        const ai = await getAiClient();
        const lang = params.outputLanguage || "English";
        const prompt = `Generate ONE single social media content idea for a ${params.style} influencer.
        Type: ${type}.
        Output in ${lang}.
        JSON format: { "title": string, "description": string, "caption": string, "hashtags": string[] }`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const data = JSON.parse(response.text);
        return { id: crypto.randomUUID(), day: Math.floor(Math.random() * 7) + 1, type: type, ...data };
    }, 3, 3000, onLog);
}

export async function animatePhoto(photoUrl: string, onLog?: LogCallback): Promise<VideoAsset> {
    return retry(async () => {
        if (onLog) onLog("Animating existing photo...");
        const ai = await getAiClient();
        let base64 = "";
        if (photoUrl.startsWith('blob:')) {
            const r = await fetch(photoUrl);
            const b = await r.blob();
            base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(b);
            });
        } else { base64 = photoUrl; }
        const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            image: { imageBytes: cleanBase64, mimeType: 'image/jpeg' },
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' },
        });
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        const videoResource = operation.response?.generatedVideos?.[0]?.video;
        const downloadLink = videoResource?.uri;
        if (!downloadLink) throw new Error("Animation failed");
        const apiKey = getApiKey('gemini');
        const finalUrl = `${downloadLink}${downloadLink.includes('?') ? '&' : '?'}key=${apiKey}`;
        const videoResponse = await fetch(finalUrl);
        const videoBlob = await videoResponse.blob();
        return { url: URL.createObjectURL(videoBlob), resourceHandle: videoResource, mimeType: 'video/mp4' };
    }, 3, 3000, onLog);
}

export async function generateSpeech(text: string, voiceName: string = 'Kore', onLog?: LogCallback): Promise<string> {
    if (!text) return "";
    return retry(async () => {
        if (onLog) onLog(`Synthesizing speech (${voiceName})...`);
        const ai = await getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("Audio generation failed");
        const pcmData = base64ToUint8Array(base64Audio);
        const wavBlob = pcmToWav(pcmData, 24000); 
        return URL.createObjectURL(wavBlob);
    }, 3, 3000, onLog);
}
