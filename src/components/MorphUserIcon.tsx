"use client";

import React from "react";
import { MorphIcon } from "morphicons/react";

// Standard Lucide IconNodes for User (1v1) & Users (Teams)
const userIcon = [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }],
  ["circle", { cx: "12", cy: "7", r: "4" }],
] as const;

const usersIcon = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }],
  ["circle", { cx: "9", cy: "7", r: "4" }],
] as const;

interface MorphUserIconProps {
  is1v1: boolean;
  size?: number;
  className?: string;
  spring?: "smooth" | "snappy" | "bouncy";
}

export function MorphUserIcon({
  is1v1,
  size = 18,
  className,
  spring = "snappy",
}: MorphUserIconProps) {
  return (
    <MorphIcon
      icon={is1v1 ? userIcon : usersIcon}
      size={size}
      spring={spring}
      className={className}
    />
  );
}

export default MorphUserIcon;
