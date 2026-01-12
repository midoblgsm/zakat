import { describe, it, expect } from "@jest/globals";
import {
  isValidEmail,
  isValidPhone,
  isValidRole,
  hasPermission,
  sanitizeString,
} from "./validation";

describe("isValidEmail", () => {
  it("should return true for valid emails", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("user.name@domain.org")).toBe(true);
    expect(isValidEmail("user+tag@example.co.uk")).toBe(true);
  });

  it("should return false for invalid emails", () => {
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("test@")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("should return true for valid phone numbers", () => {
    expect(isValidPhone("1234567890")).toBe(true);
    expect(isValidPhone("+11234567890")).toBe(true);
    expect(isValidPhone("(123) 456-7890")).toBe(true);
    expect(isValidPhone("123-456-7890")).toBe(true);
  });

  it("should return false for invalid phone numbers", () => {
    expect(isValidPhone("123")).toBe(false);
    expect(isValidPhone("abc")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });
});

describe("isValidRole", () => {
  it("should return true for valid roles", () => {
    expect(isValidRole("applicant")).toBe(true);
    expect(isValidRole("zakat_admin")).toBe(true);
    expect(isValidRole("super_admin")).toBe(true);
  });

  it("should return false for invalid roles", () => {
    expect(isValidRole("admin")).toBe(false);
    expect(isValidRole("user")).toBe(false);
    expect(isValidRole("")).toBe(false);
    expect(isValidRole("APPLICANT")).toBe(false);
  });
});

describe("hasPermission", () => {
  it("should return true when caller has equal or higher role", () => {
    expect(hasPermission("super_admin", "applicant")).toBe(true);
    expect(hasPermission("super_admin", "zakat_admin")).toBe(true);
    expect(hasPermission("super_admin", "super_admin")).toBe(true);
    expect(hasPermission("zakat_admin", "applicant")).toBe(true);
    expect(hasPermission("zakat_admin", "zakat_admin")).toBe(true);
    expect(hasPermission("applicant", "applicant")).toBe(true);
  });

  it("should return false when caller has lower role", () => {
    expect(hasPermission("applicant", "zakat_admin")).toBe(false);
    expect(hasPermission("applicant", "super_admin")).toBe(false);
    expect(hasPermission("zakat_admin", "super_admin")).toBe(false);
  });

  it("should return false for undefined role", () => {
    expect(hasPermission(undefined, "applicant")).toBe(false);
  });
});

describe("sanitizeString", () => {
  it("should trim whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
    expect(sanitizeString("\nhello\n")).toBe("hello");
  });

  it("should remove angle brackets", () => {
    expect(sanitizeString("<script>alert('xss')</script>")).toBe("scriptalert('xss')/script");
    expect(sanitizeString("hello<world>")).toBe("helloworld");
  });

  it("should handle empty strings", () => {
    expect(sanitizeString("")).toBe("");
    expect(sanitizeString("   ")).toBe("");
  });
});
