import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, User, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError('Please provide your full name');
          setLoading(false);
          return;
        }
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (err) {
      console.error('Demo login error:', err);
      setError('Demo login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-2">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            MediAssist <span className="text-cyan-400">AI</span>
          </h1>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Multilingual Medical Report Summarizer & AI Voice Assistant
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-3xl p-8 border border-gray-800 shadow-2xl space-y-6 relative overflow-hidden">
          
          {/* Quick Demo Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-emerald-500/15 to-teal-500/15 border border-cyan-500/30 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Instant Demo Access
              </span>
              <p className="text-[11px] text-gray-400">Test full app with pre-loaded medical reports</p>
            </div>
            <button
              onClick={handleDemo}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
            >
              <span>Explore Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold transition-colors border-b-2 ${
                !isRegister ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold transition-colors border-b-2 ${
                isRegister ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Register Account
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Jane Doe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900/90 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900/90 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900/90 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Processing...' : isRegister ? 'Create MediAssist Account' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Educational Platform — Secure & Private Local Storage</span>
        </div>
      </div>
    </div>
  );
};
