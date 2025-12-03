
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
    "Gap Teeth", "Natural Makeup", "Mole/Beauty Spot"
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

export const GeneratorForm: React.FC<GeneratorFormProps> = ({ onGenerate, currentLanguage }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [openSection, setOpenSection] = useState<'identity' | 'style' | 'campaign'>('identity');
    
    // Updated defaults
    const defaultParams: BloggerParams = {
        gender: 'female',
        ethnicity: 'caucasian',
        age: 24,
        style: 'travel lifestyle',
        audience: 'travel enthusiasts',
        customTheme: 'Bright, energetic, dynamic, hidden gems, luxury travel, vibrant colors',
        referenceImage: undefined,
        planWeeks: 4,
        autoGenerateWeeks: 4,
        outputLanguage: 'English',
        
        // New Defaults
        bodyType: 'Curvy / Hourglass',
        chestSize: 'Voluptuous (DD+ Cup)',
        personality: 'Charismatic, confident, adventurous, flirty',
        traits: []
    };

    const [params, setParams] = useState<BloggerParams>(defaultParams);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (currentLanguage && currentLanguage !== 'English') {
             setParams(p => ({ ...p, outputLanguage: currentLanguage }));
        }
    }, []);

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
            <h2 className="text-2xl font-bold text-white mb-6">Create Your AI Blogger</h2>
            
            {/* Persona Loader */}
            <div className="mb-8 p-6 bg-gray-900/50 border-2 border-dashed border-gray-600 rounded-xl text-center hover:border-purple-500 transition group">
                {!previewUrl ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer"
                    >
                        <UploadIcon className="w-12 h-12 mx-auto text-gray-400 group-hover:text-purple-400 mb-3 transition" />
                        <h3 className="text-lg font-semibold text-white">Load Existing Persona</h3>
                        <p className="text-sm text-gray-400 mt-1">Upload a photo or a saved .json persona file to skip model generation.</p>
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
                        <p className="mt-3 text-green-400 font-semibold text-sm">Persona Loaded!</p>
                        <p className="text-xs text-gray-400">Gender/Age settings hidden.</p>
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
                            <span className="text-lg font-semibold text-white">Style & Vibe</span>
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${openSection === 'style' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                    {openSection === 'style' && (
                        <div className="p-6 bg-gray-900/30 space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput label="Fashion Style">
                                    <Select value={params.style} onChange={(e) => setParams({ ...params, style: e.target.value })}>
                                        <option value="travel lifestyle">Travel Lifestyle (Recommended)</option>
                                        <option value="glamour fashion">Glamour Fashion</option>
                                        <option value="sporty fitness">Sporty Fitness</option>
                                        <option value="professional">Professional</option>
                                        <option value="casual lifestyle">Casual Lifestyle</option>
                                        <option value="artistic indie">Artistic Indie</option>
                                        <option value="cyberpunk">Cyberpunk / Sci-Fi</option>
                                        <option value="cottagecore">Cottagecore</option>
                                    </Select>
                                </FormInput>
                                <FormInput label="Target Audience">
                                    <Select value={params.audience} onChange={(e) => setParams({ ...params, audience: e.target.value })}>
                                        <option value="travel enthusiasts">Travel Enthusiasts</option>
                                        <option value="fitness followers">Fitness & Health</option>
                                        <option value="tech enthusiasts">Tech Enthusiasts</option>
                                        <option value="beauty and fashion lovers">Beauty & Fashion</option>
                                        <option value="lifestyle and wellness seekers">Lifestyle & Wellness</option>
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
                            Use Loaded Persona & Start
                        </>
                    ) : (
                        <>
                            <span>✨</span>
                            Generate Model (Approval Step)
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
