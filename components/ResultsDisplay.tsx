
import React, { useState, useMemo } from 'react';
import type { GenerationResults, ContentPlanItem, UpdatePlanItemHandler, AddWardrobeItemHandler, ExtendVideoHandler, RegenerateWeekHandler, GenerateSelfieHandler, AnimatePhotoHandler, GenerationStep } from '../types';
// @ts-ignore
import JSZip from 'jszip';
import { ImageModal } from './ImageModal';
import { PYTHON_SCRIPT } from '../utils/pythonScript';

interface ResultsDisplayProps {
    results: GenerationResults;
    onReset: () => void;
    onExtendVideo?: ExtendVideoHandler;
    onAddContent?: (weekIndex: number, type: 'Post' | 'Reel' | 'Story') => void;
    onGenerateItemMedia?: (weekIndex: number, itemIndex: number) => void;
    onUpdateItem?: UpdatePlanItemHandler;
    onAddWardrobeItem?: AddWardrobeItemHandler;
    onRegenerateWeek?: RegenerateWeekHandler;
    onGenerateSelfie?: GenerateSelfieHandler;
    onAnimatePhoto?: AnimatePhotoHandler;
    
    // New Props for Approval Flow
    generationStep?: GenerationStep;
    onApproveIdentity?: () => void;
    onRegenerateIdentity?: () => void;
}

const ResultSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-12">
        <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-purple-500 pl-4">{title}</h3>
        {children}
    </div>
);

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
    results, 
    onReset, 
    onAddContent,
    onGenerateItemMedia,
    onUpdateItem,
    onAddWardrobeItem,
    onExtendVideo,
    onRegenerateWeek,
    onGenerateSelfie,
    onAnimatePhoto,
    generationStep,
    onApproveIdentity,
    onRegenerateIdentity
}) => {
    
    const [selectedGalleryIndex, setSelectedGalleryIndex] = useState<number | null>(null);
    const [newLookDesc, setNewLookDesc] = useState("");
    const [isAddingLook, setIsAddingLook] = useState(false);
    const [openScriptId, setOpenScriptId] = useState<string | null>(null);
    const [regeneratingWeek, setRegeneratingWeek] = useState<number | null>(null);
    
    // Manage week theme inputs locally before submission
    const [weekThemes, setWeekThemes] = useState<Record<number, string>>({});

    // Calculate flattened gallery list
    const galleryItems = useMemo(() => {
        const items: Array<{
            url: string;
            type: 'image' | 'video' | 'slideshow';
            title: string;
            // Context
            weekIdx?: number;
            itemIdx?: number;
            planItem?: ContentPlanItem;
            slideshowImages?: string[];
            slideshowAudio?: string;
        }> = [];

        // 1. Add Wardrobe
        if (results.wardrobe) {
            results.wardrobe.forEach((url, idx) => {
                items.push({
                    url,
                    type: 'image',
                    title: idx === 0 ? "PORTRAIT" : idx === 1 ? "CASUAL" : idx === 2 ? "ACTIVE" : idx === 3 ? "GLAM" : `CUSTOM ${idx}`
                });
            });
        }

        // 2. Add Content Plan Media
        if (results.contentPlan) {
            results.contentPlan.forEach((week, wIdx) => {
                week.items.forEach((item, iIdx) => {
                    if (item.mediaUrl) {
                        items.push({
                            url: item.mediaUrl,
                            type: item.mediaType || 'image',
                            title: `Week ${week.weekNumber} - Day ${item.day} (${item.type})`,
                            weekIdx: wIdx,
                            itemIdx: iIdx,
                            planItem: item,
                            slideshowImages: item.slideshowImages,
                            slideshowAudio: item.slideshowAudio
                        });
                    }
                });
            });
        }
        return items;
    }, [results]);

    const savePersonaData = () => {
        const base64Data = results.wardrobe[0].split(',')[1];
        const personaData = {
            meta: { created: new Date().toISOString() },
            avatarData: base64Data
        };
        const blob = new Blob([JSON.stringify(personaData)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `persona_data.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadZip = async () => {
        const zip = new JSZip();
        zip.file("process_assets.py", PYTHON_SCRIPT);
        const wardrobeFolder = zip.folder("Identity_Wardrobe");
        results.wardrobe.forEach((img, i) => {
            wardrobeFolder.file(`look_${i+1}.jpg`, img.split(',')[1], {base64: true});
        });

        if (results.contentPlan) {
            for (const week of results.contentPlan) {
                const weekFolder = zip.folder(`Week_${week.weekNumber}`);
                let planText = "";
                for (let i = 0; i < week.items.length; i++) {
                    const item = week.items[i];
                    planText += `Day ${item.day} - ${item.type}\nTitle: ${item.title}\nCaption: ${item.caption}\nHashtags: ${item.hashtags.join(' ')}\nScript: ${item.script || "N/A"}\n\n`;
                    if (item.mediaUrl) {
                        if (item.mediaType === 'slideshow' && item.slideshowImages) {
                             const slideFolder = weekFolder.folder(`Day_${item.day}_Slideshow`);
                             item.slideshowImages.forEach((slide, idx) => {
                                 slideFolder.file(`slide_${idx+1}.jpg`, slide.split(',')[1], {base64: true});
                             });
                             if (item.slideshowAudio) {
                                 const audioBlob = await fetch(item.slideshowAudio).then(r => r.blob());
                                 slideFolder.file(`voiceover.wav`, audioBlob);
                             }
                        } 
                        else if (item.mediaType === 'video' && item.slideshowAudio) {
                             const vidFolder = weekFolder.folder(`Day_${item.day}_SelfieVideo`);
                             const blob = await fetch(item.mediaUrl).then(r => r.blob());
                             vidFolder.file(`video.mp4`, blob);
                             const audioBlob = await fetch(item.slideshowAudio).then(r => r.blob());
                             vidFolder.file(`voiceover.wav`, audioBlob);
                        }
                        else if (item.mediaType === 'video') {
                             const blob = await fetch(item.mediaUrl).then(r => r.blob());
                             weekFolder.file(`day_${item.day}_${item.type}.mp4`, blob);
                        } 
                        else {
                             weekFolder.file(`day_${item.day}_${item.type}.jpg`, item.mediaUrl.split(',')[1], {base64: true});
                        }
                    }
                }
                weekFolder.file("content_plan.txt", planText);
            }
        }
        const content = await zip.generateAsync({type:"blob"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "ai_influencer_pack.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleNativeShare = async (item: ContentPlanItem) => {
        if (!item.mediaUrl) return;
        try {
            const response = await fetch(item.mediaUrl);
            const blob = await response.blob();
            const ext = item.mediaType === 'video' ? 'mp4' : 'jpg';
            const mime = item.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
            const file = new File([blob], `share_content.${ext}`, { type: mime });
            const shareData = {
                title: item.title || 'AI Content',
                text: `${item.caption}\n\n${item.hashtags.map(h => '#' + h).join(' ')}`,
                files: [file]
            };
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share(shareData);
            } else {
                const link = document.createElement('a');
                link.href = item.mediaUrl;
                link.download = `instagram_post.${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                alert("Native sharing is not supported on this device/browser. The file has been downloaded instead.");
            }
        } catch (e) { console.error("Sharing failed", e); alert("Could not share content. Try downloading instead."); }
    };

    const handleOpenModal = (urlToFind: string) => {
        const index = galleryItems.findIndex(item => item.url === urlToFind);
        if (index !== -1) {
            setSelectedGalleryIndex(index);
        }
    };

    const handleAddLook = async () => {
        if (!newLookDesc.trim() || !onAddWardrobeItem) return;
        setIsAddingLook(true);
        await onAddWardrobeItem(newLookDesc);
        setNewLookDesc("");
        setIsAddingLook(false);
    };

    const handleRegenWeekClick = async (wIdx: number, weekNum: number) => {
        if (!onRegenerateWeek || !weekThemes[weekNum]) return;
        setRegeneratingWeek(weekNum);
        await onRegenerateWeek(wIdx, weekThemes[weekNum]);
        setRegeneratingWeek(null);
    }

    const isReviewMode = generationStep === 'review_identity';
    
    // Derived state for current gallery item
    const currentMedia = selectedGalleryIndex !== null ? galleryItems[selectedGalleryIndex] : null;

    return (
        <div className="space-y-12 animate-fade-in relative">
            
            {/* Full Screen Modal */}
            {currentMedia && (
                <ImageModal 
                    isOpen={!!currentMedia}
                    onClose={() => setSelectedGalleryIndex(null)}
                    mediaUrl={currentMedia.url}
                    mediaType={currentMedia.type}
                    title={currentMedia.title}
                    slideshowImages={currentMedia.slideshowImages}
                    slideshowAudio={currentMedia.slideshowAudio}
                    
                    // Navigation
                    onNext={selectedGalleryIndex !== null && selectedGalleryIndex < galleryItems.length - 1 ? () => setSelectedGalleryIndex(selectedGalleryIndex + 1) : undefined}
                    onPrev={selectedGalleryIndex !== null && selectedGalleryIndex > 0 ? () => setSelectedGalleryIndex(selectedGalleryIndex - 1) : undefined}
                    hasNext={selectedGalleryIndex !== null && selectedGalleryIndex < galleryItems.length - 1}
                    hasPrev={selectedGalleryIndex !== null && selectedGalleryIndex > 0}

                    // Actions
                    onRegenerate={onGenerateItemMedia && currentMedia.weekIdx !== undefined && currentMedia.itemIdx !== undefined ? () => {
                        onGenerateItemMedia(currentMedia.weekIdx!, currentMedia.itemIdx!);
                        setSelectedGalleryIndex(null);
                    } : undefined}
                    
                    onExtendVideo={onExtendVideo && currentMedia.type === 'video' && currentMedia.weekIdx !== undefined && currentMedia.itemIdx !== undefined ? () => {
                         if (currentMedia.planItem?.mediaHandle) {
                            onExtendVideo(currentMedia.weekIdx!, currentMedia.itemIdx!);
                            setSelectedGalleryIndex(null);
                        } else {
                            alert("Cannot extend video: The video generation session has expired or the handle was lost.");
                        }
                    } : undefined}
                />
            )}

            {/* 1. DIGITAL WARDROBE (Always visible) */}
            <ResultSection title={isReviewMode ? "Step 1: Approve Identity" : "1. Digital Wardrobe (Visual Identity)"}>
                
                {/* APPROVAL CONTROLS */}
                {isReviewMode && (
                    <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-500 rounded-xl p-6 mb-8 text-center shadow-2xl">
                        <h4 className="text-xl font-bold text-white mb-2">Review Your Model</h4>
                        <p className="text-gray-300 mb-6">Does this model match your vision? If not, regenerate the identity before creating content.</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button 
                                onClick={onRegenerateIdentity}
                                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                ↻ Try New Look
                            </button>
                            <button 
                                onClick={onApproveIdentity}
                                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-bold shadow-lg transition flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Approve & Generate Content Plan
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
                    {results.wardrobe.map((look, index) => (
                        <div key={index} className="relative group rounded-xl overflow-hidden border border-gray-700 shadow-xl cursor-pointer" onClick={() => handleOpenModal(look)}>
                            <img src={look} alt={`Look ${index+1}`} className="w-full h-64 object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-center text-xs font-bold text-white backdrop-blur-sm">
                                {index === 0 ? "PORTRAIT" : index === 1 ? "CASUAL" : index === 2 ? "ACTIVE" : index === 3 ? "GLAM" : `CUSTOM ${index}`}
                            </div>
                        </div>
                    ))}
                    
                    {/* Add Custom Look Card - Only show when NOT in review mode (or do we allow custom looks during review? Maybe, but simpler to hide) */}
                    {!isReviewMode && (
                        <div className="bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-600 p-4 flex flex-col justify-center items-center text-center hover:border-purple-500 transition">
                            <p className="text-sm font-bold text-white mb-2">Add New Look</p>
                            <input 
                                type="text" 
                                placeholder="e.g. Winter Coat, Bikini..." 
                                className="w-full text-xs bg-gray-900 border border-gray-700 rounded p-2 mb-2 text-white"
                                value={newLookDesc}
                                onChange={(e) => setNewLookDesc(e.target.value)}
                            />
                            <button 
                                onClick={handleAddLook}
                                disabled={isAddingLook || !newLookDesc}
                                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-xs px-3 py-1 rounded"
                            >
                                {isAddingLook ? "Generating..." : "+ Generate"}
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-4 items-center">
                     <button onClick={savePersonaData} className="text-sm bg-purple-900/50 hover:bg-purple-800/50 text-purple-200 border border-purple-500/30 px-4 py-2 rounded-lg transition">
                        💾 Save Persona File
                    </button>
                    {results.audioUrl && (
                        <div className="flex items-center gap-3 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                            <span className="text-xs text-gray-400 uppercase font-bold">Voice Intro:</span>
                            <audio controls src={results.audioUrl} className="h-8 w-48" />
                        </div>
                    )}
                </div>
            </ResultSection>

            {/* 2. INTEGRATED CONTENT CALENDAR (Hidden during review) */}
            {!isReviewMode && results.contentPlan && (
                <ResultSection title="2. Content Production Calendar">
                    <div className="space-y-8">
                        {results.contentPlan?.map((week, wIdx) => (
                            <div key={wIdx} className="bg-gray-800/20 rounded-2xl border border-gray-700/50 overflow-hidden">
                                <div className="bg-gray-800/80 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-md">
                                    <div>
                                        <h4 className="text-xl font-bold text-white">Week {week.weekNumber}</h4>
                                        {week.theme && <p className="text-xs text-purple-300 mt-1">Current Theme: {week.theme}</p>}
                                    </div>
                                    <div className="flex gap-2 items-center w-full md:w-auto">
                                        <input 
                                            type="text" 
                                            placeholder="Enter topic (e.g. Trip to Bali)"
                                            className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 outline-none w-full md:w-48"
                                            value={weekThemes[week.weekNumber] || ""}
                                            onChange={(e) => setWeekThemes(prev => ({...prev, [week.weekNumber]: e.target.value}))}
                                        />
                                        <button 
                                            onClick={() => handleRegenWeekClick(wIdx, week.weekNumber)}
                                            disabled={!weekThemes[week.weekNumber] || regeneratingWeek === week.weekNumber}
                                            className="text-xs bg-purple-600 disabled:bg-gray-700 hover:bg-purple-700 px-3 py-2 rounded text-white transition whitespace-nowrap min-w-[100px]"
                                        >
                                            {regeneratingWeek === week.weekNumber ? "Rewriting..." : "↻ Rewrite Week"}
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                         <button onClick={() => onAddContent && onAddContent(wIdx, 'Post')} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-gray-300 transition">+ Post</button>
                                         <button onClick={() => onAddContent && onAddContent(wIdx, 'Reel')} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-gray-300 transition">+ Reel</button>
                                    </div>
                                </div>

                                <div className="p-6 grid grid-cols-1 gap-8">
                                    {week.items.map((item, idx) => (
                                        <div key={item.id} className="flex flex-col md:flex-row gap-6 bg-gray-900/40 p-6 rounded-xl border border-gray-700/30 hover:border-purple-500/30 transition">
                                            <div className="w-full md:w-1/3 flex-shrink-0">
                                                {item.mediaUrl ? (
                                                    <div className="relative rounded-lg overflow-hidden shadow-lg border border-gray-800 bg-black aspect-[9/16] md:aspect-[9/16] group cursor-pointer">
                                                        {item.mediaType === 'video' ? (
                                                            <video src={item.mediaUrl} className="w-full h-full object-cover" />
                                                        ) : item.mediaType === 'slideshow' ? (
                                                            <img src={item.mediaUrl} alt="Slideshow Thumb" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <img src={item.mediaUrl} alt="Generated Asset" className="w-full h-full object-cover" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleOpenModal(item.mediaUrl!); }}
                                                                className="bg-white/20 hover:bg-white/30 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold"
                                                            >
                                                                🔍 View Full Screen
                                                            </button>
                                                            {item.mediaType === 'image' && onAnimatePhoto && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onAnimatePhoto(wIdx, idx); }}
                                                                    className="bg-purple-600/80 hover:bg-purple-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg"
                                                                >
                                                                    {item.isGenerating ? "Animating..." : "✨ Bring to Life"}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <span className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                            item.mediaType === 'slideshow' ? 'bg-orange-600 text-white' :
                                                            item.type === 'Reel' ? 'bg-pink-600 text-white' : 'bg-blue-600 text-white'
                                                        }`}>
                                                            {item.mediaType === 'slideshow' ? 'Slideshow' : item.type === 'Reel' ? 'Video' : 'Photo'}
                                                        </span>
                                                        {item.isGenerating && (
                                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="w-full aspect-[9/16] bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center p-4 text-center">
                                                        <p className="text-gray-500 text-sm mb-3">No asset generated yet</p>
                                                        {item.isGenerating ? (
                                                            <div className="flex flex-col items-center">
                                                                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-2"></div>
                                                                 <span className="text-xs text-purple-300">Creating magic...</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-2 w-full">
                                                                <button 
                                                                    // @ts-ignore
                                                                    onClick={() => onGenerateItemMedia && onGenerateItemMedia(wIdx, idx)}
                                                                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 px-4 rounded-full transition w-full"
                                                                >
                                                                    ✨ Generate {item.type === 'Reel' ? 'Video' : 'Photo'}
                                                                </button>
                                                                {(item.type === 'Reel' || item.type === 'Story') && (
                                                                    <button
                                                                        onClick={() => onGenerateSelfie && onGenerateSelfie(wIdx, idx)}
                                                                        className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2 px-4 rounded-full transition w-full"
                                                                    >
                                                                        📹 Record Selfie
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 w-full">
                                                        <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs font-mono">Day {item.day}</span>
                                                        <input 
                                                            className="bg-transparent font-bold text-white text-lg w-full border-b border-transparent hover:border-gray-600 focus:border-purple-500 outline-none"
                                                            defaultValue={item.title}
                                                            onBlur={(e) => onUpdateItem && onUpdateItem(wIdx, idx, 'title', e.target.value)}
                                                        />
                                                    </div>
                                                    {item.mediaUrl && (
                                                        <button 
                                                            onClick={() => handleNativeShare(item)}
                                                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-lg flex items-center gap-1.5 whitespace-nowrap"
                                                            title="Share to Instagram or other apps"
                                                        >
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                                                            Share to Instagram
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                                                    <textarea 
                                                        className="bg-transparent text-gray-300 text-sm leading-relaxed whitespace-pre-wrap w-full resize-none outline-none border-b border-transparent focus:border-purple-500"
                                                        rows={3}
                                                        defaultValue={item.caption}
                                                        onBlur={(e) => onUpdateItem && onUpdateItem(wIdx, idx, 'caption', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scene Description</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => setOpenScriptId(openScriptId === item.id ? null : item.id)}
                                                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                                        >
                                                            <span>📝 {openScriptId === item.id ? 'Hide Script' : 'Add/Edit Script'}</span>
                                                        </button>
                                                    </div>
                                                    <textarea 
                                                        className="w-full text-xs text-gray-400 italic bg-gray-800/50 p-2 rounded border border-transparent focus:border-purple-500 outline-none resize-none"
                                                        rows={2}
                                                        defaultValue={item.description}
                                                        onBlur={(e) => onUpdateItem && onUpdateItem(wIdx, idx, 'description', e.target.value)}
                                                    />
                                                    {(openScriptId === item.id || item.script) && (
                                                        <div className={`mt-2 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg ${openScriptId !== item.id ? 'hidden' : 'block'}`}>
                                                            <span className="text-xs font-bold text-purple-300 block mb-1">Voiceover / Video Script:</span>
                                                            <textarea 
                                                                className="w-full bg-transparent text-sm text-white outline-none resize-none placeholder-purple-300/30"
                                                                rows={3}
                                                                placeholder="Type what the influencer should say..."
                                                                defaultValue={item.script || ""}
                                                                onBlur={(e) => onUpdateItem && onUpdateItem(wIdx, idx, 'script', e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {item.hashtags.map((h, i) => (
                                                        <span key={i} className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">#{h}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ResultSection>
            )}

            {/* Actions (Always visible, but logic differs based on mode) */}
            {!isReviewMode && results.contentPlan && (
                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-800 sticky bottom-4 z-20">
                     <button
                        onClick={handleDownloadZip}
                        className="flex-1 text-center bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-green-500/20 transition transform hover:-translate-y-1"
                    >
                        📦 Download Complete Pack (ZIP)
                    </button>
                    <button
                        onClick={onReset}
                        className="flex-1 text-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-xl transition"
                    >
                        Start New Campaign
                    </button>
                </div>
            )}
        </div>
    );
};
