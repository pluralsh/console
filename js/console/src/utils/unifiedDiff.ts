import { applyPatch, parsePatch, reversePatch } from 'diff'

// Given a unified diff patch and the post-patch ("new") content, reverse the
// patch to recover the pre-patch ("old") content. Returns the new content
// unchanged if the patch is missing, malformed, or cannot apply cleanly.
export const getOldContentFromUnifiedDiff = (
  newContent: Nullable<string>,
  patch: Nullable<string>
): { numChanges: number; oldContent: string } => {
  try {
    const firstPatch = parsePatch(patch ?? '')[0]
    if (!firstPatch) {
      return { numChanges: 0, oldContent: newContent ?? '' }
    }
    // applyPatch returns `string | false` in diff v8+; `false` means the patch
    // could not be applied cleanly, so we fall back to the original content.
    const applied = applyPatch(newContent ?? '', reversePatch(firstPatch))
    return {
      numChanges: firstPatch.hunks?.length ?? 0,
      oldContent: typeof applied === 'string' ? applied : (newContent ?? ''),
    }
  } catch (error) {
    console.error('Error applying reverse patch:', error)
    return { numChanges: 0, oldContent: newContent ?? '' }
  }
}
