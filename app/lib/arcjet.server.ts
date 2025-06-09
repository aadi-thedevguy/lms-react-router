import arcjet,{ detectBot, shield, tokenBucket } from "@arcjet/remix";

// Initialize Arcjet
export const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    // Basic protection against common web attacks
    shield({
      mode: "LIVE",
    }),
    // Bot detection
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE"],
    }),
    // Rate limiting
    tokenBucket({
      mode: "LIVE",
      refillRate: 5,
      interval: 10,
      capacity: 100,
    }),
  ],
});
