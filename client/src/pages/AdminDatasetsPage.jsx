import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  AlertCircle,
  X,
  Database,
  Search
} from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Table from '../components/Table';
import ConfirmDialog from '../components/ConfirmDialog';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Toast from '../components/Toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const AdminDatasetsPage = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload Form state
  const [datasetName, setDatasetName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileStats, setFileStats] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Deletion state
  const [datasetToDelete, setDatasetToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDatasets = useMemo(() => {
    if (!searchTerm.trim()) return datasets;
    const q = searchTerm.toLowerCase();
    return datasets.filter((d) => d.name?.toLowerCase().includes(q));
  }, [datasets, searchTerm]);

  const fileInputRef = useRef(null);

  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/admin/datasets');
      if (response.data?.success && response.data?.data) {
        setDatasets(response.data.data);
      } else {
        setError(response.data?.message || 'Failed to retrieve datasets.');
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
    fetchDatasets();
  }, [fetchDatasets]);

  const validateCsvFile = async (file) => {
    setValidationError('');
    setUploadError('');

    const isCsvExtension = file.name.toLowerCase().endsWith('.csv');
    const isCsvMime = file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
    if (!isCsvExtension && !isCsvMime) {
      setValidationError('Invalid file type. Please upload a CSV file (.csv).');
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setValidationError(`File size exceeds 5MB limit (${sizeMb} MB).`);
      return false;
    }

    try {
      const content = await file.text();
      const rows = content
        .split(/\r\n|\n|\r/)
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      if (rows.length === 0) {
        setValidationError('Dataset CSV file cannot be empty.');
        return false;
      }

      const headers = rows[0].split(',').map((h) =>
        h
          .replace(/^["']|["']$/g, '')
          .trim()
          .toLowerCase()
      );

      const hasText = headers.includes('text');
      const hasLabel = headers.includes('label');

      if (!hasText || !hasLabel) {
        setValidationError("CSV header must contain both 'text' and 'label' columns.");
        return false;
      }

      const dataRowCount = rows.length - 1;
      if (dataRowCount <= 0) {
        setValidationError('Dataset must contain at least one data row.');
        return false;
      }

      setFileStats({
        rowCount: dataRowCount,
        sizeKb: (file.size / 1024).toFixed(1)
      });
      return true;
    } catch {
      setValidationError('Unable to read or parse the CSV file.');
      return false;
    }
  };

  const handleFileSelection = async (file) => {
    if (!file) return;
    const isValid = await validateCsvFile(file);
    if (isValid) {
      setSelectedFile(file);
      if (!datasetName.trim()) {
        const defaultName = file.name.replace(/\.[^/.]+$/, '');
        setDatasetName(defaultName);
      }
    } else {
      setSelectedFile(null);
      setFileStats(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFileSelection(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileStats(null);
    setValidationError('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadError('');
    setToastMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (datasetName.trim()) {
      formData.append('name', datasetName.trim());
    }

    try {
      const response = await api.post('/admin/datasets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data?.success) {
        setToastMessage('Dataset uploaded and processed successfully');
        handleRemoveFile();
        setDatasetName('');
        fetchDatasets();
      } else {
        setUploadError(response.data?.message || 'Failed to upload dataset.');
      }
    } catch (err) {
      setUploadError(
        err.response?.data?.message || 'An unexpected error occurred while uploading the dataset.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!datasetToDelete) return;
    setDeleting(true);

    try {
      const id = datasetToDelete._id || datasetToDelete.id;
      const response = await api.delete(`/admin/datasets/${id}`);

      if (response.data?.success) {
        setDatasetToDelete(null);
        setToastMessage('Dataset deleted successfully');
        fetchDatasets();
      } else {
        setToastMessage(response.data?.message || 'Failed to delete dataset');
      }
    } catch (err) {
      setToastMessage(
        err.response?.data?.message || 'An error occurred while deleting the dataset'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Feedback */}
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

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text tracking-tight">Training Datasets</h1>
        <p className="text-sm text-text-muted mt-1">
          Upload, inspect, and manage labeled datasets used for machine learning model training.
        </p>
      </div>

      {/* Upload Card */}
      <Card>
        <Card.Header>
          <Card.Title>Upload Training Dataset</Card.Title>
          <Card.Description>
            Dataset must be a CSV file containing both <strong className="text-text">text</strong>{' '}
            and <strong className="text-text">label</strong> columns (with values &lsquo;spam&rsquo;
            or &lsquo;ham&rsquo;).
          </Card.Description>
        </Card.Header>

        <Card.Content className="space-y-4">
          {uploadError && (
            <div
              role="alert"
              className="p-3 bg-danger-soft border border-danger/20 text-danger text-sm rounded-md flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {validationError && (
            <div
              role="alert"
              className="p-3 bg-danger-soft border border-danger/20 text-danger text-sm rounded-md flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="max-w-md">
              <Input
                id="dataset-name"
                label="Dataset Name"
                placeholder="e.g. Enron Benchmark v1"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                helperText="Optional custom name to identify this dataset"
              />
            </div>

            {/* Drag & Drop Area */}
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-150 ${
                  isDragging
                    ? 'border-primary bg-primary-soft'
                    : 'border-border hover:border-primary/50 hover:bg-primary-soft/30 bg-surface-muted/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelection(e.target.files[0]);
                    }
                  }}
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center text-text-muted">
                    <UploadCloud className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-text">
                    Click to browse or drag and drop dataset file
                  </p>
                  <p className="text-xs text-text-muted">
                    CSV format (.csv) &bull; max 5 MB &bull; requires &lsquo;text&rsquo; and
                    &lsquo;label&rsquo;
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-border rounded-lg bg-surface-muted flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">{selectedFile.name}</p>
                    {fileStats && (
                      <p className="text-xs text-text-muted">
                        {fileStats.sizeKb} KB &bull; {fileStats.rowCount.toLocaleString()} valid
                        rows detected
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  aria-label="Remove file"
                  className="p-1.5 text-text-muted hover:text-danger rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-danger/40"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}

            {selectedFile && (
              <div className="pt-2 flex items-center gap-3">
                <Button type="submit" loading={uploading} disabled={uploading}>
                  Upload Dataset
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveFile}
                  disabled={uploading}
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </Card.Content>
      </Card>

      {/* Datasets Table */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">Available Datasets</h2>

        {loading ? (
          <Card>
            <Card.Content className="space-y-4 pt-6">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </Card.Content>
          </Card>
        ) : error ? (
          <ErrorState
            title="Unable to load datasets"
            message={error}
            retryText="Try again"
            onRetry={fetchDatasets}
          />
        ) : datasets.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No datasets available"
            description="Upload a benchmark dataset above to enable machine learning model training."
          />
        ) : (
          <Card>
            {/* Toolbar above Table: search input on left, count/actions aligned right */}
            <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search
                  className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search datasets..."
                  className="w-full h-9 pl-9 pr-8 rounded-md border border-border bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-150"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text rounded focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-text-muted sm:justify-end">
                <span>
                  {filteredDatasets.length} of {datasets.length}{' '}
                  {datasets.length === 1 ? 'dataset' : 'datasets'}
                </span>
              </div>
            </div>

            <Card.Content className="p-0">
              {filteredDatasets.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    title="No datasets match your search"
                    description={`No datasets found matching "${searchTerm}".`}
                    actionLabel="Clear search"
                    onAction={() => setSearchTerm('')}
                  />
                </div>
              ) : (
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head className="min-w-[200px]">Dataset Name</Table.Head>
                      <Table.Head align="right" className="w-28">
                        Total Rows
                      </Table.Head>
                      <Table.Head align="right" className="w-28">
                        Spam Rows
                      </Table.Head>
                      <Table.Head align="right" className="w-28">
                        Ham Rows
                      </Table.Head>
                      <Table.Head className="w-44">Date Created</Table.Head>
                      <Table.Head align="right" className="w-20">
                        Actions
                      </Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {filteredDatasets.map((item) => {
                      const rowCount = Number(item.rowCount ?? 0);
                      const spamCount = Number(item.spamCount ?? 0);
                      const hamCount = Number(item.hamCount ?? 0);
                      const dateStr = item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'N/A';

                      return (
                        <Table.Row key={item._id || item.id}>
                          <Table.Cell className="font-medium">{item.name}</Table.Cell>

                          <Table.Cell align="right" isNumber>
                            {rowCount.toLocaleString()}
                          </Table.Cell>

                          <Table.Cell align="right" isNumber className="text-danger">
                            {spamCount.toLocaleString()}
                          </Table.Cell>

                          <Table.Cell align="right" isNumber className="text-success">
                            {hamCount.toLocaleString()}
                          </Table.Cell>

                          <Table.Cell className="text-text-muted text-xs">{dateStr}</Table.Cell>

                          <Table.Cell align="right">
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => setDatasetToDelete(item)}
                              title="Delete dataset"
                              aria-label="Delete dataset"
                              className="h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(datasetToDelete)}
        onClose={() => setDatasetToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Dataset"
        message={`Are you sure you want to delete dataset "${datasetToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        loading={deleting}
      />
    </div>
  );
};

export default AdminDatasetsPage;
