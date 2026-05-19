import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

const AGENTS = [
  { step: 1, name: 'Data Analyzer', desc: 'Crunches raw channel metrics. Computes ROI, flags anomalies.' },
  { step: 2, name: 'Insight Agent', desc: 'Turns numbers into plain-English business insights.' },
  { step: 3, name: 'Report Writer', desc: 'Drafts a structured executive report with sections and tables.' },
  { step: 4, name: 'Reviewer', desc: 'Verifies every number, sharpens recommendations, kills filler.' },
  { step: 5, name: 'Delivery Agent', desc: 'Generates a branded PDF and emails it to the client.' },
];

const CAPABILITIES = [
  {
    title: 'Live agent streaming',
    body: 'Watch all 5 AI agents work in real time via Server-Sent Events. No spinners, no guessing.',
    icon: '⟳',
  },
  {
    title: 'Chat with your data',
    body: 'Ask follow-up questions about any report. The assistant is grounded in the metrics — no hallucinated numbers.',
    icon: '✦',
  },
  {
    title: 'PDF + email delivery',
    body: 'Branded PDF generated automatically and emailed to the client contact. Zero manual handoff.',
    icon: '✉',
  },
];

const STEPS = [
  { n: '01', title: 'Pick a client', body: 'Select from your client list — each one already wired with their marketing channel data.' },
  { n: '02', title: 'Click Generate', body: 'The 5-agent pipeline kicks off. You watch each agent complete in sequence.' },
  { n: '03', title: 'Review the output', body: 'Highlights, scorecard, recommendations — all surfaced as a clean report on screen.' },
  { n: '04', title: 'Ship to the client', body: 'PDF is auto-generated, email is auto-sent. Or download and review first. Your choice.' },
];

function Navbar() {
  return (
    <nav className="absolute top-0 inset-x-0 z-20">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
        <Link to="/" aria-label="PROITBRIDGE home" className="block w-44">
          <Logo className="w-full h-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <a
            href="#how"
            className="hidden sm:inline-block text-sm text-cyan-100/80 hover:text-white transition"
          >
            How it works
          </a>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 bg-brand-light hover:bg-white text-navy-950 font-semibold text-sm px-4 py-2 rounded-md transition shadow-md shadow-brand/30"
          >
            Open Dashboard →
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header className="bg-navy-gradient relative overflow-hidden">
      <Navbar />

      {/* Decorative globe watermarks */}
      <div className="absolute -right-24 top-10 opacity-10 pointer-events-none">
        <Logo variant="mark" className="w-[520px] h-[520px]" />
      </div>
      <div className="absolute -left-16 -bottom-24 opacity-[0.06] pointer-events-none">
        <Logo variant="mark" className="w-80 h-80" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 md:px-10 pt-36 pb-28 md:pt-44 md:pb-36">
        <div className="max-w-3xl animate-subtle-rise">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-brand-light">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-light animate-soft-pulse" />
            AI · Marketing · Automation
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-[1.05] mt-4">
            Client reports,<br />
            <span className="bg-gradient-to-r from-brand-light to-white bg-clip-text text-transparent">
              on autopilot.
            </span>
          </h1>
          <p className="text-white/75 text-base md:text-lg mt-5 max-w-2xl leading-relaxed">
            PROITBRIDGE lets agencies turn raw marketing metrics into branded monthly reports —
            written, reviewed, packaged as a PDF, and emailed to the client by five AI agents working together.
            Under a minute. Zero manual editing.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-brand-light hover:bg-white text-navy-950 font-semibold text-sm md:text-base px-5 py-3 rounded-md transition shadow-lg shadow-brand-light/30"
            >
              See the live demo →
            </Link>
            <a
              href="#agents"
              className="inline-flex items-center gap-2 border border-white/25 hover:border-white/60 text-white font-semibold text-sm md:text-base px-5 py-3 rounded-md transition"
            >
              How it works
            </a>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3 mt-10 text-xs md:text-sm text-white/55">
            <span><b className="text-white">5</b> AI agents</span>
            <span><b className="text-white">&lt; 60s</b> per report</span>
            <span><b className="text-white">100%</b> grounded in your data</span>
            <span><b className="text-white">PDF + email</b> auto-delivered</span>
          </div>
        </div>
      </div>

      {/* bottom wave separator */}
      <svg className="absolute bottom-0 inset-x-0 text-slate-50" viewBox="0 0 1440 60" preserveAspectRatio="none" height="60">
        <path fill="currentColor" d="M0,32 C240,60 480,4 720,20 C960,36 1200,60 1440,28 L1440,60 L0,60 Z" />
      </svg>
    </header>
  );
}

