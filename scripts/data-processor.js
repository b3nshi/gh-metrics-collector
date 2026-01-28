const fs = require('fs');
const path = require('path');

const DATA_DIR = 'data';
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const UI_STATS_FILE = path.join(DATA_DIR, 'ui-stats.json');
const UI_DETAILS_FILE = path.join(DATA_DIR, 'ui-details.json');

function processMetrics() {
    if (!fs.existsSync(DATA_FILE)) return console.error(`❌ No ${DATA_FILE} found.`);

    const rawData = JSON.parse(fs.readFileSync(DATA_FILE));
    const prs = rawData.prs.map(p => ({
        ...p,
        size: Number(p.size),
        mergeTime: Number(p.mergeTime),
        leadTime: Number(p.leadTime),
        commentCount: Number(p.commentCount),
        reviewCount: p.reviews ? [...new Set(p.reviews)].length : 0
    }));

    const months = [...new Set(prs.map(p => p.month))].sort();
    
    const monthlyStats = months.map(m => {
        const sub = prs.filter(p => p.month === m);
        const count = sub.length;
        // Sort to find extremes
        const sizes = sub.map(p => p.size).sort((a, b) => a - b);
        
        return {
            month: m,
            count: count,
            avgSize: sub.reduce((a, b) => a + b.size, 0) / count,
            minSize: sizes[0] || 0, // NEW
            maxSize: sizes[sizes.length - 1] || 0, // NEW
            avgTtm: sub.reduce((a, b) => a + b.mergeTime, 0) / count,
            avgLeadTime: sub.reduce((a, b) => a + b.leadTime, 0) / count,
            avgComments: sub.reduce((a, b) => a + b.commentCount, 0) / count,
            avgReviewers: sub.reduce((a, b) => a + b.reviewCount, 0) / count
        };
    });

    const mergers = Object.entries(prs.reduce((acc, p) => { acc[p.author] = (acc[p.author] || 0) + 1; return acc; }, {}))
        .map(([login, merged]) => ({ login, merged, avgTime: prs.filter(p => p.author === login).reduce((a, b) => a + b.mergeTime, 0) / merged }));

    const reviewers = Object.entries(prs.reduce((acc, p) => { (p.reviews || []).forEach(r => acc[r] = (acc[r] || 0) + 1); return acc; }, {}))
        .map(([login, count]) => ({ login, count }));

    const uiStats = {
        repoInfo: rawData.repoInfo,
        period: rawData.period,
        summary: {
            merged: prs.length,
            avgSize: prs.reduce((a, b) => a + b.size, 0) / prs.length,
            avgTtm: prs.reduce((a, b) => a + b.mergeTime, 0) / prs.length,
            avgLeadTime: prs.reduce((a, b) => a + b.leadTime, 0) / prs.length
        },
        monthlyStats,
        rankings: { mergers, reviewers },
        outliers: {
            slowest: [...prs].sort((a, b) => b.mergeTime - a.mergeTime)[0],
            biggest: [...prs].sort((a, b) => b.size - a.size)[0],
            mostComments: [...prs].sort((a, b) => b.commentCount - a.commentCount)[0]
        },
        scatterData: prs.map(p => ({ x: p.size, y: p.mergeTime }))
    };

    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(UI_STATS_FILE, JSON.stringify(uiStats));
    fs.writeFileSync(UI_DETAILS_FILE, JSON.stringify(prs));
    console.log(`✅ Processed ${prs.length} PRs.`);
}
processMetrics();