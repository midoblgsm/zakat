/**
 * Application Timeline Component
 * Displays a visual timeline of all actions taken on an application
 */
import { useMemo } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  UserPlusIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  FlagIcon,
  PencilSquareIcon,
  BanknotesIcon,
  PaperAirplaneIcon,
  DocumentCheckIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import { APPLICATION_STATUS_LABELS } from '../../utils/constants';
import type { ApplicationHistoryEntry, HistoryAction } from '../../types/application';

interface ApplicationTimelineProps {
  history: ApplicationHistoryEntry[];
  showDetailed?: boolean;
  maxItems?: number;
  className?: string;
}

/**
 * Get icon for history action
 */
function getActionIcon(action: HistoryAction) {
  switch (action) {
    case 'created':
      return <DocumentTextIcon className="h-4 w-4" />;
    case 'submitted':
      return <PaperAirplaneIcon className="h-4 w-4" />;
    case 'assigned':
      return <UserPlusIcon className="h-4 w-4" />;
    case 'released':
      return <ArrowPathIcon className="h-4 w-4" />;
    case 'status_changed':
      return <PencilSquareIcon className="h-4 w-4" />;
    case 'note_added':
      return <ChatBubbleLeftIcon className="h-4 w-4" />;
    case 'document_uploaded':
      return <DocumentArrowUpIcon className="h-4 w-4" />;
    case 'document_verified':
      return <DocumentCheckIcon className="h-4 w-4" />;
    case 'approved':
      return <CheckCircleIcon className="h-4 w-4" />;
    case 'rejected':
      return <XCircleIcon className="h-4 w-4" />;
    case 'disbursed':
      return <BanknotesIcon className="h-4 w-4" />;
    case 'flagged':
      return <FlagIcon className="h-4 w-4" />;
    case 'edited':
      return <PencilSquareIcon className="h-4 w-4" />;
    default:
      return <ClockIcon className="h-4 w-4" />;
  }
}

/**
 * Get color classes for history action
 */
function getActionColors(action: HistoryAction): {
  bg: string;
  icon: string;
  ring: string;
} {
  switch (action) {
    case 'approved':
    case 'disbursed':
      return {
        bg: 'bg-green-100',
        icon: 'text-green-600',
        ring: 'ring-green-50',
      };
    case 'rejected':
      return {
        bg: 'bg-red-100',
        icon: 'text-red-600',
        ring: 'ring-red-50',
      };
    case 'flagged':
      return {
        bg: 'bg-amber-100',
        icon: 'text-amber-600',
        ring: 'ring-amber-50',
      };
    case 'submitted':
      return {
        bg: 'bg-blue-100',
        icon: 'text-blue-600',
        ring: 'ring-blue-50',
      };
    case 'document_uploaded':
    case 'document_verified':
      return {
        bg: 'bg-purple-100',
        icon: 'text-purple-600',
        ring: 'ring-purple-50',
      };
    case 'assigned':
    case 'released':
      return {
        bg: 'bg-indigo-100',
        icon: 'text-indigo-600',
        ring: 'ring-indigo-50',
      };
    case 'note_added':
      return {
        bg: 'bg-cyan-100',
        icon: 'text-cyan-600',
        ring: 'ring-cyan-50',
      };
    default:
      return {
        bg: 'bg-gray-100',
        icon: 'text-gray-600',
        ring: 'ring-gray-50',
      };
  }
}

/**
 * Get human-readable action description
 */
