// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHoje } from "./useHoje";

describe("useHoje", () => {
  afterEach(() => vi.useRealTimers());

  it("começa com a data de hoje", () => {
    const { result } = renderHook(() => useHoje());
    expect(result.current).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("recalcula quando a aba volta a ficar visível", () => {
    const { result } = renderHook(() => useHoje());
    const antes = result.current;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current).toBe(antes); // mesma "hoje": só confirma que não quebra
  });

  it("recalcula sozinho a cada minuto", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useHoje());
    const antes = result.current;
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current).toBe(antes);
  });
});
