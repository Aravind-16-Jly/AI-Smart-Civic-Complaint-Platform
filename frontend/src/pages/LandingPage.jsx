import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Landmark,
  MapPinned,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Users,
} from 'lucide-react';

const stats = [
  { label: 'Complaints processed', value: '24.8K+' },
  { label: 'Avg. resolution time', value: '3.4 days' },
  { label: 'Municipal coverage', value: '84 cities' },
];

const steps = [
  'Upload an image + description',
  'AI identifies issue and severity',
  'Auto-route to correct department',
  'Track progress in real time',
];

const features = [
  { icon: BrainCircuit, title: 'AI complaint intelligence', text: 'Vision and text analysis produce a professional report and department recommendation.' },
  { icon: MapPinned, title: 'Live city awareness', text: 'Interactive mapping offers geospatial visibility for civic issues and authority action.' },
  { icon: BarChart3, title: 'Analytics at a glance', text: 'Track trends, city health scores, department performance, and citizen impact.' },
  { icon: ShieldCheck, title: 'Trusted routing', text: 'Severity tagging and routing logic reduce administrative friction and improve response quality.' },
];

const testimonials = [
  {
    name: 'Asha Raman',
    role: 'Citizen Advocate',
    quote: 'The experience feels instantly premium. Filing an issue takes seconds and the city response loop is finally transparent.',
  },
  {
    name: 'Sanjay Patel',
    role: 'Operations Lead',
    quote: 'The analytics and routing layer helped our team triage road safety reports faster than ever before.',
  },
];

const faqs = [
  { question: 'How does AI score the urgency of a case?', answer: 'The platform reads the complaint language, image evidence, and location context to infer issue type, severity, and routing department.' },
  { question: 'What role-based flows are supported?', answer: 'Citizen workflows focus on report submission and tracking, while authority workflows focus on queues, updates, and analytics.' },
  { question: 'Can images be uploaded directly on mobile?', answer: 'Yes. The complaint flow supports drag and drop, gallery access, and camera capture for fast submissions from any device.' },
];

const featIcons = [Users, TimerReset, Landmark, Sparkles];

const particlePositions = [
  { left: '8%', top: '18%', delay: '0s' },
  { left: '28%', top: '58%', delay: '1.4s' },
  { left: '51%', top: '32%', delay: '2.1s' },
  { left: '74%', top: '18%', delay: '0.7s' },
  { left: '84%', top: '64%', delay: '2.8s' },
  { left: '18%', top: '84%', delay: '1.8s' },
];

