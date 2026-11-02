// @vitest-environment jsdom

import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./client";

function httpErrorAdapter(status, data) {
  return async (config) => {
    const response = {
      data,
      status,
      statusText: status === 401 ? "Unauthorized" : "Internal Server Error",
      headers: {},
      config,
    };
    throw new AxiosError(
      `Request failed with status code ${status}`,
      status === 401 ? "ERR_BAD_REQUEST" : "ERR_BAD_RESPONSE",
      config,
      undefined,
      response,
    );
  };
}

describe("apiClient", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("preserves HTTP 401 and structured error details", async () => {
    await expect(
      apiClient.get("/auth/me", {
        adapter: httpErrorAdapter(401, {
          error: {
            code: "SESSION_EXPIRED",
            message: "Sesi telah berakhir",
            details: [{ field: "token", message: "Token kedaluwarsa" }],
          },
        }),
      }),
    ).rejects.toEqual({
      status: 401,
      code: "SESSION_EXPIRED",
      message: "Sesi telah berakhir",
      details: [{ field: "token", message: "Token kedaluwarsa" }],
    });
  });

  it("uses HTTP 500 despite a misleading UNAUTHORIZED code and payload status", async () => {
    await expect(
      apiClient.get("/auth/me", {
        adapter: httpErrorAdapter(500, {
          error: {
            code: "UNAUTHORIZED",
            message: "Server sedang bermasalah",
            status: 401,
          },
        }),
      }),
    ).rejects.toEqual({
      status: 500,
      code: "UNAUTHORIZED",
      message: "Server sedang bermasalah",
    });
  });

  it("preserves HTTP 401 without a structured error payload", async () => {
    await expect(
      apiClient.get("/auth/me", {
        adapter: httpErrorAdapter(401, "Unauthorized"),
      }),
    ).rejects.toEqual({
      status: 401,
      code: "NETWORK_ERROR",
      message: "Request failed with status code 401",
    });
  });

  it.each([
    ["network failure", "ERR_NETWORK", "Network Error"],
    ["timeout", "ECONNABORTED", "timeout of 10000ms exceeded"],
  ])(
    "normalizes %s without fabricating an HTTP status",
    async (_scenario, code, message) => {
      const request = apiClient.get("/auth/me", {
        adapter: async (config) => {
          throw new AxiosError(message, code, config);
        },
      });

      await expect(request).rejects.toMatchObject({
        code: "NETWORK_ERROR",
        message,
      });
      await expect(
        request.catch((error) => error.status),
      ).resolves.toBeUndefined();
    },
  );

  it("returns the successful response body unchanged", async () => {
    const body = { success: true, data: { id: "student-1" } };

    await expect(
      apiClient.get("/auth/me", {
        adapter: async (config) => ({
          data: body,
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        }),
      }),
    ).resolves.toBe(body);
  });

  it("attaches the bearer token from localStorage to the request", async () => {
    localStorage.setItem("peerlearn_token", "test-token");

    await expect(
      apiClient.get("/auth/me", {
        adapter: async (config) => ({
          data: { authorization: config.headers.Authorization },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        }),
      }),
    ).resolves.toEqual({ authorization: "Bearer test-token" });
  });
});
