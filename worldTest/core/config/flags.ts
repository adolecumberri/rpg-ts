// Fixed values for the story flags: named markers a mission leaves in
// the save when its reward step completes, so other content can ask
// "did X happen?" (dialogues, gated offers...). The constant
// identifiers are the code-side API; the string values are what gets
// serialized — they stay lowercase so old saves keep working.

export const FLAGS = {
    // Sickles to the Hay Field: the sickles were delivered.
    SICKLES_DELIVERED: 'sickles_delivered',
    // Chopping Wood: the woodpile is stocked.
    WOOD_CHOPPED: 'wood_chopped',
    // The Runaway Cow: the cow was saved from the forest.
    COW_SAVED: 'cow_saved',
} as const;
