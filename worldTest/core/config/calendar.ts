// Fixed values of the calendar: 12 months of 20 days, indexed 0-11 so
// content can gate missions/battles by month index. Months 0-2 are
// primavera, 3-5 verano, 6-8 otoño, 9-11 invierno.

export type SeasonDefinition = {
    name: string;
    icon: string;
    months: number[];
};

export const CALENDAR = {
    months: [
        'Verdarzo',
        'Rojibril',
        'Rosayo',
        'Amarunio',
        'Dorulio',
        'Platosto',
        'Ceniciembre',
        'Azubre',
        'Granabre',
        'Violembre',
        'Negrinero',
        'Celebrero',
    ],
    daysPerMonth: 20,
    seasons: [
        { name: 'Primavera', icon: '🌱', months: [0, 1, 2] },
        { name: 'Verano', icon: '☀️', months: [3, 4, 5] },
        { name: 'Otoño', icon: '🍂', months: [6, 7, 8] },
        { name: 'Invierno', icon: '❄️', months: [9, 10, 11] },
    ] as SeasonDefinition[],
} as const;
