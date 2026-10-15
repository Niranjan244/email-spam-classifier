import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MailCheck,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email address is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: trimmed });
      if (response.data?.success && response.data?.data) {
        setSuccessData(response.data.data);
      } else {
        setError(response.data?.message || 'Failed to process request');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to process your request. Please check your email.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (successData?.resetUrl) {
      navigator.clipboard.writeText(successData.resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background ambient radial glow */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-primary-soft blur-3xl opacity-40 -z-10"
        aria-hidden="true"
      />

      <div className="w-full max-w-[440px] space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shadow-sm mb-3">
            <MailCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Spam Classifier</h1>
          <p className="text-sm text-text-muted mt-1">Account Password Recovery</p>
        </div>

        <Card>
          <Card.Content className="pt-6">
            {!successData ? (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1 mb-2">
                  <h2 className="text-base font-semibold text-text">Forgot your password?</h2>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Enter the email address associated with your account and we&apos;ll generate a
                    secure password reset link.
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="p-3 bg-danger-soft border border-danger/30 text-danger text-sm rounded-lg"
                  >
                    {error}
                  </div>
                )}

                <Input
                  id="forgot-email"
                  type="email"
                  label="Registered Email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  required
                />

                <Button type="submit" className="w-full mt-2" loading={loading} disabled={loading}>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Generate Reset Link
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-success-soft text-success mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text">Reset Link Ready</h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    A password reset link has been prepared for{' '}
                    <span className="font-semibold text-text">{email}</span>. Valid for 60 minutes.
                  </p>
                </div>

                {/* Local Dev Direct Action Box */}
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary-soft/30 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs text-primary font-semibold">
                    <span>Direct Reset Link</span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1 text-[11px] hover:underline"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-success" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] font-mono break-all text-text-muted bg-surface/80 p-2 rounded border border-border">
                    {successData.resetUrl}
                  </div>
                </div>

                <Button
                  onClick={() => navigate(`/reset-password/${successData.resetToken}`)}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Proceed to Reset Password
                </Button>
              </div>
            )}
          </Card.Content>

          <Card.Footer className="justify-center text-xs text-text-muted border-t border-border py-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-text-muted hover:text-text font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
