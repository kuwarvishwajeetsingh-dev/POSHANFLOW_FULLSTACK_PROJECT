import React from 'react';
import { ArrowLeft, AtSign, ExternalLink, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const linkedInUrl = 'https://www.linkedin.com/in/kunwar07singh?utm_source=share_via&utm_content=profile&utm_medium=member_android';
const instagramUrl = 'https://www.instagram.com/kunwar_singhrajput07_iitm/';
const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=svg&data=${encodeURIComponent(instagramUrl)}`;

// The supplied portraits belong here in this same left-to-right order.
const team = [
  ['KV', 'Kuwar Vishwajeet Singh', 'Core Developer Chair', '/team-members/kuwar-vishwajeet-singh.jpg.jpeg'],
  ['YK', 'Yash Kumar Singh', 'Frontend Developer Chair', '/team-members/yash-kumar-singh.jpg.jpeg'],
  ['AP', 'Aditya Pandey', 'Documentation & Research Chair', '/team-members/aditya-pandey.jpg.jpeg'],
];
const collaborationSlides = [
  '/team-collaboration/collaboration-01.jpeg',
  '/team-collaboration/collaboration-02.jpeg',
  '/team-collaboration/collaboration-03.jpeg',
];

export default function DeveloperPortfolio() {
  const navigate = useNavigate();

  return (
    <main className="relative isolate min-h-screen overflow-hidden text-slate-800">
      <div className="fixed inset-0 z-0 overflow-hidden bg-[#173b2b]" aria-hidden="true">
        {collaborationSlides.map((slide, index) => (
          <div key={slide} className="team-collaboration-slide absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${slide})`, animationDelay: `${-index * 6}s` }} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-br from-[#10281d]/76 via-[#3e342b]/70 to-[#173b2b]/76" />
      </div>
      <div className="relative z-10">
      <header className="border-b border-[#bfd4c5] bg-[#dce9df]/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#285843]"><ArrowLeft size={16} /> PoshanFlow</button>
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#173b2b] text-xs font-black text-[#f7bd6a]">A</span><span className="text-sm font-extrabold tracking-tight text-[#173b2b]">Aryabytes</span></div>
          <a href={linkedInUrl} target="_blank" rel="noreferrer" className="hidden rounded-lg bg-[#173b2b] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#285843] sm:inline-flex">LinkedIn <ExternalLink className="ml-1.5" size={13} /></a>
        </div>
      </header>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#173b2b] via-[#20523d] to-[#0e251c] px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#f7bd6a]">Digital product team</p><h1 className="mt-5 text-5xl font-black leading-[.93] tracking-tight sm:text-7xl">Designing<br /><span className="text-[#f7bd6a]">useful systems.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-white/75">Aryabytes contributes practical technology, thoughtful interfaces, and focused research to PoshanFlow.</p></div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/50">Core development</p><p className="mt-4 text-2xl font-extrabold">Kuwar Vishwajeet Singh</p><p className="mt-1 text-sm font-semibold text-[#f7bd6a]">Core Developer Chair</p><div className="my-6 h-px bg-white/15" /><p className="text-sm leading-6 text-white/70">Building clearer, more dependable digital experiences for everyday school operations.</p></div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-9"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#b9701c]">Profile</p><h2 className="mt-3 text-3xl font-black tracking-tight text-[#173b2b]">Kuwar Vishwajeet Singh</h2><p className="mt-2 text-sm font-semibold text-slate-500">Core Developer Chair · Aryabytes</p><p className="mt-6 max-w-xl leading-7 text-slate-600">Focused on helping PoshanFlow turn school-level records into a more organised and understandable digital experience—keeping attention on the project, its users, and the team behind it.</p><a href={linkedInUrl} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#285843] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#173b2b]"><Link size={17} /> View LinkedIn profile <ExternalLink size={15} /></a></div>
          <a href={instagramUrl} target="_blank" rel="noreferrer" className="group rounded-3xl bg-[#f1e9e3] p-7 text-center shadow-sm ring-1 ring-[#eadbce] sm:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#a45d1d]">Social profile</p><div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3 shadow-lg transition group-hover:-translate-y-1"><img src={qr} alt="Instagram QR code" className="h-40 w-40 sm:h-44 sm:w-44" /></div><p className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#6a4513]"><AtSign size={16} /> kunwar_singhrajput07_iitm</p><p className="mt-1 text-xs text-[#845d37]">Scan or click to visit Instagram</p></a>
        </section>
        <section className="mt-10">
          <div className="flex items-end justify-between px-1"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#f7bd6a]">People behind the work</p><h2 className="mt-2 text-2xl font-black text-white">Team Aryabytes</h2></div><span className="text-xs font-bold text-white/70">03 MEMBERS</span></div>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {team.map(([initials, name, role, image], index) => (
              <article key={name} className="rounded-2xl border border-white/30 bg-[#f2e9df]/92 p-4 shadow-xl shadow-[#10281d]/25 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
                <div className={`relative grid h-[152px] w-[114px] place-items-center overflow-hidden rounded-2xl text-xs font-black ${index === 0 ? 'bg-[#285843] text-white' : 'bg-[#e5f0e8] text-[#285843]'}`}>
                  <span>{initials}</span>
                  <img src={image} alt={`${name} portrait`} className="absolute inset-0 h-full w-full object-cover object-top" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                </div>
                <h3 className="mt-4 font-bold text-slate-800">{name}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{role}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      </div>
      <style>{`
        @keyframes team-collaboration-slide {
          0%, 27% { opacity: 0.42; transform: scale(1.02); }
          33%, 94% { opacity: 0; transform: scale(1); }
          100% { opacity: 0.42; transform: scale(1.02); }
        }
        .team-collaboration-slide { animation: team-collaboration-slide 18s ease-in-out infinite; }
        main [class*="bg-white"] { background-color: rgb(229 240 232 / 92%); }
        main article { background-color: rgb(242 233 223 / 92%); border-color: rgb(202 218 207); }
        @media (prefers-reduced-motion: reduce) {
          .team-collaboration-slide { animation: none; opacity: 0; }
          .team-collaboration-slide:first-child { opacity: 0.42; }
        }
      `}</style>
    </main>
  );
}