function AgentPipeline() {
  return (
    <section id="agents" className="relative bg-slate-50 py-20 md:py-24">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.22em] text-brand font-semibold">The Pipeline</p>
          <h2 className="text-3xl md:text-4xl font-bold text-navy-950 mt-2">Five agents. One report.</h2>
          <p className="text-slate-600 mt-3">
            Each agent has a single, focused job. They hand off to each other automatically — and you watch every step.
          </p>
        </div>

        <ol className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-2 relative">
          {/* connector line on md+ */}
          <div className="hidden md:block absolute top-7 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
          {AGENTS.map((a, i) => (
            <li
              key={a.step}
              className="relative bg-white border border-slate-200 rounded-xl p-4 hover:border-brand/50 hover:shadow-md hover:-translate-y-0.5 transition animate-subtle-rise"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-gradient text-white text-sm font-bold shadow-md shadow-brand/30">
                {a.step}
              </div>
              <h3 className="font-semibold text-navy-950 mt-3">{a.name}</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{a.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Capabilities() {
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.22em] text-brand font-semibold">What's inside</p>
          <h2 className="text-3xl md:text-4xl font-bold text-navy-950 mt-2">Built for serious demos.</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {CAPABILITIES.map((c, i) => (
            <div
              key={c.title}
              className="group relative bg-slate-50 border border-slate-200 hover:border-brand/40 rounded-xl p-6 transition animate-subtle-rise"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-brand-gradient text-white text-xl shadow-md shadow-brand/30">
                {c.icon}
              </div>
              <h3 className="font-semibold text-navy-950 mt-4 text-lg">{c.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="bg-slate-50 py-20 md:py-24">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.22em] text-brand font-semibold">How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-navy-950 mt-2">From click to inbox.</h2>
          <p className="text-slate-600 mt-3">Four steps. Most of it happens while you sip your coffee.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="bg-white border border-slate-200 rounded-xl p-6 animate-subtle-rise"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="text-4xl font-extrabold bg-gradient-to-br from-brand to-brand-light bg-clip-text text-transparent leading-none">
                {s.n}
              </div>
              <h3 className="font-semibold text-navy-950 mt-3">{s.title}</h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-navy-gradient relative overflow-hidden py-20 md:py-24">
      <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none">
        <Logo variant="mark" className="w-[420px] h-[420px]" />
      </div>
      <div className="relative max-w-3xl mx-auto px-6 md:px-10 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
          Skip the spreadsheet. Send the report.
        </h2>
        <p className="text-white/70 mt-3 max-w-xl mx-auto">
          Open the dashboard and generate a real report against sample clients in under a minute.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 mt-7 bg-brand-light hover:bg-white text-navy-950 font-semibold text-sm md:text-base px-6 py-3 rounded-md transition shadow-lg shadow-brand-light/30"
        >
          Try the demo →
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-navy-950 text-slate-300 py-10">
      <div className="max-w-6xl mx-auto px-6 md:px-10 flex flex-col md:flex-row justify-between gap-6 items-center">
        <div className="w-44">
          <Logo className="w-full h-auto" />
        </div>
        <div className="text-xs text-slate-400 flex flex-wrap gap-x-5 gap-y-2 items-center">
          <span>Built with Groq · React · FastAPI</span>
          <span className="hidden md:inline text-slate-700">·</span>
          <Link to="/dashboard" className="hover:text-white transition">Dashboard</Link>
          <Link to="/reports" className="hover:text-white transition">Reports History</Link>
        </div>
        <div className="text-[11px] text-slate-500">© {new Date().getFullYear()} PROITBRIDGE</div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <AgentPipeline />
      <Capabilities />
      <HowItWorks />
      <FinalCTA />
      <Footer />
    </div>
  );
}
