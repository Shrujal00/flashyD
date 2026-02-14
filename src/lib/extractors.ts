import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractText(file: File): Promise<string> {
    const fileType = file.type;

    try {
        if (fileType === 'application/pdf') {
            return await extractPDF(file);
        } else if (fileType === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
            return await extractMarkdown(file);
        } else if (fileType === 'text/plain' || file.name.endsWith('.txt')) {
            return await extractTextFile(file);
        } else {
            throw new Error(`Unsupported file type: ${fileType}`);
        }
    } catch (error) {
        console.error('Error extracting text:', error);
        throw new Error('Failed to extract text from file');
    }
}

async function extractPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `\n\n--- Page ${i} ---\n${pageText}`;
    }

    return fullText;
}

function extractMarkdown(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            // We return the raw markdown for the AI to parse, as it preserves structure better than stripping it
            resolve(text);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

function extractTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target?.result as string);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
