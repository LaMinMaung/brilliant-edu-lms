import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { countUnread, subscribeNotifications } from "../services/notifications";

/** Unread notification count for the signed-in user, kept live via realtime events. */
export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const userId = user?.id;

  const refresh = useCallback(async () => {
    if (!userId) return setCount(0);
    try { setCount(await countUnread(userId)); } catch (err) { console.error("Failed to load notifications", err); }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
    const sub = subscribeNotifications(userId, () => refresh());
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("lms:notifications-changed", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("lms:notifications-changed", onFocus);
      sub.then((unsub) => unsub()).catch((err) => console.error("Notification unsubscribe failed", err));
    };
  }, [userId, refresh]);

  return { count, refresh };
}

/** Lets pages tell the bell to recount (e.g. after "mark all read"). */
export function announceNotificationsChanged() {
  window.dispatchEvent(new Event("lms:notifications-changed"));
}
