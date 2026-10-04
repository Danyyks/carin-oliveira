// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useOffline } from "./useOffline";

function definirOnline(valor: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value: valor });
}

afterEach(() => {
  cleanup();
  definirOnline(true);
});

describe("useOffline", () => {
  it("começa como online quando navigator.onLine é true", () => {
    definirOnline(true);
    const { result } = renderHook(() => useOffline());
    expect(result.current).toBe(false);
  });

  it("começa como offline quando navigator.onLine já é false", () => {
    definirOnline(false);
    const { result } = renderHook(() => useOffline());
    expect(result.current).toBe(true);
  });

  it("reage ao evento 'offline'", () => {
    definirOnline(true);
    const { result } = renderHook(() => useOffline());
    act(() => {
      definirOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(true);
  });

  it("reage ao evento 'online'", () => {
    definirOnline(false);
    const { result } = renderHook(() => useOffline());
    act(() => {
      definirOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(false);
  });
});
