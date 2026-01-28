#!/usr/bin/env node
const { Command } = require('commander');
const { Octokit } = require("@octokit/rest");
const fs = require('fs');
const ora = require('ora');

const DATA_DIR = 'data';
const STATE_FILE = `${DATA_DIR}/.pending_state.json`;
const DATA_FILE = `${DATA_DIR}/data.json`;

const program = new Command();

program
  .name('metric-gen')
  .version('1.9.2')
  .requiredOption('-t, --token <string>', 'GitHub PAT')
  .requiredOption('-r, --repo <string>', 'owner/repo')
  .requiredOption('-f, --from <yyyy-mm-dd>', 'Start date')
  .requiredOption('-u, --until <yyyy-mm-dd>', 'End date')
  .action(async (options) => {
    const [owner, repo] = options.repo.split('/');
    const octokit = new Octokit({ auth: options.token });
    const spinner = ora().start();

    const checkRateLimit = async () => {
        const { data } = await octokit.rateLimit.get();
        return { 
            remaining: data.resources.core.remaining, 
            reset: new Date(data.resources.core.reset * 1000).toLocaleTimeString() 
        };
    };

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      let state = { config: options, processedIds: [], results: [], pullsToProcess: [], globalStats: {} };
      
      if (fs.existsSync(STATE_FILE)) {
        const savedState = JSON.parse(fs.readFileSync(STATE_FILE));
        if (savedState.config.repo === options.repo && savedState.config.from === options.from) {
          state = savedState;
          spinner.info(`Resuming: ${state.results.length} processed.`);
        } else {
          fs.unlinkSync(STATE_FILE);
        }
      }

      const limitInfo = await checkRateLimit();
      spinner.info(`API Credits: ${limitInfo.remaining}`);

      const { data: repoMeta } = await octokit.repos.get({ owner, repo });

      if (state.pullsToProcess.length === 0) {
        spinner.start(`Deep crawling history for range ${options.from} to ${options.until}...`);
        let page = 1;
        let keepFetching = true;
        const fromDate = new Date(options.from);
        const untilDate = new Date(options.until);
        const allMergedInRange = [];

        while (keepFetching) {
            spinner.text = `Fetching page ${page} (Found ${allMergedInRange.length} so far)...`;
            const { data: pagePulls } = await octokit.pulls.list({
                owner, repo, state: 'closed', per_page: 100, page, sort: 'updated', direction: 'desc'
            });

            if (pagePulls.length === 0) break;

            for (const pr of pagePulls) {
                if (!pr.merged_at) continue;
                const mDate = new Date(pr.merged_at);

                if (mDate >= fromDate && mDate <= untilDate) {
                    allMergedInRange.push(pr);
                }

                if (mDate < fromDate) {
                    const updatedDate = new Date(pr.updated_at);
                    if (updatedDate < fromDate) {
                        keepFetching = false;
                    }
                }
            }
            page++;
            if (page > 100) break; 
        }
        state.pullsToProcess = allMergedInRange;
        spinner.succeed(`Total found in range: ${allMergedInRange.length} PRs.`);
      }

      for (const pr of state.pullsToProcess) {
        if (state.processedIds.includes(pr.id)) continue;

        const currentLimit = await checkRateLimit();
        if (currentLimit.remaining < 20) {
            spinner.fail(`Rate limit! Reset at ${currentLimit.reset}`);
            process.exit(0);
        }

        spinner.start(`Processing #${pr.number} (Remaining: ${currentLimit.remaining})`);

        const [reviews, commits, comments, fullPr] = await Promise.all([
          octokit.pulls.listReviews({ owner, repo, pull_number: pr.number }),
          octokit.pulls.listCommits({ owner, repo, pull_number: pr.number }),
          octokit.issues.listComments({ owner, repo, issue_number: pr.number }),
          octokit.pulls.get({ owner, repo, pull_number: pr.number })
        ]);

        const mergeDate = new Date(fullPr.data.merged_at);
        const creationDate = new Date(fullPr.data.created_at);
        
        // Defensive check for first commit
        let firstCommitDate = creationDate; 
        if (commits.data && commits.data.length > 0 && commits.data[0].commit && commits.data[0].commit.author) {
            firstCommitDate = new Date(commits.data[0].commit.author.date);
        }

        state.results.push({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          author: pr.user.login,
          size: (fullPr.data.additions || 0) + (fullPr.data.deletions || 0),
          commits: commits.data.length,
          mergeTime: (mergeDate - creationDate) / (1000 * 60 * 60),
          leadTime: (mergeDate - firstCommitDate) / (1000 * 60 * 60),
          month: fullPr.data.merged_at.substring(0, 7),
          commentCount: comments.data.length,
          url: pr.html_url,
          reviews: reviews.data.map(r => r.user.login)
        });

        state.processedIds.push(pr.id);
        fs.writeFileSync(STATE_FILE, JSON.stringify(state));
      }

      const finalData = {
        repoInfo: { name: repo, created: repoMeta.created_at },
        periodStats: { merged: state.results.length },
        period: { from: options.from, until: options.until },
        generatedAt: new Date().toLocaleString(),
        prs: state.results
      };

      fs.writeFileSync(DATA_FILE, JSON.stringify(finalData, null, 2));
      if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
      spinner.succeed(`Success: ${state.results.length} PRs collected.`);

    } catch (error) {
      spinner.fail("Error: " + error.message);
    }
  });

program.parse();