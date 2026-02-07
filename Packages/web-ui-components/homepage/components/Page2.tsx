"use client"; // Only client updates the clock

import { useEffect, useState } from "react";

function ClientTime() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    // Initialize once on mount 
    setTime(new Date().toLocaleTimeString());

    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!time) return <div className="text-yellow-400 text-2xl">--:--:--</div>;

  return <div className="text-yellow-400 text-2xl">{time}</div>;
}

export default function Page2() {
  return (
    <div className="flex-shrink-0 w-screen h-screen flex flex-col items-center justify-center">
      <div className="text-white text-4xl font-bold mb-4">Page 2</div>
      <ClientTime />
    </div>
  );
}
