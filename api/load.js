import { Redis } from '@upstash/redis';
const kv = Redis.fromEnv();

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const game = req.query.game || 'default';
        const key = `lottery_scores_${game}`;

        const data = await kv.get(key);

        if (data) {
            res.status(200).json({
                scores: data.scores || {},
                lastSaved: data.lastSaved || null
            });
        } else {
            res.status(200).json({ scores: {}, lastSaved: null });
        }
    } catch (err) {
        console.error('❌ Load error:', err);
        res.status(500).json({ error: err.message });
    }
}
