
import React, { useState, useEffect } from 'react';
import { instagramService } from '../services/instagramService';

interface InstagramModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'connect' | 'publish';
    mediaToPublish?: { url: string; caption: string; type: string };
    onPublishSuccess?: () => void;
}

export const InstagramModal: React.FC<InstagramModalProps> = ({ 
    isOpen, 
    onClose, 
    mode, 
    mediaToPublish,
    onPublishSuccess 
}) => {
    const [step, setStep] = useState<'initial' | 'connecting' | 'publishing' | 'success' | 'error'>('initial');
    const [statusMessage, setStatusMessage] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setStep('initial');
            setError(null);
            if (mode === 'publish' && !instagramService.getConnectedStatus()) {
                setError("Please connect your Instagram account first.");
                setStep('error');
            }
        }
    }, [isOpen, mode]);

    const handleConnect = async () => {
        setStep('connecting');
        setStatusMessage("Redirecting to Facebook Login...");
        
        await instagramService.connect();
        
        setStatusMessage("Verifying permissions...");
        setTimeout(() => {
            setStep('success');
            setStatusMessage(`Connected as @${instagramService.getUsername()}`);
        }, 1000);
    };

    const handlePublish = async () => {
        if (!mediaToPublish) return;
        setStep('publishing');
        setStatusMessage("Preparing media for upload...");

        try {
            await new Promise(r => setTimeout(r, 1000));
            setStatusMessage("Uploading to Instagram Graph API...");
            
            const result = await instagramService.publishContent(mediaToPublish.url, mediaToPublish.caption);
            
            if (result.success) {
                setStatusMessage("Finalizing post...");
                await new Promise(r => setTimeout(r, 800));
                setStep('success');
                if (onPublishSuccess) onPublishSuccess();
            } else {
                throw new Error(result.error || "Upload failed");
            }
        } catch (e: any) {
            setError(e.message);
            setStep('error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white text-gray-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-6 text-white text-center">
                    <div className="w-12 h-12 bg-white rounded-xl mx-auto mb-3 flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
                             <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold">
                        {mode === 'connect' ? 'Connect Instagram' : 'New Post'}
                    </h3>
                    <p className="text-white/80 text-sm">
                        {mode === 'connect' ? 'Link your account to auto-publish' : 'Share your AI creation'}
                    </p>
                </div>

                {/* Body */}
                <div className="p-8 text-center">
                    
                    {step === 'initial' && mode === 'connect' && (
                        <>
                            <p className="text-gray-600 mb-6">Connect your Business Account to publish posts and reels directly from the Hub.</p>
                            <button 
                                onClick={handleConnect}
                                className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                Continue with Facebook
                            </button>
                            <p className="text-xs text-gray-400 mt-4">Simulated Integration for Demo</p>
                        </>
                    )}

                    {step === 'initial' && mode === 'publish' && mediaToPublish && (
                        <div className="text-left">
                            <div className="flex gap-4 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                {mediaToPublish.type === 'video' ? (
                                    <video src={mediaToPublish.url} className="w-16 h-16 object-cover rounded bg-black" />
                                ) : (
                                    <img src={mediaToPublish.url} className="w-16 h-16 object-cover rounded bg-black" />
                                )}
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">{mediaToPublish.type}</p>
                                    <p className="text-sm text-gray-800 truncate">{mediaToPublish.caption}</p>
                                </div>
                            </div>
                            <button 
                                onClick={handlePublish}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:opacity-90 transition"
                            >
                                Share Now
                            </button>
                        </div>
                    )}

                    {(step === 'connecting' || step === 'publishing') && (
                        <div className="py-8">
                            <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600 font-medium animate-pulse">{statusMessage}</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="py-4">
                            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">{mode === 'connect' ? 'Connected!' : 'Posted!'}</h4>
                            <p className="text-gray-600 mb-6">{mode === 'connect' ? 'You can now publish directly to Instagram.' : 'Your content is live on Instagram.'}</p>
                            <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition">Close</button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="py-4">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">Error</h4>
                            <p className="text-red-600 mb-6">{error || "Something went wrong."}</p>
                            <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition">Close</button>
                        </div>
                    )}
                </div>

                {/* Close X */}
                <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
};
