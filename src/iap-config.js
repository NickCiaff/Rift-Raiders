import { MONETIZATION_CATALOG } from "../shared/monetization-catalog.js";

export const IAP_CONFIG = {
  ...MONETIZATION_CATALOG,
  appleApiKey: "appl_public_sdk_key_here",
  googleApiKey: "goog_public_sdk_key_here",
  backend: {
    baseUrl: "http://10.0.2.2:8787",
    apiToken: "dev-token-change-me"
  }
};
