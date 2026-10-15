import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MailCheck,
  ShieldCheck,
  Zap,
  FileSpreadsheet,
  Cpu,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import AuthBackground from '../components/AuthBackground';
import { signInWithGoogle } from '../services/firebase';

const GoogleIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.26C.46 8.19 0 10.03 0 12c0 1.97.46 3.81 1.26 5.41l4.02-3.13z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
    />
  </svg>
);

const RegisterPage = () => {
  const { register, loginWithGoogle, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const validate = () => {
    const newErrors = {};
    const nameTrimmed = name.trim();
    const emailTrimmed = email.trim();

    if (!nameTrimmed) {
      newErrors.name = 'Full name is required';
    }

    if (!emailTrimmed) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.message === 'Network Error' || !err.response
          ? 'Cannot connect to backend server. Please make sure the backend is running on http://localhost:5000.'
          : 'Registration failed. Please check your information and try again.');
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setApiError('');
    setGoogleLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      await loginWithGoogle(googleUser);
      navigate('/', { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Google sign-in failed. Please try again.';
      setApiError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-text flex flex-col justify-center relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8 select-none">
      <AuthBackground />

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-6">
        <div className="lg:col-span-7 space-y-6 sm:space-y-8 pr-0 lg:pr-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary border border-primary/20 text-xs font-semibold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Email Security Platform</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text tracking-tight leading-tight">
              Email Spam & Threat Detection
            </h1>
            <p className="mt-4 text-base sm:text-lg text-text-muted leading-relaxed">
              Safeguard your inbox with a machine learning classification pipeline. Detect phishing
              and spam instantly with deep keyword indicator analysis and high-confidence metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="auth-feature-card p-4 rounded-xl border border-border bg-surface/70 backdrop-blur-sm shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                <Zap className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-text">Instant Classification</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Real-time email inference with spam probability scoring and suspicious keyword
                tagging.
              </p>
            </div>

            <div className="auth-feature-card p-4 rounded-xl border border-border bg-surface/70 backdrop-blur-sm shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-text">Bulk Batch Processing</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Upload CSV datasets up to 1,000 emails with preview, pagination, and one-click
                results export.
              </p>
            </div>

            <div className="auth-feature-card p-4 rounded-xl border border-border bg-surface/70 backdrop-blur-sm shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                <Cpu className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-text">ML Pipeline & Retraining</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Train on custom datasets, evaluate confusion matrices, and hot-swap active model
                versions.
              </p>
            </div>

            <div className="auth-feature-card p-4 rounded-xl border border-border bg-surface/70 backdrop-blur-sm shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                <BarChart3 className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-text">Explainable Analytics</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Visual breakdown of top suspicious terms, daily volume trends, and full
                classification history.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-border/60 text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              <span>Scikit-Learn ML Service</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              <span>Role-Based Access Control</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              <span>Dark & Light Themes</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 w-full max-w-[420px] mx-auto">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shadow-sm mb-3">
              <MailCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-text">Spam Classifier</h2>
            <p className="text-sm text-text-muted mt-1">Create a new account</p>
          </div>

          <Card className="auth-card auth-card-shadow border border-border bg-surface/92 backdrop-blur-md rounded-2xl">
            <Card.Content className="pt-6">
              {apiError && (
                <div
                  role="alert"
                  className="mb-4 p-3 bg-danger-soft border border-danger/30 text-danger text-sm rounded-md"
                >
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <Input
                  id="register-name"
                  type="text"
                  label="Full Name"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  error={errors.name}
                  required
                />

                <Input
                  id="register-email"
                  type="email"
                  label="Email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  error={errors.email}
                  required
                />

                <Input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  error={errors.password}
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-text-muted hover:text-text transition-colors p-1 focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                <Input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm Password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  error={errors.confirmPassword}
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="text-text-muted hover:text-text transition-colors p-1 focus:outline-none"
                      aria-label={
                        showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                      }
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                <Button
                  type="submit"
                  className="w-full mt-2"
                  loading={submitting}
                  disabled={submitting || googleLoading}
                >
                  Create Account
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface px-2 text-text-muted font-medium">
                    Or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting || googleLoading}
                className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-text font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                <GoogleIcon className="w-4 h-4 flex-shrink-0" />
                <span>{googleLoading ? 'Signing in with Google...' : 'Sign up with Google'}</span>
              </button>
            </Card.Content>

            <Card.Footer className="justify-center text-sm text-text-muted border-t border-border py-4">
              Already have an account?{' '}
              <Link to="/login" className="ml-1 text-primary hover:underline font-medium">
                Sign in
              </Link>
            </Card.Footer>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
