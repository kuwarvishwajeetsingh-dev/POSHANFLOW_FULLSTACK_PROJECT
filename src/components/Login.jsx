import React, { useEffect, useState } from 'react';
import { Accessibility, Building2, CalendarDays, ChevronRight, CircleHelp, Languages, LockKeyhole, Mail, ShieldCheck, SlidersVertical, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIndiaDateString } from '../utils/indiaDate';

const slides = ['/login-slides/school-meal.jpg', '/login-slides/school-water.jpg', '/login-slides/meal-distribution.jpg', '/login-slides/school-pump.jpg', '/login-slides/meal-service.jpg'];
const languages = [['English', 'English'], ['हिन्दी', 'Hindi'], ['ଓଡ଼ିଆ', 'Odia'], ['বাংলা', 'Bengali'], ['தமிழ்', 'Tamil'], ['తెలుగు', 'Telugu']];

export default function Login({ onLogin, onForgotPassword, loginError, loginContext }) {
  const [portal, setPortal] = useState('teacher'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false); const [localMessage, setLocalMessage] = useState(''); const [resetMessage, setResetMessage] = useState(''); const [resetting, setResetting] = useState(false); const [language, setLanguage] = useState(languages[0]); const [languageOpen, setLanguageOpen] = useState(false); const [accessibilityOpen, setAccessibilityOpen] = useState(false); const [textScale, setTextScale] = useState(0); const [homeMenuOpen, setHomeMenuOpen] = useState(false);
  const navigate = useNavigate(); const teacher = portal === 'teacher';
  useEffect(() => { document.documentElement.lang = language[1] === 'Hindi' ? 'hi' : 'en'; }, [language]);
  useEffect(() => { document.documentElement.style.fontSize = `${16 + textScale}px`; return () => { document.documentElement.style.fontSize = '16px'; }; }, [textScale]);
  useEffect(() => { if (!loginContext) return; const panel = document.getElementById('login-panel'); window.requestAnimationFrame(() => { panel?.scrollIntoView({ behavior: 'smooth', block: 'center' }); panel?.focus({ preventScroll: true }); }); }, [loginContext]);
  useEffect(() => { const about = document.querySelector('.min-h-screen header nav span:nth-of-type(1)'); if (about) about.style.display = 'inline-block'; const openAbout = () => navigate('/about-pm-poshan'); about?.addEventListener('click', openAbout); return () => about?.removeEventListener('click', openAbout); }, [navigate]);
  useEffect(() => {
    const navContent = document.querySelector('.min-h-screen header nav > div');
    if (!navContent) return undefined;
    const menu = document.createElement('div');
    menu.className = 'header-quick-menu';
    menu.innerHTML = '<button type="button" aria-label="Open navigation menu" aria-haspopup="menu">☰</button><div class="header-quick-menu-list" role="menu"><button type="button" data-nav-action="home" role="menuitem">Home</button><button type="button" data-nav-action="login" role="menuitem">Login</button><button type="button" data-nav-action="about" role="menuitem">About PM POSHAN</button><button type="button" data-nav-action="explore" role="menuitem">Explore</button><button type="button" data-nav-action="help" role="menuitem">Help & Support</button></div>';
    const selectOption = (event) => {
      const action = event.target.closest('[data-nav-action]')?.dataset.navAction;
      if (!action) return;
      if (action === 'home') navigate('/');
      if (action === 'login') { const panel = document.getElementById('login-panel'); panel?.scrollIntoView({ behavior: 'smooth', block: 'center' }); panel?.focus({ preventScroll: true }); }
      if (action === 'about') navigate('/about-pm-poshan');
      if (action === 'explore') navigate('/explore');
      if (action === 'help') document.querySelector('.min-h-screen header nav span:last-child')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    navContent.appendChild(menu);
    menu.addEventListener('click', selectOption);
    return () => { menu.removeEventListener('click', selectOption); menu.remove(); };
  }, [navigate]);
  useEffect(() => {
    const image = document.querySelector('img[alt="80th Independence Day 2026"]');
    if (!image?.parentElement) return undefined;
    const wrapper = document.createElement('div');
    wrapper.className = 'independence-day-message';
    image.parentElement.insertBefore(wrapper, image);
    wrapper.appendChild(image);
    const message = document.createElement('span');
    message.textContent = 'मेरा भारत महान';
    wrapper.appendChild(message);
    return () => { wrapper.replaceWith(image); };
  }, []);
  useEffect(() => {
    const assistance = [...document.querySelectorAll('.min-h-screen header nav span')].find((item) => item.textContent.includes('Need assistance?'));
    if (!assistance?.parentElement) return undefined;
    const help = document.createElement('div');
    help.className = 'header-assistance';
    assistance.parentElement.insertBefore(help, assistance);
    help.appendChild(assistance);
    assistance.setAttribute('role', 'button');
    assistance.setAttribute('tabindex', '0');
    assistance.setAttribute('aria-expanded', 'false');
    const panel = document.createElement('div');
    panel.className = 'header-assistance-panel';
    panel.innerHTML = '<p><strong>How can we help?</strong></p><button type="button" data-help="login">Sign in to your account</button><button type="button" data-help="reset">Reset a forgotten password</button><button type="button" data-help="dashboard">Use the school dashboard</button><p class="header-assistance-contact">For account access, contact your District Inspector.</p>';
    help.appendChild(panel);
    const toggle = () => { const open = help.classList.toggle('is-open'); assistance.setAttribute('aria-expanded', String(open)); };
    const onKeyDown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } };
    const onHelpClick = (event) => {
      const action = event.target.closest('[data-help]')?.dataset.help;
      if (!action) return;
      if (action === 'login' || action === 'dashboard') document.getElementById('login-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (action === 'reset') document.querySelector('#login-panel input[type="email"]')?.focus({ preventScroll: true });
      help.classList.remove('is-open'); assistance.setAttribute('aria-expanded', 'false');
    };
    assistance.addEventListener('click', toggle);
    assistance.addEventListener('keydown', onKeyDown);
    panel.addEventListener('click', onHelpClick);
    return () => { assistance.removeEventListener('click', toggle); assistance.removeEventListener('keydown', onKeyDown); panel.removeEventListener('click', onHelpClick); help.replaceWith(assistance); assistance.removeAttribute('role'); assistance.removeAttribute('tabindex'); assistance.removeAttribute('aria-expanded'); };
  }, []);
  useEffect(() => {
    const calendarButton = document.querySelectorAll('.portal-icon-button')[1];
    if (!calendarButton) return undefined;
    const originalParent = calendarButton.parentElement;
    const container = document.createElement('span');
    originalParent.insertBefore(container, calendarButton);
    container.appendChild(calendarButton);
    const getToday = () => new Date(`${getIndiaDateString()}T00:00:00`);
    let month = getToday();
    container.classList.add('calendar-action-container');

    const drawCalendar = () => {
      const today = getToday();
      month = new Date(month.getFullYear(), month.getMonth(), 1);
      const label = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(month);
      const firstWeekday = month.getDay();
      const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      const dates = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
        if (index < firstWeekday) return '<span></span>';
        const day = index - firstWeekday + 1;
        const isToday = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth() && day === today.getDate();
        return `<span class="calendar-day${isToday ? ' is-today' : ''}"${isToday ? ' aria-current="date"' : ''}>${day}</span>`;
      }).join('');
      return `<div class="calendar-month-header"><button type="button" data-calendar-action="previous" aria-label="Previous month">‹</button><strong>${label}</strong><button type="button" data-calendar-action="next" aria-label="Next month">›</button></div><div class="calendar-grid calendar-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="calendar-grid">${dates}</div><button type="button" class="calendar-today-button" data-calendar-action="today">Today</button>`;
    };
    const popup = document.createElement('div');
    popup.className = 'calendar-dropdown';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Calendar');
    const render = () => { popup.innerHTML = drawCalendar(); };
    const close = () => { popup.remove(); calendarButton.setAttribute('aria-expanded', 'false'); };
    const onPopupClick = (event) => {
      const action = event.target.closest('[data-calendar-action]')?.dataset.calendarAction;
      if (!action) return;
      if (action === 'previous') month = new Date(month.getFullYear(), month.getMonth() - 1, 1);
      if (action === 'next') month = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      if (action === 'today') { const today = getToday(); month = new Date(today.getFullYear(), today.getMonth(), 1); }
      render();
    };
    const open = () => {
      if (popup.isConnected) return;
      month = getToday();
      render(); container.appendChild(popup); calendarButton.setAttribute('aria-expanded', 'true');
    };
    const closeOnOutsideClick = (event) => { if (!container.contains(event.target)) close(); };
    calendarButton.setAttribute('aria-label', 'Show calendar');
    calendarButton.setAttribute('aria-haspopup', 'dialog');
    calendarButton.setAttribute('aria-expanded', 'false');
    container.addEventListener('mouseenter', open);
    container.addEventListener('mouseleave', close);
    calendarButton.addEventListener('focus', open);
    popup.addEventListener('click', onPopupClick);
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => { container.removeEventListener('mouseenter', open); container.removeEventListener('mouseleave', close); calendarButton.removeEventListener('focus', open); popup.removeEventListener('click', onPopupClick); document.removeEventListener('mousedown', closeOnOutsideClick); popup.remove(); container.classList.remove('calendar-action-container'); container.replaceWith(calendarButton); };
  }, []);
  useEffect(() => {
    const footerContent = document.querySelector('.min-h-screen footer > div');
    if (!footerContent) return undefined;

    const developerLink = document.createElement('a');
    developerLink.href = '/developer';
    developerLink.className = 'developer-footer-link';
    developerLink.textContent = 'Contact the developer for feedback or suggestions';
    developerLink.addEventListener('click', (event) => { event.preventDefault(); window.location.assign('/developer'); });
    footerContent.appendChild(developerLink);
    return () => { developerLink.remove(); };
  }, [navigate]);
  const signIn = async (event) => { event.preventDefault(); setLocalMessage(''); setLoading(true); try { await onLogin({ email: email.trim(), password, portal }); } catch (error) { setLocalMessage(error.message || 'An unexpected error occurred.'); } finally { setLoading(false); } };
  const reset = async () => { if (!email.trim()) { setLocalMessage('Enter your email address first, then select Forgot password.'); return; } setResetting(true); setLocalMessage(''); setResetMessage(''); const result = await onForgotPassword(email); setResetting(false); if (result?.success) setResetMessage('If this email has an account, a password reset link has been sent.'); else setLocalMessage(result?.message || 'Unable to send password reset email.'); };
  const openLoginPanel = (context) => { setHomeMenuOpen(false); navigate('/', { state: { loginContext: context } }); };
  const utility = 'portal-icon-button';
  return <div className="min-h-screen bg-[#1d3328] text-slate-800">
    <div className="fixed right-0 top-[42%] z-40 flex items-end"><div className={`overflow-hidden rounded-l-xl bg-white shadow-2xl transition-all duration-200 ${accessibilityOpen ? 'w-44 border border-slate-200' : 'w-0 border-0'}`}><div className="p-3"><p className="mb-2 text-xs font-bold text-[#285843]">Text size</p><div className="flex items-center justify-between gap-1"><button type="button" onClick={() => setTextScale((size) => Math.max(-2, size - 1))} disabled={textScale <= -2} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold text-slate-700">A−</button><button type="button" onClick={() => setTextScale(0)} className="text-[11px] font-medium text-[#285843] underline">Reset</button><button type="button" onClick={() => setTextScale((size) => Math.min(4, size + 1))} disabled={textScale >= 4} className="rounded-md bg-[#285843] px-2 py-1 text-xs font-bold text-white">A+</button></div></div></div><button type="button" onClick={() => setAccessibilityOpen(!accessibilityOpen)} aria-expanded={accessibilityOpen} className="flex h-12 w-12 items-center justify-center rounded-l-xl border-y border-l border-white/30 bg-[#285843] text-white shadow-xl"><Accessibility size={25} /></button></div>
    <header className="sticky top-0 z-30 border-b border-white/15 bg-[#1d3328]/78 text-white shadow-xl backdrop-blur-lg" style={{ backgroundImage: "linear-gradient(90deg, rgba(29,51,40,0.94), rgba(29,51,40,0.72), rgba(29,51,40,0.9)), url('/login-slides/school-meal.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}><div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6"><div className="flex items-center gap-3"><div className="flex h-12 w-11 items-center justify-center border border-white/25 bg-white/10"><Building2 size={26} /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f7bd6a]">Ministry of Education</p><h1 className="text-xl font-bold tracking-tight sm:text-2xl">PM POSHAN</h1><p className="text-[11px] text-white/75 sm:text-xs">Pradhan Mantri Poshan Shakti Nirman</p></div></div><div className="ml-auto flex items-center gap-1 sm:gap-2"><div className="hidden items-center gap-1 border-r border-white/25 pr-3 md:flex"><button type="button" className={utility}><SlidersVertical size={21} /></button><button type="button" className={utility}><CalendarDays size={22} /></button><button type="button" className={utility}><Accessibility size={23} /></button></div><div className="relative border-r border-white/25 pr-2"><button type="button" onClick={() => setLanguageOpen(!languageOpen)} className="flex h-11 items-center gap-2 rounded-full px-2 text-sm font-medium text-white"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3f855f]"><Languages size={19} /></span><span className="hidden sm:inline">{language[1]}</span></button>{languageOpen && <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-2xl">{languages.map((item) => <button key={item[1]} type="button" onClick={() => { setLanguage(item); setLanguageOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#edf5ef]">{item[0]} <span className="text-slate-500">— {item[1]}</span></button>)}</div>}</div><img src="/independence-day-2026.webp" alt="80th Independence Day 2026" className="h-11 w-24 rounded-lg border border-white/30 object-cover shadow-lg sm:h-14 sm:w-36" /></div></div>
      <nav className="border-t border-white/10 bg-[#315442]/80"><div className="mx-auto flex max-w-7xl items-center px-4 sm:px-6"><div className="relative" onMouseEnter={() => setHomeMenuOpen(true)} onMouseLeave={() => setHomeMenuOpen(false)}><button type="button" onClick={() => setHomeMenuOpen((open) => !open)} aria-expanded={homeMenuOpen} className="py-2 text-xs font-medium text-white hover:text-[#f7bd6a]">Home</button>{homeMenuOpen && <div className="absolute left-0 top-full z-50 w-[min(22rem,calc(100vw-2rem))] border border-[#d8e4d9] bg-white p-2 text-slate-700 shadow-2xl"><div className="border-b border-slate-200 px-3 py-2"><p className="text-sm font-bold text-[#285843]">PoshanFlow</p><p className="mt-1 text-[11px] leading-4 text-slate-500">Digital monitoring for better school meals, stronger accountability and healthier futures.</p></div><button type="button" onClick={() => openLoginPanel('Meal Monitoring')} className="home-menu-option"><span>🍲</span><span><strong>Meal Monitoring</strong><small>Monitor school meal implementation and related records.</small></span></button><button type="button" onClick={() => openLoginPanel('Smart Insights')} className="home-menu-option"><span>📊</span><span><strong>Smart Insights</strong><small>View structured information and monitoring insights.</small></span></button><button type="button" onClick={() => openLoginPanel('School-Level Tracking')} className="home-menu-option"><span>🏫</span><span><strong>School-Level Tracking</strong><small>Track important school-level operational information.</small></span></button><button type="button" onClick={() => { setHomeMenuOpen(false); navigate('/explore'); }} className="home-menu-option border-t border-slate-200"><span>→</span><span><strong>Explore PoshanFlow</strong><small>Discover how PoshanFlow connects records, monitoring and action.</small></span></button></div>}</div><span className="hidden border-l border-white/15 px-4 py-2 text-xs text-white/80 sm:inline">About PM POSHAN</span><span className="hidden border-l border-white/15 px-4 py-2 text-xs text-white/80 sm:inline">Help & Support</span><span className="ml-auto flex items-center gap-1 py-2 text-xs text-white/90"><CircleHelp size={14} /> Need assistance?</span></div></nav></header>
    <main className="relative isolate overflow-hidden"><div className="login-slide-track absolute inset-y-0 left-0 flex w-[250%]">{[...slides, ...slides].map((slide, index) => <img key={`${slide}-${index}`} src={slide} alt="" className="h-full w-[10%] shrink-0 object-cover" />)}</div><div className="login-tricolor-wash absolute inset-0" /><div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:min-h-[calc(100vh-142px)] lg:grid-cols-[1.2fr_0.8fr] lg:py-16"><section className="max-w-xl lg:pl-8"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white"><UtensilsCrossed size={24} /></div><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#f9bc62]">हर बच्चे के स्वस्थ भविष्य की ओर</p><h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">पोषण से सशक्त बचपन।<br />ज्ञान से उज्ज्वल भारत।</h2><p className="mt-5 max-w-lg text-sm leading-6 text-white/85">भारत के नन्हे बच्चों और युवा पीढ़ी को हर दिन पौष्टिक भोजन, बेहतर स्वास्थ्य और सीखने का अवसर देना हमारा संकल्प है।</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><div className="flex gap-3 border-l-4 border-[#f28c28] bg-white/95 p-4 shadow-sm"><ShieldCheck className="shrink-0 text-[#285843]" size={21} /><div><p className="text-xs font-bold text-slate-700">सुरक्षित और भरोसेमंद</p><p className="mt-1 text-[11px] leading-4 text-slate-500">हर विद्यालय और हर भोजन की पारदर्शी निगरानी।</p></div></div><div className="flex gap-3 border-l-4 border-[#16834a] bg-white/95 p-4 shadow-sm"><Building2 className="shrink-0 text-[#285843]" size={21} /><div><p className="text-xs font-bold text-slate-700">हर स्कूल, हर बच्चा</p><p className="mt-1 text-[11px] leading-4 text-slate-500">समय पर जानकारी से बेहतर देखभाल और विकास।</p></div></div></div></section>
      <section id="login-panel" tabIndex="-1" className="w-full border border-white/40 bg-white shadow-[0_8px_24px_rgba(23,51,40,0.35)] outline-none"><div className="border-b-4 border-[#e29a36] px-6 pb-4 pt-6"><img src="/poshanflow-logo.png" alt="PoshanFlow logo" className="mx-auto mb-4 h-16 w-16 rounded-full object-contain" /><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Authorised user login</p><h2 className="mt-1 text-xl font-bold text-[#285843]">Sign in to पोषणFlow</h2></div><div className="p-6">{loginContext && <p role="status" className="mb-4 border-l-4 border-[#e29a36] bg-[#fff7e8] px-3 py-2 text-xs font-medium text-[#6a4513]">Sign in to access {loginContext}.</p>}<div className="mb-6 grid grid-cols-2 border border-slate-300 bg-slate-50 p-1"><button type="button" onClick={() => setPortal('teacher')} className={`px-2 py-2 text-xs font-bold transition ${teacher ? 'bg-[#285843] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>School Login</button><button type="button" onClick={() => setPortal('inspector')} className={`px-2 py-2 text-xs font-bold transition ${!teacher ? 'bg-[#285843] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>District Login</button></div><p className="mb-5 text-xs text-slate-600">{teacher ? 'For Headmasters and authorised school staff.' : 'For District Inspectors and authorised officers.'}</p><form onSubmit={signIn} className="space-y-4"><div><label className="mb-1.5 block text-xs font-bold text-slate-700">Registered Email Address</label><div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" required autoComplete="email" placeholder="name@school.edu.in" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#285843] focus:ring-2 focus:ring-[#285843]/15" /></div></div><div><label className="mb-1.5 block text-xs font-bold text-slate-700">Password</label><div className="relative"><LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#285843] focus:ring-2 focus:ring-[#285843]/15" /></div></div><div className="flex justify-end"><button type="button" disabled={resetting} onClick={reset} className="text-xs font-semibold text-[#285843] underline underline-offset-2 hover:text-[#b9701c] disabled:opacity-60">{resetting ? 'Sending reset email...' : 'Forgot password?'}</button></div>{(loginError || localMessage) && <div role="alert" className="border-l-4 border-rose-500 bg-rose-50 px-3 py-2 text-xs text-rose-700">{loginError || localMessage}</div>}{resetMessage && <div className="border-l-4 border-[#16834a] bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{resetMessage}</div>}<button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 bg-[#285843] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1c4232] disabled:cursor-not-allowed">{loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <>Sign In <ChevronRight size={17} /></>}</button></form><p className="mt-5 border-t border-slate-200 pt-4 text-[11px] leading-4 text-slate-500">Teacher accounts are created and assigned by the District Inspector. Please contact your district office for account assistance.</p></div></section></div></main>
    <footer className="border-t border-white/10 bg-[#1d3328]/90 text-white/70"><div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-2.5 text-[10px] sm:flex-row sm:items-center sm:justify-between sm:px-6"><span>© {new Date().getFullYear()} PM POSHAN. Government of India.</span><span>Designed for demonstration use only | Team Aryabytes | Privacy Policy | Accessibility Statement</span></div></footer>
  </div>;
}
