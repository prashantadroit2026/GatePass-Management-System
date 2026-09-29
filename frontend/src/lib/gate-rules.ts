import type { AcceptedItem } from "@/types/api";
// Server computes next_movement; this only labels it. Sequences: outing OUT→IN, full_leave OUT, visitor/vendor IN→OUT.
export const movementLabel = (n: AcceptedItem["next_movement"]) => (n === "in" ? "Log IN" : n === "out" ? "Log OUT" : "Completed");
