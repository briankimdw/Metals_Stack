// Simple localStorage-backed storage for guest mode.
// Each "table" is a JSON array stored under a key.

const PREFIX = 'metal-stacker-guest-';

function getItems(table) {
  try {
    const raw = localStorage.getItem(PREFIX + table);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setItems(table, items) {
  localStorage.setItem(PREFIX + table, JSON.stringify(items));
}

export function guestSelect(table) {
  return getItems(table);
}

export function guestInsert(table, row) {
  const id = crypto.randomUUID();
  const item = { ...row, id, created_at: new Date().toISOString() };
  const items = getItems(table);
  items.push(item);
  setItems(table, items);
  return item;
}

export function guestUpdate(table, id, updates) {
  const items = getItems(table);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  items[idx] = { ...items[idx], ...updates };
  setItems(table, items);
  return true;
}

export function guestDelete(table, id) {
  const items = getItems(table);
  const filtered = items.filter((i) => i.id !== id);
  setItems(table, filtered);
  return filtered.length < items.length;
}

export function guestUpdateWhere(table, field, value, updates) {
  const items = getItems(table);
  let changed = false;
  for (let i = 0; i < items.length; i++) {
    if (items[i][field] === value) {
      items[i] = { ...items[i], ...updates };
      changed = true;
    }
  }
  if (changed) setItems(table, items);
  return changed;
}

export function isGuest(user) {
  return user?.isGuest === true;
}

export function clearAllGuestData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
