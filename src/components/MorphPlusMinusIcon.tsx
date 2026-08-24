"use client";

import React from "react";
import { MorphIcon } from "morphicons/react";

// Standard Lucide IconNodes for Plus (+) & Minus (-)
const plusIcon = [
  ["path", { d: "M5 12h14" }],
  ["path", { d: "M12 5v14" }],
] as const;

const minusIcon = [
  ["path", { d: "M5 12h14" }],
] as const;

interface MorphPlusMinusIconProps {
  isExpanded: boolean;
  size?: number;
  color?: string;
  className?: string;
  spring?: "smooth" | "snappy" | "bouncy";
}

export function MorphPlusMinusIcon({
  isExpanded,
  size = 18,
  color,
  className,
  spring = "snappy",
}: MorphPlusMinusIconProps) {
  const iconColor = color || (isExpanded ? "#ef4444" : "var(--primary, #6FAF3A)");

  return (
    <MorphIcon
      icon={isExpanded ? minusIcon : plusIcon}
      size={size}
      color={iconColor}
      spring={spring}
      className={className}
      style={{ transition: "color 0.25s ease" }}
    />
  );
}

export default MorphPlusMinusIcon;
