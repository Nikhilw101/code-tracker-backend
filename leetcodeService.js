// Native fetch is available in Node 18+
// const fetch = require('node-fetch'); 

const LEETCODE_API_URL = 'https://leetcode.com/graphql';

const getLeetCodeStats = async (username) => {
    const query = `
    query userProblemsSolved($username: String!) {
        allQuestionsCount {
            difficulty
            count
        }
        matchedUser(username: $username) {
            username
            submitStats: submitStatsGlobal {
                acSubmissionNum {
                    difficulty
                    count
                    submissions
                }
            }
        }
    }
    `;

    try {
        const response = await fetch(LEETCODE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            body: JSON.stringify({
                query,
                variables: { username }
            })
        });

        if (!response.ok) {
            return { success: false, error: `LeetCode API error: ${response.status} ${response.statusText}` };
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('LeetCode returned non-JSON:', text.substring(0, 100));
            return { success: false, error: 'LeetCode API returned unexpected content (possibly Cloudflare block)' };
        }

        const data = await response.json();

        if (data.errors) {
            return { success: false, error: data.errors[0].message };
        }

        if (!data.data.matchedUser) {
            return { success: false, error: 'User not found' };
        }

        return {
            success: true,
            data: {
                totalSolved: data.data.matchedUser.submitStats.acSubmissionNum.find(s => s.difficulty === 'All')?.count || 0,
                easySolved: data.data.matchedUser.submitStats.acSubmissionNum.find(s => s.difficulty === 'Easy')?.count || 0,
                mediumSolved: data.data.matchedUser.submitStats.acSubmissionNum.find(s => s.difficulty === 'Medium')?.count || 0,
                hardSolved: data.data.matchedUser.submitStats.acSubmissionNum.find(s => s.difficulty === 'Hard')?.count || 0,
                totalQuestions: data.data.allQuestionsCount.find(q => q.difficulty === 'All')?.count || 0,
            }
        };
    } catch (error) {
        console.error('LeetCode API Fetch Error:', error);
        return { success: false, error: error.message };
    }
};

const getRecentSubmissions = async (username) => {
    const query = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
            id
            title
            titleSlug
            timestamp
        }
    }
    `;

    try {
        const response = await fetch(LEETCODE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com',
                'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
                query,
                variables: { username, limit: 20 }
            })
        });

        const data = await response.json();

        if (data.errors) return { success: false, error: data.errors[0].message };

        return {
            success: true,
            data: data.data.recentAcSubmissionList
        };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

module.exports = { getLeetCodeStats, getRecentSubmissions };
