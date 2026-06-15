"use client";

import { useUser, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import CreateRoomPopup from "./CreateRoom";
import { useState } from "react";
import { Globe, MessageSquare, Plus } from "lucide-react";

type NavbarProps = {
  value: "rooms" | "chat";
  setValue: (v: "rooms" | "chat") => void;
};

export default function Navbar({ value, setValue }: NavbarProps) {
  const [popup, setPopup] = useState(false);
  const { isSignedIn } = useUser();

  return (
    <>
      <header className="shrink-0 sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* ── Main row ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <a href="/" className="flex items-center gap-2.5 shrink-0 select-none">
              <div className="w-8 h-8 rounded-lg bg-[#7254e9] flex items-center justify-center">
                <Globe size={16} className="text-white" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                Speak<span className="text-[#7254e9]">Up</span>
              </span>
            </a>

            {/* Desktop tabs — hidden on mobile, shown sm+ */}
            {isSignedIn && (
              <nav
                aria-label="Main navigation"
                className="hidden sm:flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1"
              >
                <NavTab
                  active={value === "rooms"}
                  onClick={() => setValue("rooms")}
                  icon={<Globe size={14} />}
                  label="Rooms"
                />
                <NavTab
                  active={value === "chat"}
                  onClick={() => setValue("chat")}
                  icon={<MessageSquare size={14} />}
                  label="World Chat"
                />
              </nav>
            )}

            {/* Right-side actions */}
            <div className="flex items-center gap-2 shrink-0">

              {/* Signed-out auth buttons */}
              {!isSignedIn && (
                <>
                  <SignInButton>
                    <button className="text-zinc-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="bg-[#7254e9] hover:bg-[#6245d4] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                      Get Started
                    </button>
                  </SignUpButton>
                </>
              )}

              {/* Signed-in actions */}
              {isSignedIn && (
                <>
                  {value === "rooms" && (
                    <button
                      onClick={() => setPopup(true)}
                      className="flex items-center gap-1.5 bg-[#7254e9] hover:bg-[#6245d4] text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                    >
                      <Plus size={15} />
                      {/* Label hidden on very small screens */}
                      <span className="hidden xs:inline sm:inline">Create Room</span>
                    </button>
                  )}
                  <UserButton />
                </>
              )}
            </div>
          </div>

          {/* ── Mobile tab strip — visible only on < sm ──────────────── */}
          {isSignedIn && (
            <div className="sm:hidden flex border-t border-zinc-800/60">
              <MobileTab
                active={value === "rooms"}
                onClick={() => setValue("rooms")}
                icon={<Globe size={15} />}
                label="Rooms"
              />
              <MobileTab
                active={value === "chat"}
                onClick={() => setValue("chat")}
                icon={<MessageSquare size={15} />}
                label="World Chat"
              />
            </div>
          )}

        </div>
      </header>

      {popup && <CreateRoomPopup popup={popup} setPopup={setPopup} />}
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function NavTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-[#7254e9] text-white shadow-sm"
          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-b-2 ${
        active
          ? "text-[#7254e9] border-[#7254e9]"
          : "text-zinc-500 border-transparent hover:text-zinc-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}