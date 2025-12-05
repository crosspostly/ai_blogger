
import React, { useState, useRef, useEffect } from 'react';
import type { BloggerParams } from '../types';
import { UploadIcon } from './icons/UploadIcon';

interface GeneratorFormProps {
    onGenerate: (params: BloggerParams) => void;
    currentLanguage: string;
}

const FormInput: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        {children}
    </div>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className="w-full bg-gray-700/50 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-purple-500 focus:border-purple-500 transition" />
);

const COMMON_TRAITS = [
    "Freckles", "Blue Eyes", "Green Eyes", "Tattoos", "Piercings", 
    "Glasses", "Messy Hair", "Dyed Hair", "Tan Lines", "Dimples", 
    "Gap Teeth", "Natural Makeup", "Mole/Beauty Spot", "Sun-kissed Skin"
];

const OUTPUT_LANGUAGES = [
    "English", "Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Japanese", "Chinese", "Korean"
];

const CHEST_SIZES = [
    "Petite / Flat", 
    "Small (A-B Cup)", 
    "Medium (C Cup)", 
    "Large (D Cup)", 
    "Voluptuous (DD+ Cup)", 
    "Very Voluptuous (E+ Cup)"
];

const BODY_TYPES = [
    "Slim / Skinny",
    "Athletic / Toned",
    "Average",
    "Curvy / Hourglass",
    "Plus Size",
    "Bodybuilder"
];

// PRESETS DEFINITION
const PRESETS: Record<string, Partial<BloggerParams>> = {
    traveler: {
        style: 'travel lifestyle',
        audience: 'luxury travelers',
        customTheme: 'Luxury resorts, crystal clear water, golden hour, exotic locations',
        bodyType: 'Athletic / Toned',
        personality: 'Adventurous, free-spirited, charismatic, elegant',
        marketingStrategy: 'Visual Aesthetic',
        traits: ["Sun-kissed Skin", "Natural Makeup", "Tan Lines"]
    },
    fashion: {
        style: 'old money',
        audience: 'gen z',
        customTheme: 'Paris fashion week, street style, vintage luxury',
        bodyType: 'Slim / Skinny',
        personality: 'Chic, mysterious, sophisticated',
        marketingStrategy: 'Visual Aesthetic',
        traits: ["Blue Eyes", "Mole/Beauty Spot"]
    },
    fitness: {
        style: 'sporty fitness',
        audience: 'fitness enthusiasts',
        customTheme: 'Gym motivation, morning runs, healthy eating',
        bodyType: 'Athletic / Toned',
        personality: 'Energetic, motivational, disciplined',
        marketingStrategy: 'Educational / Value',
        traits: ["Messy Hair", "No Makeup"]
    }
};