function getActionDescription(entry: ApplicationHistoryEntry): string {
  switch (entry.action) {
    case 'created':
      return 'created the application';
    case 'submitted':
      return 'submitted the application for review';
    case 'assigned':
      return `claimed the application${entry.newAssignee ? '' : ''}`;
    case 'released':
      return 'released the application back to the pool';
    case 'status_changed':
      return 'changed the application status';
    case 'note_added':
      return 'added a note';
    case 'document_uploaded':
      return 'uploaded a document';
    case 'document_verified':
      return 'verified a document';
    case 'approved':
      return 'approved the application';
    case 'rejected':
      return 'rejected the application';
    case 'disbursed':
      return 'marked funds as disbursed';
    case 'flagged':
      return 'flagged the applicant';
    case 'edited':
      return 'edited the application';
    default:
      return entry.details || 'performed an action';
  }
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp: { seconds: number } | Date): string {
  const date =
    timestamp instanceof Date
      ? timestamp
      : new Date(timestamp.seconds * 1000);

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  // Older than 7 days - show full date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format full date and time
 */
function formatFullDateTime(timestamp: { seconds: number } | Date): string {
  const date =
    timestamp instanceof Date
      ? timestamp
      : new Date(timestamp.seconds * 1000);

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Timeline entry component
 */
function TimelineEntry({
  entry,
  isLast,
  showDetailed,
}: {
  entry: ApplicationHistoryEntry;
  isLast: boolean;
  showDetailed: boolean;
}) {
  const colors = getActionColors(entry.action);
  const icon = getActionIcon(entry.action);

  return (
    <li>
      <div className="relative pb-8">
        {/* Connecting line */}
        {!isLast && (
          <span
            className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
            aria-hidden="true"
          />
        )}

        <div className="relative flex space-x-3">
          {/* Icon */}
          <div>
            <span
              className={`h-8 w-8 rounded-full ${colors.bg} flex items-center justify-center ring-4 ${colors.ring}`}
            >
              <span className={colors.icon}>{icon}</span>
            </span>
          </div>

          {/* Content */}
          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
            <div>
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">
                  {entry.performedByName}
                </span>{' '}
                {getActionDescription(entry)}
              </p>

              {/* Status change indicator */}
              {entry.previousStatus && entry.newStatus && (
                <p className="mt-1 text-xs flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {APPLICATION_STATUS_LABELS[entry.previousStatus] ||
                      entry.previousStatus}
                  </span>
                  <span className="text-gray-400">&rarr;</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                    {APPLICATION_STATUS_LABELS[entry.newStatus] ||
                      entry.newStatus}
                  </span>
                </p>
              )}

              {/* Additional details */}
              {showDetailed && entry.details && (
                <p className="mt-1 text-xs text-gray-500">{entry.details}</p>
              )}

              {/* Role badge */}
              {showDetailed && entry.performedByRole && (
                <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  {entry.performedByRole.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Timestamp */}
            <div className="whitespace-nowrap text-right">
              <time
                dateTime={
                  entry.createdAt instanceof Date
                    ? entry.createdAt.toISOString()
                    : new Date(entry.createdAt.seconds * 1000).toISOString()
                }
                className="text-sm text-gray-500"
                title={formatFullDateTime(entry.createdAt)}
              >
                {formatTimestamp(entry.createdAt)}
              </time>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Main timeline component
 */
export function ApplicationTimeline({
  history,
  showDetailed = false,
  maxItems,
  className = '',
}: ApplicationTimelineProps) {
  // Sort history by date (newest first) and apply limit
  const sortedHistory = useMemo(() => {
    const sorted = [...history].sort((a, b) => {
      const aTime =
        a.createdAt instanceof Date
          ? a.createdAt.getTime()
          : a.createdAt.seconds * 1000;
      const bTime =
        b.createdAt instanceof Date
          ? b.createdAt.getTime()
          : b.createdAt.seconds * 1000;
      return bTime - aTime;
    });

    return maxItems ? sorted.slice(0, maxItems) : sorted;
  }, [history, maxItems]);

  if (sortedHistory.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No history available yet</p>
      </div>
    );
  }

  return (
    <div className={`flow-root ${className}`}>
      <ul className="-mb-8">
        {sortedHistory.map((entry, index) => (
          <TimelineEntry
            key={entry.id}
            entry={entry}
            isLast={index === sortedHistory.length - 1}
            showDetailed={showDetailed}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * Compact timeline for sidebars or cards
 */
export function CompactTimeline({
  history,
  maxItems = 5,
  className = '',
}: {
  history: ApplicationHistoryEntry[];
  maxItems?: number;
  className?: string;
}) {
  const sortedHistory = useMemo(() => {
    const sorted = [...history].sort((a, b) => {
      const aTime =
        a.createdAt instanceof Date
          ? a.createdAt.getTime()
          : a.createdAt.seconds * 1000;
      const bTime =
        b.createdAt instanceof Date
          ? b.createdAt.getTime()
          : b.createdAt.seconds * 1000;
      return bTime - aTime;
    });
    return sorted.slice(0, maxItems);
  }, [history, maxItems]);

  if (sortedHistory.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No history available
      </p>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {sortedHistory.map((entry) => {
        const colors = getActionColors(entry.action);
        return (
          <div key={entry.id} className="flex items-start gap-3">
            <span
              className={`flex-shrink-0 h-6 w-6 rounded-full ${colors.bg} flex items-center justify-center`}
            >
              <span className={`${colors.icon} scale-75`}>
                {getActionIcon(entry.action)}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-600 truncate">
                <span className="font-medium">{entry.performedByName}</span>{' '}
                {getActionDescription(entry)}
              </p>
              <p className="text-xs text-gray-400">
                {formatTimestamp(entry.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
      {history.length > maxItems && (
        <p className="text-xs text-gray-400 text-center">
          +{history.length - maxItems} more events
        </p>
      )}
    </div>
  );
}

export default ApplicationTimeline;
