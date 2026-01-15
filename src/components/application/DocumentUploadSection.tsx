import { useState, useEffect, useRef } from 'react';
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  getDocumentRequests,
  fulfillDocumentRequest,
  type DocumentRequest,
} from '../../services/application';
import { uploadRequestedDocument } from '../../services/storage';
import { DOCUMENT_TYPES } from '../../schemas/masjid';

interface DocumentUploadSectionProps {
  applicationId: string;
  onUploadComplete?: () => void;
}

interface UploadState {
  requestId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'success' | 'error';
  error?: string;
}

export function DocumentUploadSection({
  applicationId,
  onUploadComplete,
}: DocumentUploadSectionProps) {
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    loadDocumentRequests();
  }, [applicationId]);

  const loadDocumentRequests = async () => {
    setLoading(true);
    try {
      const requests = await getDocumentRequests(applicationId);
      setDocumentRequests(requests);
    } catch (err) {
      console.error('Error loading document requests:', err);
      setError('Failed to load document requests');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeLabel = (documentType: string): string => {
    const docType = DOCUMENT_TYPES.find((d) => d.value === documentType);
    return docType?.label || documentType;
  };

  const handleFileSelect = async (requestId: string, file: File) => {
    // Validate file
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a PDF or image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > maxSize) {
      setError('File is too large. Maximum file size is 10MB.');
      return;
    }

    // Start upload
    setUploadStates((prev) => ({
      ...prev,
      [requestId]: { requestId, progress: 0, status: 'uploading' },
    }));
    setError(null);

    try {
      // Upload file to storage
      const result = await uploadRequestedDocument(
        applicationId,
        requestId,
        file,
        (progress) => {
          setUploadStates((prev) => ({
            ...prev,
            [requestId]: { ...prev[requestId], progress },
          }));
        }
      );

      // Mark as processing while we call the cloud function
      setUploadStates((prev) => ({
        ...prev,
        [requestId]: { ...prev[requestId], status: 'processing', progress: 100 },
      }));

      // Fulfill the document request
      await fulfillDocumentRequest(applicationId, requestId, result.storagePath);

      // Mark as success
      setUploadStates((prev) => ({
        ...prev,
        [requestId]: { ...prev[requestId], status: 'success' },
      }));

      setSuccess('Document uploaded successfully!');

      // Reload document requests to show updated status
      await loadDocumentRequests();

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      setUploadStates((prev) => ({
        ...prev,
        [requestId]: {
          ...prev[requestId],
          status: 'error',
          error: 'Failed to upload document',
        },
      }));
      setError('Failed to upload document. Please try again.');
    }
  };

  const handleUploadClick = (requestId: string) => {
    const input = fileInputRefs.current[requestId];
    if (input) {
      input.click();
    }
  };

  const handleFileInputChange = (
    requestId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(requestId, file);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const pendingRequests = documentRequests.filter((req) => !req.fulfilledAt);
  const fulfilledRequests = documentRequests.filter((req) => req.fulfilledAt);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent>
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documentRequests.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader
        title="Document Requests"
        description="Please upload the following documents requested by the reviewer"
      />
      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-4" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Pending Documents */}
        {pendingRequests.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              Documents Needed ({pendingRequests.length})
            </h4>
            <div className="space-y-3">
              {pendingRequests.map((request) => {
                const uploadState = uploadStates[request.id];
                const isUploading =
                  uploadState?.status === 'uploading' ||
                  uploadState?.status === 'processing';

                return (
                  <div
                    key={request.id}
                    className="border border-amber-200 bg-amber-50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <DocumentTextIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {getDocumentTypeLabel(request.documentType)}
                          </p>
                          {request.description &&
                            request.description !== getDocumentTypeLabel(request.documentType) && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                {request.description}
                              </p>
                            )}
                          <div className="flex items-center gap-2 mt-1">
                            {request.required && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Required
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              Requested on{' '}
                              {new Date(
                                request.requestedAt.seconds * 1000
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <input
                          ref={(el) => (fileInputRefs.current[request.id] = el)}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => handleFileInputChange(request.id, e)}
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUploadClick(request.id)}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              {uploadState.status === 'processing'
                                ? 'Processing...'
                                : `${uploadState.progress}%`}
                            </>
                          ) : (
                            <>
                              <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                              Upload
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Upload progress bar */}
                    {isUploading && (
                      <div className="mt-3">
                        <div className="w-full bg-amber-200 rounded-full h-2">
                          <div
                            className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadState.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Upload error */}
                    {uploadState?.status === 'error' && (
                      <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <XMarkIcon className="h-4 w-4" />
                        {uploadState.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fulfilled Documents */}
        {fulfilledRequests.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              Uploaded Documents ({fulfilledRequests.length})
            </h4>
            <div className="space-y-2">
              {fulfilledRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between py-2 px-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <DocumentTextIcon className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getDocumentTypeLabel(request.documentType)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Uploaded on{' '}
                        {new Date(
                          request.fulfilledAt!.seconds * 1000
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    Uploaded
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help text */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Accepted file formats: PDF, JPEG, PNG, WebP. Maximum file size: 10MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
