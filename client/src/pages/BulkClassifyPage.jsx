import { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Download, AlertCircle, X, RotateCcw } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import Table from '../components/Table';
import Pagination from '../components/Pagination';
import Toast from '../components/Toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 1000;
const PAGE_SIZE = 10;

const BulkClassifyPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileStats, setFileStats] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fileInputRef = useRef(null);

  const validateCsvFile = async (file) => {
    setValidationError('');
    setApiError('');

    // Check 1: File type
    const isCsvExtension = file.name.toLowerCase().endsWith('.csv');
    const isCsvMime = file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
    if (!isCsvExtension && !isCsvMime) {
      setValidationError('Invalid file type. Please upload a valid CSV file (.csv).');
      return false;
    }

    // Check 2: File size (5MB max)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setValidationError(`File size exceeds 5MB limit (${sizeMb} MB).`);
      return false;
    }

    // Check 3 & 4: Text column and row count via client-side preview
    try {
      const content = await file.text();
      const rows = content
        .split(/\r\n|\n|\r/)
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      if (rows.length === 0) {
        setValidationError('CSV file cannot be empty.');
        return false;
      }

      // Check header row for 'text' column
      const headerLine = rows[0];
      const headers = headerLine.split(',').map((h) =>
        h
          .replace(/^["']|["']$/g, '')
          .trim()
          .toLowerCase()
      );

      if (!headers.includes('text')) {
        setValidationError('CSV file must have a column named "text".');
        return false;
      }

      const dataRowCount = rows.length - 1;
      if (dataRowCount <= 0) {
        setValidationError('CSV file contains no data rows.');
        return false;
      }

      if (dataRowCount > MAX_ROWS) {
        setValidationError(
          `CSV file cannot exceed 1,000 rows (found ${dataRowCount.toLocaleString()} rows).`
        );
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
    } else {
      setSelectedFile(null);
      setFileStats(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
    setApiError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetAll = () => {
    handleRemoveFile();
    setResultsData(null);
    setCurrentPage(1);
    setToastMessage('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setApiError('');
    setToastMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await api.post('/classify/bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data?.success && response.data?.data) {
        setResultsData(response.data.data);
        setCurrentPage(1);
        setToastMessage('Bulk classification completed successfully');
      } else {
        setApiError(response.data?.message || 'Bulk classification failed.');
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.response?.status === 503
          ? 'ML service is currently unavailable. Please try again later.'
          : 'Failed to process bulk classification. Please try again.');
      setApiError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!resultsData?.results || resultsData.results.length === 0) return;

    const headers = ['text', 'label', 'spamProbability', 'confidence', 'suspiciousTerms'];
    const csvLines = [headers.join(',')];

    resultsData.results.forEach((row) => {
      const escapedText = `"${(row.emailText || '').replace(/"/g, '""')}"`;
      const label = row.label || '';
      const spamProb = row.spamProbability !== undefined ? row.spamProbability : '';
      const conf = row.confidence !== undefined ? row.confidence : '';
      const terms = `"${(row.suspiciousTerms || []).join('; ').replace(/"/g, '""')}"`;

      csvLines.push([escapedText, label, spamProb, conf, terms].join(','));
    });

    const blob = new Blob([csvLines.join('\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `classification_results_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const results = resultsData?.results || [];
  const totalPages = Math.ceil(results.length / PAGE_SIZE) || 1;
  const paginatedResults = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
        <h1 className="text-2xl font-semibold text-text tracking-tight">Bulk Classification</h1>
        <p className="text-sm text-text-muted mt-1">
          Upload a CSV file to classify multiple emails in batches.
        </p>
      </div>

      {!resultsData && (
        <Card>
          <Card.Header>
            <Card.Title>Upload CSV File</Card.Title>
            <Card.Description>
              CSV files must include a header column named{' '}
              <strong className="text-text">text</strong>. Maximum file size is 5 MB and up to 1,000
              rows.
            </Card.Description>
          </Card.Header>

          <Card.Content className="space-y-4">
            {apiError && (
              <div
                role="alert"
                className="p-3 bg-danger-soft border border-danger/20 text-danger text-sm rounded-md flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{apiError}</span>
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

            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors duration-150 ${
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
                  <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center text-text-muted">
                    <UploadCloud className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-text">Click to upload or drag and drop</p>
                  <p className="text-xs text-text-muted">
                    CSV file (.csv), maximum 5 MB and up to 1,000 rows
                  </p>
                </div>
              </div>
            ) : (
              /* Selected File Preview */
              <div className="p-4 border border-border rounded-lg bg-surface-muted flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">{selectedFile.name}</p>
                    {fileStats && (
                      <p className="text-xs text-text-muted">
                        {fileStats.sizeKb} KB &bull; {fileStats.rowCount.toLocaleString()} data rows
                        ready to classify
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  aria-label="Remove selected file"
                  className="p-1.5 text-text-muted hover:text-danger rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-danger/40"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}

            {selectedFile && (
              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={uploading}
                >
                  Upload & Classify
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
          </Card.Content>
        </Card>
      )}

      {resultsData && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface p-4 rounded-lg border border-border">
            <div>
              <h2 className="text-base font-semibold text-text">Batch Results</h2>
              <p className="text-xs text-text-muted">
                {resultsData.summary?.total || results.length} emails classified
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadCsv}
                className="flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Download results (CSV)</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetAll}
                className="flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Upload Another</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total Processed"
              value={resultsData.summary?.total ?? results.length}
            />
            <StatCard
              label="Spam Detected"
              variant="spam"
              value={resultsData.summary?.spam ?? resultsData.summary?.spamCount ?? 0}
            />
            <StatCard
              label="Not Spam (Ham)"
              variant="notSpam"
              value={resultsData.summary?.ham ?? resultsData.summary?.hamCount ?? 0}
            />
          </div>

          <Card>
            <Card.Header>
              <Card.Title>Classified Emails</Card.Title>
              <Card.Description>Detailed classification results for each row</Card.Description>
            </Card.Header>

            <Card.Content className="p-0">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head className="w-12 text-center">#</Table.Head>
                    <Table.Head className="min-w-[260px]">Email Text</Table.Head>
                    <Table.Head className="w-28">Classification</Table.Head>
                    <Table.Head align="right" className="w-32">
                      Spam Probability
                    </Table.Head>
                    <Table.Head align="right" className="w-28">
                      Confidence
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {paginatedResults.map((item, index) => {
                    const rowNumber = (currentPage - 1) * PAGE_SIZE + index + 1;
                    const spamProb = Number(item.spamProbability ?? 0);
                    const conf = Number(item.confidence ?? 0);

                    return (
                      <Table.Row key={item._id || index}>
                        <Table.Cell className="text-center text-text-muted text-xs">
                          {rowNumber}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="max-w-md truncate" title={item.emailText}>
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
                        <Table.Cell align="right" isNumber>
                          {(conf * 100).toFixed(1)}%
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            </Card.Content>

            <Card.Footer className="border-t border-border p-3">
              <div className="w-full">
                <Pagination
                  page={currentPage}
                  pages={totalPages}
                  total={results.length}
                  limit={PAGE_SIZE}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            </Card.Footer>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BulkClassifyPage;
