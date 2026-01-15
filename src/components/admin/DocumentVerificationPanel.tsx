import { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { httpsCallable } from 'firebase/functions';
import { firebaseFunctions, firebaseStorage } from '@/services/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Modal, ModalFooter } from '@/components/common/Modal';
import { Alert } from '@/components/common/Alert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DocumentPreview } from '@/components/common/DocumentPreview';
import { DOCUMENT_TYPES } from '@/schemas/masjid';

interface DocumentFile {
  fileName: string;
  storagePath: string;
  uploadedAt: { seconds: number };
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: { seconds: number };
}

interface DocumentRequest {
  id: string;
  documentType: string;
  description: string;
  required: boolean;
  requestedBy: string;
  requestedByName: string;
  requestedAt: { seconds: number };
  fulfilledAt?: { seconds: number };
  fulfilledBy?: string;
  storagePath?: string;
}

interface DocumentVerificationPanelProps {
  applicationId: string;
  documents?: {
    photoId?: DocumentFile;
    ssnCard?: DocumentFile;
    leaseAgreement?: DocumentFile;
    otherDocuments?: DocumentFile[];
  };
  canVerify: boolean;
  onUpdate: () => void;
}

export function DocumentVerificationPanel({
  applicationId,
  documents,
  canVerify,
  onUpdate,
}: DocumentVerificationPanelProps) {
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    type: string;
    path: string;
    fileName: string;
  } | null>(null);
  const [previewDocument, setPreviewDocument] = useState<{
    fileName: string;
    storagePath: string;
    contentType?: string;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  // Request form state
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [requestMessage, setRequestMessage] = useState('');

  // Verify form state
  const [verifyNotes, setVerifyNotes] = useState('');

  useEffect(() => {
    loadDocumentRequests();
  }, [applicationId]);

  const loadDocumentRequests = async () => {
    setLoading(true);
    try {
      const getDocumentRequests = httpsCallable<{ applicationId: string }, { success: boolean; data: DocumentRequest[] }>(
        firebaseFunctions,
        'getDocumentRequests'
      );
      const result = await getDocumentRequests({ applicationId });
      if (result.data.success) {
        setDocumentRequests(result.data.data || []);
      }
    } catch (err) {
      console.error('Error loading document requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDocuments = async () => {
    if (selectedDocTypes.length === 0) {
      setError('Please select at least one document type');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const requestDocuments = httpsCallable(firebaseFunctions, 'requestDocuments');
      await requestDocuments({
        applicationId,
        documents: selectedDocTypes.map(type => ({
          documentType: type,
          description: DOCUMENT_TYPES.find(d => d.value === type)?.label || type,
          required: true,
        })),
        message: requestMessage,
      });

      setSuccess('Document request sent successfully');
      setShowRequestModal(false);
      setSelectedDocTypes([]);
      setRequestMessage('');
      await loadDocumentRequests();
      onUpdate();
    } catch (err) {
      console.error('Error requesting documents:', err);
      setError('Failed to request documents');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyDocument = async (verified: boolean) => {
    if (!selectedDocument) return;

    setProcessing(true);
    setError(null);

    try {
      const verifyDocument = httpsCallable(firebaseFunctions, 'verifyDocument');
      await verifyDocument({
        applicationId,
        documentPath: selectedDocument.path,
        verified,
        notes: verifyNotes,
      });

      setSuccess(verified ? 'Document verified successfully' : 'Document rejected');
      setShowVerifyModal(false);
      setSelectedDocument(null);
      setVerifyNotes('');
      onUpdate();
    } catch (err) {
      console.error('Error verifying document:', err);
      setError('Failed to verify document');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadDocument = async (storagePath: string) => {
    try {
      const storageRef = ref(firebaseStorage, storagePath);
      const downloadUrl = await getDownloadURL(storageRef);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document');
    }
  };

  const openVerifyModal = (type: string, path: string, fileName: string) => {
    setSelectedDocument({ type, path, fileName });
    setShowVerifyModal(true);
  };

  const openPreviewModal = (fileName: string, storagePath: string) => {
    // Determine content type from file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'pdf') contentType = 'application/pdf';
    else if (['jpg', 'jpeg'].includes(ext || '')) contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'webp') contentType = 'image/webp';

    setPreviewDocument({ fileName, storagePath, contentType });
    setShowPreviewModal(true);
  };

  const getRequestStatusBadge = (request: DocumentRequest) => {
    if (request.fulfilledAt) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          Fulfilled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
        <ClockIcon className="h-3 w-3 mr-1" />
        Pending
      </span>
    );
  };

  const renderDocumentItem = (
    label: string,
    doc: DocumentFile | undefined,
    type: string
  ) => {
    if (!doc) return null;

    // Determine verification status badge
    // Check verifiedBy to distinguish between "not yet reviewed" and "explicitly rejected"
    const getVerificationBadge = () => {
      if (doc.verified === true) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Verified
          </span>
        );
      } else if (doc.verified === false && doc.verifiedBy) {
        // Only show "Rejected" if it was explicitly rejected (has verifiedBy)
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="h-3 w-3 mr-1" />
            Rejected
          </span>
        );
      } else {
        // Default state: not yet reviewed
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            <ClockIcon className="h-3 w-3 mr-1" />
            Pending verification
          </span>
        );
      }
    };

    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-500">{doc.fileName}</p>
          </div>
          {getVerificationBadge()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openPreviewModal(doc.fileName, doc.storagePath)}
            title="Preview"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownloadDocument(doc.storagePath)}
            title="Download"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
          {canVerify && doc.verified !== true && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openVerifyModal(type, doc.storagePath, doc.fileName)}
            >
              {doc.verified === false && doc.verifiedBy ? 'Re-verify' : 'Verify'}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
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

      {/* Uploaded Documents */}
      <Card className="mb-6">
        <CardHeader
          title="Uploaded Documents"
          description="Documents submitted by the applicant"
        />
        <CardContent>
          <div>
            {renderDocumentItem('Photo ID', documents?.photoId, 'photoId')}
            {renderDocumentItem('SSN Card', documents?.ssnCard, 'ssnCard')}
            {renderDocumentItem('Lease Agreement', documents?.leaseAgreement, 'leaseAgreement')}
            {documents?.otherDocuments?.map((doc, index) => (
              <div key={index}>
                {renderDocumentItem(`Other Document ${index + 1}`, doc, `other_${index}`)}
              </div>
            ))}
            {!documents?.photoId &&
              !documents?.ssnCard &&
              !documents?.leaseAgreement &&
              (!documents?.otherDocuments || documents.otherDocuments.length === 0) && (
                <p className="text-sm text-gray-500 py-4">No documents uploaded</p>
              )}
          </div>

          {canVerify && (
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowRequestModal(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Request Additional Documents
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Requests */}
      <Card className="mb-6">
        <CardHeader
          title="Document Requests"
          description="Additional documents requested from the applicant"
        />
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : documentRequests.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              No additional documents have been requested
            </p>
          ) : (
            <div className="space-y-4">
              {documentRequests.map(request => (
                <div
                  key={request.id}
                  className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {DOCUMENT_TYPES.find(d => d.value === request.documentType)?.label ||
                          request.documentType}
                      </p>
                      {getRequestStatusBadge(request)}
                      {request.required && (
                        <span className="text-xs text-red-600">Required</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested by {request.requestedByName} on{' '}
                      {new Date(request.requestedAt.seconds * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  {request.fulfilledAt && request.storagePath && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPreviewModal(
                          DOCUMENT_TYPES.find(d => d.value === request.documentType)?.label || request.documentType,
                          request.storagePath!
                        )}
                        title="Preview"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadDocument(request.storagePath!)}
                        title="Download"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </Button>
                      {canVerify && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openVerifyModal(
                              request.documentType,
                              request.storagePath!,
                              DOCUMENT_TYPES.find(d => d.value === request.documentType)?.label || request.documentType
                            )
                          }
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Documents Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Request Additional Documents"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Select Documents to Request</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {DOCUMENT_TYPES.map(doc => (
                <label
                  key={doc.value}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedDocTypes.includes(doc.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDocTypes([...selectedDocTypes, doc.value]);
                      } else {
                        setSelectedDocTypes(selectedDocTypes.filter(d => d !== doc.value));
                      }
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{doc.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Message to Applicant (Optional)</label>
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              className="w-full"
              rows={3}
              placeholder="Explain why these documents are needed..."
            />
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowRequestModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRequestDocuments}
            disabled={selectedDocTypes.length === 0 || processing}
          >
            {processing ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            Send Request
          </Button>
        </ModalFooter>
      </Modal>

      {/* Verify Document Modal */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Verify Document"
        size="md"
      >
        {selectedDocument && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900">
                {DOCUMENT_TYPES.find(d => d.value === selectedDocument.type)?.label ||
                  selectedDocument.type}
              </p>
              <p className="text-xs text-gray-500">{selectedDocument.fileName}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => openPreviewModal(selectedDocument.fileName, selectedDocument.path)}
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                Preview Document
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleDownloadDocument(selectedDocument.path)}
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                className="w-full"
                rows={3}
                placeholder="Add any notes about this document..."
              />
            </div>
          </div>
        )}

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowVerifyModal(false)}>
            Cancel
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleVerifyDocument(false)}
            disabled={processing}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <XCircleIcon className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button onClick={() => handleVerifyDocument(true)} disabled={processing}>
            {processing ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Verify
          </Button>
        </ModalFooter>
      </Modal>

      {/* Document Preview Modal */}
      {showPreviewModal && previewDocument && (
        <DocumentPreview
          fileName={previewDocument.fileName}
          storagePath={previewDocument.storagePath}
          contentType={previewDocument.contentType}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewDocument(null);
          }}
          isModal={true}
        />
      )}
    </>
  );
}
