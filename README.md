# GitHub PR Metrics Dashboard

A professional-grade engineering intelligence tool designed to analyze GitHub repository performance, visualize **DORA** metrics, and provide mathematical proof of how PR size impacts team velocity.

## 🚀 Quick Start

1. **Install dependencies**:

```bash
npm install
```

2. Step 1: Collect Raw Data Fetches historical data from GitHub. The script uses deep-crawling pagination to ensure all PRs in the range are captured.

```Bash
node scripts/metrics-collector.js -t YOUR_TOKEN -r owner/repo --from yyyy-mm-dd --until yyyy-mm-dd
```

3. Step 2: Process for UI Performs mathematical aggregations, calculates monthly trends, and splits data into optimized JSON files for a high-performance dashboard.

```Bash
node scripts/data-processor.js
```

4. Step 3: View Dashboard

```Bash
npm start
```

Dashboard will be available at http://localhost:8080/dashboard.html

Markdown

## 📊 Metrics & Formulas

This tool utilizes industry-standard DORA-lite logic to measure engineering health:

### 1. Lead Time for Changes (DORA)

Measures the total time from the **first commit** until the work is successfully merged.

**Formula:** $$T_{lead} = T_{merged\_at} - T_{first\_commit\_at}$$

**Description:** This is the ultimate "Development Velocity" metric. It captures the entire lifecycle of a feature, not just the review phase.

### 2. Time to Merge (TTM)

Measures the efficiency of the review and CI/CD process.

**Formula:** $$TTM = T_{merged\_at} - T_{pr\_created\_at}$$

**Description:** Represents the "Review Friction." If TTM is high but Lead Time is low, your bottleneck is in the peer-review cycle.

### 3. PR Size & Correlation

Total volume of the change (Additions + Deletions) mapped against TTM.

**Insight:** Proves the correlation between large changes and increased review time. Smaller PRs (< 200 lines) are mathematically proven to merge faster.

### 4. Engagement (Collaboration Depth)

- **Average Reviewers:** Unique users participating in a PR.
- **Average Comments:** Discussion density per PR.

**Formula:** $$Engagement = \frac{\sum Comments}{\sum PRs}$$

---

## 🔑 Authentication (SAML SSO Organizations)

If your organization uses SAML SSO, follow these steps:

1.  **Create a Fine-grained PAT:**
    - Go to `Settings > Developer Settings > Fine-grained tokens`.
    - Set **Resource owner** to your Organization.
    - **Permissions:** Set `Pull Requests`, `Commits`, and `Metadata` to **Read-only**.
2.  **SSO Authorization (Classic Tokens):**
    - If using a Classic Token, ensure you click **Configure SSO** next to the token and click **Authorize** for your organization.

> [!NOTE]
> If the script is interrupted by GitHub's Rate Limiter, it will save a `data/.pending_state.json`. Simply run the collector command again to resume exactly where it left off.

---

## 🛠 Tech Stack

- **Collector:** Node.js + `@octokit/rest` (Handles deep-crawling, pagination, and SAML logic).
- **Processor:** Node.js (Handles data-splitting and pre-calculating metrics).
- **Frontend:** Chart.js (Scatter, Dual-Axis Line, and Bar charts) + Tailwind CSS.

---

## 🤝 How to Contribute

We welcome contributions to improve the logic!

1.  **Fork the Repository**.
2.  **Create a Branch:** `git checkout -b feature/new-metric`.
3.  **Implement:**
    - Add raw data points in `scripts/metrics-collector.js`.
    - Update mathematical processing in `scripts/data-processor.js`.
    - Update visualizations in `dashboard.html`.
4.  **Submit a Pull Request**.

---

## ✨ Features

- **DORA Velocity:** Visualizes the gap between coding speed and review speed.
- **Hall of Fame:** Largest, smallest, and fastest PRs merged.
- **Engagement Trends:** Track avg reviewers and comment density per month.
- **Split-Loading UI:** High-performance architecture handles 1000+ PRs with zero lag.
