import React, { useState } from 'react';
import { dbService } from '../db';
import { User } from '../types';
import { Lock, Mail, ChevronRight, UserPlus, HelpCircle, RefreshCw, Loader2 } from 'lucide-react';
import logoImg from '../assets/images/app_logo_1781644653866.jpg';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
  darkMode: boolean;
}

export function Auth({ onAuthSuccess, darkMode }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('What was the name of your first pet?');
  const [securityAnswer, setSecurityAnswer] = useState('');
  
  // Reset form fields
  const [resetEmail, setResetEmail] = useState('');
  const [resetAnswer, setResetAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ text: 'Please fill in all fields.', isError: true });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const dummyHash = btoa(password); // Basic client side secure representation
      const result = await dbService.loginUser(email, dummyHash);

      if (typeof result === 'string') {
        setMessage({ text: result, isError: true });
      } else {
        setMessage({ text: 'Successfully logged in! Restoring cloud profile...', isError: false });
        setTimeout(() => onAuthSuccess(result), 400);
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Login failed', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !securityAnswer) {
      setMessage({ text: 'Please fill in all fields.', isError: true });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match.', isError: true });
      return;
    }

    if (password.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters long.', isError: true });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const dummyHash = btoa(password);
      const result = await dbService.registerUser(email, dummyHash, securityQuestion, securityAnswer);

      if (typeof result === 'string') {
        setMessage({ text: result, isError: true });
      } else {
        setMessage({ text: 'Successfully registered account in cloud! Logging in...', isError: false });
        // Automatically log them in
        const loggedUser = await dbService.loginUser(email, dummyHash);
        if (typeof loggedUser !== 'string') {
          setTimeout(() => onAuthSuccess(loggedUser), 400);
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Registration failed', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetAnswer || !newPassword || !confirmNewPassword) {
      setMessage({ text: 'Please fill in all fields.', isError: true });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setMessage({ text: 'New passwords do not match.', isError: true });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters long.', isError: true });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const dummyHash = btoa(newPassword);
      const success = await dbService.resetPassword(resetEmail, resetAnswer, dummyHash);

      if (success) {
        setMessage({ text: 'Password reset successfully in cloud! You can now log in.', isError: false });
        setTimeout(() => {
          setMode('login');
          setEmail(resetEmail);
          setMessage(null);
        }, 1500);
      } else {
        setMessage({ text: 'Verification failed. Incorrect security answer or email matching.', isError: true });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Reset failed', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await dbService.loginWithGoogle();
      if (typeof result === 'string') {
        setMessage({ text: result, isError: true });
      } else {
        setMessage({ text: 'Successfully authenticated via Google Log In! RESTORING SECURE CLOUD SESSION...', isError: false });
        setTimeout(() => onAuthSuccess(result), 450);
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Google Single Sign-On failed', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex min-h-screen items-center justify-center p-4 transition-colors duration-200 ${darkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      <div className="w-full max-w-md">
        {/* Title Logo section */}
        <div className="mb-8 text-center animate-fade-in">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm bg-white dark:bg-neutral-900">
            <img
              id="app-logo-icon"
              src={logoImg}
              alt="Kallon Finance Logo"
              className="h-full w-full object-cover animate-fade-in"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 id="app-title-header" className="font-display text-3xl font-bold tracking-tight">
            Kallon <span className="text-indigo-600 dark:text-indigo-400">FinanceTracker</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Secure, professional personal budget and savings planner
          </p>
        </div>

        {/* Card Panel */}
        <div className={`rounded-3xl border p-8 shadow-sm transition-card ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="mb-6 flex justify-between border-b pb-4 border-neutral-200 dark:border-neutral-800">
            <h2 id="form-heading" className="text-xl font-semibold">
              {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Account' : 'Recover Access'}
            </h2>
            <button
              onClick={() => {
                if (loading) return;
                setMode(mode === 'login' ? 'register' : 'login');
                setMessage(null);
              }}
              disabled={loading}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50"
            >
              {mode === 'login' ? 'No account? Sign up' : mode === 'register' ? 'Have account? Sign in' : 'Return to sign in'}
            </button>
          </div>

          {message && (
            <div
              id="auth-alert"
              className={`mb-5 rounded-xl border p-3.5 text-xs font-medium whitespace-pre-wrap ${
                message.isError
                  ? 'border-rose-100 bg-rose-50/50 text-rose-600 dark:border-rose-950/40 dark:bg-rose-950/20 dark:text-rose-400'
                  : 'border-emerald-100 bg-emerald-50/50 text-emerald-600 dark:border-emerald-950/40 dark:bg-emerald-950/20 dark:text-emerald-400'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* LOGIN MODE */}
          {mode === 'login' && (
            <div className="space-y-4">
              <form id="login-form" onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Email Address</label>
                  <div className="relative mt-1">
                    <Mail className="absolute top-3.5 left-3.5 h-4 w-4 text-neutral-400" />
                    <input
                      id="login-email-input"
                      type="email"
                      required
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Password</label>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setMode('reset');
                        setMessage(null);
                      }}
                      className="text-xs text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition disabled:opacity-50"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative mt-1">
                    <Lock className="absolute top-3.5 left-3.5 h-4 w-4 text-neutral-400" />
                    <input
                      id="login-password-input"
                      type="password"
                      required
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <button
                  id="login-submit-button"
                  type="submit"
                  disabled={loading}
                  className="mt-6 flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 active:scale-[0.98] transition shadow-sm disabled:opacity-75"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing In...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      Sign In
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </span>
                  )}
                </button>
              </form>

              {/* Secure Google Login Button */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-neutral-400 dark:bg-neutral-900 font-medium">Or log in securely via</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-200 bg-white py-2.5 px-4 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900 transition active:scale-[0.98] disabled:opacity-65 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                  <g>
                    <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.48C21.68,11.89 21.56,11.47 21.35,11.1z" fill="#4285F4" />
                    <path d="M12,20.8c2.43,0 4.47,-0.8 5.96,-2.2l-3.3,-2.58c-0.91,0.61 -2.08,0.98 -3.1,0.98 -2.39,0 -4.41,-1.61 -5.14,-3.78H3.01v2.67C4.49,18.86 8.01,20.8 12,20.8z" fill="#34A853" />
                    <path d="M6.86,13.22c-0.18,-0.55 -0.29,-1.13 -0.29,-1.72s0.1,-1.18 0.29,-1.72V7.1H3.01c-0.65,1.29 -1.01,2.75 -1.01,4.4s0.36,3.11 1.01,4.4L6.86,13.22z" fill="#FBBC05" />
                    <path d="M12,5.78c1.33,0 2.51,0.46 3.45,1.36l2.58,-2.58C16.46,3.1 14.43,2.2 12,2.2 8.01,2.2 4.49,4.14 3.01,7.1l3.56,2.78C7.3,7.71 9.32,5.78 12,5.78z" fill="#EA4335" />
                  </g>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          {/* REGISTER MODE */}
          {mode === 'register' && (
            <div className="space-y-4">
              <form id="register-form" onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Email Address</label>
                  <div className="relative mt-1">
                    <Mail className="absolute top-3.5 left-3.5 h-4 w-4 text-neutral-400" />
                    <input
                      id="register-email-input"
                      type="email"
                      required
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Password (min 6 chars)</label>
                  <div className="relative mt-1">
                    <Lock className="absolute top-3.5 left-3.5 h-4 w-4 text-neutral-400" />
                    <input
                      id="register-password-input"
                      type="password"
                      required
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Confirm Password</label>
                  <div className="relative mt-1">
                    <Lock className="absolute top-3.5 left-3.5 h-4 w-4 text-neutral-400" />
                    <input
                      id="register-password-confirm"
                      type="password"
                      required
                      disabled={loading}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Security Question (For Retrieval)</span>
                  </div>
                  <select
                    id="security-question-select"
                    value={securityQuestion}
                    disabled={loading}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="w-full rounded-xl border py-2 px-3 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 disabled:opacity-60"
                  >
                    <option>What was the name of your first pet?</option>
                    <option>What is your mother's maiden name?</option>
                    <option>In what city were you born?</option>
                    <option>What was the name of your high school?</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Security Answer</label>
                  <input
                    id="security-answer-input"
                    type="text"
                    required
                    disabled={loading}
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Your answer"
                    className="mt-1 w-full rounded-xl border py-2.5 px-4 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>

                <button
                  id="register-submit-button"
                  type="submit"
                  disabled={loading}
                  className="mt-6 flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 active:scale-[0.98] transition shadow-sm disabled:opacity-75"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Cloud Profile...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Create Account
                      <UserPlus className="h-4 w-4" />
                    </span>
                  )}
                </button>
              </form>

              {/* Secure Google Register Button */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-neutral-400 dark:bg-neutral-900 font-medium">Or register instantly with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-200 bg-white py-2.5 px-4 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900 transition active:scale-[0.98] disabled:opacity-65 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                  <g>
                    <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.48C21.68,11.89 21.56,11.47 21.35,11.1z" fill="#4285F4" />
                    <path d="M12,20.8c2.43,0 4.47,-0.8 5.96,-2.2l-3.3,-2.58c-0.91,0.61 -2.08,0.98 -3.1,0.98 -2.39,0 -4.41,-1.61 -5.14,-3.78H3.01v2.67C4.49,18.86 8.01,20.8 12,20.8z" fill="#34A853" />
                    <path d="M6.86,13.22c-0.18,-0.55 -0.29,-1.13 -0.29,-1.72s0.1,-1.18 0.29,-1.72V7.1H3.01c-0.65,1.29 -1.01,2.75 -1.01,4.4s0.36,3.11 1.01,4.4L6.86,13.22z" fill="#FBBC05" />
                    <path d="M12,5.78c1.33,0 2.51,0.46 3.45,1.36l2.58,-2.58C16.46,3.1 14.43,2.2 12,2.2 8.01,2.2 4.49,4.14 3.01,7.1l3.56,2.78C7.3,7.71 9.32,5.78 12,5.78z" fill="#EA4335" />
                  </g>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          {/* RESET PASSWORD MODE */}
          {mode === 'reset' && (
            <form id="reset-form" onSubmit={handleReset} className="space-y-4">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Confirm your account email and answer the security question correctly to set a new password.
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Account Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute top-3.5 left-3.5 h-4 w-4 text-neutral-400" />
                  <input
                    id="reset-email-input"
                    type="email"
                    required
                    disabled={loading}
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">What is your security answer?</label>
                <input
                  id="reset-security-answer-input"
                  type="text"
                  required
                  disabled={loading}
                  value={resetAnswer}
                  onChange={(e) => setResetAnswer(e.target.value)}
                  placeholder="Answer entered during registration"
                  className="mt-1 w-full rounded-xl border py-2.5 px-4 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">New Password (min 6 chars)</label>
                <input
                  id="reset-new-password-input"
                  type="password"
                  required
                  disabled={loading}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border py-2.5 px-4 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Confirm New Password</label>
                <input
                  id="reset-new-password-confirm"
                  type="password"
                  required
                  disabled={loading}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border py-2.5 px-4 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setMode('login');
                    setMessage(null);
                  }}
                  className="flex-1 rounded-xl border py-3 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-950 transition text-center disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  id="reset-submit-button"
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 active:scale-[0.98] transition shadow-sm flex items-center justify-center gap-1 disabled:opacity-75"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Reset Password
                      <RefreshCw className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
