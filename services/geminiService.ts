
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { base64ToUint8Array, pcmToWav } from "./audioUtils";
import type { BloggerParams, WeeklyPlan, ContentPlanItem, VideoAsset } from '../types';
import { getApiKey } from '../config/apiConfig';

type LogCallback = (message: string, type?: 'info' | 'warning' | 'error' | 'success') => void;

async function getAiClient() {
    const apiKey = getApiKey('gemini');
    if (!apiKey) {
        throw new Error("API Key is missing. Please select a key via the AI Studio button or configure VITE_GOOGLE_API_KEY.");
    }
    return new GoogleGenAI({ apiKey });
}

// Retry helper with smart exponential backoff and error parsing
async function retry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 4000, onLog?: LogCallback): Promise<T> {
    try {
        return await fn();
    } catch (e: any) {
        // Check for rate limits
        const isRateLimit = e.status === 429 || e.code === 429 || e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('RESOURCE_EXHAUSTED') || e.status === 503 || e.code === 503;
        
        // Check if there is a specific retry time
        const match = e.message?.match(/retry in ([0-9.]+)s/);
        const retryAfterMs = match && match[1] ? Math.ceil(parseFloat(match[1]) * 1000) + 2000 : 0;

        if (isRateLimit && retries > 0) {
            let delay = Math.max(baseDelay, retryAfterMs);
            // If no specific time found, fallback to baseDelay
            if (!retryAfterMs) delay = baseDelay;

            if (onLog) onLog(`Rate limit hit. Retrying in ${(delay/1000).toFixed(1)}s...`, 'warning');
            
            await new Promise(resolve => setTimeout(resolve, delay));
            
            const nextBaseDelay = retryAfterMs ? baseDelay : baseDelay * 2;
            return retry(fn, retries - 1, nextBaseDelay, onLog);
        }
        
        const isStrictQuota = (e.message?.includes('limit: 0') || e.message?.includes('limit of 0')) && !retryAfterMs;
        if (isStrictQuota) {
            throw new Error(`Quota Limit 0 (Free Tier Exhausted). ${e.message}`);
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
        
        const bodyContext = `Physical Build: ${params.bodyType}, ${params.chestSize} chest.`;
        const vibeContext = params.personality ? `Personality Vibe: ${params.personality}.` : "";
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
    }, 3, 5000, onLog);
}

// Optimized safe image generation using Flash model for stability
async function generateImageSafe(
    prompt: string, 
    referenceImageBase64: string | undefined, 
    config: any, 
    onLog?: LogCallback
): Promise<string> {
    const ai = await getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                     ...(referenceImageBase64 ? [{ inlineData: { mimeType: 'image/jpeg', data: referenceImageBase64.replace(/^data:image\/\w+;base64,/, "") } }] : []),
                    { text: prompt },
                ],
            },
            config: { ...config }, 
        });
        const imgData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!imgData) throw new Error("No image data returned from Flash model");
        return `data:image/jpeg;base64,${imgData}`;

    } catch (e: any) {
        if (onLog) onLog(`Image generation failed: ${e.message}`, 'error');
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
            const cleanPortraitBytes = portraitBase64; 

            if (onLog) onLog("Anchor portrait generated. Creating lookbook...");

            // 2. Generate subsequent looks using the Portrait as a REFERENCE
            const lookPrompts = [
                { type: 'Casual', text: brief.wardrobePrompts.casual },
                { type: 'Active', text: brief.wardrobePrompts.active },
                { type: 'Glam', text: brief.wardrobePrompts.glam }
            ];

            for (const look of lookPrompts) {
                if (onLog) onLog(`Generating ${look.type} look...`);
                
                await new Promise(r => setTimeout(r, 15000)); 

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
    }, 5, 8000, onLog); 
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
    }, 3, 5000, onLog);
}

