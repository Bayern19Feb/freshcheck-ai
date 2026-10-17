// Scan history saved on this device (IndexedDB).

import * as db from './db.js';

/** Build the record stored for one analysed photo. */
export function makeScanRecord(result, { thumbnail, modelVersion }) {
  return {
    id: db.newId(),
    createdAt: new Date().toISOString(),
    userFruitId: result.userFruitId,
    detectedFruitId: result.detectedFruitId,
    fruitConfidence: result.fruitConfidence,
    conditionId: result.conditionId,
    topClass: result.topClass,
    confidence: result.confidence,
    threshold: result.threshold,
    reasons: result.reasons,
    experimental: result.experimental,
    scores: result.scores,
    thumbnail: thumbnail || null,
    modelVersion: modelVersion || null,
    feedback: null,
  };
}

export async function saveScan(record) {
  await db.put('scans', record);
  return record;
}

export async function listScans() {
  const all = await db.getAll('scans');
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const getScan = (id) => db.get('scans', id);
export const deleteScan = (id) => db.remove('scans', id);
export const clearScans = () => db.clear('scans');

export async function setFeedback(id, feedback) {
  const rec = await db.get('scans', id);
  if (!rec) return null;
  rec.feedback = feedback;
  await db.put('scans', rec);
  return rec;
}
