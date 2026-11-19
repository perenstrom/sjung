import { createVocabulary } from "@/lib/text/vocabulary";

/**
 * Credit roles are a free-text vocabulary (see `createVocabulary`). These
 * three are always offered and rank first, in this order.
 */
const creditRoles = createVocabulary(["Arrangör", "Kompositör", "Textförfattare"]);

export const BUILT_IN_CREDIT_ROLES = creditRoles.builtIns;

export const MAX_CREDIT_ROLE_LENGTH = 50;

export const compareCreditRoles = creditRoles.compare;
export const rankCreditRoles = creditRoles.rank;
export const resolveCreditRole = creditRoles.resolve;
export const creditRoleSuggestions = creditRoles.suggestions;
export const shouldOfferNewCreditRole = creditRoles.shouldOfferNew;
