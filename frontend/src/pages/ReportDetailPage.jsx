import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Languages, Volume2, MessageSquare, Activity, 
  Download, AlertTriangle, CheckCircle, HelpCircle, FileText, 
  Play, Pause, RotateCcw, Send, Mic, MicOff, Sparkles, RefreshCw, ShieldAlert
} from 'lucide-react';

const LANGUAGES = [
  { name: 'English', code: 'english' },
  { name: 'Hindi (हिंदी)', code: 'hindi' },
  { name: 'Kannada (ಕನ್ನಡ)', code: 'kannada' },
  { name: 'Tamil (தமிழ்)', code: 'tamil' },
  { name: 'Telugu (తెలుగు)', code: 'telugu' },
  { name: 'Malayalam (മലയാളം)', code: 'malayalam' },
  { name: 'Marathi (मराठी)', code: 'marathi' },
  { name: 'Bengali (বাংলা)', code: 'bengali' }
];

const DISCLAIMER = "MediAssist AI provides educational information only and is not a substitute for professional medical advice. Always consult a qualified doctor.";

export const ReportDetailPage = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [selectedLang, setSelectedLang] = useState('english');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'insights' | 'voice' | 'chat' | 'downloads'
  
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');

  // Voice Assistant Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const audioRef = useRef(null);

  // RAG Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const chatEndRef = useRef(null);

  // Voice Chat state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    fetchReportDetails();
    fetchInsights();
    fetchChatHistory();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/reports/${id}`);
      setReport(res.data);
      setData(res.data.structured_json);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load report details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const res = await axios.get(`/api/reports/${id}/insights`);
      setInsights(res.data);
    } catch (err) {
      console.error("Failed to load insights", err);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(`/api/reports/${id}/chat/history`);
      setChatMessages(res.data);
    } catch (err) {
      console.error("Failed to load chat history", err);
    }
  };

  const handleLanguageChange = async (langCode) => {
    setSelectedLang(langCode);
    if (langCode === 'english') {
      setData(report.structured_json);
      return;
    }
    try {
      setTranslating(true);
      const res = await axios.post(`/api/reports/${id}/translate`, { language: langCode });
      setData(res.data.translated_json);
    } catch (err) {
      setError('Translation failed. Reverting to English.');
      setData(report.structured_json);
    } finally {
      setTranslating(false);
    }
  };

  const handlePlayTTS = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
      return;
    }

    const textToSpeak = data.simple_explanation || data.key_findings || data.diagnosis;
    try {
      setIsPlaying(true);
      const res = await axios.post(`/api/reports/${id}/tts`, 
        { text: textToSpeak, language: selectedLang },
        { responseType: 'blob' }
      );
      
      const audioUrl = URL.createObjectURL(res.data);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.playbackRate = speechRate;
        audioRef.current.play();
        audioRef.current.onended = () => setIsPlaying(false);
      }
    } catch (err) {
      // Browser SpeechSynthesis fallback
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = speechRate;
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlaying(false);
      }
    }
  };

  const handleReplayTTS = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      handlePlayTTS();
    }
  };

  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isChatSending) return;

    const userText = inputMessage;
    setInputMessage('');
    setIsChatSending(true);

    const tempUserMsg = { sender: 'user', role: 'user', content: userText, created_at: new Date().toISOString() };
    setChatMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await axios.post(`/api/reports/${id}/chat`, { message: userText });
      setChatMessages(prev => [...prev.filter(m => m !== tempUserMsg), tempUserMsg, res.data]);
    } catch (err) {
      setChatMessages(prev => [...prev, {
        sender: 'assistant', role: 'assistant',
        content: `Error generating response. ${DISCLAIMER}`,
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsChatSending(false);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendVoiceChatAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access required for voice chat.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceChatAudio = async (audioBlob) => {
    try {
      setIsProcessingVoice(true);
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');

      const res = await axios.post(`/api/reports/${id}/voice-chat`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { user_transcript, ai_response, audio_base64 } = res.data;

      setChatMessages(prev => [
        ...prev,
        { sender: 'user', role: 'user', content: user_transcript, created_at: new Date().toISOString() },
        { sender: 'assistant', role: 'assistant', content: ai_response, created_at: new Date().toISOString() }
      ]);

      if (audio_base64 && audioRef.current) {
        const audioUrl = `data:audio/mpeg;base64,${audio_base64}`;
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
        audioRef.current.onended = () => setIsPlaying(false);
      }
    } catch (err) {
      setError('Failed to process voice chat audio.');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const handleDownloadPDF = () => {
    window.open(`/api/reports/${id}/download/pdf`, '_blank');
  };

  const handleDownloadAudio = () => {
    window.open(`/api/reports/${id}/download/audio`, '_blank');
  };

  const handleDownloadJSON = () => {
    window.open(`/api/reports/${id}/download/json`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] text-cyan-400 font-bold text-xs space-x-2">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span>Loading Medical Report Analysis...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Unable to Load Report</h2>
        <p className="text-xs text-gray-400">{error || 'Report not found'}</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-gray-950 font-bold text-xs">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  const parameters = data.parameters || [];
  const abnormalParams = parameters.filter(p => (p.status || '').toLowerCase() === 'abnormal');
  const normalParams = parameters.filter(p => (p.status || '').toLowerCase() !== 'abnormal');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <audio ref={audioRef} className="hidden" />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gray-900/80 border border-gray-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-2.5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {data.report_type || report.report_type}
              </span>
              <span className="text-xs text-gray-400 font-mono">{report.filename}</span>
            </div>
            <h1 className="text-xl font-extrabold text-white mt-1">{data.diagnosis}</h1>
          </div>
        </div>

        {/* Language Selector Dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center gap-2 bg-gray-950 px-3 py-2 rounded-2xl border border-gray-800">
            <Languages className="w-4 h-4 text-cyan-400" />
            <select
              value={selectedLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={translating}
              className="bg-transparent text-xs font-semibold text-gray-200 focus:outline-none cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-gray-900 text-white">
                  {lang.name}
                </option>
              ))}
            </select>
            {translating && <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2 overflow-x-auto">
        {[
          { id: 'summary', label: 'Structured Summary', icon: FileText },
          { id: 'insights', label: 'Health Insights', icon: Activity },
          { id: 'voice', label: 'Voice Assistant', icon: Volume2 },
          { id: 'chat', label: 'AI RAG & Voice Chat', icon: MessageSquare },
          { id: 'downloads', label: 'Downloads & Exports', icon: Download }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500 text-gray-950 shadow-lg shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Summary */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 space-y-6">
            {/* Key Findings */}
            <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Key Medical Findings</span>
              </h3>
              <p className="text-xs text-gray-200 leading-relaxed font-sans">{data.key_findings}</p>
            </div>

            {/* Structured Parameters */}
            {parameters.length > 0 && (
              <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center justify-between">
                  <span>Extracted Clinical Parameters ({parameters.length})</span>
                  {abnormalParams.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {abnormalParams.length} Abnormal Flagged
                    </span>
                  )}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 font-semibold">
                        <th className="pb-3">Parameter Name</th>
                        <th className="pb-3">Result Value</th>
                        <th className="pb-3">Reference Range</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 text-gray-300">
                      {parameters.map((p, idx) => {
                        const isAbnormal = (p.status || '').toLowerCase() === 'abnormal';
                        return (
                          <tr key={idx} className="hover:bg-gray-850/50 transition-colors">
                            <td className="py-3 font-medium text-white">{p.name}</td>
                            <td className="py-3 font-mono">{p.value} {p.unit}</td>
                            <td className="py-3 font-mono text-gray-400">{p.reference_range || 'N/A'}</td>
                            <td className="py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                isAbnormal ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {isAbnormal ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                <span>{p.status || 'Normal'}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Simple Layperson Explanation */}
            <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Plain Language Explanation</h3>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">{data.simple_explanation}</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Patient Info & Health Score */}
            <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Patient Details</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span className="text-gray-400">Name:</span>
                  <span className="font-semibold text-white">{data.patient_name || 'Patient'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span className="text-gray-400">Age / Gender:</span>
                  <span className="font-semibold text-white">{data.patient_age} / {data.patient_gender}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span className="text-gray-400">Health Score:</span>
                  <span className="font-bold text-cyan-400">{data.health_score || 85}/100</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Risk Level:</span>
                  <span className={`font-bold ${data.risk_level === 'High' ? 'text-rose-400' : 'text-emerald-400'}`}>{data.risk_level || 'Low'}</span>
                </div>
              </div>
            </div>

            {/* Doctor Recommendations */}
            <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Doctor Recommendations</h3>
              <p className="text-xs text-gray-300 leading-relaxed">{data.recommendations}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Health Insights */}
      {activeTab === 'insights' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Overall Health Score</p>
                <p className="text-3xl font-extrabold text-cyan-400 mt-1">{insights?.health_score || data.health_score || 85}/100</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-extrabold text-lg">
                {insights?.health_score || data.health_score || 85}%
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Risk Evaluation</p>
                <p className={`text-3xl font-extrabold mt-1 ${(insights?.risk_level || data.risk_level) === 'High' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {insights?.risk_level || data.risk_level || 'Low'}
                </p>
              </div>
              <Activity className="w-10 h-10 text-emerald-400 opacity-80" />
            </div>

            <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Flagged Abnormalities</p>
                <p className="text-3xl font-extrabold text-rose-400 mt-1">{abnormalParams.length}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-rose-400 opacity-80" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Suggested Follow-Up Tests */}
            <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Suggested Follow-up Tests</span>
              </h3>
              <ul className="space-y-2 text-xs text-gray-300">
                {(insights?.followup_tests || data.suggested_tests || []).map((test, i) => (
                  <li key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-950/60 border border-gray-800">
                    <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{test}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Questions to Ask Your Doctor */}
            <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                <span>Questions to Ask Your Doctor</span>
              </h3>
              <ul className="space-y-2 text-xs text-gray-300">
                {(insights?.doctor_questions || data.questions_for_doctor || []).map((q, i) => (
                  <li key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-950/60 border border-gray-800">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Voice Assistant */}
      {activeTab === 'voice' && (
        <div className="p-8 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-6 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Volume2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Medical Summary Voice Assistant</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">Listen to an audio narrative summary of your report findings in {selectedLang}.</p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePlayTTS}
              className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause Audio' : 'Play Summary Audio'}</span>
            </button>

            <button
              onClick={handleReplayTTS}
              className="p-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-gray-950 border border-gray-800 text-xs text-gray-300 leading-relaxed text-left font-mono">
            {data.simple_explanation || data.key_findings}
          </div>
        </div>
      )}

      {/* TAB CONTENT: AI Chat & Real Voice Chat */}
      {activeTab === 'chat' && (
        <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 flex flex-col h-[650px] space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>AI RAG & Real Voice Assistant</span>
              </h3>
              <p className="text-[11px] text-gray-400">Ask questions using text or real microphone voice input.</p>
            </div>

            {/* Microphone Voice Recording Button */}
            <button
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={isProcessingVoice}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-cyan-400" />}
              <span>{isRecording ? 'Stop Recording' : isProcessingVoice ? 'Processing Audio...' : 'Voice Chat'}</span>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {chatMessages.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-gray-200">Ask MediAssist AI anything about this report</h4>
                <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                  Click the microphone button or type below to ask questions about your diagnostic results.
                </p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isUser = (msg.role || msg.sender) === 'user';
                return (
                  <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed space-y-1 ${
                      isUser
                        ? 'bg-cyan-500 text-gray-950 font-medium rounded-tr-none'
                        : 'bg-gray-950 border border-gray-800 text-gray-200 rounded-tl-none'
                    }`}>
                      <div className="flex items-center justify-between gap-4 text-[10px] opacity-75 font-semibold">
                        <span>{isUser ? 'You' : 'MediAssist AI'}</span>
                        <span>{new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content || msg.message}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-gray-800">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question about your report..."
              className="flex-1 px-4 py-3 rounded-2xl bg-gray-950 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={isChatSending || !inputMessage.trim()}
              className="px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs disabled:opacity-50 transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* TAB CONTENT: Downloads */}
      {activeTab === 'downloads' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-4">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 w-fit">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Printable Summary PDF</h3>
              <p className="text-xs text-gray-400 mt-1">Download clean formatted medical report PDF summary.</p>
            </div>
            <button
              onClick={handleDownloadPDF}
              className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Summary</span>
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 w-fit">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Audio Narration File</h3>
              <p className="text-xs text-gray-400 mt-1">Download spoken audio file summary in MP3 format.</p>
            </div>
            <button
              onClick={handleDownloadAudio}
              className="w-full py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-amber-400 font-bold text-xs border border-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Audio (.mp3)</span>
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 w-fit">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Structured Pydantic JSON</h3>
              <p className="text-xs text-gray-400 mt-1">Export raw structured medical JSON data.</p>
            </div>
            <button
              onClick={handleDownloadJSON}
              className="w-full py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-emerald-400 font-bold text-xs border border-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Report</span>
            </button>
          </div>
        </div>
      )}

      {/* Visible Medical Disclaimer Footer Banner */}
      <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-300 text-xs text-center flex items-center justify-center gap-2">
        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
        <span>{DISCLAIMER}</span>
      </div>
    </div>
  );
};