// SHARED GROWTH STRATEGY PROMPT LOGIC
function getGrowthStrategySystemInstruction(lang: string) {
    return `You are an elite Social Media Growth Hacker. Your goal is NOT to write a blog, but to trigger ALGORITHM SIGNALS (Watch time, Saves, Shares, Comments).

    CORE MECHANIC (LOOP THEORY):
    For Reels/Videos:
    - 'title': This is the VISUAL HOOK text overlay on the video. Must be short, provocative, or incomplete. (e.g., "Stop doing this...", "The secret to...", "POV: You realized").
    - 'caption': This is the VALUE/STORY. It must be long and engaging so the user reads it while the video loops in the background.

    CONTENT PILLARS (Use these):
    1. Unpopular Opinion (Triggers comments/debates).
    2. Educational/Save-able (Triggers saves).
    3. Relatable POV (Triggers shares/reposts).
    4. Vulnerability/Failure (Triggers connection).

    TONE:
    - Charismatic, "Insider" vibe.
    - Treat the follower like a close friend.
    - Be specific, not generic.

    NO "How was your day?" or generic questions.
    OUTPUT LANGUAGE: ${lang}. All Titles and Captions must be in ${lang}.`;
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
        
        const prompt = `Rewrite the content plan for Week ${weekNumber}.
        NEW THEME: "${theme}".
        
        ${getGrowthStrategySystemInstruction(lang)}
        
        Provide exactly ${currentPlanItems.length} items. Keep same types (Post/Reel/Story).
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
                            title: { type: Type.STRING, description: "VISUAL HOOK (Text on video) or HEADLINE. Max 7 words." },
                            description: { type: Type.STRING, description: "Visual scene description for AI generation." },
                            caption: { type: Type.STRING, description: "Full caption. Use line breaks. End with Call to Action (Save/Share)." },
                            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            }
        });

        const newItemsData = JSON.parse(response.text);
        
        return newItemsData.map((newItem: any, index: number) => ({
            ...currentPlanItems[index], 
            title: newItem.title,
            description: newItem.description,
            caption: newItem.caption,
            hashtags: newItem.hashtags
        }));
    }, 3, 4000, onLog);
}

export async function generateContentPlan(params: BloggerParams, onLog?: LogCallback): Promise<WeeklyPlan[]> {
    return retry(async () => {
        if (onLog) onLog(`Developing ${params.planWeeks}-week viral strategy (${params.marketingStrategy})...`);
        const ai = await getAiClient();
        const themeContext = params.customTheme ? `Focus theme on: ${params.customTheme}` : "";
        const lang = params.outputLanguage || "English";
        
        let strategyContext = "";
        
        // CUSTOM STRATEGY OVERRIDES
        if (params.style.toLowerCase().includes('travel')) {
             strategyContext = "FOR TRAVEL: The goal is 'Magnetic Storytelling'. Mix 'Hidden Gems' with 'Raw Travel Reality'. Avoid being just a negative critic. Instead of just 'Don't go here', say 'Here is how to do it right'. Hooks should be about *feelings* or *secrets* (e.g., 'I almost didn't share this...', 'The most expensive mistake I made...'). The character is adventurous, smart, and a bit chaotic/fun.";
        } else if (params.marketingStrategy === 'POV / Relatable') {
            strategyContext = "Focus on POV scenarios, relatable failures, and 'That feeling when...' moments.";
        } else if (params.marketingStrategy === 'Visual Aesthetic') {
             strategyContext = "Focus on mood, atmosphere, and aspirational vibes. Hooks should be poetic or short.";
        } else {
             strategyContext = "Focus on 'How To', '3 Mistakes', 'Secrets revealed'. High value for saving.";
        }

        const systemInstruction = getGrowthStrategySystemInstruction(lang);

        const prompt = `Create a ${params.planWeeks}-week viral content calendar.
        Influencer: ${params.gender}, ${params.style}, ${params.age}yo.
        Strategy: ${strategyContext}
        ${themeContext}
        
        For each week, provide 4 items. Mix of Post, Reel, Story.
        ensure Reels have specific "Visual Hooks" in the title field.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
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
                                        title: { type: Type.STRING, description: "VISUAL HOOK (Text on video) or HEADLINE. Max 7 words." },
                                        description: { type: Type.STRING, description: "Visual scene prompt for AI generator." },
                                        caption: { type: Type.STRING, description: "Full post caption with value and CTA." },
                                        script: { type: Type.STRING, description: "Voiceover script for Reels (optional)." },
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
    }, 3, 4000, onLog);
}

