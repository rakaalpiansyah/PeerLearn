// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import LinkifiedText from "./LinkifiedText";

describe("LinkifiedText", () => {
  afterEach(cleanup);

  it("renders plain text without links directly", () => {
    render(<LinkifiedText text="Halo semua, sesi belajar dimulai pukul 14.00" />);
    expect(screen.getByText(/Halo semua, sesi belajar dimulai pukul 14.00/)).toBeTruthy();
  });

  it("converts https:// and http:// URLs into clickable links with security attributes", () => {
    render(
      <LinkifiedText text="Silakan akses materi di https://drive.google.com/drive/folders/sample-link ya" />
    );
    const link = screen.getByRole("link", { name: /drive\.google\.com/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("https://drive.google.com/drive/folders/sample-link");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("sanitizes HTML tags safely without rendering raw HTML (XSS prevention)", () => {
    const maliciousInput = '<script>alert("xss")</script> Halo <img src="x" onerror="alert(1)">';
    render(<LinkifiedText text={maliciousInput} />);
    // The tags must not be rendered as HTML elements in DOM
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText(/<script>/)).toBeTruthy();
  });

  it("does not linkify javascript: pseudoprotocol", () => {
    render(<LinkifiedText text="Coba klik javascript:alert(1) ini" />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
