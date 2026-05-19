import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

/** Wraps every "app" route (Dashboard, Client, Reports) with the sidebar. */
export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
