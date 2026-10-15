import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import api from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Table from '../components/Table';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import useTheme from '../hooks/useTheme';

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartColors = useMemo(() => {
    return {
      spam: isDark ? '#F87171' : '#DC2626',
      ham: isDark ? '#4ADE80' : '#16A34A',
      primary: isDark ? '#3B82F6' : '#2563EB',
      grid: isDark ? '#243044' : '#E2E8F0',
      axis: isDark ? '#94A3B8' : '#64748B',
      tooltipBg: isDark ? '#111827' : '#FFFFFF',
      tooltipBorder: isDark ? '#243044' : '#E2E8F0',
      tooltipText: isDark ? '#F1F5F9' : '#0F172A'
    };
  }, [isDark]);

  // Shared date range state
  const [datePreset, setDatePreset] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Charts state
  const [chartsData, setChartsData] = useState(null);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [chartsError, setChartsError] = useState(null);

  // Raw data table state
  const [rawRows, setRawRows] = useState([]);
  const [rawTotal, setRawTotal] = useState(0);
  const [rawLoading, setRawLoading] = useState(true);
  const [rawError, setRawError] = useState(null);

  // Table filters & pagination state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [exporting, setExporting] = useState(false);

  // Debounce search input by 400ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Handle date preset change
  const handlePresetChange = (e) => {
    const preset = e.target.value;
    setDatePreset(preset);

    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);

    if (preset === '7d') {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      setFromDate(from.toISOString().slice(0, 10));
      setToDate(toStr);
    } else if (preset === '30d') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      setFromDate(from.toISOString().slice(0, 10));
      setToDate(toStr);
    } else if (preset === '90d') {
      const from = new Date(now);
      from.setDate(from.getDate() - 90);
      setFromDate(from.toISOString().slice(0, 10));
      setToDate(toStr);
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  const handleClearDateRange = () => {
    setDatePreset('all');
    setFromDate('');
    setToDate('');
  };

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, labelFilter, fromDate, toDate, limit]);

  // Fetch charts analytics
  const fetchAnalytics = useCallback(async () => {
    setChartsLoading(true);
    setChartsError(null);

    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const response = await api.get('/analytics', { params });
      if (response.data?.success && response.data?.data) {
        setChartsData(response.data.data);
      } else {
        setChartsError(response.data?.message || 'Failed to load analytics.');
      }
    } catch (err) {
      setChartsError(
        err.response?.data?.message ||
          'Unable to connect to the server. Please check your backend connection.'
      );
    } finally {
      setChartsLoading(false);
    }
  }, [fromDate, toDate]);

  // Fetch raw analytics rows
  const fetchRawAnalytics = useCallback(async () => {
    setRawLoading(true);
    setRawError(null);

    try {
      const params = {
        page,
        limit,
        sortBy,
        order: sortOrder
      };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (labelFilter && labelFilter !== 'all') params.label = labelFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const response = await api.get('/analytics/raw', { params });
      if (response.data?.success && response.data?.data) {
        setRawRows(response.data.data.rows || []);
        setRawTotal(response.data.data.total || 0);
      } else {
        setRawError(response.data?.message || 'Failed to load classification records.');
      }
    } catch (err) {
      setRawError(
        err.response?.data?.message ||
          'Unable to connect to the server. Please check your backend connection.'
      );
    } finally {
      setRawLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, fromDate, toDate, labelFilter, debouncedSearch]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchRawAnalytics();
  }, [fetchRawAnalytics]);

  // Sorting handler
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'label' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const renderSortIcon = (field) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? (
        <ArrowUp className="w-3.5 h-3.5 text-primary ml-1" aria-hidden="true" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-primary ml-1" aria-hidden="true" />
      );
    }
    return (
      <ArrowUpDown
        className="w-3.5 h-3.5 text-text-muted/40 ml-1 group-hover:text-text-muted transition-colors"
        aria-hidden="true"
      />
    );
  };

  // CSV Export handler
  const handleExportCsv = async () => {
    if (exporting || rawTotal === 0) return;
    setExporting(true);

    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (labelFilter && labelFilter !== 'all') params.label = labelFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (sortBy) params.sortBy = sortBy;
      if (sortOrder) params.order = sortOrder;

      const response = await api.get('/analytics/raw/export', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'classification-records.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Export failure
    } finally {
      setExporting(false);
    }
  };

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  const hasActiveRawFilters = Boolean(
    debouncedSearch.trim() || (labelFilter && labelFilter !== 'all') || fromDate || toDate
  );

  const handleClearRawFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setLabelFilter('all');
    handleClearDateRange();
  };

  // Pagination bounds
  const totalPages = Math.max(1, Math.ceil(rawTotal / limit));
  const startItem = rawTotal === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, rawTotal);

  // Charts data preparation
  const donutData = useMemo(() => {
    if (!chartsData) return [];
    return [
      { name: 'Spam', value: chartsData.spam || 0, color: chartColors.spam },
      { name: 'Not Spam', value: chartsData.ham || 0, color: chartColors.ham }
    ].filter((item) => item.value > 0);
  }, [chartsData, chartColors]);

  const topTermsData = useMemo(() => {
    if (!chartsData?.topSuspiciousTerms) return [];
    return chartsData.topSuspiciousTerms.map((item) => ({
      term: item.term,
      count: item.count
    }));
  }, [chartsData]);

  const timelineData = useMemo(() => {
    if (!chartsData?.countsPerDay) return [];
    return chartsData.countsPerDay.map((item) => ({
      date: item.date,
      total: item.total || 0,
      spam: item.spam || 0,
      ham: item.ham || 0
    }));
  }, [chartsData]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text tracking-tight">Analytics</h1>
          <p className="text-sm text-text-muted mt-1">
            Performance metrics, trends, and classifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-surface p-2 rounded-xl border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-1.5 text-xs text-text-muted px-1">
            <Calendar className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
            <span className="font-medium text-text">Range:</span>
          </div>

          <select
            value={datePreset}
            onChange={handlePresetChange}
            aria-label="Date range preset"
            className="h-8 px-2.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset('custom');
              }}
              aria-label="Filter from date"
              className="h-8 px-2 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset('custom');
              }}
              aria-label="Filter to date"
              className="h-8 px-2 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
          </div>

          {(fromDate || toDate || datePreset !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearDateRange}
              title="Reset date filter"
              className="h-8 px-2 text-xs text-text-muted hover:text-text"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {chartsLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : chartsError ? (
        <ErrorState
          title="Unable to load analytics"
          message={chartsError}
          retryText="Try again"
          onRetry={fetchAnalytics}
        />
      ) : chartsData && chartsData.total === 0 ? (
        <Card>
          <Card.Content className="py-12 text-center">
            <p className="text-sm font-medium text-text">
              No classification activity recorded for this period.
            </p>
            <p className="text-xs text-text-muted mt-1">
              Adjust the date range above or analyze emails to generate trend data.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Card.Header>
                <Card.Title>Spam vs Not Spam Distribution</Card.Title>
                <Card.Description>
                  Proportion of flagged spam versus legitimate messages.
                </Card.Description>
              </Card.Header>

              <Card.Content className="pt-2">
                {donutData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-sm text-text-muted">
                    No classification breakdown available.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart key={`donut-${theme}`}>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={4}
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: chartColors.tooltipBg,
                            borderColor: chartColors.tooltipBorder,
                            color: chartColors.tooltipText,
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Top Suspicious Terms</Card.Title>
                <Card.Description>
                  The most frequent terms identified across analyzed emails.
                </Card.Description>
              </Card.Header>

              <Card.Content className="pt-2">
                {topTermsData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-sm text-text-muted">
                    No suspicious terms detected in this period.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        key={`terms-${theme}`}
                        data={topTermsData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                      >
                        <CartesianGrid
                          stroke={chartColors.grid}
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="term"
                          stroke={chartColors.axis}
                          fontSize={11}
                          tickLine={false}
                          interval={0}
                          angle={-25}
                          textAnchor="end"
                        />
                        <YAxis
                          stroke={chartColors.axis}
                          fontSize={11}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: chartColors.tooltipBg,
                            borderColor: chartColors.tooltipBorder,
                            color: chartColors.tooltipText,
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={28}
                          wrapperStyle={{ fontSize: '12px' }}
                        />
                        <Bar
                          dataKey="count"
                          name="Occurrences"
                          fill={chartColors.primary}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>

          <Card>
            <Card.Header>
              <Card.Title>Classifications per Day</Card.Title>
              <Card.Description>Daily volume of analyzed emails across time.</Card.Description>
            </Card.Header>

            <Card.Content className="pt-2">
              {timelineData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-text-muted">
                  No daily classification activity recorded for this period.
                </div>
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      key={`timeline-${theme}`}
                      data={timelineData}
                      margin={{ top: 10, right: 20, left: -10, bottom: 10 }}
                    >
                      <CartesianGrid
                        stroke={chartColors.grid}
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        stroke={chartColors.axis}
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke={chartColors.axis}
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartColors.tooltipBg,
                          borderColor: chartColors.tooltipBorder,
                          color: chartColors.tooltipText,
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '12px' }} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke={chartColors.primary}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="spam"
                        name="Spam"
                        stroke={chartColors.spam}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="ham"
                        name="Not Spam"
                        stroke={chartColors.ham}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Content>
          </Card>
        </>
      )}

      <Card>
        <Card.Header>
          <Card.Title>Classification Records</Card.Title>
          <Card.Description>
            Detailed records of every email classified in the selected period.
          </Card.Description>
        </Card.Header>

        <div className="px-6 py-3 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search
              className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search email text..."
              aria-label="Search email text"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-surface text-xs text-text placeholder:text-text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              aria-label="Filter by classification label"
              className="h-9 px-3 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            >
              <option value="all">All Labels</option>
              <option value="spam">Spam</option>
              <option value="ham">Not Spam</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={rawLoading || rawTotal === 0 || exporting}
              loading={exporting}
              title={
                rawTotal === 0
                  ? 'No classification records available to export'
                  : 'Export classification records to CSV'
              }
              className="h-9 text-xs flex items-center gap-1.5"
            >
              {!exporting && <Download className="w-3.5 h-3.5" aria-hidden="true" />}
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {rawLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : rawError ? (
          <div className="p-6">
            <ErrorState
              title="Unable to load classification records"
              message={rawError}
              retryText="Try again"
              onRetry={fetchRawAnalytics}
            />
          </div>
        ) : rawRows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={hasActiveRawFilters ? 'No records found' : 'No classification records'}
              description={
                hasActiveRawFilters
                  ? 'No classification records match your current search, label, or date filters.'
                  : 'No classification records found in the selected period. Classify an email to view records here.'
              }
              actionLabel={hasActiveRawFilters ? 'Clear filters' : 'Classify Email'}
              onAction={hasActiveRawFilters ? handleClearRawFilters : () => navigate('/classify')}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="border-0 rounded-none" aria-label="Classification records table">
                <Table.Header>
                  <Table.Row>
                    <Table.Head className="min-w-[150px] whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSort('createdAt')}
                        className="inline-flex items-center font-semibold text-text-muted hover:text-text transition-colors group focus:outline-none"
                      >
                        <span>Date</span>
                        {renderSortIcon('createdAt')}
                      </button>
                    </Table.Head>

                    <Table.Head className="min-w-[240px]">Email Preview</Table.Head>

                    <Table.Head className="min-w-[120px]">
                      <button
                        type="button"
                        onClick={() => handleSort('label')}
                        className="inline-flex items-center font-semibold text-text-muted hover:text-text transition-colors group focus:outline-none"
                      >
                        <span>Label</span>
                        {renderSortIcon('label')}
                      </button>
                    </Table.Head>

                    <Table.Head align="right" className="min-w-[140px] whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSort('spamProbability')}
                        className="inline-flex items-center font-semibold text-text-muted hover:text-text transition-colors group focus:outline-none ml-auto"
                      >
                        <span>Spam Probability</span>
                        {renderSortIcon('spamProbability')}
                      </button>
                    </Table.Head>

                    <Table.Head align="right" className="min-w-[120px] whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSort('confidence')}
                        className="inline-flex items-center font-semibold text-text-muted hover:text-text transition-colors group focus:outline-none ml-auto"
                      >
                        <span>Confidence</span>
                        {renderSortIcon('confidence')}
                      </button>
                    </Table.Head>

                    <Table.Head className="min-w-[180px]">Suspicious Terms</Table.Head>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {rawRows.map((row) => {
                    const spamProb = Number(row.spamProbability ?? 0);
                    const conf = Number(row.confidence ?? 0);
                    const terms = Array.isArray(row.suspiciousTerms) ? row.suspiciousTerms : [];

                    return (
                      <Table.Row key={row.id}>
                        <Table.Cell className="text-text-muted text-xs whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </Table.Cell>

                        <Table.Cell>
                          <div
                            className="max-w-xs md:max-w-md lg:max-w-lg truncate text-sm text-text"
                            title={row.emailText}
                          >
                            {row.emailText || '—'}
                          </div>
                        </Table.Cell>

                        <Table.Cell>
                          <Badge
                            variant={row.label === 'spam' ? 'spam' : 'notSpam'}
                            className="text-xs font-semibold uppercase tracking-wider"
                          >
                            {row.label === 'spam' ? 'Spam' : 'Not Spam'}
                          </Badge>
                        </Table.Cell>

                        <Table.Cell align="right" isNumber className="text-xs">
                          {(spamProb * 100).toFixed(1)}%
                        </Table.Cell>

                        <Table.Cell align="right" isNumber className="text-xs">
                          {(conf * 100).toFixed(1)}%
                        </Table.Cell>

                        <Table.Cell>
                          {terms.length === 0 ? (
                            <span className="text-text-muted text-xs">—</span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1">
                              {terms.slice(0, 3).map((term, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block px-1.5 py-0.5 text-[11px] rounded bg-surface-muted border border-border text-text-muted font-mono"
                                >
                                  {term}
                                </span>
                              ))}
                              {terms.length > 3 && (
                                <span
                                  className="inline-block px-1.5 py-0.5 text-[11px] rounded bg-surface-muted border border-border text-text-muted font-medium cursor-help"
                                  title={terms.slice(3).join(', ')}
                                >
                                  +{terms.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            </div>

            <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
                <div>
                  Showing <span className="font-semibold text-text">{startItem}</span> to{' '}
                  <span className="font-semibold text-text">{endItem}</span> of{' '}
                  <span className="font-semibold text-text">{rawTotal}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span>Rows per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    aria-label="Rows per page"
                    className="h-8 px-2 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous Page"
                  className="h-8 px-3 inline-flex items-center gap-1 text-xs font-medium rounded-lg border border-border bg-surface text-text hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Previous</span>
                </button>

                <span className="text-xs text-text-muted px-1">
                  Page <span className="font-semibold text-text">{page}</span> of{' '}
                  <span className="font-semibold text-text">{totalPages}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next Page"
                  className="h-8 px-3 inline-flex items-center gap-1 text-xs font-medium rounded-lg border border-border bg-surface text-text hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AnalyticsPage;
