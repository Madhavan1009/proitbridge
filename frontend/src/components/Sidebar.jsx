import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo.jsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '◆' },
  { to: '/reports', label: 'Reports History', icon: '▤' },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-slate-200">
      <div className="px-5 pt-6 pb-5 border-b border-slate-800">
        <Link to="/" aria-label="PROITBRIDGE home">
          <Logo className="w-full h-auto" />
        </Link>
        <p className="text-[11px] text-slate-400 mt-2 tracking-wide">Automated Client Intelligence</p>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition',
                isActive
                  ? 'bg-brand/15 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              ].join(' ')
            }
          >
            <span className="text-brand-light">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-slate-800 text-xs text-slate-500">
        <div>v0.1 · Demo build</div>
        <div className="mt-1">LLM: Groq · Llama 3.3 70B</div>
      </div>
    </aside>
  );
}
