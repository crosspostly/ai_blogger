
import { useState, useCallback } from 'react';
import type { BloggerParams, GenerationResults, ContentPlanItem, LogEntry, GenerationStep } from '../types';
import * as geminiService from '../services/geminiService';

// Simple concurrency helper
async function mapConcurrent<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<void> {
    const results = [];
    const executing = new Set<Promise<any>>();

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const p = Promise.resolve().then(() => fn(item, i));
        
        executing.add(p);
        const clean = () => executing.delete(p);
        p.then(clean).catch(clean);

        if (executing.size >= concurrency) {
            await Promise.race(executing);
        }
    }
    await Promise.all(executing);
}

export function useAIBloggerGenerator(onAuthError: () => void) {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Idle');
    const [results, setResults] = useState<GenerationResults | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentParams, setCurrentParams] = useState<BloggerParams | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    
    // New Step State for 2-Phase Flow
    const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');

    const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        setLogs(prev => [...prev, { timestamp, message, type }]);
    }, []);

    const reset = useCallback(() => {
        setIsLoading(false);
        setProgress(0);
        setStatus('Idle');
        setResults(null);
        setError(null);
        setCurrentParams(null);
        setLogs([]);
        setGenerationStep('idle');
    }, []);

    // PHASE 1: Generate Identity Only
    const generateIdentity = useCallback(async (params: BloggerParams) => {
        setIsLoading(true);
        setError(null);
        setGenerationStep('idle');
        setResults(null);
        setCurrentParams(params);
        setProgress(0);
        addLog("Initializing Model Generation...", 'info');

        try {
            // 0. Creative Brief
            setStatus('Designing visual identity & wardrobe...');
            setProgress(10);
            addLog("Drafting visual brief...", 'info');
            const brief = await geminiService.generateCreativeBrief(params, addLog);
            
            // 1. Generate Wardrobe (or use reference)
            let wardrobe: string[] = [];
            
            if (params.referenceImage) {
                 setStatus('Importing existing persona...');
                 addLog("Importing reference persona...", 'info');
                 wardrobe = [
                    params.referenceImage.startsWith('data:') ? params.referenceImage : `data:image/jpeg;base64,${params.referenceImage}`
                 ];
                 setProgress(100);
                 
                 // If reference exists, we can technically skip approval, but let's stick to flow or auto-approve?
                 // Let's set to review so they can see it, OR if it's uploaded, maybe just go straight to campaign?
                 // Request was: "if we load our model... don't confuse". 
                 // Let's go to Review mode so they can verify the upload parsed correctly.
            } else {
                setStatus('Shooting wardrobe (Portrait, Casual, Active, Glam)...');
                addLog("Starting model photoshoot...", 'info');
                wardrobe = await geminiService.generateWardrobe(brief, params, addLog);
                setProgress(100);
            }

            setResults({ 
                wardrobe, 
                audioUrl: null,
                voiceScript: brief.voiceScript,
                contentPlan: null,
                creativeBrief: brief
            });
            
            setStatus('Model Ready for Approval');
            setGenerationStep('review_identity');
            addLog("Model generated. Waiting for approval.", 'success');

        } catch (e: any) {
            console.error(e);
            handleError(e, onAuthError, setError, addLog);
            setStatus('Failed');
        } finally {
            setIsLoading(false);
        }
    }, [addLog, onAuthError]);

    // Handler for the main "Start" button
    const startGeneration = useCallback((params: BloggerParams) => {
        generateIdentity(params);
    }, [generateIdentity]);

    // PHASE 1.5: Regenerate Identity (Retry Button)
    const handleRegenerateIdentity = useCallback(async () => {
        if (!currentParams) return;
        generateIdentity(currentParams);
    }, [currentParams, generateIdentity]);


    // PHASE 2: Generate Campaign (Approve Button)
    const handleApproveIdentity = useCallback(async () => {
        if (!results || !currentParams || !results.creativeBrief) return;
        
        setIsLoading(true);
        setGenerationStep('campaign_complete'); // We are moving to campaign mode
        setStatus('Starting Campaign Production...');
        addLog("Model Approved. Starting content production...", 'success');
        setProgress(0);

        try {
            const params = currentParams;
            const brief = results.creativeBrief;

            // 2. Generate Content Plan
            setStatus(`Developing ${params.planWeeks}-week content strategy in ${params.outputLanguage}...`);
            addLog("Drafting content strategy...", 'info');
            const contentPlan = await geminiService.generateContentPlan(params, addLog);
            
            setResults(prev => prev ? { ...prev, contentPlan } : null);
            setProgress(30);

            // 3. Generate Audio
            if (brief.voiceScript) {
                setStatus('Recording voice intro...');
                addLog("Recording voice introduction...", 'info');
                try {
                    const audioUrl = await geminiService.generateSpeech(brief.voiceScript, params.gender, addLog); 
                    setResults(prev => prev ? { ...prev, audioUrl } : null);
                } catch (e) { console.warn("Audio failed", e); }
            }
            setProgress(50);

            // 4. Generate Media (Automation)
            if (params.autoGenerateWeeks > 0) {
                const weeksToProcess = contentPlan.filter(w => w.weekNumber <= params.autoGenerateWeeks);
                const itemsToProcess = weeksToProcess.flatMap(w => w.items);
                const faceReference = results.wardrobe[0];
                const totalItems = itemsToProcess.length;
                let completedItems = 0;

                if (totalItems > 0) {
                    setStatus(`Producing media for ${params.autoGenerateWeeks} weeks (${totalItems} items)...`);
                    addLog(`Starting batch production for ${totalItems} items...`, 'info');

                    // Use mapConcurrent to limit active requests to 1 to avoid Rate Limit 0 on Free Tier
                    await mapConcurrent(itemsToProcess, 1, async (item, i) => {
                        // Mark as generating
                         setResults(prev => {
                            if (!prev || !prev.contentPlan) return prev;
                            const newPlan = [...prev.contentPlan];
                            const wIndex = newPlan.findIndex(w => w.items.some(it => it.id === item.id));
                            if (wIndex !== -1) {
                                const newItems = [...newPlan[wIndex].items];
                                const itemIndex = newItems.findIndex(it => it.id === item.id);
                                if (itemIndex !== -1) newItems[itemIndex] = { ...newItems[itemIndex], isGenerating: true };
                                newPlan[wIndex].items = newItems;
                            }
                            return { ...prev, contentPlan: newPlan };
                        });

                        try {
                            const mediaResult = await geminiService.generateMediaForPlanItem(item, faceReference, params, addLog);
                            
                            // Update success
                            setResults(prev => {
                                if (!prev || !prev.contentPlan) return prev;
                                const newPlan = [...prev.contentPlan];
                                const wIndex = newPlan.findIndex(w => w.items.some(it => it.id === item.id));
                                if (wIndex !== -1) {
                                    const newItems = [...newPlan[wIndex].items];
                                    const itemIndex = newItems.findIndex(it => it.id === item.id);
                                    if (itemIndex !== -1) {
                                        newItems[itemIndex] = { 
                                            ...newItems[itemIndex], 
                                            mediaUrl: mediaResult.url, 
                                            mediaType: mediaResult.type,
                                            mediaHandle: mediaResult.resourceHandle,
                                            slideshowImages: mediaResult.slideshowImages,
                                            slideshowAudio: mediaResult.slideshowAudio,
                                            isGenerating: false
                                        };
                                    }
                                    newPlan[wIndex].items = newItems;
                                }
                                return { ...prev, contentPlan: newPlan };
                            });
                        } catch (e) {
                            console.error(`Failed item ${item.id}`, e);
                             // Update failure
                            setResults(prev => {
                                if (!prev || !prev.contentPlan) return prev;
                                const newPlan = [...prev.contentPlan];
                                const wIndex = newPlan.findIndex(w => w.items.some(it => it.id === item.id));
                                if (wIndex !== -1) {
                                    const newItems = [...newPlan[wIndex].items];
                                    const itemIndex = newItems.findIndex(it => it.id === item.id);
                                    if (itemIndex !== -1) newItems[itemIndex] = { ...newItems[itemIndex], isGenerating: false };
                                    newPlan[wIndex].items = newItems;
                                }
                                return { ...prev, contentPlan: newPlan };
                            });
                        }

                        completedItems++;
                        const progressVal = 50 + Math.round((completedItems / totalItems) * 50);
                        setProgress(progressVal);
                        setStatus(`Producing asset ${completedItems}/${totalItems}...`);
                    });
                }
            } else {
                 setStatus('Content Plan ready! Click generate on cards to create media.');
                 addLog("Content Plan generated. Awaiting manual media triggers.", 'success');
            }

            setStatus('Media pack complete!');
            addLog("Campaign Generation Complete!", 'success');
            setProgress(100);

        } catch (e: any) {
             console.error(e);
             handleError(e, onAuthError, setError, addLog);
             setStatus('Failed');
        } finally {
            setIsLoading(false);
        }
    }, [results, currentParams, onAuthError, addLog]);

    // Manual triggers (unchanged logic, just ensuring they use currentParams)
    const handleGenerateItemMedia = async (weekIndex: number, itemIndex: number) => {
        if (!results || !results.contentPlan || !results.wardrobe[0] || !currentParams) return;
        setStatus('Generating media for selected item...');
        setIsLoading(true);
        try {
            const plan = [...results.contentPlan];
            const item = plan[weekIndex].items[itemIndex];
            
            const updatedPlanStart = [...results.contentPlan];
            updatedPlanStart[weekIndex].items[itemIndex] = { ...item, isGenerating: true };
            setResults({ ...results, contentPlan: updatedPlanStart });

            const mediaResult = await geminiService.generateMediaForPlanItem(item, results.wardrobe[0], currentParams, addLog);
            
            const updatedPlanEnd = [...results.contentPlan];
            updatedPlanEnd[weekIndex].items[itemIndex] = {
                ...item,
                mediaUrl: mediaResult.url,
                mediaType: mediaResult.type,
                mediaHandle: mediaResult.resourceHandle,
                slideshowImages: mediaResult.slideshowImages,
                slideshowAudio: mediaResult.slideshowAudio,
                isGenerating: false
            };
            setResults({ ...results, contentPlan: updatedPlanEnd });
        } catch (e: any) {
            handleError(e, onAuthError, (msg) => alert(msg), addLog);
            const updatedPlanErr = [...results.contentPlan];
            updatedPlanErr[weekIndex].items[itemIndex] = { ...updatedPlanErr[weekIndex].items[itemIndex], isGenerating: false };
            setResults({ ...results, contentPlan: updatedPlanErr });
        } finally {
            setIsLoading(false);
            setStatus('Ready');
        }
    };

    // ... (Other handlers: handleUpdatePlanItem, handleAddWardrobeItem, handleExtendVideo, handleGenerateSelfie, handleAnimatePhoto, handleAddContent, handleRegenerateWeek - Unchanged logic, just ensure types match)
    
    // Helper for error handling
    const handleError = (e: any, authCb: () => void, errorCb: (msg: string) => void, logCb: any) => {
        let errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        if (e.message?.includes('User not authenticated')) {
            authCb();
            errorMessage = "Authentication failed. Please select your API key.";
        } else if (e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('RESOURCE_EXHAUSTED') || e.message?.includes('Billing required') || e.message?.includes('limit of 0')) {
            authCb();
            errorMessage = "Quota/Billing limit reached. Please select a valid paid API Key.";
        }
        errorCb(`Generation failed: ${errorMessage}`);
        logCb(`FAILURE: ${errorMessage}`, 'error');
    };

    // Re-export other handlers same as before...
    const handleUpdatePlanItem = (weekIndex: number, itemIndex: number, field: keyof ContentPlanItem, value: string) => {
        setResults(prev => {
            if (!prev || !prev.contentPlan) return prev;
            const newPlan = [...prev.contentPlan];
            const item = newPlan[weekIndex].items[itemIndex];
            // @ts-ignore
            item[field] = value;
            newPlan[weekIndex].items[itemIndex] = item;
            return { ...prev, contentPlan: newPlan };
        });
    };

    const handleAddWardrobeItem = async (description: string) => {
        if (!results || !results.wardrobe[0]) return;
        setStatus('Creating new custom look...');
        setIsLoading(true);
        try {
            const newLook = await geminiService.generateSingleWardrobeItem(results.wardrobe[0], description, currentParams!, addLog);
            setResults(prev => prev ? { ...prev, wardrobe: [...prev.wardrobe, newLook] } : null);
        } catch (e: any) { handleError(e, onAuthError, (msg) => alert(msg), addLog); } 
        finally { setIsLoading(false); setStatus('Ready'); }
    };

    const handleExtendVideo = async (weekIndex: number, itemIndex: number) => {
        if (!results?.contentPlan) return;
        const item = results.contentPlan[weekIndex].items[itemIndex];
        if (item.mediaType !== 'video' || !item.mediaHandle) { alert("Invalid video handle"); return; }
        setStatus('Extending video clip...');
        setIsLoading(true);
        try {
            const extendedAsset = await geminiService.extendVideo(item.mediaHandle, item.description, addLog);
            setResults(prev => {
                if(!prev?.contentPlan) return prev;
                const newPlan = [...prev.contentPlan];
                newPlan[weekIndex].items[itemIndex] = { ...item, mediaUrl: extendedAsset.url, mediaHandle: extendedAsset.resourceHandle };
                return { ...prev, contentPlan: newPlan };
            });
        } catch(e: any) { handleError(e, onAuthError, (msg) => alert(msg), addLog); }
        finally { setIsLoading(false); setStatus('Ready'); }
    };

    const handleGenerateSelfie = async (weekIndex: number, itemIndex: number) => {
        if (!results?.contentPlan || !results.wardrobe[0] || !currentParams) return;
        const item = results.contentPlan[weekIndex].items[itemIndex];
        const script = item.script || item.caption;
        setStatus('Recording selfie video...');
        setIsLoading(true);
        try {
             setResults(prev => {
                if (!prev?.contentPlan) return prev;
                const newPlan = [...prev.contentPlan];
                newPlan[weekIndex].items[itemIndex] = { ...item, isGenerating: true };
                return { ...prev, contentPlan: newPlan };
             });
             const selfieResult = await geminiService.generateSelfieVideo(script, results.wardrobe[0], currentParams, addLog);
             setResults(prev => {
                if(!prev?.contentPlan) return prev;
                const newPlan = [...prev.contentPlan];
                newPlan[weekIndex].items[itemIndex] = { 
                    ...item, 
                    mediaUrl: selfieResult.videoUrl, 
                    mediaType: 'video', 
                    mediaHandle: selfieResult.resourceHandle,
                    slideshowAudio: selfieResult.audioUrl,
                    isGenerating: false
                };
                return { ...prev, contentPlan: newPlan };
             });
        } catch(e: any) { 
            handleError(e, onAuthError, (msg) => alert(msg), addLog);
            setResults(prev => {
                if (!prev?.contentPlan) return prev;
                const newPlan = [...prev.contentPlan];
                newPlan[weekIndex].items[itemIndex] = { ...item, isGenerating: false };
                return { ...prev, contentPlan: newPlan };
             });
        }
        finally { setIsLoading(false); setStatus('Ready'); }
    };

    const handleAnimatePhoto = async (weekIndex: number, itemIndex: number) => {
        if (!results?.contentPlan) return;
        const item = results.contentPlan[weekIndex].items[itemIndex];
        if (!item.mediaUrl) return;
        setStatus('Animating photo...');
        setIsLoading(true);
        try {
            setResults(prev => {
                if (!prev?.contentPlan) return prev;
                const newPlan = [...prev.contentPlan];
                newPlan[weekIndex].items[itemIndex] = { ...item, isGenerating: true };
                return { ...prev, contentPlan: newPlan };
             });
            const videoAsset = await geminiService.animatePhoto(item.mediaUrl, addLog);
            setResults(prev => {
                if(!prev?.contentPlan) return prev;
                const newPlan = [...prev.contentPlan];
                newPlan[weekIndex].items[itemIndex] = { 
                    ...item, 
                    mediaUrl: videoAsset.url, 
                    mediaType: 'video', 
                    mediaHandle: videoAsset.resourceHandle,
                    isGenerating: false
                };
                return { ...prev, contentPlan: newPlan };
            });
        } catch(e: any) { 
            handleError(e, onAuthError, (msg) => alert(msg), addLog); 
             setResults(prev => {
                if (!prev?.contentPlan) return prev;
                const newPlan = [...prev.contentPlan];
                newPlan[weekIndex].items[itemIndex] = { ...item, isGenerating: false };
                return { ...prev, contentPlan: newPlan };
             });
        }
        finally { setIsLoading(false); setStatus('Ready'); }
    };

    const handleAddContent = async (weekIndex: number, type: 'Post' | 'Reel' | 'Story') => {
        if (!currentParams || !results?.contentPlan) return;
        setStatus('Adding content...');
        setIsLoading(true);
        try {
            const newItem = await geminiService.generateSingleContentItem(currentParams, type, addLog);
            setResults(prev => {
                if(!prev?.contentPlan) return prev;
                const newPlan = [...prev.contentPlan];
                newPlan[weekIndex].items.push(newItem);
                return { ...prev, contentPlan: newPlan };
            });
        } catch(e) { console.error(e); }
        finally { setIsLoading(false); setStatus('Ready'); }
    };

    const handleRegenerateWeek = async (weekIndex: number, theme: string, overrideLanguage?: string) => {
        if (!currentParams || !results?.contentPlan) return;
        setStatus(`Rewriting Week ${weekIndex + 1}...`);
        setIsLoading(true);
        try {
            const week = results.contentPlan[weekIndex];
            const paramsToUse = overrideLanguage ? { ...currentParams, outputLanguage: overrideLanguage } : currentParams;
            const updatedItems = await geminiService.regenerateWeekPlan(week.weekNumber, week.items, theme, paramsToUse, addLog);
            setResults(prev => {
                if(!prev?.contentPlan) return prev;
                const newPlan = [...prev.contentPlan];
                newPlan[weekIndex] = { ...newPlan[weekIndex], items: updatedItems, theme };
                return { ...prev, contentPlan: newPlan };
            });
        } catch(e) { alert("Failed to regenerate week"); }
        finally { setIsLoading(false); setStatus('Ready'); }
    };

    return { 
        isLoading, 
        progress, 
        status, 
        results, 
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
    };
}
