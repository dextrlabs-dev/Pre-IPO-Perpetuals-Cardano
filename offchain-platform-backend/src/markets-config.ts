/**
 * Ventuals perps on Hyperliquid use `vntl:*` ids (see Ventuals + HL docs).
 * `bootstrapTipTx` = last known script spend tx for this market (e.g. from Preprod CSV).
 */
export type VentualsMarketConfig = {
  id: string;
  label: string;
  hlCoin: string;
  /** Used when no sessions file / env override exists */
  bootstrapTipTx: string;
};

export const VENTUALS_MARKETS: VentualsMarketConfig[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    hlCoin: "vntl:ANTHROPIC",
    bootstrapTipTx:
      "6709ffd84b43920260aa4528a2595dd67ac0c1567caf407323303f623918e15a",
  },
  {
    id: "openai",
    label: "OpenAI",
    hlCoin: "vntl:OPENAI",
    bootstrapTipTx:
      "53d640e3a9594acc6e7e623368050da6c713d5974fcdc720a5bf31861adb90fb",
  },
  {
    id: "spacex",
    label: "SpaceX",
    hlCoin: "vntl:SPACEX",
    bootstrapTipTx:
      "99b7f17565eacfca9d72627c73e8ccf78577676b1336fd17e77157e6fe871dc9",
  },
];

export const SCALE = 1_000_000n;
