import { useState, useMemo } from 'react';
import api from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Toast from '../components/Toast';

const MAX_CHARACTERS = 20000;

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const ClassifyPage = () => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');
  const [result, setResult] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const charCount = text.length;

  const keyIndicators = useMemo(() => {
    if (!result) return [];
    const combined = [...(result.suspiciousTerms || []), ...(result.suspiciousPhrases || [])];
    return Array.from(new Set(combined.filter(Boolean)));
  }, [result]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_CHARACTERS) {
      setText(val);
      if (validationError) setValidationError('');
    }
  };

  const handleClear = () => {
    setText('');
    setValidationError('');
    setApiError('');
    setResult(null);
  };

  const handleClassify = async (e) => {
    e.preventDefault();
    setApiError('');
    setToastMessage('');

    const trimmed = text.trim();
    if (!trimmed) {
      setValidationError('Email text is required and cannot be empty');
      return;
    }

    if (text.length > MAX_CHARACTERS) {
      setValidationError(
        `Email text exceeds the maximum allowed length of ${MAX_CHARACTERS.toLocaleString()} characters`
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/classify', { text: trimmed });
      if (response.data?.success && response.data?.data) {
        setResult(response.data.data);
        setToastMessage('Classification complete');
      } else {
        setApiError(response.data?.message || 'Unable to classify email text.');
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.response?.status === 503
          ? 'ML service is currently unavailable. Please try again later.'
          : 'An unexpected error occurred while classifying the email.');
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderHighlightedText = (content, indicators) => {
    if (!content) return null;
    if (!indicators || indicators.length === 0) {
      return <span>{content}</span>;
    }

    const sortedIndicators = [...indicators].sort((a, b) => b.length - a.length);
    const pattern = `(${sortedIndicators.map(escapeRegExp).join('|')})`;
    const regex = new RegExp(pattern, 'gi');
    const parts = content.split(regex);

    const indicatorLookup = new Set(sortedIndicators.map((s) => s.toLowerCase()));

    return parts.map((part, index) => {
      if (indicatorLookup.has(part.toLowerCase())) {
        return (
          <mark
            key={index}
            className="bg-warning-soft text-warning px-1 py-0.5 rounded font-medium border border-warning/20"
          >
            {part}
          </mark>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <Toast
            type="success"
            title="Success"
            message={toastMessage}
            duration={3000}
            onClose={() => setToastMessage('')}
          />
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-text tracking-tight">Classify Email</h1>
        <p className="text-sm text-text-muted mt-1">
          Analyze email text in real time to detect spam and suspicious indicators.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <Card.Header>
            <Card.Title>Email Input</Card.Title>
            <Card.Description>Enter or paste the email body to classify.</Card.Description>
          </Card.Header>

          <Card.Content>
            {apiError && (
              <div
                role="alert"
                className="mb-4 p-3 bg-danger-soft border border-danger/30 text-danger text-sm rounded-md"
              >
                {apiError}
              </div>
            )}

            <form onSubmit={handleClassify} className="space-y-4">
              <div>
                <label
                  htmlFor="email-input-text"
                  className="block text-sm font-medium text-text mb-1.5"
                >
                  Email Content
                </label>
                <textarea
                  id="email-input-text"
                  rows={10}
                  value={text}
                  onChange={handleTextChange}
                  placeholder="Paste or type the email message text here..."
                  aria-invalid={Boolean(validationError)}
                  aria-describedby={validationError ? 'email-text-error' : undefined}
                  className={`w-full rounded-lg border p-3.5 text-sm bg-surface text-text placeholder:text-text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150 resize-y min-h-[220px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                    validationError
                      ? 'border-danger focus:ring-danger/20 focus:border-danger'
                      : 'border-border/80 hover:border-border'
                  }`}
                />

                <div className="flex justify-between items-center text-xs mt-1.5">
                  {validationError ? (
                    <span id="email-text-error" className="text-danger">
                      {validationError}
                    </span>
                  ) : (
                    <span className="text-text-muted">Standard text or message body</span>
                  )}
                  <span
                    className={`tabular-nums ${
                      charCount >= MAX_CHARACTERS ? 'text-danger font-semibold' : 'text-text-muted'
                    }`}
                  >
                    {charCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" loading={loading} disabled={loading || !text.trim()}>
                  Classify
                </Button>
                {text.length > 0 && (
                  <Button type="button" variant="outline" onClick={handleClear} disabled={loading}>
                    Clear
                  </Button>
                )}
              </div>
            </form>
          </Card.Content>
        </Card>

        {result && (
          <Card>
            <Card.Header className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <Card.Title>Classification Result</Card.Title>
                <Card.Description>Model prediction outcome</Card.Description>
              </div>
              <Badge
                variant={result.label === 'spam' ? 'spam' : 'notSpam'}
                className="text-sm px-3.5 py-1 uppercase tracking-wide font-semibold shadow-sm"
              >
                {result.label === 'spam' ? 'Spam' : 'Not Spam'}
              </Badge>
            </Card.Header>

            <Card.Content className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Spam probability</span>
                  <span className="font-semibold text-text tabular-nums">
                    {(Number(result.spamProbability || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden p-[1px]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      result.label === 'spam'
                        ? 'bg-gradient-to-r from-danger to-danger/90'
                        : 'bg-gradient-to-r from-success to-success/90'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, Number(result.spamProbability || 0) * 100)
                      )}%`
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Confidence</span>
                  <span className="font-semibold text-text tabular-nums">
                    {(Number(result.confidence || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-primary to-primary-hover"
                    style={{
                      width: `${Math.min(100, Math.max(0, Number(result.confidence || 0) * 100))}%`
                    }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <h3 className="text-sm font-semibold text-text mb-2">Key indicators</h3>
                {keyIndicators.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {keyIndicators.map((indicator, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning-soft text-warning border border-warning/25 shadow-xs tracking-wide"
                      >
                        {indicator}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">
                    No suspicious terms or phrases detected.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-border">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Highlighted Email Content
                </h3>
                <div className="p-3 bg-surface-muted border border-border rounded-md text-sm text-text whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                  {renderHighlightedText(result.emailText, keyIndicators)}
                </div>
              </div>
            </Card.Content>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClassifyPage;
