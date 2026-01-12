import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock firebase-admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  apps: [],
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        update: jest.fn(),
        get: jest.fn(() => Promise.resolve({ exists: false })),
      })),
      orderBy: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            offset: jest.fn(() => ({
              get: jest.fn(() => Promise.resolve({ docs: [] })),
            })),
          })),
        })),
        limit: jest.fn(() => ({
          offset: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ docs: [] })),
          })),
        })),
      })),
    })),
  })),
  auth: jest.fn(() => ({
    createUser: jest.fn(() => Promise.resolve({ uid: "new-user-uid" })),
    updateUser: jest.fn(),
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

describe("createAdminUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { createAdminUser } = await import("./management");

    const request = {
      auth: null,
      data: {},
    };

    await expect(createAdminUser(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for non super_admin users", async () => {
    const { createAdminUser } = await import("./management");

    const request = {
      auth: {
        uid: "admin-uid",
        token: { role: "zakat_admin" },
      },
      data: {
        email: "test@example.com",
        password: "password123",
        firstName: "Test",
        lastName: "User",
        phone: "1234567890",
        role: "zakat_admin",
        masjidId: "masjid-1",
      },
    };

    await expect(createAdminUser(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument for invalid email", async () => {
    const { createAdminUser } = await import("./management");

    const request = {
      auth: {
        uid: "admin-uid",
        token: { role: "super_admin" },
      },
      data: {
        email: "invalid-email",
        password: "password123",
        firstName: "Test",
        lastName: "User",
        phone: "1234567890",
        role: "zakat_admin",
        masjidId: "masjid-1",
      },
    };

    await expect(createAdminUser(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("should throw invalid-argument for short password", async () => {
    const { createAdminUser } = await import("./management");

    const request = {
      auth: {
        uid: "admin-uid",
        token: { role: "super_admin" },
      },
      data: {
        email: "test@example.com",
        password: "short",
        firstName: "Test",
        lastName: "User",
        phone: "1234567890",
        role: "zakat_admin",
        masjidId: "masjid-1",
      },
    };

    await expect(createAdminUser(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("disableUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { disableUser } = await import("./management");

    const request = {
      auth: null,
      data: { userId: "user-1" },
    };

    await expect(disableUser(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw failed-precondition when trying to disable self", async () => {
    const { disableUser } = await import("./management");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "super_admin" },
      },
      data: { userId: "user-1" },
    };

    await expect(disableUser(request as never)).rejects.toMatchObject({
      code: "failed-precondition",
    });
  });

  it("should throw permission-denied for applicants", async () => {
    const { disableUser } = await import("./management");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: { userId: "user-2" },
    };

    await expect(disableUser(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });
});

describe("enableUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { enableUser } = await import("./management");

    const request = {
      auth: null,
      data: { userId: "user-1" },
    };

    await expect(enableUser(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });
});

describe("listUsers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { listUsers } = await import("./management");

    const request = {
      auth: null,
      data: {},
    };

    await expect(listUsers(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for applicants", async () => {
    const { listUsers } = await import("./management");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: {},
    };

    await expect(listUsers(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });
});

describe("getUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { getUser } = await import("./management");

    const request = {
      auth: null,
      data: { userId: "user-1" },
    };

    await expect(getUser(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied when viewing other user without admin role", async () => {
    const { getUser } = await import("./management");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: { userId: "user-2" },
    };

    await expect(getUser(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });
});
