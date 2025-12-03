
import React, { useState, useEffect } from 'react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'slideshow';
  slideshowImages?: string[];
  slideshowAudio?: string;
  onRegenerate?: () => void;
  onExtendVideo?: () => void;
  
  // Navigation Props
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  title?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({ 
    isOpen, 
    onClose, 
    mediaUrl, 
    mediaType,
    slideshowImages,
    slideshowAudio,
    onRegenerate,
    onExtendVideo,
    onNext,
    onPrev,
    hasNext,
    hasPrev,
    title
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slideshow logic for "slideshow" media type
  useEffect(() => {
    let interval: any;
    if (mediaType === 'slideshow' && slideshowImages && slideshowImages.length > 1) {
        interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slideshowImages.length);
        }, 3000); // Change slide every 3 seconds
    }
    return () => clearInterval(interval);
  }, [mediaType, slideshowImages]);

  // Keyboard Navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      } else if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        onPrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasNext, hasPrev, onNext, onPrev, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in group">
      <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition z-50"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        {title && (
            <div className="absolute -top-10 left-0 text-white font-bold text-lg bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                {title}
            </div>
        )}

        {/* Navigation Arrows */}
        {hasPrev && (
            <button 
                onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
                className="absolute left-[-60px] top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition p-4 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-sm hidden md:block"
                aria-label="Previous Image"
            >
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
        )}
        {hasNext && (
            <button 
                onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                className="absolute right-[-60px] top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition p-4 rounded-full bg-black/20 hover:bg-black/50 backdrop-blur-sm hidden md:block"
                aria-label="Next Image"
            >
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        )}

        {/* Media Container */}
        <div className="w-full h-full flex justify-center items-center overflow-hidden rounded-lg shadow-2xl bg-black border border-gray-800 relative">
           {mediaType === 'video' ? (
               <div className="relative flex justify-center w-full h-full">
                   <video 
                      src={mediaUrl} 
                      controls 
                      autoPlay 
                      className="max-w-full max-h-[80vh] object-contain"
                   />
                   {/* Selfie Audio Overlay */}
                   {slideshowAudio && (
                       <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
                           <span className="text-xs text-white">Voiceover:</span>
                           <audio src={slideshowAudio} controls autoPlay className="h-8 w-32" />
                       </div>
                   )}
               </div>
           ) : mediaType === 'slideshow' && slideshowImages ? (
               <div className="relative w-full h-full flex flex-col items-center">
                   <img 
                      src={slideshowImages[currentSlide]} 
                      alt={`Slide ${currentSlide + 1}`} 
                      className="max-w-full max-h-[80vh] object-contain transition-opacity duration-500"
                   />
                   {/* Audio Player */}
                   {slideshowAudio && (
                       <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                           <audio src={slideshowAudio} controls autoPlay className="h-8 w-48" />
                       </div>
                   )}
                   {/* Indicators */}
                   <div className="absolute top-4 right-4 bg-black/60 px-2 py-1 rounded text-white text-xs">
                       {currentSlide + 1} / {slideshowImages.length}
                   </div>
               </div>
           ) : (
               <img 
                  src={mediaUrl} 
                  alt="Full Screen" 
                  className="max-w-full max-h-[80vh] object-contain"
               />
           )}
        </div>

        {/* Actions Bar */}
        <div className="mt-6 flex gap-4">
             <a 
                href={mediaUrl} 
                download={`generated_media.${mediaType === 'video' ? 'mp4' : 'jpg'}`}
                className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-full border border-gray-600 transition flex items-center gap-2"
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4 4m4 4V4" /></svg>
                Download
             </a>
             
             {onRegenerate && (
                 <button 
                    onClick={onRegenerate}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full shadow-lg shadow-purple-500/30 transition flex items-center gap-2"
                 >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Regenerate
                 </button>
             )}

             {onExtendVideo && mediaType === 'video' && (
                 <button 
                    onClick={onExtendVideo}
                    className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-full shadow-lg shadow-pink-500/30 transition flex items-center gap-2"
                 >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Extend (+5s)
                 </button>
             )}
        </div>
      </div>
    </div>
  );
};
