"use client";
import { Suspense } from "react";
import Homepage from "./home";

// Main component that doesn't directly use useSearchParams
export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Homepage />
    </Suspense>
  );
}
