"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { createDirectChat, getEmployees, getProfile } from "@/app/api/api";
import { Employee, ProfileLike } from "@/types/chat";
import { normalizeEmployee } from "@/lib/chat-utils";
import MobileTabHeader from "../../components/MobileTabHeader";

export default function NewChatPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      setLoading(true);
      try {
        const profileRes = await getProfile();
        const profile = (profileRes.data || {}) as ProfileLike;
        if (!profile.organizationId) {
          setEmployees([]);
          return;
        }

        const res = await getEmployees(profile.organizationId);
        const data: unknown[] = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];

        const list = data
          .map((item: unknown) => normalizeEmployee(item))
          .filter((item: Employee | null): item is Employee => Boolean(item))
          .filter((item) => item.userId !== (profile.userId || profile.id));

        setEmployees(list);
      } finally {
        setLoading(false);
      }
    };

    void loadEmployees();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const query = search.toLowerCase();

    return employees.filter((employee) => {
      const name = `${employee.firstName || ""} ${employee.lastName || ""}`.toLowerCase();
      const designation = `${employee.designation?.name || employee.designationName || ""}`.toLowerCase();
      return name.includes(query) || designation.includes(query);
    });
  }, [employees, search]);

  const startChatWith = async (employee: Employee) => {
    try {
      const res = await createDirectChat(employee.userId);
      const conversationId = res.data?.id;
      if (!conversationId) return;

      const name = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Chat";
      const params = new URLSearchParams({
        title: name,
        avatar: employee.photoUrl || "",
        peerId: employee.userId,
      });

      if (employee.photoUrl) {
        try { sessionStorage.setItem(`chat_avatar_${conversationId}`, employee.photoUrl); } catch { /* ignore */ }
      }
      router.push(`/user/dashboard/mobile/messages/${conversationId}?${params.toString()}`);
    } catch {
      // ignore
    }
  };

  return (
    /*
     * ✅ LAYOUT:
     * `h-[100dvh] flex flex-col overflow-hidden` — full dynamic viewport,
     * flex column so header is locked and only the list scrolls.
     */
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden">

      {/* ── STICKY HEADER + SEARCH (never scrolls) ── */}
      <div className="sticky top-0 z-20 shrink-0 bg-background">
        <MobileTabHeader
          title="New Chat"
          backHref="/user/dashboard/mobile/messages"
          showBackLabel
          backLabel="Chats"
        />

        {/* Search bar — pinned, never scrolls */}
        <div className="mx-4 -mt-3 bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-2">
          <Search className="w-4.5 h-4.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employees"
            className="flex-1 text-[13px] text-foreground placeholder:text-muted-foreground outline-none bg-transparent"
          />
          {search.length > 0 ? (
            <button onClick={() => setSearch("")} aria-label="Clear">
              <X className="w-4.5 h-4.5 text-muted-foreground" />
            </button>
          ) : null}
        </div>

        {/* Section label */}
        {!loading && filtered.length > 0 ? (
          <p className="px-5 pt-4 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            {search.trim() ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : `All employees · ${filtered.length}`}
          </p>
        ) : null}
      </div>

      {/* ── SCROLLABLE EMPLOYEE LIST ── */}
      {/*
       * ✅ `flex-1 min-h-0` — takes all remaining height.
       * `min-h-0` prevents the flex child from expanding beyond the container.
       * `overflow-y-auto` — only this zone scrolls.
       * `pb-20` — breathing room above the bottom nav bar.
       */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-20">
        {loading ? (
          <div className="px-4 py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading employees…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 flex flex-col items-center gap-2">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-muted-foreground/50"
            >
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-muted-foreground">
              {search.trim() ? `No results for "${search}"` : "No employees found"}
            </p>
          </div>
        ) : (
          filtered.map((employee) => {
            const name =
              `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";
            const designation =
              employee.designation?.name || employee.designationName || "Employee";
            const initials = name
              .split(" ")
              .slice(0, 2)
              .map((w) => w.charAt(0).toUpperCase())
              .join("");

            return (
              <button
                key={employee.id}
                onClick={() => void startChatWith(employee)}
                className="w-full flex items-center px-4 py-3 border-b border-border/60 text-left active:bg-muted transition-colors"
              >
                {/* Avatar */}
                <div className="w-[42px] h-[42px] rounded-full bg-primary/10 flex items-center justify-center mr-3 shrink-0">
                  <span className="text-primary text-sm font-bold">{initials}</span>
                </div>

                {/* Name + designation */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{designation}</p>
                </div>

                {/* Chevron hint */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-muted-foreground/40 shrink-0 ml-2"
                >
                  <path
                    d="M9 18L15 12L9 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
