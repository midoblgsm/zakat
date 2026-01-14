/**
 * NotificationBell Component
 * Displays notification bell icon with unread count and dropdown
 */
import { useState, useEffect, useRef, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Transition } from '@headlessui/react';
import {
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowUpIcon,
  UserPlusIcon,
  ArrowPathIcon,
  InboxIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
  MegaphoneIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToNotifications,
  subscribeToUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  formatNotificationTime,
  getNotificationColor,
} from '../../services/notification';
import { ROUTES } from '../../utils/constants';
import type { Notification, NotificationType } from '../../types/notification';

/**
 * Get icon component for notification type
 */
function NotificationIcon({
  type,
  className = 'h-5 w-5',
}: {
  type: NotificationType;
  className?: string;
}) {
  switch (type) {
    case 'application_submitted':
      return <PaperAirplaneIcon className={className} />;
    case 'application_assigned':
      return <UserPlusIcon className={className} />;
    case 'application_released':
      return <ArrowPathIcon className={className} />;
    case 'status_update':
      return <PencilSquareIcon className={className} />;
    case 'document_requested':
      return <DocumentArrowUpIcon className={className} />;
    case 'application_approved':
      return <CheckCircleIcon className={className} />;
    case 'application_rejected':
      return <XCircleIcon className={className} />;
    case 'new_application_in_pool':
      return <InboxIcon className={className} />;
    case 'system_announcement':
      return <MegaphoneIcon className={className} />;
    default:
      return <BellIcon className={className} />;
  }
}

/**
 * Get icon background color classes
 */
function getIconBgColor(type: NotificationType): string {
  const color = getNotificationColor(type);
  switch (color) {
    case 'green':
      return 'bg-green-100 text-green-600';
    case 'red':
      return 'bg-red-100 text-red-600';
    case 'amber':
      return 'bg-amber-100 text-amber-600';
    case 'blue':
      return 'bg-blue-100 text-blue-600';
    case 'indigo':
      return 'bg-indigo-100 text-indigo-600';
    case 'purple':
      return 'bg-purple-100 text-purple-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

/**
 * Notification item component
 */
function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  // Determine link based on notification type and data
  let linkTo: string | undefined;
  if (notification.applicationId) {
    // Check if user is admin or applicant based on notification type
    if (
      notification.type === 'new_application_in_pool' ||
      notification.type === 'application_assigned' ||
      notification.type === 'application_released'
    ) {
      linkTo = ROUTES.ADMIN.APPLICATION_DETAIL.replace(':id', notification.applicationId);
    } else {
      linkTo = ROUTES.APPLICANT.APPLICATION_DETAIL.replace(':id', notification.applicationId);
    }
  }

  const content = (
    <div
      className={`flex gap-3 p-3 rounded-lg transition-colors ${
        notification.read
          ? 'bg-white hover:bg-gray-50'
          : 'bg-blue-50 hover:bg-blue-100'
      }`}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getIconBgColor(
          notification.type
        )}`}
      >
        <NotificationIcon type={notification.type} className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            notification.read ? 'text-gray-600' : 'text-gray-900 font-medium'
          }`}
        >
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {formatNotificationTime(notification.createdAt)}
        </p>
      </div>
      {!notification.read && (
        <div className="flex-shrink-0">
          <span className="w-2 h-2 bg-blue-500 rounded-full block" />
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button className="w-full text-left" onClick={handleClick}>
      {content}
    </button>
  );
}

/**
 * NotificationBell main component
 */
export function NotificationBell() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribeNotifications = subscribeToNotifications(
      user.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        setIsLoading(false);
      },
      { maxResults: 20 }
    );

    const unsubscribeCount = subscribeToUnreadCount(user.uid, (count) => {
      setUnreadCount(count);
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeCount();
    };
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.uid);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        {unreadCount > 0 ? (
          <BellIconSolid className="h-6 w-6" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <Transition
        as={Fragment}
        show={isOpen}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                <CheckIcon className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  We'll notify you when something happens
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={handleMarkAsRead}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100">
              <Link
                to={ROUTES.APPLICANT.APPLICATIONS}
                onClick={() => setIsOpen(false)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      </Transition>
    </div>
  );
}

export default NotificationBell;
