import { useState, useEffect } from "react";

function getToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useToday(): string {
  const [today, setToday] = useState(getToday);

  useEffect(() => {
    const interval = setInterval(() => setToday(getToday()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return today;
}
