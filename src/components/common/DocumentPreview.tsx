/**
 * DocumentPreview Component
 * Reusable component for previewing documents (images and PDFs)
 */
import { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
} from '@heroicons/react/24/outline';
import { Button } from './Button';
import { getFileDownloadUrl, formatFileSize, getFileTypeCategory } from '../../services/storage';

interface DocumentPreviewProps {
  fileName: string;
  storagePath?: string;
  downloadUrl?: string;
  contentType?: string;
  size?: number;
  onClose?: () => void;
  isModal?: boolean;
}

/**
 * File type icon component
 */
function FileTypeIcon({ contentType }: { contentType: string }) {
  const category = getFileTypeCategory(contentType);

  switch (category) {
    case 'pdf':
      return (
        <div className="h-16 w-16 rounded-lg bg-red-100 flex items-center justify-center">
          <DocumentTextIcon className="h-8 w-8 text-red-600" />
          <span className="absolute text-xs font-bold text-red-600 mt-12">PDF</span>
        </div>
      );
    case 'image':
      return (
        <div className="h-16 w-16 rounded-lg bg-blue-100 flex items-center justify-center">
          <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    case 'document':
      return (
        <div className="h-16 w-16 rounded-lg bg-blue-100 flex items-center justify-center">
          <DocumentTextIcon className="h-8 w-8 text-blue-600" />
          <span className="absolute text-xs font-bold text-blue-600 mt-12">DOC</span>
        </div>
      );
    default:
      return (
        <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
          <DocumentTextIcon className="h-8 w-8 text-gray-600" />
        </div>
      );
  }
}

/**
 * Image preview with zoom controls
 */
function ImagePreview({ url, alt }: { url: string; alt: string }) {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="relative">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-white/90 rounded-lg px-2 py-1 shadow">
        <button
          onClick={handleZoomOut}
          className="p-1 hover:bg-gray-100 rounded"
          title="Zoom out"
        >
          <MagnifyingGlassMinusIcon className="h-5 w-5 text-gray-600" />
        </button>
        <span className="text-sm text-gray-600 min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1 hover:bg-gray-100 rounded"
          title="Zoom in"
        >
          <MagnifyingGlassPlusIcon className="h-5 w-5 text-gray-600" />
        </button>
        {zoom !== 1 && (
          <button
            onClick={handleReset}
            className="p-1 hover:bg-gray-100 rounded text-xs text-primary-600"
            title="Reset"
          >
            Reset
          </button>
        )}
      </div>

      {/* Image container */}
      <div
        className="overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ height: '60vh' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={url}
          alt={alt}
          className="max-w-full h-full object-contain mx-auto transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}

/**
 * PDF preview using iframe
 */
function PdfPreview({ url, title }: { url: string; title: string }) {
  return (
    <iframe
      src={url}
      title={title}
      className="w-full h-[70vh] border-0"
    />
  );
}

/**
 * Fallback for unsupported file types
 */
function UnsupportedPreview({
  fileName,
  contentType,
  size,
  onDownload,
}: {
  fileName: string;
  contentType?: string;
  size?: number;
  onDownload: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <FileTypeIcon contentType={contentType || ''} />
      <h3 className="mt-4 text-lg font-medium text-gray-900">{fileName}</h3>
      {contentType && (
        <p className="text-sm text-gray-500 mt-1">Type: {contentType}</p>
      )}
      {size && (
        <p className="text-sm text-gray-500">Size: {formatFileSize(size)}</p>
      )}
      <p className="text-sm text-gray-500 mt-4">
        Preview not available for this file type
      </p>
      <Button className="mt-4" onClick={onDownload}>
        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
        Download to View
      </Button>
    </div>
  );
}

/**
 * Main DocumentPreview component
 */
export function DocumentPreview({
  fileName,
  storagePath,
  downloadUrl,
  contentType,
  size,
  onClose,
  isModal = true,
}: DocumentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(downloadUrl || null);
  const [isLoading, setIsLoading] = useState(!downloadUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUrl() {
      if (downloadUrl) {
        setPreviewUrl(downloadUrl);
        setIsLoading(false);
        return;
      }

      if (!storagePath) {
        setError('No file path provided');
        setIsLoading(false);
        return;
      }

      try {
        const url = await getFileDownloadUrl(storagePath);
        setPreviewUrl(url);
      } catch (err) {
        setError('Failed to load document');
        console.error('Error loading document:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUrl();
  }, [storagePath, downloadUrl]);

  const handleDownload = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const isImage = contentType?.startsWith('image/');
  const isPdf = contentType === 'application/pdf';

  // Inline preview (non-modal)
  if (!isModal) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      );
    }

    if (error || !previewUrl) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-red-600">{error || 'Unable to load preview'}</p>
        </div>
      );
    }

    if (isImage) {
      return <ImagePreview url={previewUrl} alt={fileName} />;
    }

    if (isPdf) {
      return <PdfPreview url={previewUrl} title={fileName} />;
    }

    return (
      <UnsupportedPreview
        fileName={fileName}
        contentType={contentType}
        size={size}
        onDownload={handleDownload}
      />
    );
  }

  // Modal preview
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="preview-modal"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Centering element */}
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <FileTypeIcon contentType={contentType || ''} />
              <div>
                <h3 className="text-lg font-medium text-gray-900 truncate max-w-[300px]">
                  {fileName}
                </h3>
                {size && (
                  <p className="text-sm text-gray-500">{formatFileSize(size)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Download
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin h-12 w-12 border-3 border-primary-500 border-t-transparent rounded-full" />
              </div>
            ) : error || !previewUrl ? (
              <div className="text-center py-16">
                <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-red-600">
                  {error || 'Unable to load preview'}
                </p>
              </div>
            ) : isImage ? (
              <ImagePreview url={previewUrl} alt={fileName} />
            ) : isPdf ? (
              <PdfPreview url={previewUrl} title={fileName} />
            ) : (
              <UnsupportedPreview
                fileName={fileName}
                contentType={contentType}
                size={size}
                onDownload={handleDownload}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Document thumbnail component for lists
 */
export function DocumentThumbnail({
  fileName,
  contentType,
  size,
  verified,
  onPreview,
  onDownload,
  onRemove,
}: {
  fileName: string;
  contentType?: string;
  size?: number;
  verified?: boolean;
  onPreview?: () => void;
  onDownload?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <FileTypeIcon contentType={contentType || ''} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
            {fileName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {size && (
              <span className="text-xs text-gray-500">
                {formatFileSize(size)}
              </span>
            )}
            {verified !== undefined && (
              <span
                className={`text-xs ${
                  verified ? 'text-green-600' : 'text-amber-600'
                }`}
              >
                {verified ? 'Verified' : 'Pending'}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {onPreview && (
          <button
            onClick={onPreview}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title="Preview"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title="Download"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
            title="Remove"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default DocumentPreview;
