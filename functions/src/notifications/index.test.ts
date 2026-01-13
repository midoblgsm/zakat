import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock firebase-admin/firestore
jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn((collectionName: string) => {
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
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(() =>
                Promise.resolve({
                  empty: false,
                  docs: [
                    { id: "admin-1" },
                    { id: "admin-2" },
                  ],
                })
              ),
            })),
          })),
        };
      }
      return {
        doc: jest.fn(() => ({
          id: "notif-1",
          set: jest.fn(() => Promise.resolve()),
          get: jest.fn(() =>
            Promise.resolve({
              exists: true,
              data: () => ({
                id: "notif-1",
                userId: "user-1",
                type: "status_update",
                title: "Test Notification",
                message: "Test message",
                read: false,
              }),
            })
          ),
          update: jest.fn(() => Promise.resolve()),
          delete: jest.fn(() => Promise.resolve()),
        })),
        add: jest.fn(() => Promise.resolve({ id: "notif-new" })),
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn(() =>
              Promise.resolve({
                empty: false,
                docs: [
                  {
                    ref: { update: jest.fn() },
                    data: () => ({ read: false }),
                  },
                ],
                size: 1,
              })
            ),
            count: jest.fn(() => ({
              get: jest.fn(() =>
                Promise.resolve({
                  data: () => ({ count: 5 }),
                })
              ),
            })),
          })),
          count: jest.fn(() => ({
            get: jest.fn(() =>
              Promise.resolve({
                data: () => ({ count: 5 }),
              })
            ),
          })),
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() =>
                Promise.resolve({
                  docs: [],
                })
              ),
              startAfter: jest.fn(() => ({
                get: jest.fn(() =>
                  Promise.resolve({
                    docs: [],
                  })
                ),
              })),
            })),
          })),
        })),
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(() =>
              Promise.resolve({
                docs: [],
              })
            ),
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
  WriteBatch: jest.fn(),
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

describe("sendNotification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { sendNotification } = await import("./index");

    const request = {
      auth: null,
      data: {
        userId: "user-1",
        type: "status_update",
        title: "Test",
        message: "Test message",
      },
    };

    await expect(sendNotification(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for non-admin users", async () => {
    const { sendNotification } = await import("./index");

    const request = {
      auth: {
        uid: "user-1",
        token: { role: "applicant" },
      },
      data: {
        userId: "user-2",
        type: "status_update",
        title: "Test",
        message: "Test message",
      },
    };

    await expect(sendNotification(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument when required params are missing", async () => {
    const { sendNotification } = await import("./index");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {
        userId: "user-1",
        type: "status_update",
      },
    };

    await expect(sendNotification(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("sendBulkNotification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { sendBulkNotification } = await import("./index");

    const request = {
      auth: null,
      data: {
        userIds: ["user-1", "user-2"],
        type: "system_announcement",
        title: "Test",
        message: "Test message",
      },
    };

    await expect(sendBulkNotification(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw permission-denied for non-super_admin users", async () => {
    const { sendBulkNotification } = await import("./index");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "zakat_admin", masjidId: "masjid-1" },
      },
      data: {
        userIds: ["user-1", "user-2"],
        type: "system_announcement",
        title: "Test",
        message: "Test message",
      },
    };

    await expect(sendBulkNotification(request as never)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("should throw invalid-argument when userIds array is empty", async () => {
    const { sendBulkNotification } = await import("./index");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "super_admin" },
      },
      data: {
        userIds: [],
        type: "system_announcement",
        title: "Test",
        message: "Test message",
      },
    };

    await expect(sendBulkNotification(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("should throw invalid-argument when userIds exceeds 500", async () => {
    const { sendBulkNotification } = await import("./index");

    const request = {
      auth: {
        uid: "admin-1",
        token: { role: "super_admin" },
      },
      data: {
        userIds: Array(501).fill("user-1"),
        type: "system_announcement",
        title: "Test",
        message: "Test message",
      },
    };

    await expect(sendBulkNotification(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("markNotificationRead", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { markNotificationRead } = await import("./index");

    const request = {
      auth: null,
      data: { notificationId: "notif-1" },
    };

    await expect(markNotificationRead(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw invalid-argument when notificationId is missing", async () => {
    const { markNotificationRead } = await import("./index");

    const request = {
      auth: { uid: "user-1" },
      data: {},
    };

    await expect(markNotificationRead(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("markAllNotificationsRead", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { markAllNotificationsRead } = await import("./index");

    const request = {
      auth: null,
      data: {},
    };

    await expect(markAllNotificationsRead(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });
});

describe("deleteNotification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { deleteNotification } = await import("./index");

    const request = {
      auth: null,
      data: { notificationId: "notif-1" },
    };

    await expect(deleteNotification(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("should throw invalid-argument when notificationId is missing", async () => {
    const { deleteNotification } = await import("./index");

    const request = {
      auth: { uid: "user-1" },
      data: {},
    };

    await expect(deleteNotification(request as never)).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("getUnreadNotificationCount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { getUnreadNotificationCount } = await import("./index");

    const request = {
      auth: null,
      data: {},
    };

    await expect(getUnreadNotificationCount(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });
});

describe("getUserNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw unauthenticated error when not authenticated", async () => {
    const { getUserNotifications } = await import("./index");

    const request = {
      auth: null,
      data: {},
    };

    await expect(getUserNotifications(request as never)).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });
});
