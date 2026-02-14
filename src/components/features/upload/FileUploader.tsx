import React, { useState, useCallback } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface FileUploaderProps {
    onFileSelect: (file: File) => void;
    isLoading?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isLoading = false }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const validateFile = (file: File): string | null => {
        const validTypes = [
            'application/pdf',
            'text/markdown',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
            'application/vnd.ms-powerpoint' // ppt
        ];

        // Check extension for markdown if mime type fails (common issue)
        const isMarkdown = file.name.endsWith('.md') || file.name.endsWith('.markdown');

        if (!validTypes.includes(file.type) && !isMarkdown) {
            return 'Unsupported file type. Please upload PDF, MD, TXT, or PPTX.';
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            return 'File too large. Maximum size is 10MB.';
        }

        return null;
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setError(null);

        const file = e.dataTransfer.files[0];
        if (file) {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
            } else {
                onFileSelect(file);
            }
        }
    }, [onFileSelect]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = e.target.files?.[0];
        if (file) {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
            } else {
                onFileSelect(file);
            }
        }
    }, [onFileSelect]);

    return (
        <div className="w-full max-w-xl mx-auto">
            <div
                className={twMerge(
                    clsx(
                        "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer",
                        isDragging ? "border-blue-500 bg-blue-500/10 scale-[1.02]" : "border-gray-700 hover:border-blue-500/50 hover:bg-gray-900",
                        isLoading && "opacity-50 pointer-events-none"
                    )
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
            >
                <Upload
                    size={48}
                    className={clsx(
                        "mx-auto mb-4 transition-colors",
                        isDragging ? "text-blue-400" : "text-gray-600"
                    )}
                />
                <h3 className="text-xl font-semibold text-gray-100 mb-2">
                    {isDragging ? 'Drop file to upload' : 'Click or drop file here'}
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                    Support for PDF, Markdown, Text, and PowerPoint (up to 10MB)
                </p>

                <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.md,.markdown,.txt,.pptx,.ppt"
                    onChange={handleFileInput}
                    className="hidden"
                />

                <button className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-500 transition-colors">
                    Browse Files
                </button>
            </div>

            {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}
        </div>
    );
};
