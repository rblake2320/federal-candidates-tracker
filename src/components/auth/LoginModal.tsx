import { useState, type FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
      onClose();
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setPassword('');
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="px-3 py-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
                {error}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm',
                    'bg-slate-800 border border-slate-700 text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  )}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={cn(
                  'w-full px-3 py-2 rounded-lg text-sm',
                  'bg-slate-800 border border-slate-700 text-white placeholder-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Min 8 characters' : 'Your password'}
                className={cn(
                  'w-full px-3 py-2 rounded-lg text-sm',
                  'bg-slate-800 border border-slate-700 text-white placeholder-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                )}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium',
                'bg-blue-600 text-white hover:bg-blue-500 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <div className="text-center text-sm text-slate-500">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
