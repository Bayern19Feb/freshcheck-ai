// Dashboard numbers, calculated only from the scan records stored on this device.

import { FRUITS } from './fruits.js';

export function computeStats(records) {
  const byCondition = { fresh: 0, overripe: 0, spoiled: 0, uncertain: 0 };
  const byFruit = {};
  let helpfulYes = 0;
  let helpfulNo = 0;
  let manualOnly = 0;

  for (const r of records) {
    byCondition[r.conditionId] = (byCondition[r.conditionId] || 0) + 1;
    // Count the fruit the model detected; fall back to the user's selection.
    const fruitId = r.detectedFruitId || r.userFruitId;
    if (fruitId) byFruit[fruitId] = (byFruit[fruitId] || 0) + 1;
    if (!r.detectedFruitId && r.userFruitId) manualOnly += 1;
    if (r.feedback === 'yes') helpfulYes += 1;
    if (r.feedback === 'no') helpfulNo += 1;
  }

  let mostScanned = null;
  for (const f of FRUITS) {
    const n = byFruit[f.id] || 0;
    if (n > 0 && (!mostScanned || n > mostScanned.count)) mostScanned = { fruitId: f.id, count: n };
  }

  return {
    total: records.length,
    byCondition,
    byFruit,
    mostScanned,
    helpfulYes,
    helpfulNo,
    manualOnly,
  };
}
