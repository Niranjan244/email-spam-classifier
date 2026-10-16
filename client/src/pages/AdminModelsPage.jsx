import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Play, Check, AlertCircle, RotateCcw, Search, X } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Table from '../components/Table';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Toast from '../components/Toast';
import useTheme from '../hooks/useTheme';

const AdminModelsPage = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartColors = useMemo(() => {
    return {
      accuracy: isDark ? '#3B82F6' : '#2563EB',
      precision: isDark ? '#F87171' : '#DC2626',
      f1: isDark ? '#4ADE80' : '#16A34A',
      grid: isDark ? '#243044' : '#E2E8F0',
      axis: isDark ? '#94A3B8' : '#64748B',
      tooltipBg: isDark ? '#111827' : '#FFFFFF',
      tooltipBorder: isDark ? '#243044' : '#E2E8F0',
      tooltipText: isDark ? '#F1F5F9' : '#0F172A'
    };
  }, [isDark]);

  const [datasets, setDatasets] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Two-step training state
  const [step, setStep] = useState(1);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [testSize, setTestSize] = useState('0.2');
  const [algorithm, setAlgorithm] = useState('logistic_regression');
  const [training, setTraining] = useState(false);
  const [trainError, setTrainError] = useState('');
  const [latestTrainedResult, setLatestTrainedResult] = useState(null);

  // Activation & Toast state
  const [activatingId, setActivatingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Table filters
  const [modelSearch, setModelSearch] = useState('');
  const [algorithmFilter, setAlgorithmFilter] = useState('all');

  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      if (algorithmFilter !== 'all' && m.algorithm !== algorithmFilter) return false;
      if (modelSearch.trim()) {
        const q = modelSearch.toLowerCase();
        const matchVer = m.version?.toLowerCase().includes(q);
        const matchAlgo = m.algorithm?.toLowerCase().includes(q);
        if (!matchVer && !matchAlgo) return false;
      }
      return true;
    });
  }, [models, modelSearch, algorithmFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [datasetsRes, modelsRes] = await Promise.all([
        api.get('/admin/datasets'),
        api.get('/admin/models')
      ]);

      if (datasetsRes.data?.success) {
        const dList = datasetsRes.data.data || [];
        setDatasets(dList);
        if (dList.length > 0 && !selectedDatasetId) {
          setSelectedDatasetId(dList[0]._id || dList[0].id);
        }
      }

      if (modelsRes.data?.success) {
        setModels(modelsRes.data.data || []);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to load model training data from the server.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDatasetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTrain = async (e) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      setTrainError('Please select a dataset for training.');
      return;
    }

    setTraining(true);
    setTrainError('');
    setToastMessage('');

    try {
      const response = await api.post('/admin/train', {
        datasetId: selectedDatasetId,
        testSize: parseFloat(testSize),
        algorithm
      });

      if (response.data?.success && response.data?.data) {
        setLatestTrainedResult(response.data.data);
        setStep(2);
        setToastMessage('Model training completed successfully');
        // Refresh models list
        const modelsRes = await api.get('/admin/models');
        if (modelsRes.data?.success) {
          setModels(modelsRes.data.data || []);
        }
      } else {
        setTrainError(response.data?.message || 'Model training failed.');
      }
    } catch (err) {
      setTrainError(
        err.response?.data?.message || 'Failed to train model. Ensure the ML service is running.'
      );
    } finally {
      setTraining(false);
    }
  };

  const handleActivate = async (modelId) => {
    setActivatingId(modelId);
    setToastMessage('');

    try {
      const response = await api.post(`/admin/models/${modelId}/activate`);
      if (response.data?.success) {
        setToastMessage('Model version activated successfully');
        // Refresh models list
        const modelsRes = await api.get('/admin/models');
        if (modelsRes.data?.success) {
          setModels(modelsRes.data.data || []);
        }
        if (
          latestTrainedResult &&
          (latestTrainedResult._id === modelId || latestTrainedResult.id === modelId)
        ) {
          setLatestTrainedResult((prev) => ({ ...prev, isActive: true }));
        }
      } else {
        setToastMessage(response.data?.message || 'Failed to activate model');
      }
    } catch (err) {
      setToastMessage(err.response?.data?.message || 'An error occurred during activation');
    } finally {
      setActivatingId(null);
    }
  };

  // Prepare chart comparison data (last 5 models)
  const comparisonData = useMemo(() => {
    if (!models || models.length === 0) return [];
    return [...models]
      .slice(0, 5)
      .reverse()
      .map((m) => {
        const shortVer = m.version && m.version.length > 8 ? m.version.slice(-8) : m.version || 'v';
        return {
          version: shortVer,
          fullVersion: m.version,
          Accuracy: Number(((m.accuracy || 0) * 100).toFixed(1)),
          Precision: Number(((m.precision || 0) * 100).toFixed(1)),
          F1: Number(((m.f1 || 0) * 100).toFixed(1))
        };
      });
  }, [models]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text tracking-tight">Model Training</h1>
          <p className="text-sm text-text-muted mt-1">
            Train, evaluate, and activate spam classification models.
          </p>
        </div>
        <ErrorState
          title="Unable to load model training section"
          message={error}
          retryText="Try again"
          onRetry={loadData}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <Toast
            type="info"
            title="Notification"
            message={toastMessage}
            duration={3000}
            onClose={() => setToastMessage('')}
          />
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text tracking-tight">Model Training</h1>
        <p className="text-sm text-text-muted mt-1">
          Train custom algorithms on benchmark datasets, inspect evaluation metrics, and activate
          versions.
        </p>
      </div>

      {/* Model Training & Evaluation */}
      <Card>
        <Card.Header className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>
                {step === 1 ? 'Configure & Train Model' : 'Training & Evaluation Results'}
              </Card.Title>
              <Card.Description>
                {step === 1
                  ? 'Select dataset parameters and classification algorithm'
                  : 'Evaluation metrics and confusion matrix for the trained model'}
              </Card.Description>
            </div>

            {/* View switcher */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  step === 1
                    ? 'bg-primary-soft text-primary border border-primary/20'
                    : 'text-text-muted hover:bg-surface-muted'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === 1
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border text-text-muted'
                  }`}
                >
                  1
                </span>
                <span>Configure</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (latestTrainedResult) setStep(2);
                }}
                disabled={!latestTrainedResult}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  step === 2
                    ? 'bg-primary-soft text-primary border border-primary/20'
                    : !latestTrainedResult
                      ? 'text-text-muted/50 cursor-not-allowed opacity-50'
                      : 'text-text-muted hover:bg-surface-muted'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === 2
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border text-text-muted'
                  }`}
                >
                  2
                </span>
                <span>Evaluation</span>
              </button>
            </div>
          </div>
        </Card.Header>

        <Card.Content className="pt-6">
          {trainError && (
            <div
              role="alert"
              className="mb-5 p-3 bg-danger-soft border border-danger/20 text-danger text-sm rounded-md flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{trainError}</span>
            </div>
          )}

          {/* Training Form */}
          {step === 1 && (
            <form onSubmit={handleTrain} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Dataset Selector */}
                <div>
                  <label
                    htmlFor="select-dataset"
                    className="block text-sm font-medium text-text mb-1.5"
                  >
                    Training Dataset <span className="text-danger">*</span>
                  </label>
                  {datasets.length === 0 ? (
                    <div className="text-xs text-danger p-2.5 bg-danger-soft border border-danger/20 rounded-md">
                      No datasets found. Please upload a dataset in the Datasets section first.
                    </div>
                  ) : (
                    <select
                      id="select-dataset"
                      value={selectedDatasetId}
                      onChange={(e) => setSelectedDatasetId(e.target.value)}
                      required
                      className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    >
                      {datasets.map((d) => (
                        <option key={d._id || d.id} value={d._id || d.id}>
                          {d.name} ({d.rowCount} rows)
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-text-muted mt-1">
                    Benchmark dataset containing labeled spam & ham text
                  </p>
                </div>

                {/* Test Size */}
                <div>
                  <label
                    htmlFor="select-test-size"
                    className="block text-sm font-medium text-text mb-1.5"
                  >
                    Test Split Size <span className="text-danger">*</span>
                  </label>
                  <select
                    id="select-test-size"
                    value={testSize}
                    onChange={(e) => setTestSize(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  >
                    <option value="0.1">10% Test / 90% Train</option>
                    <option value="0.2">20% Test / 80% Train (Standard)</option>
                    <option value="0.25">25% Test / 75% Train</option>
                    <option value="0.3">30% Test / 70% Train</option>
                  </select>
                  <p className="text-xs text-text-muted mt-1">
                    Portion reserved for independent evaluation
                  </p>
                </div>

                {/* Algorithm */}
                <div>
                  <label
                    htmlFor="select-algorithm"
                    className="block text-sm font-medium text-text mb-1.5"
                  >
                    Algorithm <span className="text-danger">*</span>
                  </label>
                  <select
                    id="select-algorithm"
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  >
                    <option value="logistic_regression">Logistic Regression (TF-IDF)</option>
                    <option value="naive_bayes">Multinomial Naive Bayes</option>
                  </select>
                  <p className="text-xs text-text-muted mt-1">
                    scikit-learn classification pipeline
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="submit"
                  loading={training}
                  disabled={training || datasets.length === 0}
                  className="flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                  <span>Train Model</span>
                </Button>
              </div>
            </form>
          )}

          {/* Evaluation Results */}
          {step === 2 && latestTrainedResult && (
            <div className="space-y-6">
              {/* Summary Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface-muted border border-border rounded-lg">
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Newly Trained Model
                  </p>
                  <h3 className="text-base font-semibold text-text mt-0.5">
                    Version: {latestTrainedResult.version}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Algorithm:{' '}
                    <span className="capitalize font-medium text-text">
                      {(latestTrainedResult.algorithm || algorithm).replace('_', ' ')}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Train Another</span>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={activatingId === (latestTrainedResult._id || latestTrainedResult.id)}
                    onClick={() =>
                      handleActivate(latestTrainedResult._id || latestTrainedResult.id)
                    }
                    disabled={
                      latestTrainedResult.isActive ||
                      activatingId === (latestTrainedResult._id || latestTrainedResult.id)
                    }
                    className="flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{latestTrainedResult.isActive ? 'Active' : 'Activate Model'}</span>
                  </Button>
                </div>
              </div>

              {/* 4 Metric Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  label="Accuracy"
                  value={`${(Number(latestTrainedResult.accuracy || 0) * 100).toFixed(1)}%`}
                  subtext="Overall accuracy"
                />
                <StatCard
                  label="Precision"
                  value={`${(Number(latestTrainedResult.precision || 0) * 100).toFixed(1)}%`}
                  subtext="Spam precision"
                />
                <StatCard
                  label="Recall"
                  value={`${(Number(latestTrainedResult.recall || 0) * 100).toFixed(1)}%`}
                  subtext="Spam detection rate"
                />
                <StatCard
                  label="F1 Score"
                  value={`${(Number(latestTrainedResult.f1 || 0) * 100).toFixed(1)}%`}
                  subtext="Harmonic balance"
                />
              </div>

              {/* Confusion Matrix: 2x2 grid with soft tinted cells, labeled Actual vs Predicted, counts large and centered */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-text">Confusion Matrix</h4>
                  <p className="text-xs text-text-muted">
                    Actual vs Predicted distribution on test split
                  </p>
                </div>
                {latestTrainedResult.confusionMatrix &&
                Array.isArray(latestTrainedResult.confusionMatrix) ? (
                  <div className="max-w-md">
                    {/* Column labels: Predicted */}
                    <div className="grid grid-cols-[100px_1fr_1fr] gap-2 items-center mb-1.5 text-center">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted text-left">
                        Actual \ Pred
                      </div>
                      <div className="text-xs font-semibold text-text">Predicted Ham</div>
                      <div className="text-xs font-semibold text-text">Predicted Spam</div>
                    </div>

                    {/* Row 1: Actual Ham */}
                    <div className="grid grid-cols-[100px_1fr_1fr] gap-2 items-stretch mb-2">
                      <div className="flex items-center text-xs font-semibold text-text-muted">
                        Actual Ham
                      </div>
                      {/* Correct: True Ham */}
                      <div className="p-4 rounded-xl bg-success-soft text-success border border-success/20 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold tabular-nums">
                          {latestTrainedResult.confusionMatrix[0]?.[0] ?? 0}
                        </span>
                        <span className="text-[10px] font-medium opacity-80 mt-0.5">Correct</span>
                      </div>
                      {/* Error: False Spam */}
                      <div className="p-4 rounded-xl bg-danger-soft text-danger border border-danger/20 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold tabular-nums">
                          {latestTrainedResult.confusionMatrix[0]?.[1] ?? 0}
                        </span>
                        <span className="text-[10px] font-medium opacity-80 mt-0.5">Error</span>
                      </div>
                    </div>

                    {/* Row 2: Actual Spam */}
                    <div className="grid grid-cols-[100px_1fr_1fr] gap-2 items-stretch">
                      <div className="flex items-center text-xs font-semibold text-text-muted">
                        Actual Spam
                      </div>
                      {/* Error: Missed Spam */}
                      <div className="p-4 rounded-xl bg-danger-soft text-danger border border-danger/20 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold tabular-nums">
                          {latestTrainedResult.confusionMatrix[1]?.[0] ?? 0}
                        </span>
                        <span className="text-[10px] font-medium opacity-80 mt-0.5">Error</span>
                      </div>
                      {/* Correct: True Spam */}
                      <div className="p-4 rounded-xl bg-success-soft text-success border border-success/20 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold tabular-nums">
                          {latestTrainedResult.confusionMatrix[1]?.[1] ?? 0}
                        </span>
                        <span className="text-[10px] font-medium opacity-80 mt-0.5">Correct</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">
                    No confusion matrix available for this evaluation run.
                  </p>
                )}
              </div>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Model Versions Comparison Bar Chart */}
      {comparisonData.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Model Performance Comparison</Card.Title>
            <Card.Description>
              Comparing Accuracy, Precision, and F1 metrics across the last 5 trained versions
            </Card.Description>
          </Card.Header>

          <Card.Content className="pt-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  key={`models-bar-${theme}`}
                  data={comparisonData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 10 }}
                >
                  <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="version"
                    stroke={chartColors.axis}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={chartColors.axis}
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(val) => [`${val}%`]}
                    contentStyle={{
                      backgroundColor: chartColors.tooltipBg,
                      borderColor: chartColors.tooltipBorder,
                      color: chartColors.tooltipText,
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Accuracy" fill={chartColors.accuracy} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Precision" fill={chartColors.precision} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="F1" fill={chartColors.f1} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Model Versions Table */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">Model Versions</h2>

        {models.length === 0 ? (
          <EmptyState
            title="No trained models available"
            description="Train your first model version above using a training dataset."
          />
        ) : (
          <Card>
            {/* Toolbar above Table: search on left, filters aligned right */}
            <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search
                  className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Search model versions..."
                  className="w-full h-9 pl-9 pr-8 rounded-md border border-border bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-150"
                />
                {modelSearch && (
                  <button
                    type="button"
                    onClick={() => setModelSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text rounded focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 sm:justify-end">
                <select
                  value={algorithmFilter}
                  onChange={(e) => setAlgorithmFilter(e.target.value)}
                  aria-label="Filter by algorithm"
                  className="h-9 px-3 rounded-md border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-150"
                >
                  <option value="all">All Algorithms</option>
                  <option value="logistic_regression">Logistic Regression</option>
                  <option value="naive_bayes">Naive Bayes</option>
                </select>
              </div>
            </div>

            <Card.Content className="p-0">
              {filteredModels.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    title="No model versions match your filters"
                    description={
                      modelSearch
                        ? `No model version found matching "${modelSearch}".`
                        : 'No model versions match the selected algorithm.'
                    }
                    actionLabel="Reset filters"
                    onAction={() => {
                      setModelSearch('');
                      setAlgorithmFilter('all');
                    }}
                  />
                </div>
              ) : (
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head className="min-w-[150px]">Version</Table.Head>
                      <Table.Head className="w-36">Algorithm</Table.Head>
                      <Table.Head align="right" className="w-24">
                        Accuracy
                      </Table.Head>
                      <Table.Head align="right" className="w-24">
                        Precision
                      </Table.Head>
                      <Table.Head align="right" className="w-24">
                        Recall
                      </Table.Head>
                      <Table.Head align="right" className="w-24">
                        F1 Score
                      </Table.Head>
                      <Table.Head className="w-32">Date Created</Table.Head>
                      <Table.Head align="right" className="w-28">
                        Status
                      </Table.Head>
                    </Table.Row>
                  </Table.Header>

                  <Table.Body>
                    {filteredModels.map((item) => {
                      const id = item._id || item.id;
                      const dateStr = item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'N/A';

                      return (
                        <Table.Row key={id}>
                          <Table.Cell className="font-medium text-xs">{item.version}</Table.Cell>

                          <Table.Cell className="capitalize text-xs">
                            {(item.algorithm || 'logistic_regression').replace('_', ' ')}
                          </Table.Cell>

                          <Table.Cell align="right" isNumber>
                            {((Number(item.accuracy) || 0) * 100).toFixed(1)}%
                          </Table.Cell>

                          <Table.Cell align="right" isNumber>
                            {((Number(item.precision) || 0) * 100).toFixed(1)}%
                          </Table.Cell>

                          <Table.Cell align="right" isNumber>
                            {((Number(item.recall) || 0) * 100).toFixed(1)}%
                          </Table.Cell>

                          <Table.Cell align="right" isNumber>
                            {((Number(item.f1) || 0) * 100).toFixed(1)}%
                          </Table.Cell>

                          <Table.Cell className="text-text-muted text-xs">{dateStr}</Table.Cell>

                          <Table.Cell align="right">
                            {item.isActive ? (
                              <Badge variant="notSpam" className="text-xs uppercase font-semibold">
                                Active
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                loading={activatingId === id}
                                disabled={activatingId === id}
                                onClick={() => handleActivate(id)}
                                className="text-xs h-7 px-2.5"
                              >
                                Activate
                              </Button>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              )}
            </Card.Content>
          </Card>
        )}
      </section>
    </div>
  );
};

export default AdminModelsPage;
