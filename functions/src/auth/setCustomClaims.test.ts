import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock firebase-admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  apps: [],
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        update: jest.fn(),
        get: jest.fn(),
      })),
    })),
  })),
  auth: jest.fn(() => ({
    getUser: jest.fn(),
    setCustomUserClaims: jest.fn(),
  })),
  storage: jest.fn(() => ({})),
}));

// Mock firebase-functions
jest.mock("firebase-functions/v2/https", () => ({
  onCall: jest.fn((options, handler) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message);
    }
  },
}));

describe("setUserRole", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { setUserRole } = await import("./setCustomClaims");

    const request = {
      auth: null,
      data: { userId: "test-user", role: "applicant" },
    };

    await expect(setUserRole(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw invalid-argument error for invalid role", async () => {
    const { setUserRole } = await import("./setCustomClaims");

    const request = {
      auth: {
        uid: "admin-uid",
        token: { role: "super_admin" },
      },
      data: { userId: "test-user", role: "invalid_role" },
    };

    await expect(setUserRole(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("should throw permission-denied for non-admin users", async () => {
    const { setUserRole } = await import("./setCustomClaims");

    const request = {
      auth: {
        uid: "applicant-uid",
        token: { role: "applicant" },
      },
      data: { userId: "test-user", role: "applicant" },
    };

    await expect(setUserRole(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument when masjidId missing for zakat_admin role", async () => {
    const { setUserRole } = await import("./setCustomClaims");

    const request = {
      auth: {
        uid: "admin-uid",
        token: { role: "super_admin" },
      },
      data: { userId: "test-user", role: "zakat_admin" },
    };

    await expect(setUserRole(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("getUserClaims", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { getUserClaims } = await import("./setCustomClaims");

    const request = {
      auth: null,
      data: {},
    };

    await expect(getUserClaims(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied when viewing other user claims without admin role", async () => {
    const { getUserClaims } = await import("./setCustomClaims");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: { userId: "user-2" },
    };

    await expect(getUserClaims(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });
});
