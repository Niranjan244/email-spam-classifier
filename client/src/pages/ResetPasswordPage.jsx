import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MailCheck, ArrowLeft, CheckCircle2, LockKeyhole, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { token: urlToken } = useParams();

  const [token, setToken] = useState(urlToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (urlToken) {
      setToken(urlToken);
    }
  }, [urlToken]);

  const validate = () => {
    const errs = {};
    if (!token.trim()) {
      errs.token = 'Reset token is required';
    }
    if (!newPassword) {
      errs.newPassword = 'Password is required';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters long';
    }
    if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await api.post(`/auth/reset-password/${encodeURIComponent(token.trim())}`, {
        newPassword
      });

      if (response.data?.success) {
        setSuccess(true);
      } else {
        setApiError(response.data?.message || 'Failed to reset password');
      }
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          'Password reset token is invalid or has expired. Please request a new link.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background ambient glow */}
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
          <p className="text-sm text-text-muted mt-1">Set New Account Password</p>
        </div>

        <Card>
          <Card.Content className="pt-6">
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1 mb-2">
                  <h2 className="text-base font-semibold text-text">Create new password</h2>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Choose a strong password with at least 8 characters.
                  </p>
                </div>

                {apiError && (
                  <div
                    role="alert"
                    className="p-3 bg-danger-soft border border-danger/30 text-danger text-sm rounded-lg"
                  >
                    {apiError}
                  </div>
                )}

                {!urlToken && (
                  <Input
                    id="reset-token-input"
                    type="text"
                    label="Reset Token"
                    placeholder="Paste 64-character reset token"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      if (errors.token) setErrors((prev) => ({ ...prev, token: '' }));
                    }}
                    error={errors.token}
                    required
                  />
                )}

                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  label="New Password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
                  }}
                  error={errors.newPassword}
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
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm New Password"
                  placeholder="Re-enter your new password"
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
                  disabled={submitting}
                >
                  <LockKeyhole className="w-4 h-4 mr-2" />
                  Update Password
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center py-4">
                <div className="w-14 h-14 rounded-full bg-success-soft text-success mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text">Password Updated!</h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Your password has been successfully reset. You can now use your new password to
                    sign in.
                  </p>
                </div>

                <Button onClick={() => navigate('/login')} className="w-full mt-2">
                  Sign In with New Password
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

export default ResetPasswordPage;
