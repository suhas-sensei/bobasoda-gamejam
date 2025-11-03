"use client"

import BottomNav from "@/components/bottom-nav";
import BetHistoryList from "@/components/bet-history-list";
import { useViewportHeight } from "@/hooks/useViewportHeight";

export default function History() {
  const viewportHeight = useViewportHeight()

  return (
    <main
      className="w-screen overflow-hidden"
      style={{
        height: viewportHeight ? `${viewportHeight}px` : '100vh',
        backgroundColor: '#27262c',
      }}
    >
      <div
        className="w-full max-w-md md:max-w-xl mx-auto relative"
        style={{
          height: '100%',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="relative h-full w-full">
          <BetHistoryList />
          <BottomNav />
        </div>
      </div>
    </main>
  );
}
