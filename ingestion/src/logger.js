const ts = () => new Date().toISOString();

export const log = {
    info: (...a) => console.log(`[${ts()}] INFO `, ...a),
    warn: (...a) => console.warn(`[${ts()}] WARN `, ...a),
    error: (...a) => console.error(`[${ts()}] ERROR`, ...a),
};

// Aynı uyarıyı saniyede bir kereden fazla basmamak için (socket akışı hızlı).
const lastSeen = new Map();
export const logThrottled = (key, intervalMs, fn) => {
    const now = Date.now();
    if ((lastSeen.get(key) ?? 0) + intervalMs > now) return;
    lastSeen.set(key, now);
    fn();
};
