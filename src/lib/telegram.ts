/**
 * Shared Telegram notification helper for Recruitment App.
 * Dispatches notifications simultaneously to personal bot chat and Telegram groups.
 */

export interface TelegramConfig {
  botToken: string | null;
  chatIds: string[];
  personalChatIds: string[];
  groupChatIds: string[];
}

export function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function getTelegramConfig(): TelegramConfig {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || null;

  // Personal chat ID(s) - can be single ID or comma/space separated
  const rawPersonal = process.env.TELEGRAM_CHAT_ID || "";
  const personalChatIds = rawPersonal
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);

  // Group chat ID(s) - supports TELEGRAM_GROUP_CHAT_ID or TELEGRAM_GROUP_ID
  const rawGroup = process.env.TELEGRAM_GROUP_CHAT_ID || process.env.TELEGRAM_GROUP_ID || "";
  const groupChatIds = rawGroup
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);

  // Combined deduplicated target chat IDs
  const combined = Array.from(new Set([...personalChatIds, ...groupChatIds]));

  return {
    botToken,
    chatIds: combined,
    personalChatIds,
    groupChatIds,
  };
}

export interface SendResult {
  chatId: string;
  success: boolean;
  isGroup: boolean;
  error?: string;
  data?: any;
}

export async function sendTelegramNotification(
  messageHtml: string,
  options?: { disableWebPagePreview?: boolean }
): Promise<{
  success: boolean;
  sentCount: number;
  totalTargets: number;
  results: SendResult[];
}> {
  const { botToken, chatIds } = getTelegramConfig();

  if (!botToken || chatIds.length === 0) {
    console.warn("[Telegram] Notification skipped: TELEGRAM_BOT_TOKEN or target chat IDs not set.");
    return {
      success: false,
      sentCount: 0,
      totalTargets: 0,
      results: [],
    };
  }

  const results = await Promise.all(
    chatIds.map(async (chatId): Promise<SendResult> => {
      const isGroup = chatId.startsWith("-");
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageHtml,
            parse_mode: "HTML",
            disable_web_page_preview: options?.disableWebPagePreview ?? true,
          }),
        });

        const data = await res.json();
        if (!data.ok) {
          console.error(`[Telegram] Error sending to chat ${chatId} (${isGroup ? "Group" : "Direct"}):`, data);
          return {
            chatId,
            success: false,
            isGroup,
            error: data.description || "Telegram API rejected message",
            data,
          };
        }

        return {
          chatId,
          success: true,
          isGroup,
          data,
        };
      } catch (err: any) {
        console.error(`[Telegram] Network error sending to ${chatId}:`, err);
        return {
          chatId,
          success: false,
          isGroup,
          error: err.message || "Network request failed",
        };
      }
    })
  );

  const sentCount = results.filter((r) => r.success).length;

  return {
    success: sentCount > 0,
    sentCount,
    totalTargets: chatIds.length,
    results,
  };
}

/**
 * Diagnostics helper: inspect bot status and fetch recent group/supergroup chat IDs
 * where the bot was added or received messages.
 */
export async function getTelegramDiagnostics() {
  const config = getTelegramConfig();
  if (!config.botToken) {
    return {
      configured: false,
      error: "TELEGRAM_BOT_TOKEN is not configured in environment variables.",
      config,
    };
  }

  let botInfo: any = null;
  let detectedChats: Array<{
    id: string | number;
    title: string;
    type: string;
    username?: string;
  }> = [];

  try {
    const meRes = await fetch(`https://api.telegram.org/bot${config.botToken}/getMe`);
    botInfo = await meRes.json();
  } catch (err: any) {
    botInfo = { ok: false, error: err.message };
  }

  try {
    const updatesRes = await fetch(`https://api.telegram.org/bot${config.botToken}/getUpdates?limit=50`);
    const updatesData = await updatesRes.json();

    if (updatesData.ok && Array.isArray(updatesData.result)) {
      const chatMap = new Map<string, { id: string | number; title: string; type: string; username?: string }>();
      for (const update of updatesData.result) {
        const msg = update.message || update.channel_post || update.my_chat_member;
        const chat = msg?.chat;
        if (chat && chat.id) {
          const key = String(chat.id);
          if (!chatMap.has(key)) {
            chatMap.set(key, {
              id: chat.id,
              title: chat.title || chat.first_name || (chat.username ? `@${chat.username}` : "Unknown"),
              type: chat.type || "unknown",
              username: chat.username,
            });
          }
        }
      }
      detectedChats = Array.from(chatMap.values());
    }
  } catch (err: any) {
    console.error("[Telegram Diagnostics] getUpdates failed:", err);
  }

  return {
    configured: true,
    bot: botInfo,
    activeTargets: config.chatIds,
    personalTargets: config.personalChatIds,
    groupTargets: config.groupChatIds,
    detectedChats,
  };
}
