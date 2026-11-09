// Read-only, bounded Firestore pagination for the CSI marketing diagnosis.
// Never returns contact identifiers through the API; callers aggregate counts.
export async function scanCsiDiagnosticCollection(db, documentIdField, {
  name, max, fields, storeId = 'csi', pageSize = 750,
  deadlineMs = Date.now() + 40000,
} = {}) {
  if (!name || !Array.isArray(fields) || !fields.length ||
      !Number.isInteger(max) || max < 1 || !Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('Invalid diagnostic scan configuration');
  }
  const rows = [];
  let cursor = null;
  let partial = false;

  while (rows.length < max) {
    if (Date.now() >= deadlineMs) { partial = true; break; }
    const count = Math.min(pageSize, max - rows.length);
    let query = db.collection(name).where('storeId', '==', storeId)
      .orderBy(documentIdField).limit(count).select(...fields);
    if (cursor) query = query.startAfter(cursor);
    const snap = await query.get();
    rows.push(...snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    if (snap.size < count) break;
    if (rows.length >= max) { partial = true; break; }
    cursor = snap.docs[snap.docs.length - 1];
  }
  return { rows, partial };
}
