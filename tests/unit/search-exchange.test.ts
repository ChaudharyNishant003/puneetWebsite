import { describe, expect, it } from "vitest";
import { parseQuery } from "@/lib/search/parse";
import { exchangeEligibility, exchangeIsFree } from "@/lib/exchange";

describe("parseQuery (research doc test queries)", () => {
  it("shaadi me pehne ke liye red suit", () => {
    const q = parseQuery("shaadi me pehne ke liye red suit");
    expect(q.attributes.occasion).toContain("Wedding Guest");
    expect(q.attributes.colour).toEqual(["red"]);
    expect(q.terms).toContain("suit set");
  });

  it("office ke liye cotton kurti under 1500", () => {
    const q = parseQuery("office ke liye cotton kurti under 1500");
    expect(q.attributes.occasion).toEqual(["Office"]);
    expect(q.maxPrice).toBe(1500);
    expect(q.terms).toEqual(expect.arrayContaining(["cotton", "kurti"]));
  });

  it("maa ke liye simple suit", () => {
    const q = parseQuery("maa ke liye simple suit");
    expect(q.attributes.recipient).toEqual(["Mother"]);
    expect(q.attributes.pattern).toEqual(["Solid"]);
  });

  it("summer ke liye comfortable kurti", () => {
    const q = parseQuery("summer ke liye comfortable kurti");
    expect(q.attributes.fabric).toEqual(["Cotton", "Linen", "Mul"]);
  });

  it("green anarkali", () => {
    const q = parseQuery("green anarkali");
    expect(q.attributes.colour).toEqual(["green"]);
    expect(q.terms).toEqual(["anarkali"]);
  });

  it("festival wear under 2000", () => {
    const q = parseQuery("festival wear under 2000");
    expect(q.attributes.occasion).toEqual(["Festive"]);
    expect(q.maxPrice).toBe(2000);
  });

  it("handles rupee symbols, ranges, Hindi colours and admin synonyms", () => {
    expect(parseQuery("kurti ₹500 - ₹1000")).toMatchObject({ minPrice: 500, maxPrice: 1000 });
    expect(parseQuery("laal saree").attributes.colour).toEqual(["red"]);
    expect(parseQuery("lehnga", { lehnga: ["lehenga"] }).terms).toEqual(["lehenga"]);
    expect(parseQuery("sasta kurta").maxPrice).toBe(799);
  });
});

describe("exchange rules", () => {
  const delivered = new Date("2026-10-01T10:00:00Z");
  const base = { deliveredAt: delivered, isExchangeable: true, alreadyRequested: false, windowDays: 7 };

  it("allows within 7 days and reports days left", () => {
    const r = exchangeEligibility({ ...base, now: new Date("2026-10-05T10:00:00Z") });
    expect(r).toEqual({ eligible: true, daysLeft: 3 });
  });

  it("closes after 7 days", () => {
    expect(exchangeEligibility({ ...base, now: new Date("2026-10-08T10:00:01Z") }).eligible).toBe(false);
  });

  it("never allows innerwear or undelivered items", () => {
    expect(exchangeEligibility({ ...base, isInnerwear: true }).eligible).toBe(false);
    expect(exchangeEligibility({ ...base, deliveredAt: null }).eligible).toBe(false);
    expect(exchangeEligibility({ ...base, alreadyRequested: true, now: delivered }).eligible).toBe(false);
  });

  it("first exchange free, later ones charged unless defect", () => {
    expect(exchangeIsFree({ previousExchanges: 0, isDefect: false })).toBe(true);
    expect(exchangeIsFree({ previousExchanges: 1, isDefect: false })).toBe(false);
    expect(exchangeIsFree({ previousExchanges: 1, isDefect: true })).toBe(true);
  });
});
