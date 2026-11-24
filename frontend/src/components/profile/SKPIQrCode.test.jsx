// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SKPIQrCode } from "./SKPIQrCode";

afterEach(cleanup);

it("renders a crisp native SVG QR matrix for the SKPI verification URL", () => {
  render(
    <SKPIQrCode url="https://peerlearn.uinsgd.ac.id/verifikasi-skpi/user-123" size={96} />
  );

  const svg = screen.getByRole("img", {
    name: "QR Code Verifikasi SKPI PeerLearn",
  });
  expect(svg.tagName.toLowerCase()).toBe("svg");
  expect(svg.querySelectorAll("rect").length).toBeGreaterThan(20);
  expect(screen.getByText("Pindai Verifikasi SKPI")).toBeTruthy();
});
