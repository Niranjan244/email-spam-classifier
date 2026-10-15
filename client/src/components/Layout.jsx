import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Mail,
  Files,
  History,
  BarChart3,
  Shield,
  Database,
  Cpu,
  Users,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  MailCheck,
  Inbox,
  User
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useTheme from '../hooks/useTheme';
import useSessionTimeout from '../hooks/useSessionTimeout';
import SessionTimeoutModal from './SessionTimeoutModal';
import { getAvatarUrl } from '../services/api';

const userNavItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Classify', to: '/classify', icon: Mail },
  { label: 'Bulk Classification', to: '/classify/bulk', icon: Files },
  { label: 'Gmail Scanner', to: '/gmail-scanner', icon: Inbox },
  { label: 'History', to: '/history', icon: History },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'Profile', to: '/profile', icon: User }
];

const adminNavItems = [
  { label: 'Overview', to: '/admin', icon: Shield, end: true },
  { label: 'Datasets', to: '/admin/datasets', icon: Database },
  { label: 'Model Training', to: '/admin/models', icon: Cpu },
  { label: 'Users', to: '/admin/users', icon: Users }
];

const getPageTitle = (pathname) => {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/gmail-scanner')) return 'Live Gmail Scanner';
  if (pathname.startsWith('/classify/bulk')) return 'Bulk Classification';
  if (pathname.startsWith('/classify')) return 'Classify Email';
  if (pathname.startsWith('/history')) return 'Classification History';
  if (pathname.startsWith('/analytics')) return 'Analytics';
  if (pathname.startsWith('/profile')) return 'Profile';
  if (pathname === '/admin') return 'Administration Overview';
  if (pathname.startsWith('/admin/datasets')) return 'Training Datasets';
  if (pathname.startsWith('/admin/models')) return 'Model Training';
  if (pathname.startsWith('/admin/users')) return 'User Management';
  return 'Email Spam Classifier';
};

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Layout = () => {
  const { user, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const avatarUrl = getAvatarUrl(user?.avatar);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const handleTimeoutLogout = useCallback(() => {
    logout();
    navigate('/login', {
      replace: true,
      state: {
        message: 'You have been logged out due to 10 minutes of inactivity. Please sign in again.'
      }
    });
  }, [logout, navigate]);

  const { isWarningOpen, secondsRemaining, stayLoggedIn, logOutNow } = useSessionTimeout({
    idleTimeMs: 9 * 60 * 1000,
    countdownSeconds: 60,
    onTimeout: handleTimeoutLogout,
    enabled: Boolean(user)
  });

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  // Close user dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const navLinkClass = ({ isActive }) =>
    `relative flex items-center gap-3 px-3 h-10 text-sm font-medium rounded-lg transition-colors duration-150 ${
      isActive
        ? 'bg-primary-soft text-primary font-semibold'
        : 'text-text-muted hover:bg-surface-muted hover:text-text'
    }`;

  const renderNavContent = (onItemClick) => (
    <div className="flex flex-col h-full bg-surface">
      {/* Product Name with Small Icon Chip at the top */}
      <div className="h-16 flex items-center px-4 border-b border-border gap-2.5 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center flex-shrink-0 shadow-sm">
          <MailCheck className="w-4 h-4" aria-hidden="true" />
        </div>
        <span className="font-semibold text-text text-sm tracking-tight truncate">
          Spam Classifier
        </span>
      </div>

      {/* Navigation items */}
      <div className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        <nav className="space-y-1">
          {userNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onItemClick}
                className={navLinkClass}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute inset-y-1.5 left-0 w-[3px] bg-primary rounded-r"
                        aria-hidden="true"
                      />
                    )}
                    <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {isAdmin && (
          <div>
            <p className="pt-4 pb-2 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
              Administration
            </p>
            <nav className="space-y-1">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onItemClick}
                    className={navLinkClass}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            className="absolute inset-y-1.5 left-0 w-[3px] bg-primary rounded-r"
                            aria-hidden="true"
                          />
                        )}
                        <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-text">
      {/* Desktop Fixed 240px Sidebar: surface background, 1px right border */}
      <aside className="hidden md:flex md:w-[240px] md:flex-col md:fixed md:inset-y-0 bg-surface border-r border-border z-30">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden transition-opacity duration-200"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <aside
          role="dialog"
          aria-modal="true"
          className="fixed inset-y-0 left-0 z-50 w-[240px] bg-surface border-r border-border shadow-xl flex flex-col md:hidden animate-in slide-in-from-left duration-200"
        >
          <div className="absolute top-4 right-3 z-10">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {renderNavContent(() => setMobileOpen(false))}
        </aside>
      )}

      {/* Content wrapper with left offset for fixed 240px sidebar on desktop */}
      <div className="flex flex-col flex-1 md:pl-[240px] min-h-screen">
        {/* Top Header: surface background, 1px bottom border */}
        <header className="h-16 bg-surface border-b border-border sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
          {/* Left: Mobile Menu button and Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="md:hidden p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors flex-shrink-0"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <h2 className="text-base sm:text-lg font-semibold text-text tracking-tight truncate">
              {pageTitle}
            </h2>
          </div>

          {/* Right: Theme Toggle and User Menu */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:text-text hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-warning" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-text-muted" aria-hidden="true" />
              )}
            </button>

            {/* User Menu with Circular Avatar, Name, and Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="User menu"
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <div className="w-8 h-8 rounded-full bg-primary-soft text-primary font-semibold text-xs flex items-center justify-center border border-primary/20 flex-shrink-0 overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(user?.name)
                  )}
                </div>
                <span className="text-sm font-medium text-text hidden sm:block max-w-[130px] truncate">
                  {user?.name || 'User'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-text-muted transition-transform duration-150 hidden sm:block ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {/* User Dropdown with Soft Shadow and Border */}
              {userMenuOpen && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  className="absolute right-0 top-full mt-2 w-56 rounded-lg bg-surface border border-border shadow-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-text truncate">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-text-muted truncate mt-0.5">{user?.email}</p>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-surface-muted text-text-muted border border-border">
                        Role: {user?.role || 'user'}
                      </span>
                    </div>
                  </div>

                  <div className="my-1 border-t border-border" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text hover:bg-surface-muted focus:outline-none focus:bg-surface-muted transition-colors rounded-md text-left"
                  >
                    <User className="w-4 h-4 text-text-muted" aria-hidden="true" />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-danger hover:bg-danger-soft focus:outline-none focus:bg-danger-soft transition-colors rounded-md text-left"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area: 24px padding */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      <SessionTimeoutModal
        isOpen={isWarningOpen}
        secondsRemaining={secondsRemaining}
        onStayLoggedIn={stayLoggedIn}
        onLogout={logOutNow}
      />
    </div>
  );
};

export default Layout;
