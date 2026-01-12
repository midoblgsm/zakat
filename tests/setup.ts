// Test setup for Firestore rules testing
import { beforeAll, afterAll } from "vitest";

// Ensure we're using the emulator
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

beforeAll(() => {
  console.log("Starting Firestore rules tests...");
});

afterAll(() => {
  console.log("Firestore rules tests completed.");
});
