import { useState, type ReactNode } from "react";
import Modal from "@/components/Modal/Modal";
import { Hint } from "@/components/Text/Text";
import type { InventoryItem } from "@/features/inventory/inventoryItems";
import { usePlayerStore } from "@/features/player/playerStore";
import { catalogueItem } from "@/features/player/toInventoryItem";
import type { GeoItemView } from "@/lib/geo/contracts";
import { DEFAULT_RECIPE_SORT, type RecipeCategory, type RecipeSort } from "../recipes";
import CraftPage from "./CraftPage";
import RecipesPage, { type Availability } from "./RecipesPage";
import UsagePage from "./UsagePage";

/**
 * Where the modal is. Pages stack: back returns to the one before, with its
 * search, sort and filters as they were.
 */
type Page =
    | {
          page: "recipes";
          query: string;
          sort: RecipeSort;
          category: RecipeCategory | "all";
          availability: Availability;
      }
    | { page: "usage"; itemId: string; query: string; sort: RecipeSort }
    | { page: "detail"; itemId: string }
    | { page: "craft"; recipeId: string };

const usagePage = (itemId: string): Page => ({ page: "usage", itemId, query: "", sort: DEFAULT_RECIPE_SORT });

const recipesPage: Page = {
    page: "recipes",
    query: "",
    sort: DEFAULT_RECIPE_SORT,
    category: "all",
    availability: "all",
};

type CraftingModalProps = {
    /** An item's Usage, or (no item) the Crafting menu of every recipe. */
    itemId?: string;
    onClose: () => void;
    /**
     * Draws an item's detail page, with a Usage button that calls `onUsage`.
     * Passed in by whoever opens this modal, so `ItemDetail` and this file
     * don't import each other.
     */
    renderDetail: (item: InventoryItem, onUsage: () => void) => ReactNode;
};

/**
 * Crafting, from either end, in one modal:
 *
 * - **Crafting** (from the actions hub): every recipe, filtered by what it
 *   makes and whether it can be crafted now, searchable and sorted.
 * - **Usage** (from an item's detail page): how that item is obtained, then
 *   every recipe that uses it up.
 *
 * Both list recipes as the same rows. A row's tiles open that item's
 * details, whose Usage button goes a level deeper; Craft opens the recipe
 * with a quantity.
 *
 * Its own modal, over whichever screen opened it, so every detail page gets
 * Usage without each screen handling it.
 */
export default function CraftingModal({ itemId, onClose, renderDetail }: CraftingModalProps) {
    const items = usePlayerStore((state) => state.items);
    const [stack, setStack] = useState<Page[]>(() => [itemId ? usagePage(itemId) : recipesPage]);
    const page = stack[stack.length - 1]!;
    const push = (next: Page) => setStack((current) => [...current, next]);
    const back = () => setStack((current) => current.slice(0, -1));
    const replaceTop = (next: Page) => setStack((current) => [...current.slice(0, -1), next]);
    const inspect = (id: string) => push({ page: "detail", itemId: id });
    const craft = (recipeId: string) => push({ page: "craft", recipeId });

    const title =
        page.page === "recipes"
            ? "Crafting"
            : page.page === "usage"
              ? `${items[page.itemId]?.name ?? "Item"} · Usage`
              : page.page === "detail"
                ? (items[page.itemId]?.name ?? "Item")
                : "Craft";

    return (
        <Modal
            title={title}
            size="fill"
            showBack
            onBack={stack.length > 1 ? back : undefined}
            closePlacement="footer"
            onClose={onClose}
        >
            {page.page === "recipes" ? (
                <RecipesPage
                    query={page.query}
                    onQuery={(query) => replaceTop({ ...page, query })}
                    sort={page.sort}
                    onSort={(sort) => replaceTop({ ...page, sort })}
                    category={page.category}
                    onCategory={(category) => replaceTop({ ...page, category })}
                    availability={page.availability}
                    onAvailability={(availability) => replaceTop({ ...page, availability })}
                    onInspect={inspect}
                    onCraft={craft}
                />
            ) : page.page === "usage" ? (
                <UsagePage
                    itemId={page.itemId}
                    query={page.query}
                    onQuery={(query) => replaceTop({ ...page, query })}
                    sort={page.sort}
                    onSort={(sort) => replaceTop({ ...page, sort })}
                    onInspect={inspect}
                    onCraft={craft}
                />
            ) : page.page === "detail" ? (
                <Detail
                    def={items[page.itemId]}
                    renderDetail={renderDetail}
                    onUsage={() => push(usagePage(page.itemId))}
                />
            ) : (
                <CraftPage recipeId={page.recipeId} onInspect={inspect} onDone={back} />
            )}
        </Modal>
    );
}

function Detail({
    def,
    renderDetail,
    onUsage,
}: {
    def: GeoItemView | undefined;
    renderDetail: CraftingModalProps["renderDetail"];
    onUsage: () => void;
}) {
    if (!def) return <Hint>That item no longer exists.</Hint>;
    return <>{renderDetail(catalogueItem(def, `usage-${def.id}`), onUsage)}</>;
}

