
import React from 'react';

interface HeaderProps {
    language: string;
    setLanguage: (lang: string) => void;
}

const LANGUAGES = [
    'English', 'Spanish', 'French', 'German', 'Italian', 
    'Portuguese', 'Russian', 'Japanese', 'Korean', 'Chinese'
];

export const Header: React.FC<HeaderProps> = ({ language, setLanguage }) => {
    return (
        <div className="flex flex-col items-center relative">
            {/* Top Right Controls */}
            <div className="absolute top-0 right-0 flex items-center gap-3">
                {/* Language Selector */}
                <div className="relative group">
                    <button className="flex items-center gap-2 text-xs sm:text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full border border-gray-600 transition">
                        <span>🌐 {language}</span>
                    </button>
                    <div className="absolute right-0 mt-2 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-xl hidden group-hover:block z-50 max-h-60 overflow-y-auto">
                        {LANGUAGES.map(lang => (
                            <button
                                key={lang}
                                onClick={() => setLanguage(lang)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${language === lang ? 'text-purple-400 font-bold' : 'text-gray-300'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                AI Blogger Hub
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400 text-center">
                Generate a complete, ready-to-post media pack for your AI influencer.
            </p>
        </div>
    );
};
