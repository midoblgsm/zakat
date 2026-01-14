/**
 * Notification Service
 * Handles in-app notifications with real-time updates
 */
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { firebaseDb } from './firebase';
import type { Notification, NotificationType } from '../types/notification';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    maxResults?: number;
  } = {}
): Promise<Notification[]> {
  const { unreadOnly = false, maxResults = 50 } = options;

  try {
    let q = query(
      collection(firebaseDb, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );

    if (unreadOnly) {
      q = query(
        collection(firebaseDb, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(maxResults)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(firebaseDb, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const docRef = doc(firebaseDb, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(docRef, {
      read: true,
      readAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(firebaseDb, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(firebaseDb);
    const now = serverTimestamp();

    snapshot.docs.forEach((document) => {
      batch.update(document.ref, {
        read: true,
        readAt: now,
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time notification updates
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  options: {
    unreadOnly?: boolean;
    maxResults?: number;
  } = {}
): Unsubscribe {
  const { unreadOnly = false, maxResults = 50 } = options;

  let q = query(
    collection(firebaseDb, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  if (unreadOnly) {
    q = query(
      collection(firebaseDb, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
      callback(notifications);
    },
    (error) => {
      console.error('Error subscribing to notifications:', error);
    }
  );
}

/**
 * Subscribe to unread notification count
 */
export function subscribeToUnreadCount(
  userId: string,
  callback: (count: number) => void
): Unsubscribe {
  const q = query(
    collection(firebaseDb, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    where('read', '==', false)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.size);
    },
    (error) => {
      console.error('Error subscribing to unread count:', error);
      callback(0);
    }
  );
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'application_submitted':
      return 'paper-airplane';
    case 'application_assigned':
      return 'user-plus';
    case 'application_released':
      return 'arrow-path';
    case 'status_update':
      return 'pencil-square';
    case 'document_requested':
      return 'document-arrow-up';
    case 'application_approved':
      return 'check-circle';
    case 'application_rejected':
      return 'x-circle';
    case 'new_application_in_pool':
      return 'inbox';
    case 'system_announcement':
      return 'megaphone';
    default:
      return 'bell';
  }
}

/**
 * Get notification color based on type
 */
export function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'application_approved':
      return 'green';
    case 'application_rejected':
      return 'red';
    case 'document_requested':
    case 'status_update':
      return 'amber';
    case 'application_submitted':
    case 'new_application_in_pool':
      return 'blue';
    case 'application_assigned':
    case 'application_released':
      return 'indigo';
    case 'system_announcement':
      return 'purple';
    default:
      return 'gray';
  }
}

/**
 * Format notification timestamp for display
 */
export function formatNotificationTime(timestamp: Timestamp | Date): string {
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }

  // Older
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Group notifications by date
 */
export function groupNotificationsByDate(
  notifications: Notification[]
): { label: string; notifications: Notification[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  const groups: { label: string; notifications: Notification[] }[] = [
    { label: 'Today', notifications: [] },
    { label: 'Yesterday', notifications: [] },
    { label: 'This Week', notifications: [] },
    { label: 'Older', notifications: [] },
  ];

  notifications.forEach((notification) => {
    const date =
      notification.createdAt instanceof Date
        ? notification.createdAt
        : notification.createdAt.toDate();

    if (date >= today) {
      groups[0].notifications.push(notification);
    } else if (date >= yesterday) {
      groups[1].notifications.push(notification);
    } else if (date >= thisWeek) {
      groups[2].notifications.push(notification);
    } else {
      groups[3].notifications.push(notification);
    }
  });

  // Filter out empty groups
  return groups.filter((group) => group.notifications.length > 0);
}