export default function LandingPage() {
  return (
    <div className="hero-scene min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 hero-grid opacity-30" />
      <div className="hero-network absolute inset-0 opacity-80" />
      {particlePositions.map((particle, index) => (
        <span
          key={index}
          className="particle"
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
          }}
        />
      ))}
      <div className="ambient-orb left-[6%] top-[8%] h-40 w-40 bg-cyan-400/25" />
      <div className="ambient-orb right-[8%] top-[18%] h-52 w-52 bg-fuchsia-500/20" />
      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-6">
        <header className="glass sticky top-4 z-50 flex items-center justify-between rounded-full px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3 text-lg font-semibold">
            <div className="rounded-full bg-brand-500/20 p-2"><Sparkles size={18} /></div>
            CivicMind AI
          </div>
          <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
            <a href="#features" className="nav-pill rounded-full px-3 py-1.5">Features</a>
            <a href="#how-it-works" className="nav-pill rounded-full px-3 py-1.5">How it Works</a>
            <a href="#stats" className="nav-pill rounded-full px-3 py-1.5">Stats</a>
            <a href="#contact" className="nav-pill rounded-full px-3 py-1.5">Contact</a>
          </nav>
          <a href="/auth" className="button-primary ripple inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white">Launch Demo</a>
        </header>

        <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-100 shadow-[0_0_0_1px_rgba(96,165,250,0.14)]">
              <Sparkles size={14} />
              <span>AI Enabled</span>
            </div>
            <h1 className="max-w-2xl bg-gradient-to-r from-white via-sky-100 to-cyan-300 bg-clip-text text-5xl font-semibold leading-tight text-transparent md:text-6xl">
              AI-Powered Smart Civic Complaint Platform
            </h1>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium text-slate-200">
              <span className="rounded-full bg-white/5 px-3 py-1.5">Report</span>
              <span className="rounded-full bg-white/5 px-3 py-1.5">Analyze</span>
              <span className="rounded-full bg-white/5 px-3 py-1.5">Track</span>
              <span className="rounded-full bg-white/5 px-3 py-1.5">Resolve</span>
            </div>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Citizens report problems through images and text. AI interprets, prioritizes, and routes every complaint to the right authority with measurable city insights.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="/auth" className="button-primary ripple inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-glow">
                Get Started <ArrowRight size={16} />
              </a>
              <a href="/authority" className="button-secondary ripple inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-slate-100">
                Authority Preview
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-300">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Trusted by 120+ civic teams</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">4.9/5 response consistency</div>
            </div>
          </div>

          <div className="premium-card glass rounded-[28px] p-5">
            <div className="rounded-[22px] bg-slate-900/70 p-6">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Live AI Assessment</span>
                <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-300">Critical</span>
              </div>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl bg-slate-800/70 p-4">
                  <div className="text-xs text-slate-400">Issue Identified</div>
                  <div className="mt-1 text-xl font-semibold">Water leakage on arterial road</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-800/70 p-4"><div className="text-xs text-slate-400">Severity</div><div className="text-lg font-semibold">High</div></div>
                  <div className="rounded-2xl bg-slate-800/70 p-4"><div className="text-xs text-slate-400">Department</div><div className="text-lg font-semibold">Water Board</div></div>
                </div>
                <div className="rounded-2xl bg-slate-800/70 p-4 text-sm text-slate-300">
                  Professional report generated with suggested resolution window of 2 days and probable public risk rating of medium-high.
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                  <Sparkles size={16} /> AI classification confidence 94%
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat, index) => (
              <div key={stat.label} className="premium-card glass rounded-3xl p-6 text-center">
                <div className="mx-auto mb-4 inline-flex rounded-2xl bg-brand-500/10 p-3 text-brand-300">
                  {index === 0 ? <Users size={20} /> : index === 1 ? <TimerReset size={20} /> : <Landmark size={20} />}
                </div>
                <div className="text-3xl font-semibold text-brand-300">{stat.value}</div>
                <div className="mt-2 text-sm text-slate-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="py-12">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold">Why CivicMind AI</h2>
            <p className="mx-auto mt-2 max-w-2xl text-slate-300">A premium civic intelligence layer for routing urban issues, keeping citizens informed, and giving authorities a unified response command center.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="premium-card glass rounded-3xl p-6">
                <div className="mb-4 inline-flex rounded-2xl bg-brand-500/10 p-3 text-brand-300"><Icon size={20} /></div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-slate-300">{text}</p>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="skeleton-bar h-full rounded-full bg-gradient-to-r from-brand-400 to-cyan-300" style={{ width: `${70 + index * 6}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="py-14">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold">How it works</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className="premium-card glass rounded-3xl p-6">
                <div className="mb-4 text-sm text-brand-200">0{index + 1}</div>
                <p className="text-lg font-medium">{step}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-brand-300" />
                  Step {index + 1}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-14">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold">Trusted by citizens and cities</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {testimonials.map((item) => (
              <div key={item.name} className="premium-card glass rounded-3xl p-6">
                <div className="flex items-center gap-2 text-brand-200"><Sparkles size={16} /> {item.role}</div>
                <p className="mt-4 text-lg text-slate-100">“{item.quote}”</p>
                <div className="mt-4 text-sm text-slate-400">{item.name}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-14">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold">Frequently asked questions</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {faqs.map((item) => (
              <div key={item.question} className="premium-card glass rounded-3xl p-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-full bg-brand-500/10 p-2 text-brand-100"><CheckCircle2 size={15} /></div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.question}</h3>
                    <p className="mt-2 text-sm text-slate-300">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="py-14">
          <div className="premium-card glass rounded-[32px] p-8 md:p-10">
            <div className="grid gap-8 md:grid-cols-[1fr_0.9fr]">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-brand-200">Contact</div>
                <h2 className="mt-2 text-3xl font-semibold">Bring a premium civic ops layer to your city.</h2>
                <p className="mt-3 max-w-xl text-slate-300">Enable faster public issue resolution, more transparent communication, and measurable department performance across every neighborhood.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white/5 p-4"><div className="text-xs text-slate-400">Email</div><div className="mt-1 font-medium text-white">hello@civicmind.ai</div></div>
                <div className="rounded-2xl bg-white/5 p-4"><div className="text-xs text-slate-400">Response SLA</div><div className="mt-1 font-medium text-white">Under 3 hours</div></div>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-12 rounded-3xl border border-white/10 bg-slate-900/40 p-6 text-center text-sm text-slate-300">
          Built for next-generation urban governance and AI-assisted public service response.
        </footer>
      </div>
    </div>
  );
}
