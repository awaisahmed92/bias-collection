// Re-export shared pricing helpers so cms.service can import from one place
// without circular dependencies.
export { getActivePromotions, priceForProduct } from "./discount.service";
export { decorateProduct } from "./product.service";
