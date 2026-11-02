import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { SpriteAnimation } from './sprites';

/**
 * The render box of a sprite in each place (px). The native frame is
 * 16px: the scale is always box / frameWidth, so making a sprite bigger
 * is a one-number change here.
 *   ficha    — the battlefield card sprite (the 32px cell)
 *   squadCard— the party menu character card
 */
export const SPRITE_BOX = {
    ficha: 40,
    squadCard: 64,
} as const;

/** The pixel scale for a box: the native frame width is 16px. */
export function spriteScaleFor(box: number, animation: SpriteAnimation): number {
    return box / animation.frameWidth;
}

/** The element box (width/height) that shows the frame at that size. */
export function spriteBoxStyle(animation: SpriteAnimation | undefined, box: number): CSSProperties {
    if (!animation) return {};
    const ratio = animation.frameHeight / animation.frameWidth;
    return { width: box, height: box * ratio };
}

/**
 * The style that shows ONE frame of an animation at a render scale.
 * Frame count, frame size and sheet width all come from the sprite
 * data — no CSS rule hardcodes the sheet geometry anymore.
 *
 * `scale` maps the native frame onto the render box: the arena draws at
 * 1x (16px), the battlefield fichas at 2.5x (40px), the squad cards at
 * 4x (64px), the team position view at 1.5x (24px), the arena banner at
 * 1.375x (22px).
 */
export function spriteFrameStyle(
    animation: SpriteAnimation,
    frame: number,
    scale = 1,
): CSSProperties {
    const frameWidth = animation.frameWidth * scale;
    const frameHeight = animation.frameHeight * scale;
    const sheetFrames = animation.sheetFrames ?? animation.frames;
    const offset = animation.frameOffset ?? 0;
    return {
        backgroundImage: `url(${animation.sheet})`,
        backgroundSize: `${sheetFrames * frameWidth}px ${frameHeight}px`,
        backgroundPosition: `${-((offset + frame) * frameWidth)}px 0`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
    };
}

/**
 * Steps an animation's frames (looped by default) and returns the
 * current frame's style. `playing: false` holds the first frame (the
 * arena holds the idle loop while an attack pose plays; a one-shot
 * animation stops on its last frame).
 */
export function useSpriteFrames(
    animation: SpriteAnimation | undefined,
    { scale = 1, loop = true, playing = true }: { scale?: number; loop?: boolean; playing?: boolean } = {},
): { frame: number; style: CSSProperties | undefined } {
    const [frame, setFrame] = useState(0);
    useEffect(() => {
        setFrame(0);
        if (!animation || !playing || animation.frames <= 1) return;
        const timer = window.setInterval(() => {
            setFrame((prev) => {
                const next = prev + 1;
                if (next < animation.frames) return next;
                return loop ? 0 : animation.frames - 1;
            });
        }, animation.frameMs);
        return () => window.clearInterval(timer);
    }, [animation, playing, loop]);
    return {
        frame,
        style: animation ? spriteFrameStyle(animation, frame, scale) : undefined,
    };
}
