// Shared property-type definitions
// value  → stored in DB
// label  → shown in UI
// emoji  → icon for filter chips

export const PROPERTY_TYPES = [
  { value: 'SINGLE_ROOM',       label: 'Single Room',        emoji: '🛏️'  },
  { value: '1RK',               label: '1 RK',               emoji: '🏠'  },
  { value: '1BHK',              label: '1 BHK',              emoji: '🏠'  },
  { value: '2BHK',              label: '2 BHK',              emoji: '🏡'  },
  { value: '3BHK',              label: '3 BHK',              emoji: '🏡'  },
  { value: '4BHK',              label: '4+ BHK',             emoji: '🏘️'  },
  { value: 'INDEPENDENT_HOUSE', label: 'Independent House',  emoji: '🏚️'  },
  { value: 'VILLA',             label: 'Villa',              emoji: '🏰'  },
  { value: 'PG',                label: 'PG / Hostel',        emoji: '🛋️'  },
  { value: 'COMMERCIAL',        label: 'Commercial',         emoji: '🏢'  },
];

// Quick lookup: value → label
export const TYPE_LABEL = Object.fromEntries(
  PROPERTY_TYPES.map(t => [t.value, t.label])
);

// Quick lookup: value → emoji
export const TYPE_EMOJI = Object.fromEntries(
  PROPERTY_TYPES.map(t => [t.value, t.emoji])
);
