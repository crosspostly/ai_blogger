
import React, { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

interface LogConsoleProps {
    logs: LogEntry[];
    className?: string;
}

export const LogConsole: React.FC<LogConsoleProps> = ({ logs, className = '' }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    if (logs.length === 0) return null;

    return (
        <div className={`fixed bottom-0 left-0 right-0 h-48 bg-black/90 text-xs font-mono border-t-2 border-purple-500/50 z-40 flex flex-col shadow-2xl backdrop-blur-md ${className}`}>
            <div className="bg-gray-900/80 px-4 py-1 flex justify-between items-center border-b border-gray-800">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">System Terminal</span>
                <span className="text-gray-500">{logs.length} events</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-3">
                        <span className="text-gray-600 shrink-0 select-none">[{log.timestamp}]</span>
                        <span className={`break-words ${
                            log.type === 'error' ? 'text-red-400 font-bold' :
                            log.type === 'success' ? 'text-green-400' :
                            log.type === 'warning' ? 'text-yellow-400' :
                            'text-gray-300'
                        }`}>
                            {log.type === 'error' ? '❌ ' : log.type === 'success' ? '✅ ' : log.type === 'warning' ? '⚠️ ' : '> '}
                            {log.message}
                        </span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
