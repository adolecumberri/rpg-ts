// Fixed values for the shops: each shop is content (id, name, and the
// stock it opens with). The remaining stock is session state — a bought
// entry is removed, and an emptied shop closes.

export type ShopStockEntry = {
    itemId: string;
    buyPrice: number;
};

export type ShopDefinition = {
    id: string;
    name: string;
    stock: ShopStockEntry[];
};

export const SHOPS: Record<string, ShopDefinition> = {
    farm_shop: {
        id: 'farm_shop',
        name: 'Farm Shop',
        stock: [{ itemId: 'sickle', buyPrice: 5 }],
    },
};
