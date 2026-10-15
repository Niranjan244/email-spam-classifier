import { useState, useMemo } from 'react';
import {
  Inbox,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  LogOut,
  Search,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Mail,
  Calendar,
  User,
  Tag
} from 'lucide-react';
import api from '../services/api';
import { connectGmail } from '../services/firebase';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Table from '../components/Table';
import Modal from '../components/Modal';

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

const GmailScannerPage = () => {
  const [connectedUser, setConnectedUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanLimit, setScanLimit] = useState(15);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);

  const handleConnect = async () => {
    setError('');
    setConnecting(true);
    try {
      const data = await connectGmail();
      setConnectedUser({
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL
      });
      setAccessToken(data.accessToken);
    } catch (err) {
      setError(
        err.message ||
          'Failed to connect to Google Gmail. Please ensure popups are allowed and consent was granted.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setConnectedUser(null);
    setAccessToken(null);
    setResults(null);
    setError('');
    setSelectedEmail(null);
  };

  const handleScan = async () => {
    if (!accessToken) return;
    setError('');
    setScanning(true);
    try {
      const response = await api.post('/classify/gmail', {
        accessToken,
        maxResults: scanLimit
      });
      if (response.data?.success && response.data?.data) {
        setResults(response.data.data);
      } else {
        setError(response.data?.message || 'Failed to scan Gmail inbox.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to scan Gmail messages. Please check your connection.';
      setError(msg);
    } finally {
      setScanning(false);
    }
  };

  const filteredMessages = useMemo(() => {
    if (!results?.results) return [];
    let list = results.results;

    if (filter === 'spam') {
      list = list.filter((m) => m.isSpam);
    } else if (filter === 'ham') {
      list = list.filter((m) => !m.isSpam);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.subject?.toLowerCase().includes(term) ||
          m.from?.toLowerCase().includes(term) ||
          m.snippet?.toLowerCase().includes(term)
      );
    }

    return list;
  }, [results, filter, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-soft text-primary text-xs font-semibold uppercase tracking-wider mb-2">
            <Inbox className="w-3.5 h-3.5" aria-hidden="true" />
            <span>On-Demand Inbox Protection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
            Live Gmail Scanner
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Connect your real Gmail account on demand to scan incoming emails for spam and phishing
            threats.
          </p>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary-soft/40 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs sm:text-sm text-text">
          <span className="font-semibold text-primary">Privacy Guarantee: </span>
          We only request read-only access (<code>gmail.readonly</code>) to evaluate email text. Our
          service will never alter, send, or delete any emails from your account.
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-danger/30 bg-danger-soft text-danger flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm flex-1">
            <p className="font-medium">{error}</p>
            {error.includes('Gmail API') && (
              <p className="text-xs mt-1 text-danger/80">
                Tip: In the Google Cloud Console for this Firebase project, search for &quot;Gmail
                API&quot; and click &quot;Enable&quot;.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Connection & Control Card */}
      <Card>
        <Card.Content className="pt-6">
          {!connectedUser ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-surface-muted border border-border flex items-center justify-center flex-shrink-0 shadow-sm">
                  <GoogleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text">Connect Your Gmail Account</h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                    Authorize real-time inbox scanning on demand without altering your main
                    credentials.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-text font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 shadow-sm whitespace-nowrap"
              >
                <GoogleIcon className="w-4 h-4" />
                <span>{connecting ? 'Connecting...' : 'Connect to Gmail'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connected Status Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
                <div className="flex items-center gap-3">
                  {connectedUser.photoURL ? (
                    <img
                      src={connectedUser.photoURL}
                      alt={connectedUser.displayName || 'Google User'}
                      className="w-10 h-10 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center">
                      {connectedUser.email?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text text-sm sm:text-base">
                        {connectedUser.displayName || 'Google User'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-soft text-success text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        Connected
                      </span>
                    </div>
                    <span className="text-xs text-text-muted block mt-0.5">
                      {connectedUser.email}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="self-start sm:self-auto text-text-muted hover:text-danger"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  Disconnect
                </Button>
              </div>

              {/* Scan Trigger Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label htmlFor="scan-limit" className="text-xs sm:text-sm font-medium text-text">
                    Number of recent emails to scan:
                  </label>
                  <select
                    id="scan-limit"
                    value={scanLimit}
                    onChange={(e) => setScanLimit(Number(e.target.value))}
                    disabled={scanning}
                    className="h-9 px-3 rounded-lg border border-border bg-surface text-text text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value={10}>10 emails</option>
                    <option value={15}>15 emails</option>
                    <option value={20}>20 emails</option>
                    <option value={30}>30 emails</option>
                  </select>
                </div>

                <Button
                  onClick={handleScan}
                  loading={scanning}
                  disabled={scanning}
                  className="sm:w-auto w-full"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  {scanning ? 'Scanning Inbox...' : `Scan Last ${scanLimit} Emails`}
                </Button>
              </div>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Scan Results Section */}
      {results && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <Card.Content className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted font-medium uppercase">Total Scanned</p>
                  <p className="text-2xl font-bold text-text mt-1">{results.total}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-muted">
                  <Mail className="w-5 h-5" aria-hidden="true" />
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted font-medium uppercase">Spam Threats</p>
                  <p className="text-2xl font-bold text-danger mt-1">{results.spamCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-danger-soft text-danger flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" aria-hidden="true" />
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted font-medium uppercase">Safe Emails</p>
                  <p className="text-2xl font-bold text-success mt-1">{results.hamCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-success-soft text-success flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted font-medium uppercase">Spam Ratio</p>
                  <p className="text-2xl font-bold text-text mt-1">
                    {results.total > 0
                      ? `${Math.round((results.spamCount / results.total) * 100)}%`
                      : '0%'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Table Container Card */}
          <Card>
            <Card.Header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Card.Title>Scanned Inbox Messages</Card.Title>
                <Badge variant="neutral">{filteredMessages.length}</Badge>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter by sender or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 pl-9 pr-3 rounded-lg border border-border bg-surface text-text text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-full sm:w-60"
                  />
                </div>

                <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      filter === 'all'
                        ? 'bg-primary-soft text-primary font-semibold'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    All ({results.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('spam')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      filter === 'spam'
                        ? 'bg-danger-soft text-danger font-semibold'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    Spam ({results.spamCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('ham')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      filter === 'ham'
                        ? 'bg-success-soft text-success font-semibold'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    Safe ({results.hamCount})
                  </button>
                </div>
              </div>
            </Card.Header>

            <Card.Content className="p-0">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-sm">
                  No emails match the selected filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head>Verdict</Table.Head>
                        <Table.Head>Sender</Table.Head>
                        <Table.Head>Subject</Table.Head>
                        <Table.Head>Date</Table.Head>
                        <Table.Head>Detected Keywords</Table.Head>
                        <Table.Head className="text-right">Action</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {filteredMessages.map((email) => (
                        <Table.Row
                          key={email.id}
                          className={email.isSpam ? 'bg-danger-soft/10' : ''}
                        >
                          <Table.Cell>
                            <Badge variant={email.isSpam ? 'danger' : 'success'}>
                              {email.isSpam ? 'SPAM' : 'HAM'} ({Math.round(email.confidence * 100)}
                              %)
                            </Badge>
                          </Table.Cell>
                          <Table.Cell className="font-medium max-w-[200px] truncate text-text">
                            {email.from}
                          </Table.Cell>
                          <Table.Cell className="max-w-[280px]">
                            <span className="font-medium text-text block truncate">
                              {email.subject}
                            </span>
                            <span className="text-xs text-text-muted block truncate mt-0.5">
                              {email.snippet}
                            </span>
                          </Table.Cell>
                          <Table.Cell className="text-xs text-text-muted whitespace-nowrap">
                            {email.date ? new Date(email.date).toLocaleDateString() : 'Recent'}
                          </Table.Cell>
                          <Table.Cell>
                            {email.suspiciousTerms?.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {email.suspiciousTerms.slice(0, 3).map((term) => (
                                  <span
                                    key={term}
                                    className="px-1.5 py-0.5 rounded text-[10px] bg-danger-soft text-danger border border-danger/20 font-medium"
                                  >
                                    {term}
                                  </span>
                                ))}
                                {email.suspiciousTerms.length > 3 && (
                                  <span className="text-[10px] text-text-muted self-center">
                                    +{email.suspiciousTerms.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-text-muted">None</span>
                            )}
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEmail(email)}
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                              Details
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      )}

      {/* Email Detail Modal */}
      {selectedEmail && (
        <Modal
          isOpen={Boolean(selectedEmail)}
          onClose={() => setSelectedEmail(null)}
          title="Gmail Message Analysis"
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="p-4 rounded-xl border border-border bg-surface-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={selectedEmail.isSpam ? 'danger' : 'success'}>
                  {selectedEmail.isSpam ? 'SPAM' : 'HAM'} Verdict
                </Badge>
                <span className="text-xs text-text-muted">
                  Spam Probability: {Math.round(selectedEmail.spamProbability * 100)}%
                </span>
              </div>
              <h3 className="text-base font-semibold text-text">{selectedEmail.subject}</h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted pt-1">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>{selectedEmail.from}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Suspicious Keywords */}
            {selectedEmail.suspiciousTerms?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-danger" />
                  Trigger Keywords Detected:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEmail.suspiciousTerms.map((term) => (
                    <span
                      key={term}
                      className="px-2 py-0.5 rounded-md text-xs bg-danger-soft text-danger border border-danger/30 font-medium"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Email snippet */}
            <div>
              <p className="text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                Message Excerpt / Snippet:
              </p>
              <div className="p-3 rounded-lg border border-border bg-surface text-xs text-text font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {selectedEmail.snippet || '(No snippet available)'}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default GmailScannerPage;
