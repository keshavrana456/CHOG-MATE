import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Heart, MessageCircle, Sparkles, Video, X } from "lucide-react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";

type NotificationRow = {
  id: string;
  actor_id: string | null;
  type: "like" | "super_like" | "match" | "message" | "call" | "missed_call";
  related_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationCenter() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setUserId(null);
      setItems([]);
      return;
    }
    let channel: ReturnType<typeof client.channel> | null = null;
    let disposed = false;
    let activeUserId: string | null = null;
    let retryTimer: number | null = null;

    const loadNotifications = async (nextUserId: string) => {
      if (disposed) return;
      const { data, error } = await client
        .from("notifications")
        .select("id,actor_id,type,related_id,read_at,created_at")
        .eq("user_id", nextUserId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (disposed || activeUserId !== nextUserId) return;
      if (!error) setItems((data ?? []) as NotificationRow[]);
    };

    const subscribe = (nextUserId: string) => {
      if (disposed || activeUserId !== nextUserId || channel) return;
      const nextChannel = client
        .channel(`user-notifications:${nextUserId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${nextUserId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const inserted = payload.new as NotificationRow;
              setItems((current) =>
                [inserted, ...current.filter((item) => item.id !== inserted.id)].slice(0, 30),
              );
            } else if (payload.eventType === "UPDATE") {
              const updated = payload.new as NotificationRow;
              setItems((current) =>
                current.map((item) => item.id === updated.id ? updated : item),
              );
              } else if (payload.eventType === "DELETE") {
                const removed = payload.old as Pick<NotificationRow, "id">;
                setItems((current) => current.filter((item) => item.id !== removed.id));
            }
          },
        )
        .subscribe((status) => {
          if (
            disposed ||
            activeUserId !== nextUserId ||
            channel !== nextChannel
          ) return;
          if (status === "SUBSCRIBED") {
            if (retryTimer !== null) {
              window.clearTimeout(retryTimer);
              retryTimer = null;
            }
            void loadNotifications(nextUserId);
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            channel = null;
            void client.removeChannel(nextChannel);
            if (retryTimer === null) {
              retryTimer = window.setTimeout(() => {
                retryTimer = null;
                subscribe(nextUserId);
              }, 3000);
            }
          }
        });
    };

    const stopSubscription = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (channel) {
        const current = channel;
        channel = null;
        void client.removeChannel(current);
      }
    };

    const changeUser = async (nextUserId: string | null) => {
      if (disposed) return;
      if (nextUserId === activeUserId) {
        if (nextUserId) {
          subscribe(nextUserId);
          await loadNotifications(nextUserId);
        }
        return;
      }

      stopSubscription();
      activeUserId = nextUserId;
      setUserId(nextUserId);
      setItems([]);
      if (!nextUserId) return;

      subscribe(nextUserId);
      await loadNotifications(nextUserId);
    };

    void client.auth.getSession().then(({ data }) => {
      void changeUser(data.session?.user.id ?? null);
    });
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void changeUser(session?.user.id ?? null), 0);
    });

    return () => {
      disposed = true;
      authListener.subscription.unsubscribe();
      stopSubscription();
    };
  }, []);

  async function markRead(item: NotificationRow) {
    const client = supabase;
    if (item.read_at || !client || !userId) return;
    const readAt = new Date().toISOString();
    const { error } = await client
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", item.id)
      .eq("user_id", userId);
    if (!error) {
      setItems((current) =>
        current.map((notification) =>
          notification.id === item.id ? { ...notification, read_at: readAt } : notification,
        ),
      );
    }
  }

  async function markAllRead() {
    const client = supabase;
    if (!client || !userId || unreadCount === 0) return;
    const readAt = new Date().toISOString();
    const { error } = await client
      .from("notifications")
      .update({ read_at: readAt })
      .eq("user_id", userId)
      .is("read_at", null);
    if (!error) {
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })));
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="glass-icon-button relative grid h-10 w-10 place-items-center rounded-full transition"
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        data-testid="button-notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#a64b70] px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <section
          className="glass-popover absolute right-0 top-12 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/70 bg-[#fffaf6] shadow-[0_20px_60px_#2b163422]"
          aria-label="Notifications"
          data-testid="panel-notifications"
        >
          <header className="flex items-center justify-between border-b border-[#24133f12] px-4 py-3">
            <div>
              <h2 className="display text-base font-extrabold text-[#24133f]">Notifications</h2>
              <p className="mt-0.5 text-[10px] text-[#82778c]">
                {unreadCount ? `${unreadCount} unread` : "You’re all caught up"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="grid h-8 w-8 place-items-center rounded-full text-[#7053a4] hover:bg-[#f2ecff]"
                  title="Mark all as read"
                  aria-label="Mark all notifications as read"
                >
                  <CheckCheck size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-[#82778c] hover:bg-[#f2ecff]"
                aria-label="Close notifications"
              >
                <X size={15} />
              </button>
            </div>
          </header>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {!userId ? (
              <p className="px-3 py-8 text-center text-xs leading-5 text-[#82778c]">
                Connect and verify your wallet to receive notifications.
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs leading-5 text-[#82778c]">
                Likes, matches, and messages will show up here.
              </p>
            ) : (
              items.map((item) => {
                const destination = notificationDestination(item);
                const Icon = item.type === "message"
                  ? MessageCircle
                  : item.type === "call" || item.type === "missed_call"
                    ? Video
                    : item.type === "super_like"
                      ? Sparkles
                      : Heart;
                return (
                  <Link
                    key={item.id}
                    href={destination}
                    onClick={() => {
                      void markRead(item);
                      setOpen(false);
                    }}
                    className={`flex items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#f5f0ff] ${item.read_at ? "" : "bg-[#f7f2ff]"}`}
                    data-testid={`notification-${item.id}`}
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#eee8ff] text-[#7047ff]">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold leading-5 text-[#4e405e]">
                        {notificationText(item.type)}
                      </span>
                      <time className="mt-1 block text-[10px] text-[#95899d]">
                        {new Date(item.created_at).toLocaleString()}
                      </time>
                    </span>
                    {!item.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#a64b70]" />}
                  </Link>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function notificationText(type: NotificationRow["type"]): string {
  if (type === "like") return "Someone liked your profile";
  if (type === "super_like") return "You received a $CHOG Super Like";
  if (type === "match") return "It’s a match";
  if (type === "message") return "You have a new message";
  if (type === "missed_call") return "You missed a call";
  return "You have an incoming call";
}

function notificationDestination(item: NotificationRow): string {
  if (item.type === "like" || item.type === "super_like") return "/matches#likes";
  if (item.type === "message" && item.related_id) {
    return `/messages?match=${encodeURIComponent(item.related_id)}`;
  }
  if (item.type === "call" || item.type === "missed_call") return "/messages";
  return "/matches";
}
