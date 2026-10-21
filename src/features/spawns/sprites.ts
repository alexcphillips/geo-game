import { MAP_SPRITES } from "./sprites.generated";

/**
 * Stand-in art for enemies that don't have a sprite yet: a plain red disc.
 * Hand-written, not generated, so `npm run sprites` leaves it alone.
 */
const PLACEHOLDER_SPRITES = {
    "placeholder-red": {
        uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAADS0lEQVR42u2dPZKyQBCGjbdMzDnABkTmJkYkRmZbxRXMTYi4iomRiVcgJyH3Cl7g26Gqg636UBlg6AaeqerEohDfB+enp6d7taLRPrWfr6+1s9hZ4ix1dnJ2dpaJneWzVK6pr12jXDexN84OznJnd2cPZ/862kPukcs9NyjcLPpW3uSih9htrZDv2i5d9Ei6jnIE0V9ZKc8QLUn4nbOLouivrH6m3ZyF30t/3Emg6vvby3qAqJ9xPyfh6xnJNaTYgaDUzxxPXfxcW/QBYORT7W5Ka6L3gFFOpluSKd4khO8AIrO+gLpNUXhPEDdzCzpZSFVzEL8lhMrMQk58L8+5CO8Bov7Nibb4xzm99R3/DUdz4s9FeA8QR41uZ1Hit4CQjDngPpco/gcIz+ADs0w1qyWL/wFCFXSK+mqevzTxP0C4jbrCXar4HyBkQ4u/R3xvCPshAZQA8AZQBnUpI3wrCHlf8WPE7w0h7gPgCoDeAK4MvFMckJs20BG4M4R7l9AR3v5h/wU7HwAXxB8cwsUnYo23P8y/IGoD4Iz4wSCcO616EXMwAGUbXz/dT9huaOvl8UTIwSFk7wAUAAgOoHi320X3M043tGkCcED80SAcWrmdES8YgBzfjzXfUNNpRMQLBuDRdA6XAXjcgXj9ducL4YJDiN+GGiJacADJXwApAEYHkP4FcALA6ABOuKCtuKZxwik75QCgD4AuSLkLYhBWHoSZhipPQ1mIKS/EcEUouyJwxmk643BHK7uj2ZCxsSHDlqTyliSb8sqb8oSlaIalEJilHJiFU85GaCLBuZrBuYSnK4en45q2cUCDI0qaR5Q4pKd8SI9jqgaOqeIbUj6oTaoCI7mDSNahmKyDdDUG0tWQsEk5YRMpywykLGNANpC0j7SV3uKHKfRA4tZW4odJ3Erq4lbiV8Gra5C8WzF5N+nrDaSvp4DDRKpoUMKEIj6hxdcv4kMZKwq5aYhvr5AbpQztQaCYpxEQlLM1AIGCzoa6JUqaGwCxa4o7MmAX79CRiYOIJAyyVBS9lGeIVktuspDLms4nBLBCvmu7or1c0B1kBnVvOr3pYQ+5Ry733KBwNyhrmU0lklbhJF1HJnaWz1K5Jv7vHC6N1tR+ASz8rMhgUdDNAAAAAElFTkSuQmCC",
        width: 96,
        height: 96,
    },
} as const;

/** Every sprite an enemy can name: the real art, plus placeholders. */
export const SPRITES = { ...MAP_SPRITES, ...PLACEHOLDER_SPRITES };

export type SpriteName = keyof typeof SPRITES;

/**
 * Per-sprite display size, relative to the default, on the map and in combat.
 * For creatures whose art would otherwise draw too big for what they are.
 * Unlisted sprites draw at 1.
 */
export const SPRITE_SCALES: Partial<Record<SpriteName, number>> = {
    "crystal-slime": 0.7,
    "green-slime": 0.7,
    "magma-slime": 0.7,
    spider: 0.7,
};

export function spriteScale(name: string | undefined): number {
    return SPRITE_SCALES[name as SpriteName] ?? 1;
}
