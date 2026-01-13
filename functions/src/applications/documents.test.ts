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
              }),
            })
          ),
          update: jest.fn(() => Promise.resolve()),
          collection: jest.fn(() => ({
            doc: jest.fn(() => ({
              id: "request-1",
              set: jest.fn(() => Promise.resolve()),
              get: jest.fn(() =>
                Promise.resolve({
                  exists: true,
                  data: () => ({
                    id: "request-1",
                    documentType: "photo_id",
                    required: true,
                  }),
                })
              ),
              update: jest.fn(() => Promise.resolve()),
            })),
            where: jest.fn(() => ({
              get: jest.fn(() =>
                Promise.resolve({
                  docs: [
                    {
                      data: () => ({ fulfilledAt: { seconds: 123 } }),
                    },
                  ],
                })
              ),
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
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn(() => Promise.resolve()),
    })),
  })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
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

describe("requestDocuments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { requestDocuments } = await import("./documents");

    const request = {
      auth: null,
      data: {
        applicationId: "app-1",
        documents: [{ documentType: "photo_id", description: "Photo ID", required: true }],
      },
    };

    await expect(requestDocuments(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for non-admin users", async () => {
    const { requestDocuments } = await import("./documents");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: {
        applicationId: "app-1",
        documents: [{ documentType: "photo_id", description: "Photo ID", required: true }],
      },
    };

    await expect(requestDocuments(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument when documents array is empty", async () => {
    const { requestDocuments } = await import("./documents");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {
        applicationId: "app-1",
        documents: [],
      },
    };

    await expect(requestDocuments(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("should throw invalid-argument when applicationId is missing", async () => {
    const { requestDocuments } = await import("./documents");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {
        documents: [{ documentType: "photo_id", description: "Photo ID", required: true }],
      },
    };

    await expect(requestDocuments(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("fulfillDocumentRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { fulfillDocumentRequest } = await import("./documents");

    const request = {
      auth: null,
      data: {
        applicationId: "app-1",
        requestId: "request-1",
        storagePath: "/applications/app-1/documents/photo_id/file.pdf",
      },
    };

    await expect(fulfillDocumentRequest(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw invalid-argument when required params are missing", async () => {
    const { fulfillDocumentRequest } = await import("./documents");

    const request = {
      auth: { uid: "user-1" },
      data: {
        applicationId: "app-1",
        requestId: "request-1",
      },
    };

    await expect(fulfillDocumentRequest(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("verifyDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { verifyDocument } = await import("./documents");

    const request = {
      auth: null,
      data: {
        applicationId: "app-1",
        documentPath: "/documents/photo_id.pdf",
        verified: true,
      },
    };

    await expect(verifyDocument(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for non-admin users", async () => {
    const { verifyDocument } = await import("./documents");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: {
        applicationId: "app-1",
        documentPath: "/documents/photo_id.pdf",
        verified: true,
      },
    };

    await expect(verifyDocument(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument when required params are missing", async () => {
    const { verifyDocument } = await import("./documents");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {
        applicationId: "app-1",
      },
    };

    await expect(verifyDocument(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("getDocumentRequests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { getDocumentRequests } = await import("./documents");

    const request = {
      auth: null,
      data: { applicationId: "app-1" },
    };

    await expect(getDocumentRequests(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw invalid-argument when applicationId is missing", async () => {
    const { getDocumentRequests } = await import("./documents");

    const request = {
      auth: { uid: "user-1" },
      data: {},
    };

    await expect(getDocumentRequests(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});
