import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL, useAuth } from '../context/AuthContext';
import { ReportUploadModal } from '../components/ReportUploadModal';
import {
  FileText, Upload, Plus, Sparkles, Activity, HeartPulse, 
  ChevronRight, Calendar, ArrowUpRight, ShieldCheck, Zap, AlertTriangle
} from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(null);

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/reports`);
      setReports(res.data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleLoadSample = async (sampleType) => {
    setSampleLoading(sampleType);
    try {
      const res = await axios.post(`${API_BASE_URL}/reports/sample/${sampleType}`);
      setReports(prev => [res.data, ...prev]);
      navigate(`/report/${res.data.id}`);
    } catch (err) {
      console.error('Failed to load sample report:', err);
    } finally {
      setSampleLoading(null);
    }
  };

  const getRiskBadge = (risk) => {
    const r = (risk || '').toLowerCase();
    if (r.includes('high') || r.includes('severe')) {
      return <span className="px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">High Risk</span>;
    } else if (r.includes('moderate') || r.includes('medium')) {
      return <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">Moderate Risk</span>;
    }
    return <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">Low / Normal Risk</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner */}
      <div className="relative overflow-hidden glass-card rounded-3xl p-8 border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900 to-cyan-950/40">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5" />
              <span>Medical Report Intelligence</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome, <span className="text-cyan-400">{user?.name || 'Patient'}</span>
            </h1>
            <p className="text-xs text-gray-400 leading-relaxed">
              Upload your medical laboratory reports (PDF) or select a sample report below to view plain-language summaries, voice audio insights, multilingual translations, and RAG grounded chat.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-gray-950 font-bold text-xs shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Quick Demo Sample Reports Fast-Track */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Instant Demo Reports (No Upload Required)</span>
          </h2>
          <span className="text-[11px] text-gray-500">1-Click Test Scenarios</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => handleLoadSample('lipid')}
            disabled={sampleLoading !== null}
            className="glass-card glass-card-hover p-4 rounded-2xl border border-gray-800 text-left space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <HeartPulse className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-white">Lipid Profile Report</h3>
            <p className="text-[11px] text-gray-400 line-clamp-2">Elevated Cholesterol & Triglycerides analysis with dietary tips.</p>
          </button>

          <button
            onClick={() => handleLoadSample('cbc')}
            disabled={sampleLoading !== null}
            className="glass-card glass-card-hover p-4 rounded-2xl border border-gray-800 text-left space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Activity className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-white">Complete Blood Count (CBC)</h3>
            <p className="text-[11px] text-gray-400 line-clamp-2">Hemoglobin, RBC, WBC, and Platelet status summary.</p>
          </button>

          <button
            onClick={() => handleLoadSample('ecg')}
            disabled={sampleLoading !== null}
            className="glass-card glass-card-hover p-4 rounded-2xl border border-gray-800 text-left space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <HeartPulse className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-white">ECG / Cardiac Rhythm</h3>
            <p className="text-[11px] text-gray-400 line-clamp-2">Sinus rhythm evaluation and cardiac parameters.</p>
          </button>

          <button
            onClick={() => handleLoadSample('mri')}
            disabled={sampleLoading !== null}
            className="glass-card glass-card-hover p-4 rounded-2xl border border-gray-800 text-left space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-white">Brain MRI Scan</h3>
            <p className="text-[11px] text-gray-400 line-clamp-2">Brain structure analysis and neurological health findings.</p>
          </button>
        </div>
      </div>

      {/* Uploaded Reports Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Your Analyzed Reports ({reports.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12 glass-card rounded-2xl border border-gray-800">
            <p className="text-xs text-gray-400">Loading medical report history...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-2xl border border-gray-800 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-200">No Medical Reports Uploaded Yet</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Upload your first PDF report or try one of the instant sample reports above.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all inline-flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload PDF Now</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reports.map((r) => {
              const data = r.structured_json || {};
              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/report/${r.id}`)}
                  className="glass-card glass-card-hover rounded-2xl p-6 border border-gray-800 cursor-pointer space-y-4 group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      {getRiskBadge(data.risk_level)}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {r.report_type || r.filename}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium mt-0.5 line-clamp-1">
                        {data.diagnosis || 'General Health Summary'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-gray-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      {data.health_score && (
                        <div className="flex items-center gap-1 font-semibold text-emerald-400">
                          <span>Health Score:</span>
                          <span>{data.health_score}/100</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-cyan-400 font-bold group-hover:translate-x-1 transition-transform">
                    <span>View AI Summary & Voice</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ReportUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={(newReport) => {
          setReports(prev => [newReport, ...prev]);
          navigate(`/report/${newReport.id}`);
        }}
      />
    </div>
  );
};
