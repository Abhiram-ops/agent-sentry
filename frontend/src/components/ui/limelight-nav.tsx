'use client';
import React, { useState, useRef, useLayoutEffect, cloneElement } from 'react';

type NavItem = {
  id: string | number;
  icon: React.ReactElement;
  label?: string;
  onClick?: () => void;
};

type LimelightNavProps = {
  items?: NavItem[];
  defaultActiveIndex?: number;
  onTabChange?: (index: number) => void;
  className?: string;
  limelightClassName?: string;
  iconContainerClassName?: string;
  iconClassName?: string;
};

/**
 * An adaptive-width navigation bar with a limelight highlight effect.
 * Adapted to AgentSentry's dark-green cyber theme.
 */
export function LimelightNav({
  items = [],
  defaultActiveIndex = 0,
  onTabChange,
  className,
  limelightClassName,
  iconContainerClassName,
  iconClassName,
}: LimelightNavProps) {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
  const [isReady, setIsReady] = useState(false);
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const limelightRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (items.length === 0) return;
    const limelight  = limelightRef.current;
    const activeItem = navItemRefs.current[activeIndex];
    if (limelight && activeItem) {
      const newLeft = activeItem.offsetLeft + activeItem.offsetWidth / 2 - limelight.offsetWidth / 2;
      limelight.style.left = `${newLeft}px`;
      if (!isReady) setTimeout(() => setIsReady(true), 50);
    }
  }, [activeIndex, isReady, items]);

  if (items.length === 0) return null;

  const handleItemClick = (index: number, itemOnClick?: () => void) => {
    setActiveIndex(index);
    onTabChange?.(index);
    itemOnClick?.();
  };

  return (
    <nav
      className={`relative inline-flex items-center h-16 rounded-xl bg-[#080808] border border-[rgba(255,255,255,0.08)] px-2 ${className ?? ''}`}
    >
      {items.map(({ id, icon, label, onClick }, index) => (
        <a
          key={id}
          ref={el => { navItemRefs.current[index] = el; }}
          className={`relative z-20 flex h-full cursor-pointer items-center justify-center p-5 ${iconContainerClassName ?? ''}`}
          onClick={() => handleItemClick(index, onClick)}
          aria-label={label}
        >
          {cloneElement(icon as React.ReactElement<{ className?: string }>, {
            className: `w-5 h-5 transition-all duration-150 ${
              activeIndex === index ? 'opacity-100 text-[#00ff88]' : 'opacity-35 text-white'
            } ${(icon.props as { className?: string }).className || ''} ${iconClassName || ''}`,
          })}
        </a>
      ))}

      {/* Limelight bar */}
      <div
        ref={limelightRef}
        className={`absolute top-0 z-10 w-10 h-[3px] rounded-full bg-[#00ff88] ${
          isReady ? 'transition-[left] duration-300 ease-in-out' : ''
        } ${limelightClassName ?? ''}`}
        style={{ left: '-999px', boxShadow: '0 0 14px rgba(0,255,136,0.8), 0 0 40px rgba(0,255,136,0.3)' }}
      >
        {/* Cone glow beneath the bar */}
        <div className="absolute left-[-30%] top-[3px] w-[160%] h-14 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,255,136,0.22) 0%, transparent 100%)', clipPath: 'polygon(5% 100%,25% 0,75% 0,95% 100%)' }} />
      </div>
    </nav>
  );
}

export type { NavItem };
