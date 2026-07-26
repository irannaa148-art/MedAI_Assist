import React from 'react';
import { Heart, FileText, Mic, Globe2, ShieldAlert } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-gray-800/80 bg-gray-950/80 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div>
          <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-bold text-gray-200">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
            <span>MediAssist AI</span>
          </div>
          <p className="text-xs text-gray-400 mt-1 max-w-md">
            Multilingual medical report summarization, RAG chat assistant, voice health companion, and health insights.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>PDF Parsing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>8 Languages</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            <span>Voice Assistant</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-gray-800/60 text-center">
        <p className="text-xs text-rose-300/90 font-medium flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>MediAssist AI provides educational information only and is not a substitute for professional medical advice. Always consult a qualified doctor.</span>
        </p>
      </div>
    </footer>
  );
};
