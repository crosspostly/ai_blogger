
import React, { useState, useEffect } from 'react';
import { GeneratorForm } from './components/GeneratorForm';
import { GenerationProgress } from './components/GenerationProgress';
import { ResultsDisplay } from './components/ResultsDisplay';
import { InfoPanel } from './components/InfoPanel';
import { Header } from './components/Header';
import { LogConsole } from './components/LogConsole';
import { useAIBloggerGenerator } from './hooks/useAIBloggerGenerator';
import type { BloggerParams } from './types';
import { getApiKey, saveApiKey } from './config/apiConfig';

function App() {
  const [needsApiKeySelection, setNeedsApiKeySelection] = useState(false);
  const [manualKey, setManualKey] = useState("");
  
  // Global Language State
  const [language, setLanguage] = useState<string>('English');

  const handleAuthError = () => {
     setNeedsApiKeySelection(true);
  };
  
  const {
    status,
    progress,
    results,
    isLoading,
    error,
    logs,
    generationStep,
    startGeneration,
    handleApproveIdentity,
    handleRegenerateIdentity,
    reset,
    handleExtendVideo,
    handleAddContent,
    handleGenerateItemMedia,
    handleUpdatePlanItem,
    handleAddWardrobeItem,
    handleRegenerateWeek,
    handleGenerateSelfie,
    handleAnimatePhoto
  } = useAIBloggerGenerator(handleAuthError);

  useEffect(() => {
    const checkKey = async () => {
      // 1. Check Config (Env or LocalStorage)
      const configuredKey = getApiKey('gemini');
      if (configuredKey) {
          setNeedsApiKeySelection(false);
          return;
      }

      // 2. Fallback to AI Studio check if no key found
      if (typeof window !== 'undefined' && window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (!hasKey) {
              setNeedsApiKeySelection(true);
          }
      } else {
          // 3. If no key and not in AI Studio, we need to ask
          setNeedsApiKeySelection(true);
      }
    };
    checkKey();
  }, []);

  const handleGenerate = (params: BloggerParams) => {
    startGeneration(params);
  };

  const handleSelectKey = async () => {
    try {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            setNeedsApiKeySelection(false);
            window.location.reload();
        }
    } catch (e) { 
        console.error("Failed to open key selector:", e); 
        alert("Could not open key selector. Please verify you are running in AI Studio.");
    }
  };

  const handleSaveManualKey = () => {
      if (!manualKey.trim()) return;
      saveApiKey('gemini', manualKey);
      setNeedsApiKeySelection(false);
      window.location.reload();
  };

  if (needsApiKeySelection) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 text-center">
        <h1 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Authentication Required
        </h1>
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-700">
            <div className="mb-6">
                <div className="w-16 h-16 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">API Key Needed</h3>
                <p className="text-gray-300 mb-4 text-sm">
                    To use high-quality models (Veo, Imagen), a valid API Key is required.
                </p>
            </div>
            
            {typeof window !== 'undefined' && window.aistudio && (
                <>
                    <button
                        onClick={handleSelectKey}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        Select Paid API Key (AI Studio)
                    </button>
                    
                    <div className="my-6 flex items-center">
                        <div className="flex-grow border-t border-gray-600"></div>
                        <span className="mx-4 text-gray-500 text-sm font-medium">OR</span>
                        <div className="flex-grow border-t border-gray-600"></div>
                    </div>
                </>
            )}
            
            <div className="space-y-3 text-left">
                <label className="block text-sm font-medium text-gray-300">Enter API Key Manually</label>
                <div className="flex gap-2">
                    <input 
                        type="password" 
                        value={manualKey}
                        onChange={(e) => setManualKey(e.target.value)}
                        placeholder="AIza..."
                        className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                    />
                    <button 
                        onClick={handleSaveManualKey}
                        disabled={!manualKey}
                        className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition text-sm whitespace-nowrap"
                    >
                        Save Key
                    </button>
                </div>
                <p className="text-xs text-gray-500">
                    Key will be saved locally in your browser.
                </p>
            </div>

            <p className="mt-6 text-xs text-gray-500">
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Learn more about billing</a>
            </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans pb-48">
        <div className="relative isolate overflow-hidden">
            <svg className="absolute inset-0 -z-10 h-full w-full stroke-white/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
                <defs>
                    <pattern id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc" width={200} height={200} x="50%" y={-1} patternUnits="userSpaceOnUse">
                        <path d="M.5 200V.5H200" fill="none" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" strokeWidth={0} fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)" />
            </svg>
        </div>

        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Header 
                language={language}
                setLanguage={setLanguage}
            />

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    { !isLoading && !results && <GeneratorForm onGenerate={handleGenerate} currentLanguage={language} /> }
                    { (isLoading || results) && <GenerationProgress status={status} progress={progress} /> }
                    { error && (
                        <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg flex items-center justify-between gap-4">
                            <span>{error}</span>
                            {(error.includes('Quota') || error.includes('Billing') || error.includes('429')) && (
                                <button 
                                    onClick={() => setNeedsApiKeySelection(true)}
                                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded whitespace-nowrap"
                                >
                                    Change API Key
                                </button>
                            )}
                        </div>
                    )}
                    { results && (
                        <ResultsDisplay 
                            results={results} 
                            onReset={reset} 
                            onExtendVideo={handleExtendVideo}
                            onAddContent={handleAddContent}
                            onGenerateItemMedia={handleGenerateItemMedia}
                            onUpdateItem={handleUpdatePlanItem}
                            onAddWardrobeItem={handleAddWardrobeItem}
                            onRegenerateWeek={(weekIdx, theme) => handleRegenerateWeek(weekIdx, theme, language)}
                            onGenerateSelfie={handleGenerateSelfie}
                            onAnimatePhoto={handleAnimatePhoto}
                            // New Approval Props
                            generationStep={generationStep}
                            onApproveIdentity={handleApproveIdentity}
                            onRegenerateIdentity={handleRegenerateIdentity}
                        /> 
                    ) }
                </div>
                <InfoPanel />
            </div>
        </main>
        
        <LogConsole logs={logs} />
    </div>
  );
}

export default App;
