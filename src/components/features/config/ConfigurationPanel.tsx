import React from "react";
import { Settings, Tag } from "lucide-react";

interface ConfigurationPanelProps {
  config: {
    deckName: string;
    numCards: number;
    difficulty: string;
    focusAreas: string;
    tags: string;
  };
  onChange: (key: string, value: any) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  config,
  onChange,
}) => {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
        <Settings className="text-blue-400" size={20} />
        <h3 className="text-lg font-semibold text-gray-100">
          Deck Configuration
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deck Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Deck Name</label>
          <input
            type="text"
            value={config.deckName}
            onChange={(e) => onChange("deckName", e.target.value)}
            className="w-full border border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-800 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            placeholder="e.g. Biology Chapter 1"
          />
        </div>

        {/* Number of Cards */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex justify-between">
            <span>Number of Cards</span>
            <span className="text-blue-400 font-bold">{config.numCards}</span>
          </label>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={config.numCards}
            onChange={(e) => onChange("numCards", parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>5</span>
            <span>25</span>
            <span>50</span>
          </div>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Difficulty Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {["Beginner", "Intermediate", "Advanced"].map((level) => (
              <button
                key={level}
                onClick={() => onChange("difficulty", level)}
                className={`text-sm py-2 rounded-lg border transition-all ${
                  config.difficulty === level
                    ? "bg-blue-500/15 border-blue-500 text-blue-400 font-medium"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
            <Tag size={14} />
            <span>Tags (comma separated)</span>
          </label>
          <input
            type="text"
            value={config.tags}
            onChange={(e) => onChange("tags", e.target.value)}
            className="w-full border border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-800 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="biology, exam-prep, week1"
          />
        </div>

        {/* Focus Areas */}
        <div className="col-span-1 md:col-span-2 space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Focus Areas (Optional)
          </label>
          <textarea
            value={config.focusAreas}
            onChange={(e) => onChange("focusAreas", e.target.value)}
            className="w-full border border-gray-700 rounded-lg px-3 py-2 text-sm h-20 resize-none bg-gray-800 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Focus on definitions and key formulas..."
          />
        </div>
      </div>
    </div>
  );
};
