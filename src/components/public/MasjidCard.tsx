import { clsx } from 'clsx';
import type { Masjid } from '@/types/masjid';
import { MapPinIcon, GlobeAltIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

interface MasjidCardProps {
  masjid: Masjid;
  className?: string;
}

export function MasjidCard({ masjid, className }: MasjidCardProps) {
  const primaryColor = masjid.primaryColor || '#4F46E5';

  return (
    <div
      className={clsx(
        'group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md',
        className
      )}
    >
      {/* Branding stripe at top */}
      <div
        className="h-2"
        style={{ backgroundColor: primaryColor }}
      />

      <div className="p-6">
        {/* Logo and name */}
        <div className="flex items-start gap-4">
          {masjid.logo ? (
            <img
              src={masjid.logo}
              alt={`${masjid.name} logo`}
              className="h-16 w-16 rounded-lg object-cover ring-1 ring-gray-200"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-lg text-white text-xl font-bold"
              style={{ backgroundColor: primaryColor }}
            >
              {masjid.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {masjid.name}
            </h3>
            <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <MapPinIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {masjid.address.city}, {masjid.address.state}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {masjid.description && (
          <p className="mt-4 text-sm text-gray-600 line-clamp-3">
            {masjid.description}
          </p>
        )}

        {/* Welcome message if available */}
        {masjid.welcomeMessage && (
          <div
            className="mt-4 rounded-lg p-3 text-sm"
            style={{ backgroundColor: `${primaryColor}10` }}
          >
            <p className="text-gray-700 italic line-clamp-2">
              "{masjid.welcomeMessage}"
            </p>
          </div>
        )}

        {/* Contact info */}
        <div className="mt-4 space-y-2">
          {masjid.website && (
            <a
              href={masjid.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <GlobeAltIcon className="h-4 w-4" />
              <span className="truncate">{masjid.website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <PhoneIcon className="h-4 w-4" />
            <span>{masjid.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <EnvelopeIcon className="h-4 w-4" />
            <span className="truncate">{masjid.email}</span>
          </div>
        </div>

        {/* Assistance types */}
        <div className="mt-4 flex flex-wrap gap-2">
          {masjid.zakatConfig.assistanceTypes.map((type) => (
            <span
              key={type}
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700"
            >
              {type === 'monthly' && 'Monthly Assistance'}
              {type === 'one_time' && 'One-time Assistance'}
              {type === 'emergency' && 'Emergency Assistance'}
            </span>
          ))}
        </div>

        {/* Full address on hover/focus */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {masjid.address.street}, {masjid.address.city}, {masjid.address.state} {masjid.address.zipCode}
          </p>
        </div>
      </div>
    </div>
  );
}
