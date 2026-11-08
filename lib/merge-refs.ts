import type { Ref, RefCallback } from "react";

/**
 * One callback ref that hands the node to every given ref, for a component
 * that needs the node itself and also forwards it to its caller. Wrap the
 * call in `useMemo` (or use `useMergedRefs`) so React doesn't detach and
 * re-attach the refs on every render.
 */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}
