"use client";

import React from "react";
import { MorphIcon } from "morphicons/react";

// Standard Lucide IconNodes for Eye & EyeOff
const eyeIcon = [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
    },
  ],
  ["circle", { cx: "12", cy: "12", r: "3" }],
] as const;

const eyeOffIcon = [
  [
    "path",
    {
      d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
    },
  ],
  ["path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242" }],
  [
    "path",
    {
      d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
    },
  ],
  ["path", { d: "m2 2 20 20" }],
] as const;

interface MorphEyeIconProps {
  isPrivate: boolean;
  size?: number;
  className?: string;
  spring?: "smooth" | "snappy" | "bouncy";
}

export function MorphEyeIcon({
  isPrivate,
  size = 18,
  className,
  spring = "snappy",
}: MorphEyeIconProps) {
  return (
    <MorphIcon
      icon={isPrivate ? eyeOffIcon : eyeIcon}
      size={size}
      spring={spring}
      className={className}
    />
  );
}

export default MorphEyeIcon;
