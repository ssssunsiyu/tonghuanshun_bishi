import { NavLink, Outlet } from 'react-router-dom';
import { TrendingUp, Save, Settings, Shield } from 'lucide-react';

const Layout = () => {
  const navItems = [
    { to: '/', label: '智能选股', icon: TrendingUp, end: true },
    { to: '/strategies', label: '我的策略', icon: Save },
    { to: '/config', label: '数据配置', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <aside className="flex w-56 flex-col border-r border-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold tracking-wide">选股解释器</span>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
          <p>股票池：沪深300成分</p>
          <p className="mt-1">数据来源：扶摇</p>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
