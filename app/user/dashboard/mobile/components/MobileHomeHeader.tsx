"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import useUnreadMessages from "./useUnreadMessages";

type UserInfo = {
  name: string;
  role: string;
  avatar: string;
};

export default function MobileHomeHeader({
  user,
  onOpenSidebar,
}: {
  user: UserInfo;
  onOpenSidebar: () => void;
}) {
  const router = useRouter();
  const unreadCount = useUnreadMessages();

  return (
    <div className="bg-[#005F90] text-white px-4 pt-5 pb-16 flex items-center justify-between">
      <div className="flex items-center space-x-2 cursor-pointer" onClick={onOpenSidebar}>
        <Avatar className="w-12 h-12 border-2 border-white transition-transform active:scale-95">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-l font-semibold">{user.name}</h2>
          <p className="text-sm opacity-90">{user.role}</p>
        </div>
      </div>
      <button
        className="relative"
        onClick={() => router.push("/user/dashboard/mobile/notifications")}
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
