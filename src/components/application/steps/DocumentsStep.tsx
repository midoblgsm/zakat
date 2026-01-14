import { useCallback, useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import {
  DocumentIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../common/Button';
import { Checkbox } from '../../forms';
import { FormStep } from '../../forms/FormStep';
import { Alert } from '../../common/Alert';
import { useAuth } from '../../../contexts/AuthContext';
import {
  uploadApplicationDocument,
  deleteFile,
  getFileDownloadUrl,
  formatFileSize,
} from '../../../services/storage';
import {
  validateFile,
  getReadableFileType,
} from '../../../utils/fileValidation';
import type { DocumentsFormData } from '../../../schemas/application';

interface UploadedFile {
  fileName: string;
  storagePath: string;
  uploadedAt: string;
  verified: boolean;
  downloadUrl?: string;
  size?: number;
  contentType?: string;
}

interface FileUploadCardProps {
  label: string;
  description: string;
  required?: boolean;
  accept?: string;
  file?: UploadedFile;
  isUploading?: boolean;
  uploadProgress?: number;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
  onPreview?: () => void;
}

function FileUploadCard({
  label,
  description,
  required,
  accept = '.pdf,.jpg,.jpeg,.png',
  file,
  isUploading,
  uploadProgress = 0,
  onUpload,
  onRemove,
  onPreview,
}: FileUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await onUpload(selectedFile);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await onUpload(droppedFile);
    }
  };

  const handleDownload = async () => {
    if (file?.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
    } else if (file?.storagePath) {
      try {
        const url = await getFileDownloadUrl(file.storagePath);
        window.open(url, '_blank');
      } catch (error) {
        console.error('Failed to get download URL:', error);
      }
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </h4>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        {file && (
          <div className="flex items-center">
            {file.verified ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <span className="text-xs text-gray-400">Pending verification</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        {file ? (
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {file.contentType?.startsWith('image/') ? (
                    <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center">
                      <DocumentIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded bg-red-100 flex items-center justify-center">
                      <DocumentIcon className="h-6 w-6 text-red-500" />
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {file.contentType && getReadableFileType(file.contentType)}
                    {file.size && ` - ${formatFileSize(file.size)}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onPreview}
                    title="Preview"
                  >
                    <EyeIcon className="h-4 w-4 text-gray-500" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  title="Download"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 text-gray-500" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  className="text-red-600 hover:text-red-700"
                  title="Remove"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <label
            className="cursor-pointer block"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div
              className={`flex flex-col items-center justify-center py-6 rounded-lg border-2 border-dashed transition-colors ${
                isDragging
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 bg-gray-50 hover:border-primary-400'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <svg
                    className="animate-spin h-8 w-8 text-primary-500 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Uploading... {uploadProgress > 0 && `${uploadProgress}%`}
                  </span>
                  {uploadProgress > 0 && (
                    <div className="w-48 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    PDF, JPG, or PNG (max 10MB)
                  </span>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export function DocumentsStep() {
  const { user } = useAuth();
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<{ documents: DocumentsFormData }>();

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'documents.otherDocuments',
  });

  const photoId = watch('documents.photoId');
  const ssnCard = watch('documents.ssnCard');
  const leaseAgreement = watch('documents.leaseAgreement');

  // Generate a temporary application ID for new applications based on user ID
  const applicationId = `temp_${user?.uid || 'unknown'}`;

  const handleUpload = useCallback(
    async (docType: string, file: File): Promise<void> => {
      setUploadingDoc(docType);
      setUploadProgress(0);
      setUploadError(null);

      try {
        // Validate file first
        const validation = await validateFile(file);
        if (!validation.isValid) {
          throw new Error(validation.errors[0]);
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
          console.warn('File validation warnings:', validation.warnings);
        }

        // Upload to Firebase Storage
        const result = await uploadApplicationDocument(
          applicationId,
          docType,
          file,
          (progress) => setUploadProgress(progress)
        );

        const uploadedFile: UploadedFile = {
          fileName: result.fileName,
          storagePath: result.storagePath,
          uploadedAt: result.uploadedAt,
          verified: false,
          downloadUrl: result.downloadUrl,
          size: result.size,
          contentType: result.contentType,
        };

        if (docType === 'photoId') {
          setValue('documents.photoId', uploadedFile);
        } else if (docType === 'ssnCard') {
          setValue('documents.ssnCard', uploadedFile);
        } else if (docType === 'leaseAgreement') {
          setValue('documents.leaseAgreement', uploadedFile);
        } else if (docType === 'other') {
          append(uploadedFile);
        }
      } catch (error) {
        console.error('Upload error:', error);
        setUploadError(
          error instanceof Error ? error.message : 'Failed to upload file'
        );
      } finally {
        setUploadingDoc(null);
        setUploadProgress(0);
      }
    },
    [setValue, append, applicationId]
  );

  const handleRemove = useCallback(
    async (docType: string, index?: number) => {
      try {
        let storagePath: string | undefined;

        if (docType === 'photoId') {
          storagePath = (photoId as UploadedFile | undefined)?.storagePath;
          setValue('documents.photoId', undefined);
        } else if (docType === 'ssnCard') {
          storagePath = (ssnCard as UploadedFile | undefined)?.storagePath;
          setValue('documents.ssnCard', undefined);
        } else if (docType === 'leaseAgreement') {
          storagePath = (leaseAgreement as UploadedFile | undefined)?.storagePath;
          setValue('documents.leaseAgreement', undefined);
        } else if (docType === 'other' && index !== undefined) {
          storagePath = (fields[index] as unknown as UploadedFile)?.storagePath;
          remove(index);
        }

        // Delete from storage if path exists
        if (storagePath) {
          try {
            await deleteFile(storagePath);
          } catch (error) {
            // Log but don't fail - file might already be deleted
            console.warn('Could not delete file from storage:', error);
          }
        }
      } catch (error) {
        console.error('Error removing file:', error);
      }
    },
    [setValue, remove, photoId, ssnCard, leaseAgreement, fields]
  );

  const handlePreview = useCallback(async (file: UploadedFile) => {
    try {
      const url = file.downloadUrl || (await getFileDownloadUrl(file.storagePath));
      setPreviewUrl(url);
      setPreviewFile(file);
    } catch (error) {
      console.error('Error getting preview URL:', error);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewUrl(null);
    setPreviewFile(null);
  }, []);

  return (
    <FormStep
      title="Document Upload"
      description="Please upload the required documents to support your application. All documents are kept secure and confidential."
    >
      <div className="space-y-6">
        {uploadError && (
          <Alert variant="error" onClose={() => setUploadError(null)}>
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          </Alert>
        )}

        {/* Required Documents */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Required Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUploadCard
              label="Photo ID"
              description="Valid government-issued photo ID (driver's license, passport, state ID)"
              required
              file={photoId as UploadedFile | undefined}
              isUploading={uploadingDoc === 'photoId'}
              uploadProgress={uploadingDoc === 'photoId' ? uploadProgress : 0}
              onUpload={(file) => handleUpload('photoId', file)}
              onRemove={() => handleRemove('photoId')}
              onPreview={
                photoId
                  ? () => handlePreview(photoId as UploadedFile)
                  : undefined
              }
            />

            <FileUploadCard
              label="Social Security Card"
              description="Copy of your Social Security card"
              required
              file={ssnCard as UploadedFile | undefined}
              isUploading={uploadingDoc === 'ssnCard'}
              uploadProgress={uploadingDoc === 'ssnCard' ? uploadProgress : 0}
              onUpload={(file) => handleUpload('ssnCard', file)}
              onRemove={() => handleRemove('ssnCard')}
              onPreview={
                ssnCard
                  ? () => handlePreview(ssnCard as UploadedFile)
                  : undefined
              }
            />
          </div>
        </div>

        {/* Optional Documents */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Additional Documents
          </h3>
          <div className="space-y-4">
            <FileUploadCard
              label="Lease Agreement / Proof of Residence"
              description="Current lease, utility bill, or other proof of residence"
              file={leaseAgreement as UploadedFile | undefined}
              isUploading={uploadingDoc === 'leaseAgreement'}
              uploadProgress={
                uploadingDoc === 'leaseAgreement' ? uploadProgress : 0
              }
              onUpload={(file) => handleUpload('leaseAgreement', file)}
              onRemove={() => handleRemove('leaseAgreement')}
              onPreview={
                leaseAgreement
                  ? () => handlePreview(leaseAgreement as UploadedFile)
                  : undefined
              }
            />
          </div>
        </div>

        {/* Other Supporting Documents */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Other Supporting Documents
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload any additional documents that may support your application
            (medical bills, termination letters, eviction notices, etc.)
          </p>

          {fields.length > 0 && (
            <div className="space-y-3 mb-4">
              {fields.map((field, index) => {
                const uploadedField = field as unknown as UploadedFile;
                return (
                  <div
                    key={field.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border"
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center mr-3">
                        <DocumentIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {uploadedField.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {uploadedField.contentType &&
                            getReadableFileType(uploadedField.contentType)}
                          {uploadedField.size &&
                            ` - ${formatFileSize(uploadedField.size)}`}
                          {' - '}
                          Uploaded{' '}
                          {new Date(uploadedField.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(uploadedField)}
                        title="Preview"
                      >
                        <EyeIcon className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove('other', index)}
                        className="text-red-600 hover:text-red-700"
                        title="Remove"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <label className="cursor-pointer block">
            <div
              className={`flex items-center justify-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors ${
                uploadingDoc === 'other' ? 'pointer-events-none' : ''
              }`}
            >
              {uploadingDoc === 'other' ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin h-5 w-5 text-primary-500 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Uploading... {uploadProgress > 0 && `${uploadProgress}%`}
                  </span>
                </div>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    Add Supporting Document
                  </span>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleUpload('other', file);
                }
                e.target.value = '';
              }}
              disabled={uploadingDoc === 'other'}
            />
          </label>
        </div>

        {/* Acknowledgement */}
        <div className="border-t pt-6">
          <Checkbox
            label="I certify that all documents uploaded are authentic and accurate. I understand that providing false documentation may result in denial of my application and potential legal consequences."
            {...register('documents.acknowledgement')}
            error={errors.documents?.acknowledgement?.message}
            required
          />
        </div>

        {/* Security Note */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Document Security
          </h4>
          <p className="text-sm text-gray-600">
            All documents are encrypted and stored securely in Firebase Storage.
            Access is restricted to authorized administrators only. Your sensitive
            information is protected according to our privacy policy.
          </p>
        </div>
      </div>

      {/* Preview Modal */}
      {previewUrl && previewFile && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="preview-modal"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closePreview}
            />
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {previewFile.fileName}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closePreview}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              </div>
              <div className="max-h-[70vh] overflow-auto">
                {previewFile.contentType?.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt={previewFile.fileName}
                    className="max-w-full h-auto mx-auto"
                  />
                ) : previewFile.contentType === 'application/pdf' ? (
                  <iframe
                    src={previewUrl}
                    title={previewFile.fileName}
                    className="w-full h-[60vh]"
                  />
                ) : (
                  <div className="text-center py-8">
                    <DocumentIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Preview not available for this file type
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => window.open(previewUrl, '_blank')}
                    >
                      Download to View
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </FormStep>
  );
}
