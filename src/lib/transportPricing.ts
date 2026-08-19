// Transport zone fares are computed in RWF (mobilityService.ts / transport_zones
// table); booking totals are USD. Matches the USD_TO_RWF default used
// server-side by the flutterwave-create-payment and intouch-request-payment
// edge functions — keep these in sync so a transport fee converts to the same
// USD amount everywhere a traveler sees it.
export const RWF_TO_USD_RATE = 1300;