// Fallback logic for slideshow 
async function generateSlideshowFallback(
    item: ContentPlanItem, 
    referenceAvatarBase64: string, 
    params: BloggerParams,
    onLog?: LogCallback
): Promise<{ url: string; type: 'slideshow'; slideshowImages: string[]; slideshowAudio: string }> {
    try {
        if (onLog) onLog("Falling back to Slideshow generation...", 'warning');
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
                // Use safe generator here too
                const imgData = await generateImageSafe(
                    p, 
                    cleanBase64,
                    { responseModalities: [Modality.IMAGE], imageConfig: { aspectRatio: "9:16" } },
                    onLog
                );
                images.push(imgData);
                await new Promise(r => setTimeout(r, 6000)); // Increased buffer here too
            } catch (e: any) { console.error("Slide gen part failed", e); }
        }
        if (images.length === 0) throw new Error("Could not generate slideshow images.");

        const voiceName = selectVoiceProfile(params);
        let audioUrl = "";
        try { 
            // Use the script if available, otherwise the caption
            const textToSay = item.script || item.caption.substring(0, 150);
            audioUrl = await generateSpeech(textToSay, voiceName, onLog); 
        } catch (e) { }
        
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

        // Smart Context Analysis based on the Title Hook
        // If the hook implies an emotion, we enforce it in the visual prompt
        const hook = item.title.toLowerCase();
        let emotionalContext = "Confidence, engaging expression.";
        
        if (hook.includes("stop") || hook.includes("don't") || hook.includes("mistake") || hook.includes("fail") || hook.includes("trap") || hook.includes("scam")) {
            emotionalContext = "Serious expression, hand gesture like 'stop' or 'warning', urgent look. Or looking disappointed at a receipt/location.";
        } else if (hook.includes("secret") || hook.includes("hack") || hook.includes("you need") || hook.includes("hidden") || hook.includes("missed") || hook.includes("gatekeep")) {
            emotionalContext = "Conspiratorial whisper expression, or showing something to camera, excited. Pointing at a view.";
        } else if (hook.includes("pov") || hook.includes("when you") || hook.includes("feeling")) {
            emotionalContext = "POV shot, selfie angle, looking directly into lens, relatable reaction face, maybe laughing or dreaming.";
        } else if (hook.includes("?")) {
            emotionalContext = "Confused or inquisitive expression, shrugging.";
        }

        const lowerDesc = item.description.toLowerCase();
        const isSocial = lowerDesc.includes('friends') || lowerDesc.includes('party') || lowerDesc.includes('group') || lowerDesc.includes('together') || lowerDesc.includes('dinner') || lowerDesc.includes('club') || lowerDesc.includes('crowd');
        const isNatural = lowerDesc.includes('natural') || lowerDesc.includes('no makeup') || lowerDesc.includes('casual') || lowerDesc.includes('routine') || lowerDesc.includes('waking up');

        const aestheticPrompt = getAestheticPrompt(params.style);
        let promptSuffix = "Single full frame image.";
        const strictTraits = params.traits && params.traits.length > 0 ? `Visible features: ${params.traits.join(", ")}.` : "";
        let subjectContext = `The character is a ${params.gender}, ${params.bodyType} with ${params.chestSize} chest, ${params.style}. Personality: ${params.personality}. ${strictTraits}. Maintain facial features EXACTLY as reference. ${emotionalContext}`;
        
        if (isSocial) {
            promptSuffix = "Authentic social moment. Main character is naturally integrated into the group. Varied composition. Candid.";
            subjectContext += " The main character is socializing.";
            if (lowerDesc.includes('party')) promptSuffix += " Dynamic motion, lively atmosphere.";
        }

        if (isNatural) {
            promptSuffix += " Authentic, candid, natural skin texture, less posed. " + SKIN_TEXTURE_PROMPT;
        } else {
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
                if (!videoResponse.ok) throw new Error(`Video fetch failed: ${videoResponse.statusText}`);
                const videoBlob = await videoResponse.blob();

                // If Reel has a script, generate audio
                let audioUrl = undefined;
                if (item.script) {
                     try {
                         const voiceName = selectVoiceProfile(params);
                         audioUrl = await generateSpeech(item.script, voiceName, onLog);
                     } catch(e) { console.warn("Reel audio failed", e); }
                }

                return { url: URL.createObjectURL(videoBlob), type: 'video', resourceHandle: videoResource, slideshowAudio: audioUrl };

            } catch (error: any) {
                console.warn("Video generation failed, falling back to Slideshow:", error);
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
    }, 3, 5000, onLog);
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

        try {
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
            if (!videoResponse.ok) throw new Error(`Video fetch failed: ${videoResponse.statusText}`);
            const videoBlob = await videoResponse.blob();

            return { videoUrl: URL.createObjectURL(videoBlob), audioUrl, resourceHandle: videoResource };
        } catch (e) {
             if (onLog) onLog("Selfie video failed (quota?), falling back to slideshow...", 'warning');
             return { videoUrl: selfieImageData, audioUrl, resourceHandle: null };
        }
    }, 3, 5000, onLog);
}

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
        if (!videoResponse.ok) throw new Error(`Video fetch failed: ${videoResponse.statusText}`);
        const videoBlob = await videoResponse.blob();
        return { url: URL.createObjectURL(videoBlob), resourceHandle: videoResource, mimeType: 'video/mp4' };
    }, 3, 4000, onLog);
}

export async function generateSingleContentItem(params: BloggerParams, type: 'Post' | 'Reel' | 'Story', onLog?: LogCallback): Promise<ContentPlanItem> {
    return retry(async () => {
        if (onLog) onLog(`Generating single ${type} idea...`);
        const ai = await getAiClient();
        const lang = params.outputLanguage || "English";
        
        const systemInstruction = getGrowthStrategySystemInstruction(lang);
        const prompt = `Generate ONE viral content idea for a ${params.style} influencer.
        Type: ${type}.
        Focus: Engagement (Saves/Shares).
        JSON output.`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { 
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                         title: { type: Type.STRING, description: "VISUAL HOOK (Text on video). Max 7 words." },
                         description: { type: Type.STRING, description: "Visual scene description." },
                         caption: { type: Type.STRING, description: "Full caption text." },
                         script: { type: Type.STRING, description: "Voiceover script (optional)." },
                         hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        const data = JSON.parse(response.text);
        return { id: crypto.randomUUID(), day: Math.floor(Math.random() * 7) + 1, type: type, ...data };
    }, 3, 4000, onLog);
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
        if (!videoResponse.ok) throw new Error(`Video fetch failed: ${videoResponse.statusText}`);
        const videoBlob = await videoResponse.blob();
        return { url: URL.createObjectURL(videoBlob), resourceHandle: videoResource, mimeType: 'video/mp4' };
    }, 3, 5000, onLog);
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
    }, 3, 4000, onLog);
}
