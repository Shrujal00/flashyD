import { useState } from 'react';
import { ExternalLink, Key, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

const STEPS = [
  {
    title: 'Create an OpenRouter account',
    description: 'Go to OpenRouter and sign up for a free account. You can use Google, GitHub, or email.',
    link: 'https://openrouter.ai/auth/sign-up',
    linkText: 'Sign up on OpenRouter',
  },
  {
    title: 'Go to API Keys',
    description: 'Once logged in, navigate to the Keys page from your dashboard.',
    link: 'https://openrouter.ai/settings/keys',
    linkText: 'Open Keys page',
  },
  {
    title: 'Create a new key',
    description: 'Click "Create Key", give it a name (e.g. "Flashy"), and hit Create. No credit card needed.',
  },
  {
    title: 'Copy and paste it above',
    description: 'Copy the key that starts with sk-or-... and paste it into the API Key field in the header bar. Done!',
  },
];

interface Props {
  compact?: boolean;
}

export function ApiKeyGuide({ compact = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const handleCopyLink = (link: string, step: number) => {
    navigator.clipboard.writeText(link);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  // Compact inline version — just a "Get free key" link that toggles the guide
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
        >
          <Key size={12} />
          Get free key
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {isOpen && (
          <div className="absolute top-8 right-0 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/50 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <h4 className="text-sm font-semibold text-gray-100 mb-3">Get your free API key</h4>
            <ol className="space-y-3">
              {STEPS.map((step, idx) => (
                <li key={idx} className="flex gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-200 font-medium">{step.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
                    {step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-1 font-medium"
                      >
                        {step.linkText} <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }

  // Full landing-page version
  return (
    <div className="w-full max-w-2xl mx-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors py-3 group"
      >
        <Key size={16} className="group-hover:text-blue-400 transition-colors" />
        <span className="font-medium">Don't have an API key? Get one free in 2 minutes</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Key size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-100">Get your free API key</h3>
              <p className="text-sm text-gray-500">Takes less than 2 minutes, no credit card required</p>
            </div>
          </div>

          <ol className="space-y-5">
            {STEPS.map((step, idx) => (
              <li key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/15 text-blue-400 text-sm font-bold shrink-0">
                    {idx + 1}
                  </span>
                  {idx < STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-gray-800 mt-2" />
                  )}
                </div>
                <div className="pb-5">
                  <h4 className="text-sm font-semibold text-gray-100">{step.title}</h4>
                  <p className="text-sm text-gray-400 mt-1 leading-relaxed">{step.description}</p>
                  {step.link && (
                    <div className="flex items-center gap-2 mt-2">
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/15 transition-colors"
                      >
                        {step.linkText} <ExternalLink size={14} />
                      </a>
                      <button
                        onClick={() => handleCopyLink(step.link!, idx)}
                        className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Copy link"
                      >
                        {copiedStep === idx ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
