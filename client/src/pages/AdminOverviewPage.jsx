import { useState, useEffect, useCallback } from 'react';
import { Cpu } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';

const AdminOverviewPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/admin/stats');
      if (response.data?.success && response.data?.data) {
        setStats(response.data.data);
      } else {
        setError(response.data?.message || 'Failed to retrieve admin stats.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to connect to the server. Please verify your connection.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-60 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>

        <Card>
          <Card.Content className="space-y-4 pt-6">
            <Skeleton className="h-6 w-1/4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text tracking-tight">
            Administration Overview
          </h1>
          <p className="text-sm text-text-muted mt-1">
            System metrics and machine learning model performance.
          </p>
        </div>

        <ErrorState
          title="Unable to load administration overview"
          message={error}
          retryText="Try again"
          onRetry={fetchStats}
        />
      </div>
    );
  }

  const {
    totalUsers = 0,
    totalClassifications = 0,
    spamRatio = 0,
    activeModel = null
  } = stats || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text tracking-tight">Administration Overview</h1>
        <p className="text-sm text-text-muted mt-1">
          High-level system metrics, usage volume, and active machine learning model performance.
        </p>
      </div>

      {/* System Usage Stats */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">System Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard
            label="Total Registered Users"
            value={totalUsers.toLocaleString()}
            subtext="Registered accounts in system"
          />
          <StatCard
            label="Total Classifications"
            value={totalClassifications.toLocaleString()}
            subtext="Combined single and bulk analyses"
          />
          <StatCard
            label="Overall Spam Ratio"
            variant="spam"
            value={`${(spamRatio * 100).toFixed(1)}%`}
            subtext="Percentage of emails flagged as spam"
          />
        </div>
      </section>

      {/* Active Model Performance Section */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">Active Machine Learning Model</h2>

        {!activeModel ? (
          <EmptyState
            icon={Cpu}
            title="No model currently active"
            description="There is currently no active machine learning model serving predictions. Train and activate a model to enable classification."
          />
        ) : (
          <Card>
            <Card.Header className="flex flex-row items-center justify-between pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <Card.Title>Model Version: {activeModel.version}</Card.Title>
                  <Badge variant="notSpam" className="text-xs uppercase">
                    Active
                  </Badge>
                </div>
                <Card.Description className="mt-1">
                  Algorithm:{' '}
                  <span className="capitalize font-medium text-text">
                    {(activeModel.algorithm || 'logistic_regression').replace('_', ' ')}
                  </span>
                  {activeModel.dataset?.name && (
                    <span className="ml-2">&bull; Dataset: {activeModel.dataset.name}</span>
                  )}
                </Card.Description>
              </div>
            </Card.Header>

            <Card.Content>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  label="Accuracy"
                  value={`${(Number(activeModel.accuracy || 0) * 100).toFixed(1)}%`}
                  subtext="Correct predictions"
                />
                <StatCard
                  label="Precision"
                  value={`${(Number(activeModel.precision || 0) * 100).toFixed(1)}%`}
                  subtext="Positive prediction value"
                />
                <StatCard
                  label="Recall"
                  value={`${(Number(activeModel.recall || 0) * 100).toFixed(1)}%`}
                  subtext="True positive detection"
                />
                <StatCard
                  label="F1 Score"
                  value={`${(Number(activeModel.f1 || 0) * 100).toFixed(1)}%`}
                  subtext="Harmonic mean"
                />
              </div>
            </Card.Content>
          </Card>
        )}
      </section>
    </div>
  );
};

export default AdminOverviewPage;
