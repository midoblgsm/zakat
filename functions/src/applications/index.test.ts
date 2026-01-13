import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock firebase-admin
const mockTransaction = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockRunTransaction = jest.fn(
  (callback: (t: typeof mockTransaction) => Promise<number>) => callback(mockTransaction)
);

const mockApplicationDoc = {
  exists: true,
  data: jest.fn(() => ({
    id: "app-1",
    applicationNumber: "ZKT-00000001",
    applicantId: "user-1",
    status: "draft",
    applicantSnapshot: { name: "Test User", email: "test@example.com" },
  })),
};

const mockHistoryDoc = {
  id: "history-1",
  set: jest.fn(),
};

jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  apps: [],
  firestore: jest.fn(() => ({
    collection: jest.fn((collectionName: string) => {
      if (collectionName === "counters") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ count: 1 }) })),
            set: jest.fn(),
          })),
        };
      }
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
                  firstName: "Test",
                  lastName: "User",
                  email: "test@example.com",
                  role: "applicant",
                }),
              })
            ),
          })),
        };
      }
      return {
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve(mockApplicationDoc)),
          update: jest.fn(() => Promise.resolve()),
          collection: jest.fn(() => ({
            doc: jest.fn(() => mockHistoryDoc),
          })),
        })),
        orderBy: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() => Promise.resolve({ docs: [] })),
            })),
          })),
          limit: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ docs: [] })),
          })),
        })),
      };
    }),
    runTransaction: mockRunTransaction,
  })),
  auth: jest.fn(() => ({
    getUser: jest.fn(() =>
      Promise.resolve({
        customClaims: { role: "zakat_admin", masjidId: "masjid-1" },
      })
    ),
  })),
  storage: jest.fn(() => ({})),
}));

// Mock firebase-admin/firestore
jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn((collectionName: string) => {
      if (collectionName === "counters") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ count: 1 }) })),
            set: jest.fn(),
          })),
        };
      }
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
                  firstName: "Test",
                  lastName: "User",
                  email: "test@example.com",
                  role: "applicant",
                }),
              })
            ),
          })),
        };
      }
      return {
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve(mockApplicationDoc)),
          update: jest.fn(() => Promise.resolve()),
          collection: jest.fn(() => ({
            doc: jest.fn(() => mockHistoryDoc),
          })),
        })),
        orderBy: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() => Promise.resolve({ docs: [] })),
            })),
          })),
          limit: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ docs: [] })),
          })),
        })),
      };
    }),
    runTransaction: mockRunTransaction,
  })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
  FieldValue: {
    delete: jest.fn(() => "__DELETE__"),
    increment: jest.fn((n: number) => ({ __increment: n })),
    arrayUnion: jest.fn((...args: unknown[]) => ({ __arrayUnion: args })),
  },
}));

// Mock firebase-admin/auth
jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({
    getUser: jest.fn(() =>
      Promise.resolve({
        customClaims: { role: "zakat_admin", masjidId: "masjid-1" },
      })
    ),
  })),
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

describe("submitApplication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { submitApplication } = await import("./index");

    const request = {
      auth: null,
      data: { applicationId: "app-1" },
    };

    await expect(submitApplication(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw invalid-argument error when applicationId is missing", async () => {
    const { submitApplication } = await import("./index");

    const request = {
      auth: { uid: "user-1" },
      data: {},
    };

    await expect(submitApplication(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("assignApplication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { assignApplication } = await import("./index");

    const request = {
      auth: null,
      data: { applicationId: "app-1" },
    };

    await expect(assignApplication(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for non-admin users", async () => {
    const { assignApplication } = await import("./index");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: { applicationId: "app-1" },
    };

    await expect(assignApplication(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument error when applicationId is missing", async () => {
    const { assignApplication } = await import("./index");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {},
    };

    await expect(assignApplication(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("releaseApplication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { releaseApplication } = await import("./index");

    const request = {
      auth: null,
      data: { applicationId: "app-1" },
    };

    await expect(releaseApplication(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for non-admin users", async () => {
    const { releaseApplication } = await import("./index");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: { applicationId: "app-1" },
    };

    await expect(releaseApplication(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument error when applicationId is missing", async () => {
    const { releaseApplication } = await import("./index");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {},
    };

    await expect(releaseApplication(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("changeApplicationStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { changeApplicationStatus } = await import("./index");

    const request = {
      auth: null,
      data: { applicationId: "app-1", newStatus: "under_review" },
    };

    await expect(changeApplicationStatus(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for non-admin users", async () => {
    const { changeApplicationStatus } = await import("./index");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: { applicationId: "app-1", newStatus: "under_review" },
    };

    await expect(changeApplicationStatus(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument error when required params are missing", async () => {
    const { changeApplicationStatus } = await import("./index");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: { applicationId: "app-1" },
    };

    await expect(changeApplicationStatus(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("getApplication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { getApplication } = await import("./index");

    const request = {
      auth: null,
      data: { applicationId: "app-1" },
    };

    await expect(getApplication(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw invalid-argument error when applicationId is missing", async () => {
    const { getApplication } = await import("./index");

    const request = {
      auth: { uid: "user-1" },
      data: {},
    };

    await expect(getApplication(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("listApplications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { listApplications } = await import("./index");

    const request = {
      auth: null,
      data: {},
    };

    await expect(listApplications(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });
});

describe("VALID_STATUS_TRANSITIONS", () => {
  it("should define valid transitions for all statuses", async () => {
    const { VALID_STATUS_TRANSITIONS } = await import("../types/application");

    expect(VALID_STATUS_TRANSITIONS.draft).toContain("submitted");
    expect(VALID_STATUS_TRANSITIONS.submitted).toContain("under_review");
    expect(VALID_STATUS_TRANSITIONS.under_review).toContain("approved");
    expect(VALID_STATUS_TRANSITIONS.under_review).toContain("rejected");
    expect(VALID_STATUS_TRANSITIONS.approved).toContain("disbursed");
    expect(VALID_STATUS_TRANSITIONS.closed).toEqual([]);
  });
});
