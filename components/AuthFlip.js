"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MemberLogin from "@/components/MemberLogin";
import MemberRegister from "@/components/MemberRegister";
import useLockedViewport from "@/lib/useLockedViewport";

export default function AuthFlip({
  initialFace = "login",
  next = "/positions",
  hasAccounts = true,
  googleEnabled = false,
  discordEnabled = false,
  initialError = "",
  initialNotice = "",
}) {
  const [face, setFace] = useState(initialFace);
  const [height, setHeight] = useState(null);
  useLockedViewport();
  const router = useRouter();
  const timer = useRef(null);
  const loginRef = useRef(null);
  const registerRef = useRef(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const switchTo = (side) => {
    setFace(side);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const target = side === "register" ? "/register" : "/login";
      router.replace(`${target}${window.location.search}`, { scroll: false });
    }, 840);
  };

  useLayoutEffect(() => {
    const measure = () => {
      const el = face === "register" ? registerRef.current : loginRef.current;
      if (!el) return;
      setHeight(el.getBoundingClientRect().height);
    };

    measure();

    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    if (loginRef.current) observer.observe(loginRef.current);
    if (registerRef.current) observer.observe(registerRef.current);
    return () => observer.disconnect();
  }, [face]);

  const flipped = face === "register";

  return (
    <div className="page">
      <div className="shell" style={{ maxWidth: "30rem" }}>
        <div className="flip" data-face={face}>
          <div
            className="flip-inner"
            style={height ? { "--flip-h": `${height}px` } : undefined}
          >
            <div
              className="flip-face"
              data-side="login"
              ref={loginRef}
              aria-hidden={flipped ? "true" : undefined}
              inert={flipped ? "" : undefined}
            >
              <MemberLogin
                next={next}
                hasAccounts={hasAccounts}
                googleEnabled={googleEnabled}
                discordEnabled={discordEnabled}
                initialError={initialError}
                initialNotice={initialNotice}
                onSwitch={() => switchTo("register")}
              />
            </div>
            <div
              className="flip-face"
              data-side="register"
              ref={registerRef}
              aria-hidden={flipped ? undefined : "true"}
              inert={flipped ? undefined : ""}
            >
              <MemberRegister
                next={next}
                googleEnabled={googleEnabled}
                discordEnabled={discordEnabled}
                onSwitch={() => switchTo("login")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
