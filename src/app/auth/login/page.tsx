'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Zap } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState<'en' | 'ru'>('en')

  const copy = {
    en: {
      title: 'Sign in to ESAI', sub: 'Welcome back',
      email: 'Email address', pass: 'Password',
      btn: 'Sign in', google: 'Continue with Google',
      noAcc: "Don't have an account?", signup: 'Create account',
      forgot: 'Forgot password?', trial: '14-day free trial • No credit card required',
    },
    ru: {
      title: 'Войти в ESAI', sub: 'С возвращением',
      email: 'Email', pass: 'Пароль',
      btn: 'Войти', google: 'Войти через Google',
      noAcc: 'Нет аккаунта?', signup: 'Создать',
      forgot: 'Забыли пароль?', trial: '14 дней бесплатно • Без карты',
    },
  }[lang]

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0D1B3E 0%, #0F2A4A 50%, #0D3A30 100%)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white">ES<span className="text-teal-400">AI</span></span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Close more deals.<br /><span className="text-teal-400">Work less.</span>
          </h1>
          <p className="text-slate-300 text-lg mb-8">AI-powered CRM built exclusively for real estate agents.</p>
          {[
            '🔥 AI lead scoring — hot, warm, cold automatically',
            '✉️ AI email drafts in one click',
            '📱 Mobile-first — works like a native app',
          ].map((f) => (
            <div key={f} className="flex items-center gap-3 mb-3">
              <p className="text-slate-200 text-sm">{f}</p>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-xs">© 2026 ESAI. All rights reserved.</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">ES<span className="text-teal-600">AI</span></span>
          </div>

          {/* Lang toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-6">
            {(['en', 'ru'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${lang === l ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">{copy.title}</h2>
          <p className="text-slate-500 text-sm mb-6">{copy.sub}</p>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            {copy.google}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">{copy.email}</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">{copy.pass}</label>
                <Link href="/auth/forgot" className="text-xs text-teal-600 hover:text-teal-700">{copy.forgot}</Link>
              </div>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {copy.btn}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            {copy.noAcc}{' '}
            <Link href="/auth/signup" className="text-teal-600 font-semibold hover:text-teal-700">{copy.signup}</Link>
          </p>

          <p className="text-center text-xs text-slate-400 mt-4 bg-teal-50 rounded-lg py-2 px-3">
            ✨ {copy.trial}
          </p>
        </div>
      </div>
    </div>
  )
}
