
import React from 'react';

interface GenerationProgressProps {
    status: string;
    progress: number;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({ status, progress }) => {
    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 lg:p-8 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-2">
                <p className="text-lg font-semibold text-white">{status}</p>
                <p className="text-lg font-bold text-purple-400">{progress}%</p>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};
