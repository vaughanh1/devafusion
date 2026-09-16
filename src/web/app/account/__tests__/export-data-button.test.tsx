import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExportDataButton } from "@/app/account/export-data-button";

describe("ExportDataButton", () => {
  const createObjectURLMock = vi.fn(() => "blob:mock-url");
  const revokeObjectURLMock = vi.fn();

  beforeEach(() => {
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;
  });

  afterEach(() => {
    cleanup();
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("fetches the export endpoint and triggers a download on success", async () => {
    const blob = new Blob(["{}"], { type: "application/json" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      }),
    );

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: /download my data/i }));

    await waitFor(() => expect(createObjectURLMock).toHaveBeenCalledWith(blob));
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url");
  });

  it("shows an error message when the export request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: /download my data/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not export your data. Please try again.",
    );
  });

  it("shows a generic error when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: /download my data/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });
});
