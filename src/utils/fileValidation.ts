/**
 * File Validation Utilities
 * Provides comprehensive file validation including magic number detection
 */

/**
 * File type definition with magic numbers
 */
interface FileTypeSignature {
  mimeType: string;
  extension: string;
  signatures: number[][];
  offset?: number;
}

/**
 * Known file signatures (magic numbers)
 */
const FILE_SIGNATURES: FileTypeSignature[] = [
  // PDF
  {
    mimeType: 'application/pdf',
    extension: 'pdf',
    signatures: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  },
  // JPEG
  {
    mimeType: 'image/jpeg',
    extension: 'jpg',
    signatures: [[0xff, 0xd8, 0xff]],
  },
  // PNG
  {
    mimeType: 'image/png',
    extension: 'png',
    signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  },
  // GIF
  {
    mimeType: 'image/gif',
    extension: 'gif',
    signatures: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    ],
  },
  // WebP
  {
    mimeType: 'image/webp',
    extension: 'webp',
    signatures: [[0x52, 0x49, 0x46, 0x46]], // RIFF (additional check needed)
  },
  // DOC (old Word format)
  {
    mimeType: 'application/msword',
    extension: 'doc',
    signatures: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  },
  // DOCX (new Word format - ZIP-based)
  {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: 'docx',
    signatures: [[0x50, 0x4b, 0x03, 0x04]], // PK (ZIP signature)
  },
];

/**
 * Read file header as byte array
 */
async function readFileHeader(file: File, bytes: number = 12): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
}

/**
 * Check if byte array matches a signature
 */
function matchesSignature(bytes: Uint8Array, signature: number[], offset: number = 0): boolean {
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Detect file type from magic numbers
 */
export async function detectFileType(file: File): Promise<{
  mimeType: string;
  extension: string;
  isValid: boolean;
}> {
  try {
    const header = await readFileHeader(file);

    for (const fileType of FILE_SIGNATURES) {
      for (const signature of fileType.signatures) {
        if (matchesSignature(header, signature, fileType.offset || 0)) {
          return {
            mimeType: fileType.mimeType,
            extension: fileType.extension,
            isValid: true,
          };
        }
      }
    }

    // If no signature matched, return the browser-reported type
    return {
      mimeType: file.type || 'application/octet-stream',
      extension: file.name.split('.').pop()?.toLowerCase() || '',
      isValid: false,
    };
  } catch {
    return {
      mimeType: file.type || 'application/octet-stream',
      extension: file.name.split('.').pop()?.toLowerCase() || '',
      isValid: false,
    };
  }
}

/**
 * Validation options
 */
export interface ValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  validateMagicNumbers?: boolean;
  minDimensions?: { width: number; height: number };
  maxDimensions?: { width: number; height: number };
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedType?: {
    mimeType: string;
    extension: string;
  };
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: ValidationOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ],
  allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
  validateMagicNumbers: true,
};

/**
 * Validate file comprehensively
 */
export async function validateFile(
  file: File,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if file exists
  if (!file) {
    return { isValid: false, errors: ['No file provided'], warnings };
  }

  // Check for empty file
  if (file.size === 0) {
    return { isValid: false, errors: ['File is empty'], warnings };
  }

  // Check file size
  if (opts.maxSize && file.size > opts.maxSize) {
    const maxMB = (opts.maxSize / (1024 * 1024)).toFixed(1);
    const fileMB = (file.size / (1024 * 1024)).toFixed(2);
    errors.push(`File size (${fileMB}MB) exceeds maximum allowed size (${maxMB}MB)`);
  }

  // Check extension
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (opts.allowedExtensions && !opts.allowedExtensions.includes(extension)) {
    errors.push(
      `File extension ".${extension}" is not allowed. Allowed: ${opts.allowedExtensions.join(', ')}`
    );
  }

  // Check MIME type
  if (opts.allowedTypes && !opts.allowedTypes.includes(file.type)) {
    errors.push(
      `File type "${file.type || 'unknown'}" is not allowed. Allowed types: PDF, JPEG, PNG, WebP`
    );
  }

  // Validate magic numbers
  let detectedType;
  if (opts.validateMagicNumbers) {
    detectedType = await detectFileType(file);

    if (!detectedType.isValid) {
      warnings.push('Could not verify file type from content');
    } else if (
      opts.allowedTypes &&
      !opts.allowedTypes.includes(detectedType.mimeType)
    ) {
      errors.push(
        `File content type "${detectedType.mimeType}" doesn't match allowed types`
      );
    }

    // Check for mismatched extension and content
    if (detectedType.extension && extension !== detectedType.extension) {
      // Allow jpg/jpeg mismatch
      if (
        !(
          (extension === 'jpg' && detectedType.extension === 'jpeg') ||
          (extension === 'jpeg' && detectedType.extension === 'jpg')
        )
      ) {
        warnings.push(
          `File extension (.${extension}) doesn't match detected content type (.${detectedType.extension})`
        );
      }
    }
  }

  // Validate image dimensions if needed
  if (
    (opts.minDimensions || opts.maxDimensions) &&
    file.type.startsWith('image/')
  ) {
    try {
      const dimensions = await getImageDimensions(file);

      if (opts.minDimensions) {
        if (
          dimensions.width < opts.minDimensions.width ||
          dimensions.height < opts.minDimensions.height
        ) {
          errors.push(
            `Image dimensions (${dimensions.width}x${dimensions.height}) are below minimum (${opts.minDimensions.width}x${opts.minDimensions.height})`
          );
        }
      }

      if (opts.maxDimensions) {
        if (
          dimensions.width > opts.maxDimensions.width ||
          dimensions.height > opts.maxDimensions.height
        ) {
          errors.push(
            `Image dimensions (${dimensions.width}x${dimensions.height}) exceed maximum (${opts.maxDimensions.width}x${opts.maxDimensions.height})`
          );
        }
      }
    } catch {
      warnings.push('Could not validate image dimensions');
    }
  }

  // Check for potentially dangerous file names
  const dangerousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.sh$/i,
    /\.ps1$/i,
    /\.vbs$/i,
    /\.js$/i,
    /\.html?$/i,
    /\.\./,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(file.name)) {
      errors.push('File name contains potentially dangerous characters or extension');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    detectedType,
  };
}

/**
 * Get image dimensions
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}

/**
 * Check if file is a document (Word)
 */
export function isDocumentFile(file: File): boolean {
  return (
    file.type === 'application/msword' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}

/**
 * Get human-readable file type
 */
export function getReadableFileType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF Document',
    'image/jpeg': 'JPEG Image',
    'image/jpg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/webp': 'WebP Image',
    'image/gif': 'GIF Image',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      'Word Document',
  };

  return typeMap[mimeType] || 'Unknown File Type';
}

/**
 * Sanitize file name for storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path components
  const name = fileName.split('/').pop() || fileName;

  // Get extension
  const parts = name.split('.');
  const extension = parts.length > 1 ? parts.pop() : '';
  const baseName = parts.join('.');

  // Sanitize base name
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9-_\s]/g, '') // Remove special chars except dash, underscore, space
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100); // Limit length

  return extension ? `${sanitized}.${extension}` : sanitized;
}

/**
 * Generate a preview URL for a file
 */
export function createFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL
 */
export function revokeFilePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
