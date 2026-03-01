/**
 * 在浏览器中提供 Node 的 Buffer，供 @ton/core 等依赖使用。
 * 由 index.html 先于 main.tsx 加载，保证在任何使用 @ton/core 的模块之前执行。
 */
import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  (window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}
if (typeof globalThis !== "undefined") {
  (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}
