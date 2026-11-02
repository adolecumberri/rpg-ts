/**
 * Dev-only size audit for the action bars: measures every rendered
 * `.action-btn` and reports the distinct heights. It guards against
 * layout-branch drift — the bug class where the same button renders
 * 48px on one screen and ~39px on another because a grid branch lost
 * its fixed row height.
 */
type ButtonSizeLine = {
    label: string;
    width: number;
    height: number;
};

export type ButtonSizeReport = {
    total: number;
    heights: number[];
    uniform: boolean;
    lines: ButtonSizeLine[];
};

const round = (value: number): number => Math.round(value * 10) / 10;

export function auditActionButtons(): ButtonSizeReport {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('.action-btn'));
    const lines = buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        const label = (button.querySelector('.action-btn-label-text')?.textContent ?? '').trim();
        return {
            label: label || '(unlabelled)',
            width: round(rect.width),
            height: round(rect.height),
        };
    });
    const heights = Array.from(new Set(lines.map((line) => line.height))).sort((a, b) => a - b);
    return {
        total: lines.length,
        heights,
        uniform: heights.length <= 1,
        lines,
    };
}
