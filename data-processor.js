const fs = require('fs');

function processMetrics() {
    if (!fs.existsSync('data.json')) return console.error("❌ No data.json found.");

    const rawData = JSON.parse(fs.readFileSync('data.json'));
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
        return {
            month: m,
            count: count,
            avgSize: sub.reduce((a, b) => a + b.size, 0) / count,
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

    fs.writeFileSync('ui-stats.json', JSON.stringify(uiStats));
    fs.writeFileSync('ui-details.json', JSON.stringify(prs));
    console.log(`✅ Processed ${prs.length} PRs.`);
}
processMetrics();