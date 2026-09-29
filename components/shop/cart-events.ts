// Tiny event bus so any "add to cart" button can open the cart drawer.
export const CART_OPEN = "pg:cart-open";
export const openCart = () => window.dispatchEvent(new Event(CART_OPEN));
