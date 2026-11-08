import * as React from "react"

import { mergeRefs } from "@/lib/merge-refs"

/**
 * A stable callback ref that hands the node to both refs, typically the
 * component's own ref and the one its caller forwarded. It only changes when
 * one of them does.
 */
export function useMergedRefs<T>(
  own: React.Ref<T> | undefined,
  forwarded: React.Ref<T> | undefined
) {
  return React.useMemo(() => mergeRefs(own, forwarded), [own, forwarded])
}
