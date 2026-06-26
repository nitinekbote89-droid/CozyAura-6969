// India Post Speed Post — Latur origin (PIN 413512)

const STATE_GROUPS = {
  'maharashtra': 'A', 'goa': 'A', 'karnataka': 'A', 'telangana': 'A',
  'gujarat': 'B', 'rajasthan': 'B', 'madhya pradesh': 'B', 'chhattisgarh': 'B',
  'andhra pradesh': 'B', 'tamil nadu': 'B', 'kerala': 'B', 'puducherry': 'B',
  'dadra and nagar haveli': 'B', 'daman and diu': 'B', 'lakshadweep': 'B',
  'odisha': 'C', 'uttar pradesh': 'C', 'bihar': 'C', 'jharkhand': 'C',
  'west bengal': 'C', 'delhi': 'C', 'haryana': 'C', 'punjab': 'C',
  'himachal pradesh': 'C', 'uttarakhand': 'C', 'chandigarh': 'C',
  'jammu and kashmir': 'C',
  'assam': 'D', 'arunachal pradesh': 'D', 'meghalaya': 'D', 'nagaland': 'D',
  'manipur': 'D', 'mizoram': 'D', 'tripura': 'D', 'sikkim': 'D',
  'ladakh': 'D', 'andaman and nicobar islands': 'D',
};

const WEIGHT_SLAB_MAX = [500, 1000, 1500, 2000, 2500, 3000, 3500];

const SHIPPING_RATES = {
  A: [60, 77, 94, 113, 130, 147, 166],
  B: [70, 106, 142, 178, 212, 248, 284],
  C: [94, 142, 188, 236, 284, 330, 378],
  D: [106, 166, 224, 284, 342, 402, 460],
};

export function getShippingGroup(state) {
  if (!state) return null;
  return STATE_GROUPS[state.toLowerCase().trim()] || null;
}

export function getSlabIndex(weightGrams) {
  if (weightGrams <= 0) return 0;
  for (let i = 0; i < WEIGHT_SLAB_MAX.length; i++) {
    if (weightGrams <= WEIGHT_SLAB_MAX[i]) return i;
  }
  return WEIGHT_SLAB_MAX.length - 1;
}

export function getChargeForGroupWeight(group, weightGrams) {
  const rates = SHIPPING_RATES[group];
  if (!rates) return 0;
  return rates[getSlabIndex(weightGrams)] || 0;
}

export function calculateShipping(items, state) {
  if (!items || !Array.isArray(items) || items.length === 0) return 0;
  const group = getShippingGroup(state);
  if (!group) return 0;
  const totalWeight = items.reduce((sum, item) => {
    const weight = item.product?.weight || item.weight || 220;
    return sum + (weight * (item.quantity || 1));
  }, 0);
  return getChargeForGroupWeight(group, totalWeight);
}
