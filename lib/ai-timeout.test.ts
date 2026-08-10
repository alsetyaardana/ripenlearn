// lib/ai-timeout.test.ts
// Test helper timeout DeepSeek: request yang melewati batas waktu di-abort dengan
// error yang aman ditampilkan (tidak membocorkan stack/provider error mentah).
import { test } from "node:test";
import assert from "node:assert/strict";
import { withAiTimeout, AiTimeoutError } from "./ai";

test("withAiTimeout menyelesaikan promise yang selesai sebelum batas", async () => {
  const result = await withAiTimeout(
    new Promise((resolve) => setTimeout(() => resolve("ok"), 20)),
    1000
  );
  assert.equal(result, "ok");
});

test("withAiTimeout mengabort promise yang terlalu lama (AiTimeoutError)", async () => {
  await assert.rejects(
    () =>
      withAiTimeout(
        new Promise((resolve) => setTimeout(() => resolve("late"), 5000)),
        50
      ),
    (err: unknown) => err instanceof AiTimeoutError
  );
});

test("withAiTimeout meneruskan error asli dari promise", async () => {
  await assert.rejects(
    () =>
      withAiTimeout(
        Promise.reject(new Error("provider down")),
        1000
      ),
    /provider down/
  );
});
