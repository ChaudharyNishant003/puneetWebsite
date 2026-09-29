import "server-only";
import { db } from "./db";

export { ATTR_KEYS } from "./constants";

// Denormalised text used by search; rebuild whenever name/category/attributes/colours change.
export async function refreshSearchText(productId: string) {
  const p = await db.product.findUniqueOrThrow({ where: { id: productId }, include: { category: true, attributes: true, variants: { select: { colour: true } } } });
  const text = [p.name, p.category.name, p.gender, ...p.attributes.map((a) => a.value), ...new Set(p.variants.map((v) => v.colour)), ...p.badges].join(" ").toLowerCase();
  await db.product.update({ where: { id: productId }, data: { searchText: text } });
}
