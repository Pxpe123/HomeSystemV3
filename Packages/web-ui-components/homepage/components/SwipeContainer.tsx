"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const Page1 = dynamic(() => import("./Page1"), { ssr: false });
const Page2 = dynamic(() => import("./Page2"), { ssr: false });
const Page3 = dynamic(() => import("./Page3"), { ssr: false });

const pages = [Page1, Page2, Page3];

export default function SwipeContainer() {
  const [page, setPage] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  const startX = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isDragging = useRef(false);

  const handleStart = (clientX: number, timeStamp: number) => {
    startX.current = clientX;
    startTime.current = timeStamp;
    isDragging.current = true;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current || startX.current === null) return;
    const delta = clientX - startX.current;
    currentX.current = delta;
    setDragOffset(delta);
  };

  const handleEnd = (timeStamp: number) => {
    if (!isDragging.current || startX.current === null) return;

    const screenWidth = 800; // fixed container width
    const movedBy = currentX.current;
    const elapsedTime = timeStamp - startTime.current;
    const velocity = movedBy / elapsedTime;

    let newPage = page;

    if ((movedBy < -screenWidth / 4 || velocity < -0.3) && page < pages.length - 1) {
      newPage = page + 1;
    } else if ((movedBy > screenWidth / 4 || velocity > 0.3) && page > 0) {
      newPage = page - 1;
    }

    setPage(newPage);
    setDragOffset(0);
    startX.current = null;
    currentX.current = 0;
    startTime.current = 0;
    isDragging.current = false;
  };

  // --- Touch & Mouse Events ---
  const onTouchStart = (e: React.TouchEvent) =>
    handleStart(e.touches[0].clientX, e.timeStamp);
  const onTouchMove = (e: React.TouchEvent) =>
    handleMove(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) =>
    handleEnd(e.timeStamp);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent selection
    handleStart(e.clientX, e.timeStamp);
  };
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const onMouseUp = (e: React.MouseEvent) => handleEnd(e.timeStamp);

  // --- Determine pages to render ---
  const getVisiblePages = () => {
    const visible: { Component: any; offset: number }[] = [];
    if (page > 0) visible.push({ Component: pages[page - 1], offset: -1 });
    visible.push({ Component: pages[page], offset: 0 });
    if (page < pages.length - 1) visible.push({ Component: pages[page + 1], offset: 1 });
    return visible;
  };

  return (
    <div
      className="relative w-[100vw] h-[100vh] overflow-hidden select-none"
      style={{ touchAction: "pan-x" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {getVisiblePages().map(({ Component, offset }) => (
        <div
          key={offset}
          className="absolute top-0 left-0 w-full h-full transition-transform duration-200 ease-out"
          style={{
            transform: `translateX(${offset * 100 + dragOffset / 8}% )`, 
            zIndex: offset === 0 ? 2 : 1,
          }}
        >
          <Component />
        </div>
      ))}
    </div>
  );
}
