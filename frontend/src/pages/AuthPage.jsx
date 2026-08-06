import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { login, signup } from '../services/api';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'citizen',
};

const demoAccounts = {
  citizen: {
    id: 'demo-citizen',
    name: 'Demo Citizen',
    email: 'citizen@civicmind.ai',
    role: 'citizen',
  },
  authority: {
    id: 'demo-authority',
    name: 'Demo Authority',
    email: 'authority@civicmind.ai',
    role: 'authority',
  },
};

const passwordChecks = [
  { label: '8+ chars', test: (password) => password.length >= 8 },
  { label: 'Uppercase', test: (password) => /[A-Z]/.test(password) },
  { label: 'Number', test: (password) => /\d/.test(password) },
  { label: 'Symbol', test: (password) => /[^A-Za-z0-9]/.test(password) },
];

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(password) {
  const score = passwordChecks.filter(({ test }) => test(password)).length;
  if (!password) return { percent: 0, label: 'Add a password' };
  if (score <= 1) return { percent: 25, label: 'Weak' };
  if (score === 2) return { percent: 50, label: 'Fair' };
  if (score === 3) return { percent: 75, label: 'Strong' };
  return { percent: 100, label: 'Excellent' };
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('civic_user') || 'null');
    const token = localStorage.getItem('civic_token');
    if (token && storedUser) {
      navigate(storedUser.role === 'authority' ? '/authority' : '/citizen');
    }
  }, [navigate]);

  const finalizeAuth = (user, token) => {
    localStorage.setItem('civic_user', JSON.stringify(user));
    localStorage.setItem('civic_token', token);
    setMessage('Access ready. Redirecting…');
    setTimeout(() => navigate(user.role === 'authority' ? '/authority' : '/citizen'), 350);
  };

  const handleDemoRole = async (role) => {
    setLoading(true);
    setMessage('');
    try {
      const account = demoAccounts[role];
      const response = await login(account.email, 'Password123!');
      finalizeAuth(response.user, response.token);
    } catch (error) {
      setMessage(error.message || 'Unable to sign in using the demo account.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!form.email.trim() || !emailIsValid(form.email)) {
        throw new Error('Please enter a valid email address.');
      }

      if (!form.password.trim()) {
        throw new Error('Please enter your password.');
      }

      if (mode === 'signup' && !form.name.trim()) {
        throw new Error('Please enter your full name.');
      }

      let response;
      if (mode === 'signup') {
        response = await signup({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      } else {
        response = await login(form.email, form.password);
      }

      const user = response.user;
      if (rememberMe) {
        localStorage.setItem('civic_user', JSON.stringify(user));
        localStorage.setItem('civic_token', response.token);
      }

      setMessage(mode === 'signup' ? 'Account created successfully.' : 'Login successful. Redirecting…');
      setTimeout(() => navigate(user.role === 'authority' ? '/authority' : '/citizen'), 350);
    } catch (error) {
      setMessage(error.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setMessage('Demo mode: password reset is available after account creation in the production flow.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="glass grid w-full max-w-5xl overflow-hidden rounded-[32px] md:grid-cols-[1fr_1.05fr]">
          <div className="p-8 md:p-12">
            <div className="mb-5 text-xs uppercase tracking-[0.3em] text-brand-200">CivicMind AI</div>
            <h1 className="text-3xl font-semibold">Citizen & authority access</h1>
            <p className="mt-3 text-slate-300">Choose the fastest path to submit complaints, review case progress, or manage operations.</p>
            <div className="mt-8 space-y-4 text-sm text-slate-200">
              <div className="rounded-2xl bg-white/5 p-4">Protected role-based workflows</div>
              <div className="rounded-2xl bg-white/5 p-4">AI analysis and complaint routing</div>
              <div className="rounded-2xl bg-white/5 p-4">Fast mobile-first sign in experience</div>
            </div>
          </div>

          <div className="bg-slate-900/70 p-8 md:p-12">
            <div className="mb-4 flex gap-2 rounded-2xl border border-white/10 p-1">
              <button type="button" onClick={() => setMode('login')} className={`flex-1 rounded-xl px-3 py-2 text-sm ${mode === 'login' ? 'bg-brand-500 text-white' : 'text-slate-300'}`}>Login</button>
              <button type="button" onClick={() => setMode('signup')} className={`flex-1 rounded-xl px-3 py-2 text-sm ${mode === 'signup' ? 'bg-brand-500 text-white' : 'text-slate-300'}`}>Create account</button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button type="button" onClick={() => handleDemoRole('citizen')} className="button-primary ripple rounded-2xl px-4 py-3 text-sm font-semibold text-white">Citizen Login</button>
              <button type="button" onClick={() => handleDemoRole('authority')} className="button-secondary ripple rounded-2xl px-4 py-3 text-sm font-semibold text-white">Admin Login</button>
              <button type="button" onClick={() => handleDemoRole('citizen')} className="button-ghost ripple rounded-2xl px-4 py-3 text-sm font-semibold text-slate-100">Google Login</button>
              <button type="button" onClick={() => handleDemoRole('citizen')} className="button-ghost ripple rounded-2xl px-4 py-3 text-sm font-semibold text-slate-100">Guest Login</button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {mode === 'signup' ? (
                <input
                  aria-label="Full name"
                  autoFocus
                  className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm outline-none"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              ) : null}

              <input
                aria-label="Email address"
                autoFocus={mode === 'login'}
                className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm outline-none"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              {form.email && !emailIsValid(form.email) ? (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">Please use a valid email format.</div>
              ) : null}

              <div className="relative">
                <input
                  aria-label="Password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 pr-11 text-sm outline-none"
                  placeholder="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="rounded-2xl bg-slate-800/70 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                  <span>Password strength</span>
                  <span>{passwordStrength.label}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-cyan-300" style={{ width: `${passwordStrength.percent}%` }} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  {passwordChecks.map(({ label, test }) => (
                    <div key={label} className={`rounded-full px-2 py-1 ${test(form.password) ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/5 text-slate-300'}`}>
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {mode === 'signup' ? (
                <select
                  aria-label="Role"
                  className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm outline-none"
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                >
                  <option value="citizen">Citizen</option>
                  <option value="authority">Authority</option>
                </select>
              ) : null}

              <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                  Remember Me
                </label>
                <button type="button" onClick={handleForgotPassword} className="text-brand-200 underline-offset-2 hover:underline">Forgot Password</button>
              </div>

              <AnimatePresence mode="wait">
                {message ? (
                  <motion.div
                    key={message}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
                  >
                    {message}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <button type="submit" className="button-primary ripple w-full rounded-2xl px-4 py-3 font-semibold text-white" disabled={loading}>
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                    Please wait...
                  </span>
                ) : mode === 'signup' ? (
                  <span className="inline-flex items-center gap-2">
                    Create account
                    <ArrowRight size={16} />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Login
                    <ArrowRight size={16} />
                  </span>
                )}
              </button>
            </form>

            <div className="mt-5 flex gap-3">
              <Link to="/citizen" className="button-ghost ripple flex-1 rounded-2xl px-4 py-3 text-center text-sm text-slate-100">Citizen Demo</Link>
              <Link to="/authority" className="button-secondary ripple flex-1 rounded-2xl px-4 py-3 text-center text-sm text-white">Authority Demo</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
