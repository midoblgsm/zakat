import type { Timestamp } from 'firebase/firestore';

/**
 * Notification types
 */
export type NotificationType =
  | 'application_submitted'
  | 'application_assigned'
  | 'application_released'
  | 'status_update'
  | 'document_requested'
  | 'application_approved'
  | 'application_rejected'
  | 'new_application_in_pool'
  | 'system_announcement';

/**
 * Notification document stored in Firestore /notifications/{notificationId}
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: string;
  masjidId?: string;
  read: boolean;
  readAt?: Timestamp;
  createdAt: Timestamp;
}

/**
 * Create notification input
 */
export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: string;
  masjidId?: string;
}
