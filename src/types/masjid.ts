import type { Timestamp } from 'firebase/firestore';
import type { Address } from './user';

/**
 * Zakat configuration for a masjid
 */
export interface ZakatConfig {
  nisabThreshold: number;
  nisabLastUpdated: Timestamp;
  assistanceTypes: AssistanceType[];
  maxMonthlyAmount?: number;
  maxOneTimeAmount?: number;
  requiresReferences: boolean;
  requiredDocuments: string[];
}

/**
 * Types of assistance offered
 */
export type AssistanceType = 'monthly' | 'one_time' | 'emergency';

/**
 * Masjid statistics (denormalized for performance)
 */
export interface MasjidStats {
  totalApplicationsHandled: number;
  applicationsInProgress: number;
  totalAmountDisbursed: number;
}

/**
 * Masjid document stored in Firestore /masajid/{masjidId}
 */
export interface Masjid {
  // Identity
  id: string;
  name: string;
  slug: string; // URL-friendly name

  // Contact
  email: string;
  phone: string;
  website?: string;

  // Address
  address: Address;

  // Customization
  description: string;
  logo?: string; // Storage URL
  primaryColor?: string; // Hex color for branding
  secondaryColor?: string;
  welcomeMessage?: string;

  // Zakat Configuration
  zakatConfig: ZakatConfig;

  // Statistics
  stats: MasjidStats;

  // Status
  isActive: boolean;
  onboardedAt: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/**
 * Masjid creation input
 */
export interface CreateMasjidInput {
  name: string;
  slug?: string;  // Optional - will be generated from name if not provided
  email: string;
  phone: string;
  website?: string;
  address: Address;
  description: string;
  zakatConfig?: Partial<ZakatConfig>;
}

/**
 * Masjid update input
 */
export interface UpdateMasjidInput {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: Partial<Address>;
  description?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  welcomeMessage?: string;
  zakatConfig?: Partial<ZakatConfig>;
}
