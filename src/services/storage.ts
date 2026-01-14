/**
 * Firebase Storage Service
 * Handles file uploads, downloads, and management for the Zakat application
 */
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getMetadata,
  UploadTaskSnapshot,
  StorageReference,
} from 'firebase/storage';
import { firebaseStorage } from './firebase';

/**
 * Allowed file types for document uploads
 */
export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  documents: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ],
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  all: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

/**
 * File size limits in bytes
 */
export const FILE_SIZE_LIMITS = {
  default: 10 * 1024 * 1024, // 10MB
  large: 25 * 1024 * 1024, // 25MB
  image: 5 * 1024 * 1024, // 5MB
} as const;

/**
 * Upload progress callback type
 */
export type UploadProgressCallback = (progress: number) => void;

/**
 * Upload result interface
 */
export interface UploadResult {
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate a file before upload
 */
export function validateFile(
  file: File,
  options: {
    allowedTypes?: string[];
    maxSize?: number;
  } = {}
): FileValidationResult {
  const { allowedTypes = ALLOWED_FILE_TYPES.documents, maxSize = FILE_SIZE_LIMITS.default } =
    options;

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${getReadableFileTypes(allowedTypes)}`,
    };
  }

  // Check for empty files
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File appears to be empty',
    };
  }

  return { isValid: true };
}

/**
 * Get human-readable file types
 */
function getReadableFileTypes(mimeTypes: string[]): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/gif': 'GIF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  };

  return mimeTypes
    .map((type) => typeMap[type] || type)
    .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
    .join(', ');
}

/**
 * Generate a unique file name to avoid collisions
 */
function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 50);

  return `${baseName}_${timestamp}_${randomStr}.${extension}`;
}

/**
 * Get storage reference for application documents
 */
function getApplicationDocumentRef(
  applicationId: string,
  documentType: string,
  fileName: string
): StorageReference {
  return ref(
    firebaseStorage,
    `applications/${applicationId}/documents/${documentType}/${fileName}`
  );
}

/**
 * Get storage reference for requested documents
 */
function getRequestedDocumentRef(
  applicationId: string,
  requestId: string,
  fileName: string
): StorageReference {
  return ref(
    firebaseStorage,
    `applications/${applicationId}/requested/${requestId}/${fileName}`
  );
}

/**
 * Get storage reference for user profile images
 */
function getUserProfileRef(userId: string, fileName: string): StorageReference {
  return ref(firebaseStorage, `users/${userId}/profile/${fileName}`);
}

/**
 * Get storage reference for user ID documents
 */
function getUserIdDocumentRef(userId: string, fileName: string): StorageReference {
  return ref(firebaseStorage, `users/${userId}/id_documents/${fileName}`);
}

/**
 * Get storage reference for temp uploads
 */
function getTempUploadRef(userId: string, fileName: string): StorageReference {
  return ref(firebaseStorage, `temp/${userId}/${fileName}`);
}

/**
 * Upload a file to Firebase Storage with progress tracking
 */
export async function uploadFile(
  storageRef: StorageReference,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
      },
      (error) => {
        console.error('Upload error:', error);
        reject(new Error(`Failed to upload file: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            fileName: file.name,
            storagePath: storageRef.fullPath,
            downloadUrl,
            contentType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Upload an application document
 */
export async function uploadApplicationDocument(
  applicationId: string,
  documentType: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  // Validate file first
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const uniqueFileName = generateUniqueFileName(file.name);
  const storageRef = getApplicationDocumentRef(applicationId, documentType, uniqueFileName);

  return uploadFile(storageRef, file, onProgress);
}

/**
 * Upload a document in response to an admin request
 */
export async function uploadRequestedDocument(
  applicationId: string,
  requestId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  // Validate file first
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const uniqueFileName = generateUniqueFileName(file.name);
  const storageRef = getRequestedDocumentRef(applicationId, requestId, uniqueFileName);

  return uploadFile(storageRef, file, onProgress);
}

/**
 * Upload a user profile image
 */
export async function uploadUserProfileImage(
  userId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  // Validate file - images only, smaller size limit
  const validation = validateFile(file, {
    allowedTypes: ALLOWED_FILE_TYPES.images,
    maxSize: FILE_SIZE_LIMITS.image,
  });
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const uniqueFileName = generateUniqueFileName(file.name);
  const storageRef = getUserProfileRef(userId, uniqueFileName);

  return uploadFile(storageRef, file, onProgress);
}

/**
 * Upload a user ID document
 */
export async function uploadUserIdDocument(
  userId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const uniqueFileName = generateUniqueFileName(file.name);
  const storageRef = getUserIdDocumentRef(userId, uniqueFileName);

  return uploadFile(storageRef, file, onProgress);
}

/**
 * Upload a temporary file
 */
export async function uploadTempFile(
  userId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const validation = validateFile(file, { maxSize: FILE_SIZE_LIMITS.large });
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const uniqueFileName = generateUniqueFileName(file.name);
  const storageRef = getTempUploadRef(userId, uniqueFileName);

  return uploadFile(storageRef, file, onProgress);
}

/**
 * Get download URL for a file
 */
export async function getFileDownloadUrl(storagePath: string): Promise<string> {
  const storageRef = ref(firebaseStorage, storagePath);
  return getDownloadURL(storageRef);
}

/**
 * Get file metadata
 */
export async function getFileMetadata(storagePath: string) {
  const storageRef = ref(firebaseStorage, storagePath);
  return getMetadata(storageRef);
}

/**
 * Delete a file from storage
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const storageRef = ref(firebaseStorage, storagePath);
  await deleteObject(storageRef);
}

/**
 * Check if a file exists in storage
 */
export async function fileExists(storagePath: string): Promise<boolean> {
  try {
    const storageRef = ref(firebaseStorage, storagePath);
    await getMetadata(storageRef);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file type category from MIME type
 */
export function getFileTypeCategory(mimeType: string): 'pdf' | 'image' | 'document' | 'unknown' {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'document';
  }
  return 'unknown';
}

/**
 * Get file extension from filename or MIME type
 */
export function getFileExtension(fileName: string, mimeType?: string): string {
  // Try to get from filename first
  const fromName = fileName.split('.').pop()?.toLowerCase();
  if (fromName) {
    return fromName;
  }

  // Fallback to MIME type
  if (mimeType) {
    const mimeExtensions: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };
    return mimeExtensions[mimeType] || '';
  }

  return '';
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
