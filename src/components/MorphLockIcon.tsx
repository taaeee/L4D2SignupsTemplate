"use client";

import React from "react";
import { MorphIcon } from "morphicons/react";

// Standard Lucide IconNodes for Lock (Locked / Cerrado) & LockOpen (Open / Abierto)
const lockIcon = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }],
] as const;

const lockOpenIcon = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 9.9-1" }],
] as const;

interface MorphLockIconProps {
  isLocked: boolean;
  size?: number;
  className?: string;
  spring?: "smooth" | "snappy" | "bouncy";
}

export function MorphLockIcon({
  isLocked,
  size = 18,
  className,
  spring = "snappy",
}: MorphLockIconProps) {
  return (
    <MorphIcon
      icon={isLocked ? lockIcon : lockOpenIcon}
      size={size}
      spring={spring}
      className={className}
    />
  );
}

export default MorphLockIcon;
