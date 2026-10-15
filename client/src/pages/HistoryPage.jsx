import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Eye, RotateCcw } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Table from '../components/Table';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Toast from '../components/Toast';

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const HistoryPage = () => {
  const navigate = useNavigate();

  const [classifications, setClassifications] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals & Actions state
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchHistory = useCallback(
    async (pageToFetch = pagination.page) => {
      setLoading(true);
      setError(null);

      const params = {
        page: pageToFetch,
        limit: 10
      };

      if (labelFilter) params.label = labelFilter;
      if (search.trim()) params.search = search.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      try {
        const response = await api.get('/history', { params });
        if (response.data?.success && response.data?.data) {
          setClassifications(response.data.data.classifications || []);
          setPagination(
            response.data.data.pagination || {
              page: pageToFetch,
              limit: 10,
              total: 0,
              pages: 1
            }
          );
        } else {
          setError(response.data?.message || 'Failed to retrieve history');
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'Unable to connect to the server. Please verify your connection.'
        );
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, labelFilter, search, startDate, endDate]
  );

  useEffect(() => {
    fetchHistory(pagination.page);
  }, [pagination.page, labelFilter, startDate, endDate, fetchHistory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchHistory(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setLabelFilter('');
    setStartDate('');
    setEndDate('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = Boolean(search.trim() || labelFilter || startDate || endDate);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);

    try {
      const deleteId = itemToDelete._id || itemToDelete.id;
      const response = await api.delete(`/history/${deleteId}`);

      if (response.data?.success) {
        setItemToDelete(null);
        if (selectedItem && (selectedItem._id || selectedItem.id) === deleteId) {
          setSelectedItem(null);
        }
        setToastMessage('Classification deleted successfully');
        fetchHistory(pagination.page);
      } else {
        setToastMessage(response.data?.message || 'Failed to delete record');
      }
    } catch (err) {
      setToastMessage(err.response?.data?.message || 'An error occurred while deleting the item');
    } finally {
      setDeleting(false);
    }
  };

  const selectedIndicators = useMemo(() => {
    if (!selectedItem) return [];
    const combined = [
      ...(selectedItem.suspiciousTerms || []),
      ...(selectedItem.suspiciousPhrases || [])
    ];
    return Array.from(new Set(combined.filter(Boolean)));
  }, [selectedItem]);

  const renderHighlightedText = (content, indicators) => {
    if (!content) return null;
    if (!indicators || indicators.length === 0) {
      return <span>{content}</span>;
    }

    const sorted = [...indicators].sort((a, b) => b.length - a.length);
    const pattern = `(${sorted.map(escapeRegExp).join('|')})`;
    const regex = new RegExp(pattern, 'gi');
    const parts = content.split(regex);
    const lookup = new Set(sorted.map((s) => s.toLowerCase()));

    return parts.map((part, index) => {
      if (lookup.has(part.toLowerCase())) {
        return (
          <mark
            key={index}
            className="bg-warning-soft text-warning px-1 py-0.5 rounded font-medium"
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
            type="info"
            title="Notification"
            message={toastMessage}
            duration={3000}
            onClose={() => setToastMessage('')}
          />
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-text tracking-tight">Classification History</h1>
        <p className="text-sm text-text-muted mt-1">
          Review, filter, and manage your past email classification records.
        </p>
      </div>

      <Card>
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <Search
              className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="search-history"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email text..."
              className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-150"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
            <select
              id="filter-label"
              value={labelFilter}
              onChange={(e) => {
                setLabelFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              aria-label="Filter by classification label"
              className="h-9 px-3 rounded-md border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-150"
            >
              <option value="">All Labels</option>
              <option value="spam">Spam Only</option>
              <option value="ham">Not Spam (Ham)</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span>From:</span>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                aria-label="Start date"
                className="h-9 px-2 rounded-md border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-150"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span>To:</span>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                aria-label="End date"
                className="h-9 px-2 rounded-md border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-150"
              />
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                title="Reset all filters"
                aria-label="Reset all filters"
                className="h-9 px-2.5 flex items-center gap-1 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <Card.Content className="space-y-4 p-6">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card.Content>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title="Unable to load history"
              message={error}
              retryText="Try again"
              onRetry={() => fetchHistory(pagination.page)}
            />
          </div>
        ) : classifications.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={hasActiveFilters ? 'No matching records' : 'No history yet'}
              description={
                hasActiveFilters
                  ? 'No classifications found matching your selected filters.'
                  : 'You have not analyzed any emails yet. Classify your first email or upload a bulk CSV.'
              }
              actionLabel={hasActiveFilters ? 'Clear filters' : 'Classify Email'}
              onAction={hasActiveFilters ? handleResetFilters : () => navigate('/classify')}
            />
          </div>
        ) : (
          <>
            <Card.Content className="p-0">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head className="w-28">Label</Table.Head>
                    <Table.Head align="right" className="w-32">
                      Spam Probability
                    </Table.Head>
                    <Table.Head className="w-44">Date</Table.Head>
                    <Table.Head>Email Preview</Table.Head>
                    <Table.Head align="right" className="w-24">
                      Actions
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {classifications.map((item) => {
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
                      <Table.Row key={item._id || item.id}>
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

                        <Table.Cell>
                          <div
                            className="max-w-md lg:max-w-xl truncate text-sm"
                            title={item.emailText}
                          >
                            {item.emailText}
                          </div>
                        </Table.Cell>

                        <Table.Cell align="right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => setSelectedItem(item)}
                              title="View details"
                              aria-label="View details"
                              className="h-8 w-8"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => setItemToDelete(item)}
                              title="Delete classification"
                              aria-label="Delete classification"
                              className="h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            </Card.Content>

            {pagination.pages > 1 && (
              <Card.Footer className="border-t border-border p-3">
                <div className="w-full">
                  <Pagination
                    page={pagination.page}
                    pages={pagination.pages}
                    total={pagination.total}
                    limit={pagination.limit}
                    onPageChange={(newPage) =>
                      setPagination((prev) => ({ ...prev, page: newPage }))
                    }
                  />
                </div>
              </Card.Footer>
            )}
          </>
        )}
      </Card>

      {selectedItem && (
        <Modal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title="Classification Details"
          maxWidth="max-w-2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="destructive"
                onClick={() => {
                  setItemToDelete(selectedItem);
                }}
              >
                Delete
              </Button>
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface-muted border border-border rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted uppercase">Outcome:</span>
                <Badge
                  variant={selectedItem.label === 'spam' ? 'spam' : 'notSpam'}
                  className="font-semibold uppercase tracking-wider text-xs"
                >
                  {selectedItem.label === 'spam' ? 'Spam' : 'Not Spam'}
                </Badge>
              </div>

              <div className="text-xs text-text-muted">
                <span className="font-semibold text-text-muted uppercase mr-1">
                  Spam Probability:
                </span>
                <span className="tabular-nums font-medium text-text mr-3">
                  {(Number(selectedItem.spamProbability || 0) * 100).toFixed(1)}%
                </span>

                <span className="font-semibold text-text-muted uppercase mr-1">Confidence:</span>
                <span className="tabular-nums font-medium text-text">
                  {(Number(selectedItem.confidence || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Key Indicators
              </h3>
              {selectedIndicators.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedIndicators.map((indicator, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning-soft text-warning border border-warning/20"
                    >
                      {indicator}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted">
                  No suspicious indicators were detected in this email.
                </p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Email Content
              </h3>
              <div className="p-3 bg-surface-muted border border-border rounded-md text-sm text-text whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                {renderHighlightedText(selectedItem.emailText, selectedIndicators)}
              </div>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Classification"
        message="Are you sure you want to delete this classification record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        loading={deleting}
      />
    </div>
  );
};

export default HistoryPage;
