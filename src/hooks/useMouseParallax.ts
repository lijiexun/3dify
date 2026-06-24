import { useCallback, useRef, useState } from 'react';

export type ParallaxOffset = {
  x: number;
  y: number;
};

export function useMouseParallax() {
  const boundsRef = useRef<DOMRect | null>(null);
  const [offset, setOffset] = useState<ParallaxOffset>({ x: 0, y: 0 });

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const target = event.currentTarget;
    boundsRef.current = target.getBoundingClientRect();
    const bounds = boundsRef.current;
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -2;
    setOffset({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setOffset({ x: 0, y: 0 });
  }, []);

  return {
    offset,
    bind: {
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
    },
  };
}
