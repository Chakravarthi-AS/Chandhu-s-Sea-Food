"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function CustomerGreeting() {
  const { customer, ready } = useStore();
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const tick = () => setHour(new Date().getHours());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const greeting = useMemo(() => greetingForHour(hour), [hour]);

  if (!ready || !customer) return null;

  return (
    <div className="greeting-bar" role="status">
      <div className="container greeting-inner">
        <span className="greeting-emoji" aria-hidden>
          {hour < 12 ? "🌅" : hour < 17 ? "☀️" : "🌙"}
        </span>
        <p className="greeting-text">
          {greeting}, <strong className="greeting-name">{customer.name}</strong>
          {/* <span className="greeting-sub"> — fresh catch ready when you are</span> */}
        </p>
      </div>
    </div>
  );
}
