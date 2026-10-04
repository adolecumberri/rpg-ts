/**
 * The action icons from the google-stitch design: flat vector SVGs
 * WITHOUT the black outline (the smooth look of the .html), shown
 * inside the button icon slots.
 */
export type ActionSvgIcon = { svg: string; color?: string };

export const ACTION_ICONS = {
    map: {
        svg: 'M1 2.5L5.5 1L10.5 3L15 1.5V13.5L10.5 15L5.5 13L1 14.5V2.5ZM6 2.5V11.8L10 13.4V4.1L6 2.5Z',
        color: '#fbbf24',
    },
    missions: {
        svg: 'M3 2H13V4H3V2ZM2 5H14V14H2V5ZM4 7V9H7V7H4ZM9 7V9H12V7H9ZM4 10V12H7V10H4ZM9 10V12H12V10H9Z',
        color: '#fb923c',
    },
    shop: {
        svg: 'M2 3H14L13 7H3L2 3ZM1 8H15V14H1V8ZM4 10V12H6V10H4ZM10 10V12H12V10H10Z',
        color: '#fde047',
    },
    look: {
        svg: 'M8 2C4 2 1 8 1 8C1 8 4 14 8 14C12 14 15 8 15 8C15 8 12 2 8 2ZM8 11.5C6.07 11.5 4.5 9.93 4.5 8' +
            'C4.5 6.07 6.07 4.5 8 4.5C9.93 4.5 11.5 6.07 11.5 8C11.5 9.93 9.93 11.5 8 11.5ZM8 6.5C7.17 6.5' +
            ' 6.5 7.17 6.5 8C6.5 8.83 7.17 9.5 8 9.5C8.83 9.5 9.5 8.83 9.5 8C9.5 7.17 8.83 6.5 8 6.5Z',
        color: '#22d3ee',
    },
} as const;
