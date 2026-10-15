import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Inbox } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Table from '../components/Table';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/dashboard');
      if (response.data?.success && response.data?.data) {
        setData(response.data.data);
      } else {
        setError(response.data?.message || 'Failed to load dashboard data.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to connect to the server. Please check your backend connection.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>

        <Card>
          <Card.Content className="space-y-4 pt-6">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text tracking-tight">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">Overview of email classification activity.</p>
        </div>

        <ErrorState
          title="Unable to load dashboard"
          message={error}
          retryText="Try again"
          onRetry={fetchDashboard}
        />
      </div>
    );
  }

  const totals = data?.totals || { classified: 0, spam: 0, ham: 0 };
  const recentClassifications = data?.recentClassifications || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text tracking-tight">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">
          Overview of your email classification activity and recent analyses.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Classified"
          value={totals.classified.toLocaleString()}
          subtext="Total lifetime analyzed emails"
        />
        <StatCard
          label="Spam Detected"
          variant="spam"
          value={totals.spam.toLocaleString()}
          subtext="Flagged as suspicious or spam"
        />
        <StatCard
          label="Not Spam (Ham)"
          variant="notSpam"
          value={totals.ham.toLocaleString()}
          subtext="Verified legitimate messages"
        />
      </div>

      <div className="p-4 sm:p-5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary-soft/40 via-surface to-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] hover:border-primary/40 transition-all duration-200">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0 shadow-xs ring-1 ring-primary/20">
            <Inbox className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text tracking-tight">Live Gmail Scanner</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Connect your real Google inbox on demand to scan recent emails for spam & threats.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/gmail-scanner')}
          className="whitespace-nowrap sm:self-center self-start"
        >
          Open Gmail Scanner
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
        </Button>
      </div>

      <Card>
        <Card.Header className="flex flex-row items-center justify-between pb-3">
          <div>
            <Card.Title>Recent Classifications</Card.Title>
            <Card.Description>The 5 most recent analyzed email messages.</Card.Description>
          </div>

          {recentClassifications.length > 0 && (
            <Link
              to="/history"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>View full history</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          )}
        </Card.Header>

        <Card.Content className="p-0">
          {recentClassifications.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Mail}
                title="No recent classifications"
                description="Analyze your first email to see recent results here."
                actionLabel="Classify Email"
                onAction={() => navigate('/classify')}
              />
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head className="w-12 text-center">#</Table.Head>
                  <Table.Head>Email Preview</Table.Head>
                  <Table.Head className="w-32">Classification</Table.Head>
                  <Table.Head align="right" className="w-36">
                    Spam Probability
                  </Table.Head>
                  <Table.Head className="w-44">Date</Table.Head>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {recentClassifications.map((item, index) => {
                  const spamProb = Number(item.spamProbability ?? 0);
                  const dateStr = item.createdAt
                    ? new Date(item.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A';

                  return (
                    <Table.Row key={item._id || item.id || index}>
                      <Table.Cell className="text-center text-text-muted text-xs">
                        {index + 1}
                      </Table.Cell>

                      <Table.Cell>
                        <div
                          className="max-w-md lg:max-w-xl truncate text-sm text-text"
                          title={item.emailText}
                        >
                          {item.emailText}
                        </div>
                      </Table.Cell>

                      <Table.Cell>
                        <Badge
                          variant={item.label === 'spam' ? 'spam' : 'notSpam'}
                          className="text-xs font-semibold uppercase tracking-wider"
                        >
                          {item.label === 'spam' ? 'Spam' : 'Not Spam'}
                        </Badge>
                      </Table.Cell>

                      <Table.Cell align="right" isNumber>
                        {(spamProb * 100).toFixed(1)}%
                      </Table.Cell>

                      <Table.Cell className="text-text-muted text-xs whitespace-nowrap">
                        {dateStr}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          )}
        </Card.Content>

        {recentClassifications.length > 0 && (
          <Card.Footer className="border-t border-border p-4 justify-between text-xs text-text-muted">
            <span>Showing up to 5 recent analyses</span>
            <Button variant="outline" size="sm" onClick={() => navigate('/classify')}>
              Classify New Email
            </Button>
          </Card.Footer>
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;
