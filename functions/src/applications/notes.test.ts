import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock firebase-admin/firestore
jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn((collectionName: string) => {
      if (collectionName === "notifications") {
        return {
          add: jest.fn(() => Promise.resolve({ id: "notif-1" })),
        };
      }
      if (collectionName === "users") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn(() =>
              Promise.resolve({
                exists: true,
                data: () => ({
                  firstName: "Admin",
                  lastName: "User",
                  email: "admin@example.com",
                  role: "zakat_admin",
                  masjidId: "masjid-1",
                }),
              })
            ),
            update: jest.fn(() => Promise.resolve()),
          })),
        };
      }
      if (collectionName === "flags") {
        return {
          doc: jest.fn(() => ({
            id: "flag-1",
            set: jest.fn(() => Promise.resolve()),
            get: jest.fn(() =>
              Promise.resolve({
                exists: true,
                data: () => ({
                  id: "flag-1",
                  applicantId: "user-1",
                  flaggedBy: "admin-1",
                  isActive: true,
                }),
              })
            ),
            update: jest.fn(() => Promise.resolve()),
          })),
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ empty: true })),
              })),
            })),
          })),
        };
      }
      if (collectionName === "auditLogs") {
        return {
          add: jest.fn(() => Promise.resolve({ id: "log-1" })),
        };
      }
      if (collectionName === "masjids") {
        return {
          doc: jest.fn(() => ({
            update: jest.fn(() => Promise.resolve()),
          })),
        };
      }
      return {
        doc: jest.fn(() => ({
          get: jest.fn(() =>
            Promise.resolve({
              exists: true,
              data: () => ({
                id: "app-1",
                applicationNumber: "ZKT-00000001",
                applicantId: "user-1",
                status: "under_review",
                assignedTo: "admin-1",
                assignedToMasjid: "masjid-1",
                adminNotes: [],
              }),
            })
          ),
          update: jest.fn(() => Promise.resolve()),
          collection: jest.fn(() => ({
            doc: jest.fn(() => ({
              id: "history-1",
              set: jest.fn(() => Promise.resolve()),
            })),
            orderBy: jest.fn(() => ({
              get: jest.fn(() =>
                Promise.resolve({
                  docs: [],
                })
              ),
            })),
          })),
        })),
      };
    }),
  })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
  FieldValue: {
    arrayUnion: jest.fn((...args: unknown[]) => ({ __arrayUnion: args })),
    increment: jest.fn((n: number) => ({ __increment: n })),
    delete: jest.fn(() => "__DELETE__"),
  },
}));

// Mock firebase-functions
jest.mock("firebase-functions/v2/https", () => ({
  onCall: jest.fn((optionsOrHandler, maybeHandler) => maybeHandler || optionsOrHandler),
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message);
    }
  },
}));

describe("addAdminNote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { addAdminNote } = await import("./notes");

    const request = {
      auth: null,
      data: {
        applicationId: "app-1",
        content: "Test note",
        isInternal: true,
      },
    };

    await expect(addAdminNote(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for non-admin users", async () => {
    const { addAdminNote } = await import("./notes");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: {
        applicationId: "app-1",
        content: "Test note",
        isInternal: true,
      },
    };

    await expect(addAdminNote(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument when required params are missing", async () => {
    const { addAdminNote } = await import("./notes");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {
        applicationId: "app-1",
      },
    };

    await expect(addAdminNote(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("should throw invalid-argument when content exceeds 5000 characters", async () => {
    const { addAdminNote } = await import("./notes");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {
        applicationId: "app-1",
        content: "a".repeat(5001),
        isInternal: true,
      },
    };

    await expect(addAdminNote(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("resolveApplication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { resolveApplication } = await import("./notes");

    const request = {
      auth: null,
      data: {
        applicationId: "app-1",
        decision: "approved",
        amountApproved: 1000,
      },
    };

    await expect(resolveApplication(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for non-admin users", async () => {
    const { resolveApplication } = await import("./notes");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: {
        applicationId: "app-1",
        decision: "approved",
        amountApproved: 1000,
      },
    };

    await expect(resolveApplication(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument when required params are missing", async () => {
    const { resolveApplication } = await import("./notes");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {
        applicationId: "app-1",
      },
    };

    await expect(resolveApplication(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("should throw invalid-argument when approving without amount", async () => {
    const { resolveApplication } = await import("./notes");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {
        applicationId: "app-1",
        decision: "approved",
      },
    };

    await expect(resolveApplication(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("should throw invalid-argument when rejecting without reason", async () => {
    const { resolveApplication } = await import("./notes");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {
        applicationId: "app-1",
        decision: "rejected",
      },
    };

    await expect(resolveApplication(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("flagApplicant", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { flagApplicant } = await import("./notes");

    const request = {
      auth: null,
      data: {
        applicantId: "user-1",
        reason: "Suspected fraud",
        severity: "warning",
      },
    };

    await expect(flagApplicant(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for non-admin users", async () => {
    const { flagApplicant } = await import("./notes");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: {
        applicantId: "user-2",
        reason: "Suspected fraud",
        severity: "warning",
      },
    };

    await expect(flagApplicant(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument when required params are missing", async () => {
    const { flagApplicant } = await import("./notes");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {
        applicantId: "user-1",
        reason: "Suspected fraud",
      },
    };

    await expect(flagApplicant(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("unflagApplicant", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { unflagApplicant } = await import("./notes");

    const request = {
      auth: null,
      data: {
        flagId: "flag-1",
        resolutionNotes: "Verified legitimate",
      },
    };

    await expect(unflagApplicant(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for non-admin users", async () => {
    const { unflagApplicant } = await import("./notes");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: {
        flagId: "flag-1",
        resolutionNotes: "Verified legitimate",
      },
    };

    await expect(unflagApplicant(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument when required params are missing", async () => {
    const { unflagApplicant } = await import("./notes");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {
        flagId: "flag-1",
      },
    };

    await expect(unflagApplicant(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("getApplicationHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { getApplicationHistory } = await import("./notes");

    const request = {
      auth: null,
      data: { applicationId: "app-1" },
    };

    await expect(getApplicationHistory(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw invalid-argument when applicationId is missing", async () => {
    const { getApplicationHistory } = await import("./notes");

    const request = {
      auth: { uid: "user-1" },
      data: {},
    };

    await expect(getApplicationHistory(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});
