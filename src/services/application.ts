import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firebaseDb, firebaseFunctions } from './firebase';
import type { ZakatApplication, ApplicationHistoryEntry } from '../types/application';
import type { ApplicationFormData } from '../schemas/application';

/**
 * Document request interface
 */
export interface DocumentRequest {
  id: string;
  documentType: string;
  description: string;
  required: boolean;
  requestedBy: string;
  requestedByName: string;
  requestedAt: { seconds: number };
  fulfilledAt?: { seconds: number };
  fulfilledBy?: string;
  storagePath?: string;
  fileName?: string;
  // Verification status
  verified?: boolean;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: { seconds: number };
  verificationNotes?: string;
}

const APPLICATIONS_COLLECTION = 'applications';

/**
 * Generate a unique application number
 */
function generateApplicationNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ZAK-${year}-${random}`;
}

/**
 * Get draft application for a user
 */
export async function getDraftApplication(
  userId: string
): Promise<{ id: string; data: Partial<ApplicationFormData> } | null> {
  try {
    const q = query(
      collection(firebaseDb, APPLICATIONS_COLLECTION),
      where('applicantId', '==', userId),
      where('status', '==', 'draft'),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const docData = snapshot.docs[0];
    const appData = docData.data() as ZakatApplication;

    // Convert Firestore data to form data
    return {
      id: docData.id,
      data: convertToFormData(appData),
    };
  } catch (error) {
    console.error('Error getting draft application:', error);
    throw error;
  }
}

/**
 * Create a new draft application
 */
export async function createDraftApplication(
  userId: string,
  userEmail: string,
  userName: string,
  userPhone?: string
): Promise<string> {
  try {
    const docRef = doc(collection(firebaseDb, APPLICATIONS_COLLECTION));

    const newApplication: Partial<ZakatApplication> = {
      id: docRef.id,
      applicationNumber: generateApplicationNumber(),
      applicantId: userId,
      applicantSnapshot: {
        name: userName,
        email: userEmail,
        phone: userPhone || '',
        isFlagged: false,
      },
      status: 'draft',
      assignedTo: null,
      assignedToMasjid: null,
      demographics: {} as ZakatApplication['demographics'],
      contact: {} as ZakatApplication['contact'],
      household: [],
      financial: {} as ZakatApplication['financial'],
      circumstances: {} as ZakatApplication['circumstances'],
      zakatRequest: {} as ZakatApplication['zakatRequest'],
      references: [],
      documents: {
        otherDocuments: [],
      } as ZakatApplication['documents'],
      previousApplications: {
        appliedToMHMA: false,
        otherOrganizations: [],
      },
      adminNotes: [],
      createdAt: serverTimestamp() as unknown as Timestamp,
      updatedAt: serverTimestamp() as unknown as Timestamp,
    };

    await setDoc(docRef, newApplication);

    return docRef.id;
  } catch (error) {
    console.error('Error creating draft application:', error);
    throw error;
  }
}

/**
 * Save draft application (auto-save)
 */
export async function saveDraftApplication(
  applicationId: string,
  formData: Partial<ApplicationFormData>
): Promise<void> {
  try {
    const docRef = doc(firebaseDb, APPLICATIONS_COLLECTION, applicationId);

    // Convert form data to Firestore format
    const updateData = convertFromFormData(formData);

    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving draft application:', error);
    throw error;
  }
}

/**
 * Submit application (change status from draft to submitted)
 * Calls the Cloud Function to properly process submission with notifications
 */
export async function submitApplication(applicationId: string): Promise<string> {
  try {
    const submitApplicationFn = httpsCallable<
      { applicationId: string },
      { success: boolean; data: { applicationNumber: string } }
    >(firebaseFunctions, 'submitApplication');

    const result = await submitApplicationFn({ applicationId });

    if (!result.data.success) {
      throw new Error('Failed to submit application');
    }

    return result.data.data.applicationNumber;
  } catch (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
}

/**
 * Get application by ID
 */
export async function getApplication(
  applicationId: string
): Promise<ZakatApplication | null> {
  try {
    const docRef = doc(firebaseDb, APPLICATIONS_COLLECTION, applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as ZakatApplication;
  } catch (error) {
    console.error('Error getting application:', error);
    throw error;
  }
}

/**
 * Get all applications for a user
 */
export async function getUserApplications(
  userId: string
): Promise<ZakatApplication[]> {
  try {
    const q = query(
      collection(firebaseDb, APPLICATIONS_COLLECTION),
      where('applicantId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as ZakatApplication);
  } catch (error) {
    console.error('Error getting user applications:', error);
    throw error;
  }
}

/**
 * Delete draft application
 */
export async function deleteDraftApplication(
  applicationId: string
): Promise<void> {
  try {
    const docRef = doc(firebaseDb, APPLICATIONS_COLLECTION, applicationId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting draft application:', error);
    throw error;
  }
}

/**
 * Convert Firestore DocumentFile to form data format
 */
function convertDocumentFile(doc: {
  fileName: string;
  storagePath: string;
  uploadedAt: Timestamp;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Timestamp;
}): {
  fileName: string;
  storagePath: string;
  uploadedAt: Date;
  verified: boolean;
} {
  return {
    fileName: doc.fileName,
    storagePath: doc.storagePath,
    uploadedAt: doc.uploadedAt?.toDate?.() || new Date(),
    verified: doc.verified || false,
  };
}

/**
 * Convert Firestore ZakatApplication to form data
 */
function convertToFormData(app: ZakatApplication): Partial<ApplicationFormData> {
  return {
    demographics: app.demographics
      ? {
          fullName: app.demographics.fullName || '',
          age: app.demographics.age || 0,
          gender: app.demographics.gender || 'male',
          ssn: app.demographics.ssn || '',
          hasDriverLicense: app.demographics.hasDriverLicense || false,
          driverLicenseNumber: app.demographics.driverLicenseNumber || '',
          maritalStatus: app.demographics.maritalStatus || 'single',
          primaryLanguage: app.demographics.primaryLanguage || '',
          speaksEnglish: app.demographics.speaksEnglish || false,
          associatedMasjid: app.demographics.associatedMasjid || '',
        }
      : undefined,
    contact: app.contact
      ? {
          address: app.contact.address || { street: '', city: '', state: '', zipCode: '' },
          phone: app.contact.phone || '',
          phoneSecondary: app.contact.phoneSecondary || '',
          email: app.contact.email || '',
        }
      : undefined,
    household: {
      members: app.household || [],
    },
    assets: app.financial?.assets
      ? {
          hasHouse: !!app.financial.assets.house,
          house: app.financial.assets.house,
          hasBusiness: !!app.financial.assets.business,
          business: app.financial.assets.business,
          hasCars: !!app.financial.assets.cars,
          cars: app.financial.assets.cars,
          cashOnHand: app.financial.assets.cash?.value || 0,
          cashInBank: 0, // Split from cash
          otherAssets: app.financial.assets.other || [],
        }
      : undefined,
    incomeDebts: app.financial
      ? {
          monthlyIncome: app.financial.monthlyIncome || 0,
          incomeSource: app.financial.incomeSource || '',
          receivesGovernmentAid: app.financial.receivesGovernmentAid || false,
          governmentAidDetails: app.financial.governmentAidDetails || '',
          debts: app.financial.debts || [],
          expenses: app.financial.expenses || [],
        }
      : undefined,
    circumstances: app.circumstances
      ? {
          residenceType: app.circumstances.residenceType || 'rent',
          residenceDetails: app.circumstances.residenceDetails || '',
          rentAmount: app.circumstances.rentAmount || 0,
          sharesRent: app.circumstances.sharesRent || false,
          rentShareDetails: app.circumstances.rentShareDetails || '',
          transportationType: app.circumstances.transportationType || 'public',
          transportationDetails: app.circumstances.transportationDetails || '',
          employmentStatus: app.circumstances.employmentStatus || 'unemployed',
          employerName: app.circumstances.employerName || '',
          employerAddress: app.circumstances.employerAddress || '',
          hasHealthInsurance: app.circumstances.hasHealthInsurance || false,
          healthInsuranceType: app.circumstances.healthInsuranceType || '',
          educationLevel: app.circumstances.educationLevel || '',
        }
      : undefined,
    zakatRequest: app.zakatRequest
      ? {
          isEligible: app.zakatRequest.isEligible || false,
          reasonForApplication: app.zakatRequest.reasonForApplication || '',
          assistanceType: app.zakatRequest.assistanceType || 'one_time',
          monthlyDuration: app.zakatRequest.monthlyDuration,
          amountRequested: app.zakatRequest.amountRequested || 0,
        }
      : undefined,
    references: {
      references: app.references || [],
    },
    documents: {
      photoId: app.documents?.photoId ? convertDocumentFile(app.documents.photoId) : undefined,
      ssnCard: app.documents?.ssnCard ? convertDocumentFile(app.documents.ssnCard) : undefined,
      leaseAgreement: app.documents?.leaseAgreement ? convertDocumentFile(app.documents.leaseAgreement) : undefined,
      otherDocuments: (app.documents?.otherDocuments || []).map(convertDocumentFile),
      acknowledgement: false,
    },
    previousApplications: app.previousApplications
      ? {
          appliedToMHMA: app.previousApplications.appliedToMHMA || false,
          mhmaDate: app.previousApplications.mhmaDate
            ? new Date(app.previousApplications.mhmaDate.seconds * 1000)
                .toISOString()
                .split('T')[0]
            : '',
          mhmaOutcome: app.previousApplications.mhmaOutcome || '',
          otherOrganizations: app.previousApplications.otherOrganizations?.map((org) => ({
            name: org.name,
            date: new Date(org.date.seconds * 1000).toISOString().split('T')[0],
            approved: org.approved,
          })) || [],
        }
      : undefined,
  };
}

/**
 * Remove undefined values from an object (Firestore doesn't accept undefined)
 */
function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Convert form data to Firestore update format
 */
function convertFromFormData(formData: Partial<ApplicationFormData>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (formData.demographics) {
    result.demographics = removeUndefined(formData.demographics as Record<string, unknown>);
  }

  if (formData.contact) {
    result.contact = removeUndefined(formData.contact as Record<string, unknown>);
  }

  if (formData.household) {
    result.household = formData.household.members;
  }

  if (formData.assets || formData.incomeDebts) {
    const financial: Record<string, unknown> = {
      monthlyIncome: formData.incomeDebts?.monthlyIncome || 0,
      incomeSource: formData.incomeDebts?.incomeSource || '',
      receivesGovernmentAid: formData.incomeDebts?.receivesGovernmentAid || false,
      governmentAidDetails: formData.incomeDebts?.governmentAidDetails || '',
      debts: formData.incomeDebts?.debts || [],
      totalDebt: calculateTotalDebt(formData.incomeDebts?.debts || []),
      expenses: formData.incomeDebts?.expenses || [],
      totalMonthlyExpenses: calculateTotalExpenses(formData.incomeDebts?.expenses || []),
    };

    if (formData.assets) {
      const assets: Record<string, unknown> = {
        cash: {
          value: (formData.assets.cashOnHand || 0) + (formData.assets.cashInBank || 0),
        },
        other: formData.assets.otherAssets || [],
        totalValue: calculateTotalAssets(formData.assets),
      };
      if (formData.assets.hasHouse && formData.assets.house) {
        assets.house = formData.assets.house;
      }
      if (formData.assets.hasBusiness && formData.assets.business) {
        assets.business = formData.assets.business;
      }
      if (formData.assets.hasCars && formData.assets.cars) {
        assets.cars = formData.assets.cars;
      }
      financial.assets = assets;
    }

    result.financial = financial;
  }

  if (formData.circumstances) {
    result.circumstances = removeUndefined(formData.circumstances as Record<string, unknown>);
  }

  if (formData.zakatRequest) {
    result.zakatRequest = removeUndefined(formData.zakatRequest as Record<string, unknown>);
  }

  if (formData.references) {
    result.references = formData.references.references;
  }

  if (formData.documents) {
    const docs: Record<string, unknown> = {
      otherDocuments: formData.documents.otherDocuments || [],
    };
    if (formData.documents.photoId) {
      docs.photoId = formData.documents.photoId;
    }
    if (formData.documents.ssnCard) {
      docs.ssnCard = formData.documents.ssnCard;
    }
    if (formData.documents.leaseAgreement) {
      docs.leaseAgreement = formData.documents.leaseAgreement;
    }
    result.documents = docs;
  }

  if (formData.previousApplications) {
    const prevApps: Record<string, unknown> = {
      appliedToMHMA: formData.previousApplications.appliedToMHMA,
    };
    if (formData.previousApplications.mhmaDate) {
      prevApps.mhmaDate = Timestamp.fromDate(new Date(formData.previousApplications.mhmaDate));
    }
    if (formData.previousApplications.mhmaOutcome) {
      prevApps.mhmaOutcome = formData.previousApplications.mhmaOutcome;
    }
    if (formData.previousApplications.otherOrganizations) {
      prevApps.otherOrganizations = formData.previousApplications.otherOrganizations.map(
        (org) => ({
          name: org.name,
          date: Timestamp.fromDate(new Date(org.date)),
          approved: org.approved,
        })
      );
    }
    result.previousApplications = prevApps;
  }

  return result;
}

/**
 * Calculate total assets value
 */
function calculateTotalAssets(
  assets: Partial<ApplicationFormData['assets']>
): number {
  if (!assets) return 0;

  let total = 0;
  if (assets.hasHouse && assets.house?.value) total += assets.house.value;
  if (assets.hasBusiness && assets.business?.value) total += assets.business.value;
  if (assets.hasCars && assets.cars?.value) total += assets.cars.value;
  if (assets.cashOnHand) total += assets.cashOnHand;
  if (assets.cashInBank) total += assets.cashInBank;
  if (assets.otherAssets) {
    total += assets.otherAssets.reduce((sum, asset) => sum + (asset.value || 0), 0);
  }

  return total;
}

/**
 * Calculate total debt
 */
function calculateTotalDebt(debts: ApplicationFormData['incomeDebts']['debts']): number {
  return debts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
}

/**
 * Calculate total monthly expenses
 */
function calculateTotalExpenses(
  expenses: ApplicationFormData['incomeDebts']['expenses']
): number {
  return expenses.reduce((sum, expense) => {
    const amount = expense.amount || 0;
    switch (expense.frequency) {
      case 'weekly':
        return sum + amount * 4.33;
      case 'monthly':
        return sum + amount;
      case 'quarterly':
        return sum + amount / 3;
      case 'semester':
        return sum + amount / 6;
      default:
        return sum + amount;
    }
  }, 0);
}

/**
 * Get application history for applicant view
 * Returns only non-internal history entries
 */
export async function getApplicationHistory(
  applicationId: string
): Promise<ApplicationHistoryEntry[]> {
  try {
    const historyRef = collection(
      firebaseDb,
      APPLICATIONS_COLLECTION,
      applicationId,
      'history'
    );
    const q = query(historyRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    // Filter out internal notes and sensitive admin actions
    const filteredHistory = snapshot.docs
      .map((doc) => doc.data() as ApplicationHistoryEntry)
      .filter((entry) => {
        // Hide internal note additions from applicants
        if (
          entry.action === 'note_added' &&
          entry.metadata?.isInternal === true
        ) {
          return false;
        }
        return true;
      });

    return filteredHistory;
  } catch (error) {
    console.error('Error getting application history:', error);
    throw error;
  }
}

/**
 * Get document requests for an application
 */
export async function getDocumentRequests(
  applicationId: string
): Promise<DocumentRequest[]> {
  try {
    const getDocumentRequestsFn = httpsCallable<
      { applicationId: string },
      { success: boolean; data: DocumentRequest[] }
    >(firebaseFunctions, 'getDocumentRequests');

    const result = await getDocumentRequestsFn({ applicationId });

    if (result.data.success) {
      return result.data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting document requests:', error);
    throw error;
  }
}

/**
 * Fulfill a document request (mark it as uploaded)
 */
export async function fulfillDocumentRequest(
  applicationId: string,
  requestId: string,
  storagePath: string,
  fileName?: string
): Promise<void> {
  try {
    const fulfillDocumentRequestFn = httpsCallable<
      { applicationId: string; requestId: string; storagePath: string; fileName?: string },
      { success: boolean }
    >(firebaseFunctions, 'fulfillDocumentRequest');

    const result = await fulfillDocumentRequestFn({
      applicationId,
      requestId,
      storagePath,
      ...(fileName && { fileName }),
    });

    if (!result.data.success) {
      throw new Error('Failed to fulfill document request');
    }
  } catch (error) {
    console.error('Error fulfilling document request:', error);
    throw error;
  }
}
