
import React from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ProviderStatus } from './ProviderStatus';

export const InfoPanel: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 lg:p-8 backdrop-blur-sm sticky top-8">
                <h3 className="text-xl font-bold text-white mb-6">What You'll Get</h3>
                <ul className="space-y-4 text-gray-300">
                    <li className="flex items-start">
                        <CheckCircleIcon className="h-6 w-6 text-purple-400 mr-3 mt-1 flex-shrink-0" />
                        <span><span className="font-semibold text-white">Unique AI Avatar:</span> A high-resolution, photorealistic face for your blogger.</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircleIcon className="h-6 w-6 text-purple-400 mr-3 mt-1 flex-shrink-0" />
                        <span><span className="font-semibold text-white">Lifestyle Photoset:</span> A collection of images placing your avatar in various real-world scenarios.</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircleIcon className="h-6 w-6 text-purple-400 mr-3 mt-1 flex-shrink-0" />
                        <span><span className="font-semibold text-white">Engaging Video Clip:</span> A short, high-quality video ready for social media.</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircleIcon className="h-6 w-6 text-purple-400 mr-3 mt-1 flex-shrink-0" />
                        <span><span className="font-semibold text-white">Content Plan:</span> A starter pack of post ideas, complete with descriptions and hashtags.</span>
                    </li>
                </ul>
            </div>
            
            <ProviderStatus />
        </div>
    );
};
