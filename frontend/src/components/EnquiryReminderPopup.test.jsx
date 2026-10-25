import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import api from "@/api/client";
import toast from "react-hot-toast";
import EnquiryReminderPopup from "./EnquiryReminderPopup";

let mockPathname = "/";
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: mockPathname }),
}));

jest.mock("@/api/client", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("./ChatBotWidget", () => () => null);

describe("EnquiryReminderPopup timing", () => {
  let container;
  let root;

  const renderPopup = async (pathname = mockPathname) => {
    mockPathname = pathname;
    await act(async () => {
      root.render(<EnquiryReminderPopup />);
    });
  };

  const advanceTime = async (milliseconds) => {
    await act(async () => {
      jest.advanceTimersByTime(milliseconds);
    });
  };

  const dialog = () => document.body.querySelector('[aria-labelledby="enquiry-popup-title"]');

  const updateInput = (selector, value) => {
    const input = document.body.querySelector(selector);
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(input),
        "value"
      ).set;
      valueSetter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockPathname = "/";
    window.sessionStorage.clear();
    api.post.mockReset();
    toast.error.mockReset();
    toast.success.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete document.visibilityState;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("keeps a single 60-second cadence through dismissal and public navigation", async () => {
    await renderPopup();
    expect(dialog()).toBeNull();
    expect(jest.getTimerCount()).toBe(1);

    await advanceTime(59999);
    expect(dialog()).toBeNull();

    await renderPopup("/properties/123");
    expect(jest.getTimerCount()).toBe(1);

    await advanceTime(1);
    expect(dialog()).not.toBeNull();

    await advanceTime(10000);
    await act(async () => {
      document.body.querySelector('[aria-label="Dismiss and remind me later"]').click();
    });
    expect(dialog()).toBeNull();

    await advanceTime(49999);
    expect(dialog()).toBeNull();
    await advanceTime(1);
    expect(dialog()).not.toBeNull();

    await advanceTime(60000);
    expect(document.body.querySelectorAll('[aria-labelledby="enquiry-popup-title"]').length).toBe(1);

    await act(async () => {
      document.body.querySelector('[aria-label="Dismiss and remind me later"]').click();
    });
    expect(dialog()).toBeNull();
    await advanceTime(59999);
    expect(dialog()).toBeNull();
    await advanceTime(1);
    expect(dialog()).not.toBeNull();
  });

  it("defers a due reminder while hidden and shows it once the tab is visible", async () => {
    await renderPopup();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });

    await advanceTime(60000);
    expect(dialog()).toBeNull();
    expect(jest.getTimerCount()).toBe(1);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(dialog()).not.toBeNull();
    expect(jest.getTimerCount()).toBe(1);
  });

  it("continues after a failed submission and stops after a successful submission", async () => {
    await renderPopup();
    await advanceTime(60000);
    expect(dialog()).not.toBeNull();

    api.post.mockRejectedValueOnce(new Error("network failure"));
    updateInput('input[placeholder="Your name"]', "Test Visitor");
    updateInput('input[placeholder="+91 98765 43210"]', "9876543210");

    await act(async () => {
      document.body.querySelector('button[type="submit"]').click();
      await Promise.resolve();
    });
    expect(dialog()).not.toBeNull();
    expect(window.sessionStorage.getItem("vs_enquiry_submitted")).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Could not submit enquiry. Please try again.");

    api.post.mockResolvedValueOnce({ data: { chat_session_id: "session-1" } });
    await act(async () => {
      document.body.querySelector('button[type="submit"]').click();
      await Promise.resolve();
    });
    expect(dialog()).toBeNull();
    expect(window.sessionStorage.getItem("vs_enquiry_submitted")).toBe("true");

    await advanceTime(180000);
    expect(dialog()).toBeNull();
  });

  it("cleans up the interval on unmount and starts a fresh 60-second wait on remount", async () => {
    await renderPopup();
    expect(dialog()).toBeNull();
    expect(jest.getTimerCount()).toBe(1);

    act(() => root.unmount());
    expect(jest.getTimerCount()).toBe(0);

    root = createRoot(container);
    await renderPopup();
    expect(dialog()).toBeNull();
    await advanceTime(59999);
    expect(dialog()).toBeNull();
    await advanceTime(1);
    expect(dialog()).not.toBeNull();
  });
});
