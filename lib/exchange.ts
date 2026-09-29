export type ExchangeCheck = { eligible: boolean; reason?: string; daysLeft?: number };

export function exchangeEligibility(p: {
  deliveredAt: Date | null;
  isExchangeable: boolean;
  isInnerwear?: boolean;
  alreadyRequested: boolean;
  windowDays: number;
  now?: Date;
}): ExchangeCheck {
  if (p.isInnerwear || !p.isExchangeable)
    return { eligible: false, reason: "Innerwear and hygiene items cannot be exchanged." };
  if (!p.deliveredAt) return { eligible: false, reason: "Exchange opens once the order is delivered." };
  if (p.alreadyRequested) return { eligible: false, reason: "An exchange is already requested for this item." };
  const now = p.now ?? new Date();
  const msLeft = p.deliveredAt.getTime() + p.windowDays * 86_400_000 - now.getTime();
  if (msLeft <= 0) return { eligible: false, reason: `Exchange window of ${p.windowDays} days has ended.` };
  return { eligible: true, daysLeft: Math.ceil(msLeft / 86_400_000) };
}

// First exchange on an order item is free; a defect exchange is always free.
export function exchangeIsFree(p: { previousExchanges: number; isDefect: boolean }): boolean {
  return p.isDefect || p.previousExchanges === 0;
}
