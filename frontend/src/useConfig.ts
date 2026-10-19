import { useEffect, useState } from 'react'
import { api, money } from './api'
import type { PayConfig } from './api'

const DEFAULT: PayConfig = { currency: 'USD', prices: { activate: 10, premium: 15 }, mode: 'live' }

// The fee amounts and currency set on the server (.env), ready to show on the page.
export function useConfig() {
  const [cfg, setCfg] = useState<PayConfig>(DEFAULT)

  useEffect(() => {
    api.config().then(setCfg).catch(() => undefined)
  }, [])

  return {
    ...cfg,
    activateText: money(cfg.prices.activate, cfg.currency),
    premiumText: money(cfg.prices.premium, cfg.currency),
  }
}