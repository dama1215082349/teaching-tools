import { Redis } from '@upstash/redis';
const kv = Redis.fromEnv();

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { scores, game } = req.body;
        const key = `lottery_scores_${game || 'default'}`;
        const timeStr = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        const nonZeroCount = Object.values(scores).filter(s => s > 0).length;

        await kv.set(key, { scores, lastSaved: timeStr });

        console.log(`✅ Saved ${nonZeroCount} scores for game: ${game}`);
        res.status(200).json({ success: true, time: timeStr, count: nonZeroCount });
    } catch (err) {
        console.error('❌ Save error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}
