// lib/dataLoader.js
import dcMarkets from '@/data/site/dc_markets.json';
import substations from '@/data/site/substations.json';
import fiberHubs from '@/data/site/fiber_hubs.json';
import powerCosts from '@/data/site/power_costs.json';
import climateRisk from '@/data/site/climate_risk.json';
import taxIncentives from '@/data/site/tax_incentives.json';
import sustainability from '@/data/site/sustainability.json';
import landEconomics from '@/data/site/land_economics.json';
import laborOperations from '@/data/site/labor_operations.json';
import regulatoryRisk from '@/data/site/regulatory_risk.json';
import hyperscalerPresence from '@/data/site/hyperscaler_presence.json';

export const data = {
  markets: dcMarkets.markets,
  substations: substations.substations,
  fiberHubs: fiberHubs.fiber_hubs,
  powerCosts: powerCosts.rates_by_state,
  powerCostsMeta: {
    national_average: powerCosts.national_average,
    benchmarks: powerCosts.benchmarks,
  },
  climateByState: climateRisk.states,
  taxByState: taxIncentives.states,
  sustainabilityByState: sustainability.states,
  landByMarket: landEconomics.markets,
  landDefault: landEconomics.default_for_non_market,
  laborByMarket: laborOperations.markets,
  laborDefault: laborOperations.default_for_non_market,
  regulatoryByMarket: regulatoryRisk.markets,
  regulatoryDefault: regulatoryRisk.default_for_non_market,
  hyperscalerByMarket: hyperscalerPresence.markets,
  hyperscalerDefault: hyperscalerPresence.default_for_non_market,
};