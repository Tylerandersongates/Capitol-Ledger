"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const frameBaseClass =
  "relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/14 bg-white/[0.028] p-[1px] shadow-[0_16px_34px_rgba(1,8,24,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]";
const verticalScrollPanelBaseClass =
  "w-full min-w-0 max-w-full overflow-y-auto overscroll-contain rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(8,31,67,0.86)_0%,rgba(3,15,36,0.94)_100%)] p-2 pb-3 pr-5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_18px_rgba(44,123,210,0.035)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const horizontalScrollPanelBaseClass =
  "w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(8,31,67,0.86)_0%,rgba(3,15,36,0.94)_100%)] p-2 pb-5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_18px_rgba(44,123,210,0.035)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const glassOverlayClass =
  "pointer-events-none absolute inset-px z-10 rounded-[1rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.018)_30%,rgba(255,255,255,0.028)_68%,rgba(255,255,255,0.055)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(255,255,255,0.035)]";
const verticalRailClass =
  "pointer-events-none absolute bottom-4 right-2.5 top-4 z-20 w-1.5 rounded-full bg-white/12 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.11),0_0_10px_rgba(255,255,255,0.08)]";
const horizontalRailClass =
  "pointer-events-none absolute bottom-2.5 left-4 right-4 z-20 h-1.5 rounded-full bg-white/12 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.11),0_0_10px_rgba(255,255,255,0.08)]";
const thumbClass =
  "block rounded-full bg-[#ffb12b]/90 shadow-[0_0_9px_rgba(255,177,43,0.4),inset_0_1px_0_rgba(255,255,255,0.34)]";

type ScrollAxis = "vertical" | "horizontal";

type MobileGlassScrollFrameProps = {
  axis?: ScrollAxis;
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  frameClassName?: string;
  heightClassName?: string;
};

export function MobileGlassScrollFrame({
  axis = "vertical",
  ariaLabel,
  children,
  className = "",
  frameClassName = "mt-5",
  heightClassName
}: MobileGlassScrollFrameProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [thumb, setThumb] = useState({ size: 64, offset: 0, visible: true });

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return undefined;
    const element = scrollEl;

    function updateThumb() {
      const clientSize = axis === "vertical" ? element.clientHeight : element.clientWidth;
      const scrollSize = axis === "vertical" ? element.scrollHeight : element.scrollWidth;
      const scrollOffset = axis === "vertical" ? element.scrollTop : element.scrollLeft;
      const railSize = Math.max(clientSize - 32, 1);
      const overflow = scrollSize - clientSize;

      if (overflow <= 0) {
        setThumb({ size: railSize, offset: 0, visible: false });
        return;
      }

      const size = Math.min(railSize, Math.max(48, railSize * (clientSize / scrollSize)));
      const offset = (scrollOffset / overflow) * Math.max(railSize - size, 0);
      setThumb({ size, offset, visible: true });
    }

    updateThumb();
    element.addEventListener("scroll", updateThumb, { passive: true });
    window.addEventListener("resize", updateThumb);

    const observer = new ResizeObserver(updateThumb);
    observer.observe(element);

    const mutationObserver = new MutationObserver(updateThumb);
    mutationObserver.observe(element, { attributes: true, childList: true, subtree: true });

    return () => {
      element.removeEventListener("scroll", updateThumb);
      window.removeEventListener("resize", updateThumb);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [axis]);

  const resolvedHeightClassName = heightClassName ?? (axis === "vertical" ? "max-h-[250px]" : "");
  const scrollPanelBaseClass = axis === "vertical" ? verticalScrollPanelBaseClass : horizontalScrollPanelBaseClass;
  const railClass = axis === "vertical" ? verticalRailClass : horizontalRailClass;
  const thumbStyle: CSSProperties =
    axis === "vertical"
      ? {
          height: `${thumb.size}px`,
          opacity: thumb.visible ? 1 : 0,
          transform: `translateY(${thumb.offset}px)`
        }
      : {
          opacity: thumb.visible ? 1 : 0,
          transform: `translateX(${thumb.offset}px)`,
          width: `${thumb.size}px`
        };

  return (
    <div className={`${frameBaseClass} ${frameClassName}`}>
      <div ref={scrollRef} className={`${resolvedHeightClassName} ${scrollPanelBaseClass} ${className}`} aria-label={ariaLabel}>
        {children}
      </div>
      <div className={glassOverlayClass} aria-hidden="true" />
      <div className={railClass} aria-hidden="true">
        <span
          className={`${thumbClass} ${axis === "vertical" ? "w-full" : "h-full"}`}
          style={thumbStyle}
        />
      </div>
    </div>
  );
}
