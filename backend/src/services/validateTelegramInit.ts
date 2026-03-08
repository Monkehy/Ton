/**
 * validateTelegramInit.ts
 * Verifies Telegram Mini App initData HMAC signature.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
import { createHmac } from "crypto";

export function validateTelegramInitData(initData: string, botToken: string): boolean {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;

    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const expectedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    return expectedHash === hash;
  } catch {
    return false;
  }
}

export function parseTelegramInitData(initData: string): { wallet?: string; userId?: string } {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    if (userStr) {
      const user = JSON.parse(userStr) as { id?: number };
      return { userId: String(user.id ?? "") };
    }
  } catch { /* ignore */ }
  return {};
}
