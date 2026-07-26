import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleDemo = async () => {
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (err) {
      console.error('Demo login failed:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-md">
      {/* Top Educational Disclaimer Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center text-xs font-medium text-amber-300 flex items-center justify-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>This provides educational information and is not a substitute for professional medical advice.</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-wide">MediAssist</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/30">AI</span>
            </div>
            <span className="text-[10px] text-gray-400 block -mt-1">Multilingual Medical & Voice Intelligence</span>
          </div>
        </Link>

        {/* Right Navigation / Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="text-sm font-medium text-gray-300 hover:text-cyan-400 transition-colors"
              >
                My Reports
              </Link>
              
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/80 border border-gray-800">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-gray-200 font-medium">{user.name || user.email}</span>
              </div>

              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleDemo}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold hover:from-cyan-500/30 hover:to-emerald-500/30 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Quick Demo</span>
              </button>
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold text-xs transition-colors shadow-lg shadow-cyan-500/25"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
