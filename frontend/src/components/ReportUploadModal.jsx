import React, { useState } from 'react';
import { Upload, FileText, Image as ImageIcon, X, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../context/AuthContext';

export const ReportUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const [activeTab, setActiveTab] = useState('pdf'); // 'pdf' or 'image'
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith('.pdf')) {
        setError('Only PDF medical reports are supported currently.');
        return;
      }
      setError('');
      setFile(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (!selectedFile.name.endsWith('.pdf')) {
        setError('Only PDF medical reports are supported currently.');
        return;
      }
      setError('');
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF report to upload.');
      return;
    }

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE_URL}/reports/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsUploading(false);
      onUploadSuccess(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to upload and process report.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg glass-card rounded-2xl p-6 border border-gray-800 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-cyan-400" />
          <span>Upload Medical Report</span>
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Upload your PDF medical test report for instant AI summarization and voice insights.
        </p>

        {/* Tab Selection: PDF vs Image Stub */}
        <div className="flex gap-2 mt-4 p-1 bg-gray-900/80 rounded-xl border border-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pdf'
                ? 'bg-cyan-500 text-gray-950 shadow-md shadow-cyan-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>PDF Upload</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'image'
                ? 'bg-gray-800 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Scanned Image (OCR)</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">Soon</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'pdf' ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-700/80 hover:border-cyan-500/50 rounded-2xl p-8 text-center bg-gray-900/40 hover:bg-gray-900/60 transition-all cursor-pointer group"
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload-input"
              />
              <label htmlFor="pdf-upload-input" className="cursor-pointer block">
                <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-200 mt-3">
                  {file ? file.name : 'Click to select or drag PDF file here'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: PDF (Blood Test, CBC, MRI, ECG, X-Ray)
                </p>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || !file}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-gray-950 font-bold text-xs shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Medical Report...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Process & Summarize</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 p-6 rounded-2xl bg-gray-900/50 border border-gray-800 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-200">Image OCR Enhancement Coming Soon</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Scanned image OCR (Tesseract / Vision AI) is registered as a planned future module. Please upload standard digital PDF files to experience the pipeline.
            </p>
            <button
              onClick={() => setActiveTab('pdf')}
              className="mt-2 text-xs font-semibold text-cyan-400 hover:underline"
            >
              Switch back to PDF Upload
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
