import { shop, type Settings } from "./config";

// Static content pages. Policy wording here is the single source for badges and PDP lines,
// so the site never promises more than the policy says. Placeholders need client sign-off.

export const PAGE_SLUGS = ["about", "size-guide", "exchange-policy", "shipping-policy", "privacy-policy", "terms"];

export const getPages = (s: Settings): Record<string, { title: string; body: string[] }> => ({
  about: {
    title: "About Us",
    body: [
      `${shop.name} has been dressing families in ${shop.city} since ${shop.since}. From everyday kurtis and school-day basics to festive sets and wedding-guest outfits, we keep the whole family covered under one roof.`,
      "This website brings the same shop online: the same pieces, the same prices, and the same people to help you. If anything online is unclear, call us or drop by the store.",
      "[Placeholder: the owner's story and photos will go here once shared by the client.]",
    ],
  },
  "size-guide": {
    title: "Size Guide",
    body: [
      "Every product page has its own size chart. Tap “Size Chart” next to the sizes.",
      "Women's kurtas and tops: choose by your bust measurement. If you are between sizes, pick the bigger size for a relaxed fit.",
      "Men's shirts, kurtas and T-shirts: choose by chest. Jeans and trousers: your waist in inches is the size.",
      "Kids: go by height first; age is only a guide. Between sizes? Take the bigger one, kids grow fast.",
      "Innerwear cannot be exchanged, so please check the chart carefully.",
      `Still unsure? Call us on ${shop.phone} and we'll help you pick.`,
    ],
  },
  "exchange-policy": {
    title: "Exchange & Returns Policy",
    body: [
      `Size exchange: you can exchange an item for a different size within ${s.exchangeWindowDays} days of delivery. Raise it from My Orders or bring the item to our store with the order number.`,
      "Your first exchange on an item is free. Further exchanges on the same item carry the shipping cost.",
      "Items must be unused, unwashed and have their original tags.",
      "Refunds: we refund only when the item is defective (manufacturing fault) or you received the wrong item. Report it within 48 hours of delivery with photos. Refunds go back to the original payment method (UPI/card) or to your bank account for COD orders, within 7 working days of us receiving the item.",
      "Innerwear, lingerie and other hygiene items cannot be exchanged or returned, unless they are defective or wrong.",
      "Change of mind: we don't offer refunds for change of mind, but you can exchange the size as above.",
      "[Placeholder: final wording to be confirmed by the client before launch.]",
    ],
  },
  "shipping-policy": {
    title: "Shipping & Delivery",
    body: [
      "Orders are packed and dispatched within 1–2 working days.",
      `Local pincodes around our store are delivered by our own team, usually the next day. Everywhere else in India we ship through courier partners; your expected delivery date is shown on the product page and at checkout.`,
      `Shipping is free on orders of ₹${s.freeShippingThreshold} and above. Below that, courier shipping is ₹${s.courierShippingFee}.`,
      `Cash on Delivery is available on orders up to ₹${s.codMaxAmount} on serviceable pincodes. COD orders are confirmed with a one-time password (OTP) on your phone.`,
      "You will get SMS/email updates when your order is confirmed, shipped and delivered.",
    ],
  },
  "privacy-policy": {
    title: "Privacy Policy",
    body: [
      `${shop.name} ("we") collects only what we need to deliver your order and serve you: your name, phone number, email (optional), delivery addresses and order history.`,
      "Your phone number is your login. We use it for OTP verification and order updates. We do not sell your data to anyone.",
      "Payment details are handled by our payment partner (Razorpay); we never see or store your card or UPI PIN.",
      "We share your name, phone and address with our delivery partners only to deliver your order.",
      "We use cookies to keep you logged in, remember your bag and measure site usage.",
      `You can ask us to access, correct or delete your data under the Digital Personal Data Protection Act, 2023 by writing to ${shop.email}.`,
      "[Placeholder: to be reviewed by the client's advisor before launch.]",
    ],
  },
  terms: {
    title: "Terms of Use",
    body: [
      `These terms apply to purchases on this website operated by ${shop.name}, ${shop.address}.`,
      "Prices are in Indian Rupees and include GST. We may correct pricing errors before dispatch; we'll contact you if that happens.",
      "Colours may look slightly different on different screens.",
      "Orders may be cancelled by us if an item goes out of stock or if a COD order cannot be verified; prepaid amounts are refunded in full.",
      "Exchanges and refunds follow our Exchange & Returns Policy.",
      `Disputes are subject to the jurisdiction of courts in ${shop.city}.`,
      "[Placeholder: to be reviewed by the client's advisor before launch.]",
    ],
  },
});
