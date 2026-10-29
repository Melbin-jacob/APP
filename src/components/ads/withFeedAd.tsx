import type { ReactNode } from "react";

/** After this many listings comes the in-listing banner (one row on tablets, four cards on phones). */
export const FEED_AD_AFTER = 4;

/**
 * Inserts the in-listing banner after the 4th card, only when more listings
 * follow, so it always sits between listings rather than at the end.
 */
export function withFeedAd(cards: ReactNode[], ad: ReactNode): ReactNode[] {
  if (!ad || cards.length <= FEED_AD_AFTER) return cards;
  return [...cards.slice(0, FEED_AD_AFTER), <div key="feed-ad" className="contents">{ad}</div>, ...cards.slice(FEED_AD_AFTER)];
}
