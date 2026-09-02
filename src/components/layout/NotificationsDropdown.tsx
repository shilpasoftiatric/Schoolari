"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markAllNotificationsAsRead, markNotificationAsRead } from "@/app/actions/notifications";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsDropdown({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0 || isPending) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    startTransition(async () => {
      try {
        const res = await markAllNotificationsAsRead();
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success("All notifications marked as read");
          router.refresh();
        }
      } catch (err: any) {
        toast.error("Failed to update notifications");
      }
    });
  };

  const handleItemClick = (notif: NotificationItem) => {
    if (notif.is_read) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );

    startTransition(async () => {
      try {
        await markNotificationAsRead(notif.id);
        router.refresh();
      } catch (e) {
        // Silent catch for individual read
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors focus:outline-none cursor-pointer">
        <div className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full animate-in zoom-in-50">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="hidden sm:block font-medium">Notifications</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 shadow-xl rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-sm font-bold text-slate-800">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>

        <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">No new notifications</div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`p-4 transition-colors cursor-pointer ${!notif.is_read ? "bg-violet-50/60 hover:bg-violet-50" : "hover:bg-slate-50"
                  }`}
              >
                <div className="flex gap-3">
                  <div
                    className={`mt-0.5 rounded-full p-1.5 w-fit h-fit shrink-0 ${!notif.is_read ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-400"
                      }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 leading-snug break-words">
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed break-words">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-2 border-t border-slate-100 bg-slate-50/50">
          <Button
            variant="ghost"
            disabled={unreadCount === 0 || isPending}
            onClick={handleMarkAllAsRead}
            className="w-full text-xs text-violet-600 font-bold hover:text-violet-700 hover:bg-violet-50 h-8.5 rounded-xl disabled:opacity-40 cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            )}
            {unreadCount === 0 ? "All caught up" : "Mark all as read"}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