export const GeneratorForm: React.FC<GeneratorFormProps> = ({ onGenerate, currentLanguage }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [openSection, setOpenSection] = useState<'identity' | 'style' | 'campaign'>('identity');
    const [activePreset, setActivePreset] = useState<string>('traveler');
    
    // Default is the TRAVELER preset
    const defaultParams: BloggerParams = {
        gender: 'female',
        ethnicity: 'caucasian',
        age: 23,
        referenceImage: undefined,
        planWeeks: 4,
        autoGenerateWeeks: 4,
        outputLanguage: 'English',
        chestSize: 'Medium (C Cup)',
        // Merge with Traveler default
        ...PRESETS.traveler as any
    };

    const [params, setParams] = useState<BloggerParams>(defaultParams);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (currentLanguage && currentLanguage !== 'English') {
             setParams(p => ({ ...p, outputLanguage: currentLanguage }));
        }
    }, [currentLanguage]);

    const applyPreset = (key: string) => {
        setActivePreset(key);
        setParams(prev => ({
            ...prev,
            ...PRESETS[key],
            // Preserve identity fields if reference is loaded
            referenceImage: prev.referenceImage,
            gender: prev.gender,
            ethnicity: prev.ethnicity,
            age: prev.age,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(params);
    };

    const handleTraitToggle = (trait: string) => {
        setParams(prev => {
            if (prev.traits.includes(trait)) {
                return { ...prev, traits: prev.traits.filter(t => t !== trait) };
            } else {
                return { ...prev, traits: [...prev.traits, trait] };
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const content = ev.target?.result as string;
                        if (!content) return;
                        const persona = JSON.parse(content);
                        if (persona.avatarData && persona.meta) {
                            const cleanMeta = Object.fromEntries(
                                Object.entries(persona.meta).filter(([_, v]) => v != null)
                            );
                            setParams(prev => ({ 
                                ...prev,
                                ...cleanMeta, 
                                referenceImage: persona.avatarData, 
                            }));
                            setPreviewUrl(persona.avatarData.startsWith('data:') ? persona.avatarData : `data:image/jpeg;base64,${persona.avatarData}`);
                        }
                    } catch (err) {
                        console.error("Persona load error:", err);
                        alert("Invalid persona file");
                    }
                };
                reader.readAsText(file);
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const result = ev.target?.result as string;
                    if (result) {
                        const base64 = result.split(',')[1];
                        setParams(prev => ({ ...prev, referenceImage: base64 }));
                        setPreviewUrl(result);
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const clearReference = () => {
        setParams({ ...params, referenceImage: undefined });
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const toggleSection = (section: 'identity' | 'style' | 'campaign') => {
        setOpenSection(openSection === section ? 'identity' : section);
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 lg:p-8 backdrop-blur-sm">
            
            {/* TEMPLATE SELECTOR */}
            <div className="mb-8">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Select Campaign Template</h3>
                <div className="grid grid-cols-3 gap-3">
                    <button 
                        onClick={() => applyPreset('traveler')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${activePreset === 'traveler' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                    >
                        <span className="text-2xl">✈️</span>
                        <span className="text-xs font-bold">Luxury Traveler</span>
                    </button>
                    <button 
                         onClick={() => applyPreset('fashion')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${activePreset === 'fashion' ? 'bg-pink-600/20 border-pink-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                    >
                        <span className="text-2xl">👗</span>
                        <span className="text-xs font-bold">Fashion Icon</span>
                    </button>
                    <button 
                         onClick={() => applyPreset('fitness')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${activePreset === 'fitness' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                    >
                        <span className="text-2xl">💪</span>
                        <span className="text-xs font-bold">Fitness Pro</span>
                    </button>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6">Create Your AI Blogger</h2>
            
            {/* Persona Loader */}
            <div className="mb-8 p-6 bg-gray-900/50 border-2 border-dashed border-gray-600 rounded-xl text-center hover:border-purple-500 transition group">
                {!previewUrl ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer"
                    >
                        <UploadIcon className="w-12 h-12 mx-auto text-gray-400 group-hover:text-purple-400 mb-3 transition" />
                        <h3 className="text-lg font-semibold text-white">Load Face / Persona</h3>
                        <p className="text-sm text-gray-400 mt-1">Upload a photo to use your own model.</p>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*,.json" 
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                    </div>
                ) : (
                    <div className="relative inline-block">
                        <img src={previewUrl} alt="Reference" className="h-32 w-32 object-cover rounded-full border-4 border-purple-500 shadow-lg mx-auto" />
                        <button 
                            onClick={clearReference}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition"
                            title="Remove Reference"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <p className="mt-3 text-green-400 font-semibold text-sm">Face Loaded!</p>
                        <p className="text-xs text-gray-400">Template style will apply to this face.</p>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. IDENTITY & BODY SECTION */}
                <div className="border border-gray-700 rounded-xl overflow-hidden">
                    <button 
                        type="button" 
                        onClick={() => toggleSection('identity')}
                        className="w-full px-6 py-4 bg-gray-800 flex justify-between items-center hover:bg-gray-750 transition"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">1</div>
                            <span className="text-lg font-semibold text-white">Identity & Physical Appearance</span>
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${openSection === 'identity' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                    {openSection === 'identity' && (
                        <div className="p-6 bg-gray-900/30 space-y-6 animate-fade-in">
                            {/* Basic Info */}
                            {!params.referenceImage && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormInput label="Gender">
                                        <Select value={params.gender} onChange={(e) => setParams({ ...params, gender: e.target.value })}>
                                            <option value="female">Female</option>
                                            <option value="male">Male</option>
                                            <option value="non-binary">Non-binary</option>
                                        </Select>
                                    </FormInput>
                                    <FormInput label="Ethnicity">
                                        <Select value={params.ethnicity} onChange={(e) => setParams({ ...params, ethnicity: e.target.value })}>
                                            <option value="caucasian">Caucasian (European)</option>
                                            <option value="asian">Asian</option>
                                            <option value="black">Black</option>
                                            <option value="hispanic">Hispanic</option>
                                            <option value="middle eastern">Middle Eastern</option>
                                            <option value="multiracial">Multiracial</option>
                                        </Select>
                                    </FormInput>
                                    <FormInput label={`Age: ${params.age}`}>
                                        <div className="flex items-center h-full">
                                            <input
                                                type="range"
                                                min="18"
                                                max="50"
                                                value={params.age}
                                                onChange={(e) => setParams({ ...params, age: parseInt(e.target.value, 10) })}
                                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                            />
                                        </div>
                                    </FormInput>
                                </div>
                            )}

                            {/* BODY & CHEST - The Request */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-800/50 rounded-xl border border-purple-500/30">
                                <FormInput label="Body Type / Build">
                                    <Select value={params.bodyType} onChange={(e) => setParams({ ...params, bodyType: e.target.value })}>
                                        {BODY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                    </Select>
                                </FormInput>

                                <FormInput label="Chest / Bust Size">
                                    <Select value={params.chestSize} onChange={(e) => setParams({ ...params, chestSize: e.target.value })}>
                                        {CHEST_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                                    </Select>
                                </FormInput>
                            </div>

                            {/* Traits */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">Distinguishing Features</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {COMMON_TRAITS.map(trait => (
                                        <label key={trait} className="flex items-center space-x-2 cursor-pointer group">
                                            <input 
                                                type="checkbox"
                                                checked={params.traits.includes(trait)}
                                                onChange={() => handleTraitToggle(trait)}
                                                className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                                            />
                                            <span className={`text-sm group-hover:text-white transition ${params.traits.includes(trait) ? 'text-white font-medium' : 'text-gray-400'}`}>
                                                {trait}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. STYLE & PERSONALITY */}
                <div className="border border-gray-700 rounded-xl overflow-hidden">
                    <button 
                        type="button" 
                        onClick={() => toggleSection('style')}
                        className="w-full px-6 py-4 bg-gray-800 flex justify-between items-center hover:bg-gray-750 transition"
                    >
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold">2</div>
                            <span className="text-lg font-semibold text-white">Style & Viral Strategy</span>
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${openSection === 'style' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                    {openSection === 'style' && (
                        <div className="p-6 bg-gray-900/30 space-y-6 animate-fade-in">
                            <div className="p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg border border-pink-500/20 mb-4">
                                <FormInput label="🔥 Growth Strategy (How do you want to go viral?)">
                                    <Select value={params.marketingStrategy} onChange={(e) => setParams({ ...params, marketingStrategy: e.target.value as any })}>
                                        <option value="Visual Aesthetic">Visual Aesthetic / Mood (Best for Travel/Lifestyle)</option>
                                        <option value="POV / Relatable">POV / Relatable (Best for Reels/TikTok)</option>
                                        <option value="Educational / Value">Educational / Value (Best for Saves)</option>
                                    </Select>
                                </FormInput>
                                <p className="text-xs text-gray-400 mt-2">
                                    {params.marketingStrategy === 'POV / Relatable' && "Focuses on 'Hooks' and relatable situations. Best for rapid growth."}
                                    {params.marketingStrategy === 'Visual Aesthetic' && "Focuses on high-quality, curated vibes. Perfect for 'Old Money' or Travel."}
                                    {params.marketingStrategy === 'Educational / Value' && "Focuses on tips, tricks, and informative captions."}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput label="Aesthetic / Fashion Style">
                                    <Select value={params.style} onChange={(e) => setParams({ ...params, style: e.target.value })}>
                                        <option value="travel lifestyle">Travel Lifestyle (Bright & Dynamic)</option>
                                        <option value="old money">Old Money / Quiet Luxury (Film Look)</option>
                                        <option value="clean girl">Clean Girl / Minimalist</option>
                                        <option value="y2k">Y2K / 2000s Pop</option>
                                        <option value="dark academia">Dark Academia</option>
                                        <option value="glamour fashion">Glamour Fashion</option>
                                        <option value="sporty fitness">Sporty Fitness</option>
                                        <option value="cottagecore">Cottagecore</option>
                                    </Select>
                                </FormInput>
                                <FormInput label="Target Audience">
                                    <Select value={params.audience} onChange={(e) => setParams({ ...params, audience: e.target.value })}>
                                        <option value="luxury travelers">Luxury Travelers</option>
                                        <option value="gen z">Gen Z (Trendsetters)</option>
                                        <option value="millennials">Millennials (Lifestyle)</option>
                                        <option value="fitness enthusiasts">Fitness Enthusiasts</option>
                                        <option value="business professionals">Business Professionals</option>
                                    </Select>
                                </FormInput>
                            </div>
                            
                            <FormInput label="Personality / Attitude">
                                <input 
                                    type="text"
                                    value={params.personality}
                                    onChange={(e) => setParams({ ...params, personality: e.target.value })}
                                    placeholder="e.g. Charismatic, Sexy, Flirty, Shy, Intellectual..."
                                    className="w-full bg-gray-700/50 border border-gray-600 text-white rounded-lg p-2.5 text-sm focus:ring-purple-500 focus:border-purple-500"
                                />
                            </FormInput>

                             <FormInput label="Specific Theme / Topic (Optional)">
                                <input 
                                    type="text"
                                    value={params.customTheme}
                                    onChange={(e) => setParams({ ...params, customTheme: e.target.value })}
                                    placeholder="e.g., Luxury resorts, Street food, Yoga retreats..."
                                    className="w-full bg-gray-700/50 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-purple-500 focus:border-purple-500 transition"
                                />
                            </FormInput>
                        </div>
                    )}
                </div>

                {/* 3. CAMPAIGN SETTINGS */}
                <div className="border border-gray-700 rounded-xl overflow-hidden">
                    <button 
                        type="button" 
                        onClick={() => toggleSection('campaign')}
                        className="w-full px-6 py-4 bg-gray-800 flex justify-between items-center hover:bg-gray-750 transition"
                    >
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">3</div>
                            <span className="text-lg font-semibold text-white">Campaign Settings</span>
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${openSection === 'campaign' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                    {openSection === 'campaign' && (
                        <div className="p-6 bg-gray-900/30 space-y-6 animate-fade-in">
                            <FormInput label="Output Language">
                                <Select value={params.outputLanguage} onChange={(e) => setParams({ ...params, outputLanguage: e.target.value })}>
                                    {OUTPUT_LANGUAGES.map(lang => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </Select>
                            </FormInput>

                            <FormInput label={`Campaign Duration: ${params.planWeeks} Weeks`}>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-gray-500">1 Wk</span>
                                    <input
                                        type="range"
                                        min="1"
                                        max="6"
                                        value={params.planWeeks}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            setParams({ 
                                                ...params, 
                                                planWeeks: val,
                                                autoGenerateWeeks: Math.min(params.autoGenerateWeeks, val)
                                            });
                                        }}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <span className="text-xs text-gray-500">6 Wks</span>
                                </div>
                            </FormInput>

                            <FormInput label={`Auto-Produce Media for: ${params.autoGenerateWeeks === 0 ? 'None (Text Only)' : params.autoGenerateWeeks + ' Weeks'}`}>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-gray-500">None</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max={params.planWeeks}
                                        value={params.autoGenerateWeeks}
                                        onChange={(e) => setParams({ ...params, autoGenerateWeeks: parseInt(e.target.value, 10) })}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                    />
                                    <span className="text-xs text-gray-500">All</span>
                                </div>
                            </FormInput>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-pink-500 shadow-xl shadow-purple-900/50 flex justify-center items-center gap-2"
                >
                    {params.referenceImage ? (
                        <>
                            <span>📸</span>
                            Use Loaded Face & Start
                        </>
                    ) : (
                        <>
                            <span>✨</span>
                            Generate New Identity
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
