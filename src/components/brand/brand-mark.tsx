import Image from "next/image";
import { createElement } from "react";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  priority = false,
  decorative = false,
}: {
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  return createElement(Image, {
    src: "/brand/ipo-compass-mark.png",
    alt: decorative ? "" : "IPO Compass",
    width: 889,
    height: 920,
    priority,
    className: cn("h-auto w-12 object-contain", className),
  });
}
