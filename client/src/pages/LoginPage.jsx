import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  MailCheck,
  ShieldCheck,
  Zap,
  FileSpreadsheet,
  Cpu,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  ShieldAlert
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

const LoginPage = () => {
  const {
    login,
    verify2FA,
    resend2FA,
    loginWithGoogle,
    isAuthenticated,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [infoMessage, setInfoMessage] = useState(location.state?.message || '');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // 2FA state
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [mfaData, setMfaData] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const redirectPath = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, redirectPath]);

  useEffect(() => {
    if (location.state?.message) {
      setInfoMessage(location.state.message);
    }
  }, [location.state?.message]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validate = () => {
    const newErrors = {};
    const emailTrimmed = email.trim();

    if (!emailTrimmed) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
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
      const result = await login(email.trim(), password);
      if (result?.mfaRequired && result?.data?.tempToken) {
        setMfaData({
          tempToken: result.data.tempToken,
          email: result.data.email || email.trim(),
          devCode: result.data.devCode
        });
        setIsMfaStep(true);
        return;
      }
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.message === 'Network Error' || !err.response
          ? 'Cannot connect to backend server. Please make sure the backend is running on http://localhost:5000.'
          : 'Failed to sign in. Please verify your email and password.');
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setApiError('');

    const trimmed = otpCode.trim();
    if (!trimmed || trimmed.length !== 6) {
      setErrors({ otp: 'Please enter the complete 6-digit code' });
      return;
    }

    setMfaSubmitting(true);
    try {
      await verify2FA(mfaData.tempToken, trimmed);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setApiError(
        err.response?.data?.message || 'Incorrect or expired verification code. Please try again.'
      );
    } finally {
      setMfaSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resending) return;
    setApiError('');
    setResending(true);
    try {
      const res = await resend2FA(mfaData.tempToken);
      if (res?.data?.devCode) {
        setMfaData((prev) => ({ ...prev, devCode: res.data.devCode }));
      }
      setResendCooldown(30);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setApiError('');
    setGoogleLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      await loginWithGoogle(googleUser);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Google sign-in failed. Please try again.';
      setApiError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden w-full flex flex-col justify-center relative px-4 sm:px-6 lg:px-8 text-text select-none">
      <AuthBackground />

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
        <div className="lg:col-span-7 xl:col-span-7 space-y-4 lg:space-y-5 pr-0 lg:pr-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/25 text-xs sm:text-sm font-semibold tracking-wide mb-2.5 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Machine Learning Security</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[40px] xl:text-[44px] font-extrabold text-text tracking-tight leading-[1.14]">
              Email Spam &amp;{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                Threat Detection
              </span>{' '}
              System
            </h1>
            <p className="mt-2 text-sm sm:text-base lg:text-[16px] text-text-muted leading-relaxed max-w-2xl">
              An NLP classification system powered by Scikit-Learn. Classify incoming emails in real
              time, inspect confidence probability metrics, and secure accounts with two-factor
              authentication.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 lg:gap-4 pt-1">
            <div className="auth-feature-card group p-4 lg:p-4.5 rounded-2xl border border-border bg-surface/70 backdrop-blur-sm shadow-xs hover:shadow-md transition-all duration-200 space-y-1.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-200 shadow-2xs">
                <Zap className="w-4.5 h-4.5 sm:w-5 sm:h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm sm:text-[15px] font-bold text-text">Real-Time Detection</h3>
              <p className="text-xs sm:text-[13px] text-text-muted leading-relaxed">
                Classify individual emails with spam probability scores, confidence levels, and
                keyword flags.
              </p>
            </div>

            <div className="auth-feature-card group p-4 lg:p-4.5 rounded-2xl border border-border bg-surface/70 backdrop-blur-sm shadow-xs hover:shadow-md transition-all duration-200 space-y-1.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-200 shadow-2xs">
                <FileSpreadsheet className="w-4.5 h-4.5 sm:w-5 sm:h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm sm:text-[15px] font-bold text-text">Batch CSV Processing</h3>
              <p className="text-xs sm:text-[13px] text-text-muted leading-relaxed">
                Upload CSV datasets up to 1,000 emails with preview, pagination, confusion matrix,
                and export.
              </p>
            </div>

            <div className="auth-feature-card group p-4 lg:p-4.5 rounded-2xl border border-border bg-surface/70 backdrop-blur-sm shadow-xs hover:shadow-md transition-all duration-200 space-y-1.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-200 shadow-2xs">
                <Cpu className="w-4.5 h-4.5 sm:w-5 sm:h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm sm:text-[15px] font-bold text-text">
                TF-IDF &amp; Naive Bayes
              </h3>
              <p className="text-xs sm:text-[13px] text-text-muted leading-relaxed">
                Multinomial Naive Bayes model trained with TF-IDF vectorization and version control.
              </p>
            </div>

            <div className="auth-feature-card group p-4 lg:p-4.5 rounded-2xl border border-border bg-surface/70 backdrop-blur-sm shadow-xs hover:shadow-md transition-all duration-200 space-y-1.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-200 shadow-2xs">
                <BarChart3 className="w-4.5 h-4.5 sm:w-5 sm:h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm sm:text-[15px] font-bold text-text">Prediction History</h3>
              <p className="text-xs sm:text-[13px] text-text-muted leading-relaxed">
                Audit logs with suspicious keyword breakdown and daily classification trends.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2.5 border-t border-border/70 text-xs sm:text-sm text-text-muted font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              <span>Scikit-Learn &amp; FastAPI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              <span>Two-Step Verification</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              <span>Role-Based Access</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-5 w-full max-w-[450px] xl:max-w-[470px] mx-auto">
          <div className="flex flex-col items-center text-center mb-3 sm:mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-primary/25 ring-4 ring-primary/10 mb-2 transition-transform hover:scale-105 duration-200">
              <MailCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
              Welcome Back
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">Sign in to your account</p>
          </div>

          <Card className="auth-card auth-card-shadow border border-border bg-surface/92 backdrop-blur-md rounded-2xl">
            <Card.Content className="pt-6 pb-6 px-6 sm:px-7">
              {infoMessage && (
                <div
                  role="status"
                  className="mb-4 p-3 bg-warning-soft border border-warning/30 text-warning text-xs sm:text-sm rounded-md flex items-start justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span>{infoMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInfoMessage('')}
                    className="text-warning hover:opacity-75 font-bold px-1"
                    aria-label="Dismiss message"
                  >
                    &times;
                  </button>
                </div>
              )}

              {apiError && (
                <div
                  role="alert"
                  className="mb-4 p-3 bg-danger-soft border border-danger/30 text-danger text-sm rounded-md"
                >
                  {apiError}
                </div>
              )}

              {isMfaStep ? (
                <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
                  <div className="space-y-1 mb-2 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary mx-auto flex items-center justify-center mb-2.5 ring-4 ring-primary/10 shadow-2xs">
                      <KeyRound className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-text">Two-Step Verification</h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Enter the 6-digit verification code sent to your Gmail inbox (
                      <span className="font-semibold text-text">{mfaData?.email}</span>).
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="otp-input"
                      className="block text-xs font-medium text-text mb-2 text-center"
                    >
                      6-Digit Security Code
                    </label>
                    <input
                      id="otp-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtpCode(val);
                        if (errors.otp) setErrors((prev) => ({ ...prev, otp: '' }));
                      }}
                      placeholder="••••••"
                      className="w-full h-12 text-center text-2xl font-mono tracking-[0.45em] font-bold rounded-lg bg-surface text-text border border-border hover:border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none shadow-2xs"
                      autoFocus
                    />
                    {errors.otp && (
                      <p className="text-xs text-danger text-center mt-1.5">{errors.otp}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-2"
                    loading={mfaSubmitting}
                    disabled={mfaSubmitting || otpCode.length !== 6}
                  >
                    Verify & Continue
                  </Button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMfaStep(false);
                        setOtpCode('');
                        setApiError('');
                      }}
                      className="inline-flex items-center gap-1.5 text-text-muted hover:text-text transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to sign in</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0 || resending}
                      className="text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline"
                    >
                      {resending
                        ? 'Resending...'
                        : resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : 'Resend code'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <Input
                      id="login-email"
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

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="login-password" className="text-sm font-medium text-text">
                          Password <span className="text-danger ml-0.5">*</span>
                        </label>
                        <Link
                          to="/forgot-password"
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
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
                    </div>

                    <Button
                      type="submit"
                      className="w-full mt-2.5 h-11 text-base font-semibold shadow-xs hover:shadow-md transition-all"
                      loading={submitting}
                      disabled={submitting || googleLoading}
                    >
                      Sign In
                    </Button>
                  </form>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-surface px-2.5 text-text-muted font-medium">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={submitting || googleLoading}
                    className="w-full inline-flex items-center justify-center gap-3 px-4 h-11 rounded-lg border border-border/90 bg-surface hover:bg-surface-muted/80 hover:border-border text-text font-medium text-sm sm:text-base transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
                  >
                    <GoogleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>
                      {googleLoading ? 'Signing in with Google...' : 'Sign in with Google'}
                    </span>
                  </button>
                </>
              )}
            </Card.Content>

            <Card.Footer className="justify-center text-sm text-text-muted border-t border-border py-4">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="ml-1 text-primary hover:underline font-medium">
                Sign up
              </Link>
            </Card.Footer>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
