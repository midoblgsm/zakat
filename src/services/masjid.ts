import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit as firestoreLimit,
  startAfter,
  DocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { firebaseDb } from './firebase';
import type {
  Masjid,
  CreateMasjidInput,
  UpdateMasjidInput,
  ZakatConfig,
  MasjidStats,
} from '../types/masjid';

const MASAJID_COLLECTION = 'masajid';

export interface MasjidListFilters {
  isActive?: boolean;
  search?: string;
  limit?: number;
  startAfterDoc?: DocumentSnapshot;
}

export interface MasjidListResult {
  masajid: Masjid[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Default Zakat configuration for new masajid
 */
export const DEFAULT_ZAKAT_CONFIG: ZakatConfig = {
  nisabThreshold: 5000, // Default nisab in USD
  nisabLastUpdated: Timestamp.now(),
  assistanceTypes: ['monthly', 'one_time', 'emergency'],
  maxMonthlyAmount: 2000,
  maxOneTimeAmount: 5000,
  requiresReferences: true,
  requiredDocuments: ['photoId', 'ssnCard'],
};

/**
 * Default statistics for new masajid
 */
const DEFAULT_STATS: MasjidStats = {
  totalApplicationsHandled: 0,
  applicationsInProgress: 0,
  totalAmountDisbursed: 0,
};

/**
 * Generate a URL-friendly slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Check if a slug is already in use
 */
export async function isSlugAvailable(
  slug: string,
  excludeMasjidId?: string
): Promise<boolean> {
  try {
    const q = query(
      collection(firebaseDb, MASAJID_COLLECTION),
      where('slug', '==', slug)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return true;
    }

    // If we're excluding a masjid (for updates), check if the found slug belongs to it
    if (excludeMasjidId) {
      return snapshot.docs.every(doc => doc.id === excludeMasjidId);
    }

    return false;
  } catch (error) {
    console.error('Error checking slug availability:', error);
    throw error;
  }
}

/**
 * Create a new masjid
 */
export async function createMasjid(
  input: CreateMasjidInput,
  createdBy: string
): Promise<Masjid> {
  try {
    // Generate unique ID
    const masjidId = crypto.randomUUID();

    // Check slug availability
    const slug = input.slug || generateSlug(input.name);
    const slugAvailable = await isSlugAvailable(slug);
    if (!slugAvailable) {
      throw new Error(`Slug "${slug}" is already in use. Please choose a different name.`);
    }

    const now = Timestamp.now();

    const masjid: Masjid = {
      id: masjidId,
      name: input.name,
      slug,
      email: input.email,
      phone: input.phone,
      website: input.website,
      address: input.address,
      description: input.description,
      zakatConfig: {
        ...DEFAULT_ZAKAT_CONFIG,
        ...input.zakatConfig,
        nisabLastUpdated: now,
      },
      stats: DEFAULT_STATS,
      isActive: true,
      onboardedAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    await setDoc(doc(firebaseDb, MASAJID_COLLECTION, masjidId), masjid);

    return masjid;
  } catch (error) {
    console.error('Error creating masjid:', error);
    throw error;
  }
}

/**
 * Get a single masjid by ID
 */
export async function getMasjid(masjidId: string): Promise<Masjid | null> {
  try {
    const docRef = doc(firebaseDb, MASAJID_COLLECTION, masjidId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as Masjid;
  } catch (error) {
    console.error('Error getting masjid:', error);
    throw error;
  }
}

/**
 * Get a masjid by slug
 */
export async function getMasjidBySlug(slug: string): Promise<Masjid | null> {
  try {
    const q = query(
      collection(firebaseDb, MASAJID_COLLECTION),
      where('slug', '==', slug)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as Masjid;
  } catch (error) {
    console.error('Error getting masjid by slug:', error);
    throw error;
  }
}

/**
 * Get all masajid with optional filters
 */
export async function getMasajid(
  filters: MasjidListFilters = {}
): Promise<MasjidListResult> {
  try {
    const constraints: QueryConstraint[] = [];

    // Filter by active status
    if (filters.isActive !== undefined) {
      constraints.push(where('isActive', '==', filters.isActive));
    }

    // Order by name
    constraints.push(orderBy('name', 'asc'));

    // Pagination
    const pageLimit = filters.limit || 20;
    constraints.push(firestoreLimit(pageLimit + 1));

    if (filters.startAfterDoc) {
      constraints.push(startAfter(filters.startAfterDoc));
    }

    const q = query(collection(firebaseDb, MASAJID_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    let masajid = snapshot.docs.map(doc => doc.data() as Masjid);

    // Apply client-side search filter if provided
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      masajid = masajid.filter(
        m =>
          m.name.toLowerCase().includes(searchLower) ||
          m.email.toLowerCase().includes(searchLower) ||
          m.address.city.toLowerCase().includes(searchLower)
      );
    }

    // Check if there are more results
    const hasMore = masajid.length > pageLimit;
    if (hasMore) {
      masajid = masajid.slice(0, pageLimit);
    }

    const lastDoc = snapshot.docs.length > 0
      ? snapshot.docs[Math.min(snapshot.docs.length - 1, pageLimit - 1)]
      : null;

    return {
      masajid,
      lastDoc,
      hasMore,
    };
  } catch (error) {
    console.error('Error getting masajid:', error);
    throw error;
  }
}

/**
 * Get all active masajid (for dropdowns, etc.)
 */
export async function getActiveMasajid(): Promise<Masjid[]> {
  try {
    const q = query(
      collection(firebaseDb, MASAJID_COLLECTION),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => doc.data() as Masjid);
  } catch (error) {
    console.error('Error getting active masajid:', error);
    throw error;
  }
}

/**
 * Update a masjid
 */
export async function updateMasjid(
  masjidId: string,
  input: UpdateMasjidInput
): Promise<void> {
  try {
    const docRef = doc(firebaseDb, MASAJID_COLLECTION, masjidId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Masjid not found');
    }

    // Build update object with only defined fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.email !== undefined) updates.email = input.email;
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.website !== undefined) updates.website = input.website;
    if (input.description !== undefined) updates.description = input.description;
    if (input.logo !== undefined) updates.logo = input.logo;
    if (input.primaryColor !== undefined) updates.primaryColor = input.primaryColor;
    if (input.secondaryColor !== undefined) updates.secondaryColor = input.secondaryColor;
    if (input.welcomeMessage !== undefined) updates.welcomeMessage = input.welcomeMessage;

    // Handle nested address updates
    if (input.address) {
      const currentMasjid = docSnap.data() as Masjid;
      updates.address = {
        ...currentMasjid.address,
        ...input.address,
      };
    }

    // Handle nested zakat config updates
    if (input.zakatConfig) {
      const currentMasjid = docSnap.data() as Masjid;
      updates.zakatConfig = {
        ...currentMasjid.zakatConfig,
        ...input.zakatConfig,
      };

      // Update nisabLastUpdated if nisab threshold changed
      if (input.zakatConfig.nisabThreshold !== undefined) {
        updates.zakatConfig.nisabLastUpdated = Timestamp.now();
      }
    }

    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating masjid:', error);
    throw error;
  }
}

/**
 * Update masjid zakat configuration
 */
export async function updateMasjidZakatConfig(
  masjidId: string,
  config: Partial<ZakatConfig>
): Promise<void> {
  try {
    const docRef = doc(firebaseDb, MASAJID_COLLECTION, masjidId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Masjid not found');
    }

    const currentMasjid = docSnap.data() as Masjid;
    const updatedConfig = {
      ...currentMasjid.zakatConfig,
      ...config,
    };

    // Update nisabLastUpdated if nisab threshold changed
    if (config.nisabThreshold !== undefined) {
      updatedConfig.nisabLastUpdated = Timestamp.now();
    }

    await updateDoc(docRef, {
      zakatConfig: updatedConfig,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating masjid zakat config:', error);
    throw error;
  }
}

/**
 * Toggle masjid active status
 */
export async function toggleMasjidActive(
  masjidId: string,
  isActive: boolean
): Promise<void> {
  try {
    const docRef = doc(firebaseDb, MASAJID_COLLECTION, masjidId);

    await updateDoc(docRef, {
      isActive,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error toggling masjid active status:', error);
    throw error;
  }
}

/**
 * Delete a masjid (soft delete by setting isActive = false)
 */
export async function deactivateMasjid(masjidId: string): Promise<void> {
  return toggleMasjidActive(masjidId, false);
}

/**
 * Permanently delete a masjid (use with caution)
 */
export async function deleteMasjid(masjidId: string): Promise<void> {
  try {
    const docRef = doc(firebaseDb, MASAJID_COLLECTION, masjidId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting masjid:', error);
    throw error;
  }
}

/**
 * Update masjid statistics
 */
export async function updateMasjidStats(
  masjidId: string,
  stats: Partial<MasjidStats>
): Promise<void> {
  try {
    const docRef = doc(firebaseDb, MASAJID_COLLECTION, masjidId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Masjid not found');
    }

    const currentMasjid = docSnap.data() as Masjid;
    const updatedStats = {
      ...currentMasjid.stats,
      ...stats,
    };

    await updateDoc(docRef, {
      stats: updatedStats,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating masjid stats:', error);
    throw error;
  }
}

/**
 * Get masjid statistics summary for super admin dashboard
 */
export async function getMasjidSummaryStats(): Promise<{
  totalMasajid: number;
  activeMasajid: number;
  totalApplicationsHandled: number;
  totalAmountDisbursed: number;
}> {
  try {
    const allMasajid = await getMasajid({ limit: 1000 });

    const activeMasajid = allMasajid.masajid.filter(m => m.isActive);

    const totalApplicationsHandled = allMasajid.masajid.reduce(
      (sum, m) => sum + (m.stats?.totalApplicationsHandled || 0),
      0
    );

    const totalAmountDisbursed = allMasajid.masajid.reduce(
      (sum, m) => sum + (m.stats?.totalAmountDisbursed || 0),
      0
    );

    return {
      totalMasajid: allMasajid.masajid.length,
      activeMasajid: activeMasajid.length,
      totalApplicationsHandled,
      totalAmountDisbursed,
    };
  } catch (error) {
    console.error('Error getting masjid summary stats:', error);
    return {
      totalMasajid: 0,
      activeMasajid: 0,
      totalApplicationsHandled: 0,
      totalAmountDisbursed: 0,
    };
  }
}
