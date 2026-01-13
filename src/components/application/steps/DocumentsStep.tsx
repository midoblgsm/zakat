import { useCallback, useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import {
  DocumentIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../common/Button';
import { Checkbox } from '../../forms';
import { FormStep } from '../../forms/FormStep';
import { Alert } from '../../common/Alert';
import type { DocumentsFormData } from '../../../schemas/application';

interface UploadedFile {
  fileName: string;
  storagePath: string;
  uploadedAt: string;
  verified: boolean;
}

interface FileUploadCardProps {
  label: string;
  description: string;
  required?: boolean;
  accept?: string;
  file?: UploadedFile;
  isUploading?: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
}

function FileUploadCard({
  label,
  description,
  required,
  accept = '.pdf,.jpg,.jpeg,.png',
  file,
  isUploading,
  onUpload,
  onRemove,
}: FileUploadCardProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await onUpload(selectedFile);
    }
    e.target.value = '';
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
          <div className="flex items-center justify-between bg-gray-50 rounded p-3">
            <div className="flex items-center">
              <DocumentIcon className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                  {file.fileName}
                </p>
                <p className="text-xs text-gray-500">
                  Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="cursor-pointer block">
            <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors">
              {isUploading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin h-6 w-6 text-primary-500 mr-2"
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
                  <span className="text-sm text-gray-600">Uploading...</span>
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
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<{ documents: DocumentsFormData }>();

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'documents.otherDocuments',
  });

  const photoId = watch('documents.photoId');
  const ssnCard = watch('documents.ssnCard');
  const leaseAgreement = watch('documents.leaseAgreement');

  // Simulated upload function - in production, this would upload to Firebase Storage
  const handleUpload = useCallback(
    async (docType: string, file: File): Promise<void> => {
      setUploadingDoc(docType);
      setUploadError(null);

      try {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('File size must be less than 10MB');
        }

        // Simulate upload delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // In production, this would be the actual upload to Firebase Storage
        const uploadedFile: UploadedFile = {
          fileName: file.name,
          storagePath: `documents/${Date.now()}_${file.name}`,
          uploadedAt: new Date().toISOString(),
          verified: false,
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
        setUploadError(
          error instanceof Error ? error.message : 'Failed to upload file'
        );
      } finally {
        setUploadingDoc(null);
      }
    },
    [setValue, append]
  );

  const handleRemove = useCallback(
    (docType: string, index?: number) => {
      if (docType === 'photoId') {
        setValue('documents.photoId', undefined);
      } else if (docType === 'ssnCard') {
        setValue('documents.ssnCard', undefined);
      } else if (docType === 'leaseAgreement') {
        setValue('documents.leaseAgreement', undefined);
      } else if (docType === 'other' && index !== undefined) {
        remove(index);
      }
    },
    [setValue, remove]
  );

  return (
    <FormStep
      title="Document Upload"
      description="Please upload the required documents to support your application. All documents are kept secure and confidential."
    >
      <div className="space-y-6">
        {uploadError && (
          <Alert variant="error" onClose={() => setUploadError(null)}>
            {uploadError}
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
              onUpload={(file) => handleUpload('photoId', file)}
              onRemove={() => handleRemove('photoId')}
            />

            <FileUploadCard
              label="Social Security Card"
              description="Copy of your Social Security card"
              required
              file={ssnCard as UploadedFile | undefined}
              isUploading={uploadingDoc === 'ssnCard'}
              onUpload={(file) => handleUpload('ssnCard', file)}
              onRemove={() => handleRemove('ssnCard')}
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
              onUpload={(file) => handleUpload('leaseAgreement', file)}
              onRemove={() => handleRemove('leaseAgreement')}
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
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between bg-gray-50 rounded p-3 border"
                >
                  <div className="flex items-center">
                    <DocumentIcon className="h-6 w-6 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {(field as unknown as UploadedFile).fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Uploaded{' '}
                        {new Date(
                          (field as unknown as UploadedFile).uploadedAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove('other', index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <label className="cursor-pointer block">
            <div className="flex items-center justify-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors">
              {uploadingDoc === 'other' ? (
                <span className="text-sm text-gray-600">Uploading...</span>
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
            All documents are encrypted and stored securely. Access is restricted
            to authorized administrators only. Your sensitive information is
            protected according to our privacy policy.
          </p>
        </div>
      </div>
    </FormStep>
  );
}
