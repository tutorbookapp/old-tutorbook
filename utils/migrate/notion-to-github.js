const parse = require('csv-parse/lib/sync');
const to = require('await-to-js').default;
const axios = require('axios');
const sleep = require('sleep');
const fs = require('fs');

// Where a line in the Notion-exported Roadmap is:
// Projects, Type, Status, Priority, Sprint, Epic, Tasks, Timeline, Engineers, Product Manager, Created

const getBody = (notion) => {
    const path = '../roadmap/' +
        notion['Projects'].split(',').join('').substring(0, 50) + '.md';
    if (fs.existsSync(path)) return fs.readFileSync(path).toString();
    return notion['Projects'];
};

const getLabels = (notion) => {
    const keys = ['Type', 'Status', 'Priority'];
    return keys.map(key => key.toLowerCase() + ':' +
        notion[key].toLowerCase().replace(' ', '-'));
};

const getIssue = (notion) => {
    return {
        title: notion['Projects'],
        body: getBody(notion),
        labels: getLabels(notion),
        assignees: ['nicholaschiang'],
    };
};

const main = async () => {
    const roadmap = parse(fs.readFileSync('../roadmap.csv'), {
        columns: true,
        skip_empty_lines: true,
    }).map(original => {
        const res = {};
        Object.keys(original).forEach(key => res[key.trim()] = original[key]);
        return res;
    });
    console.log('[INFO] Adding ' + roadmap.length + ' issues...');
    for (const notion of roadmap) {
        const issue = getIssue(notion);
        const [err, res] = await to(axios({
            method: 'post',
            url: 'https://api.github.com/repos/tutorbookapp/tutorbook/issues',
            data: issue,
            auth: {
                username: 'TODO: Add GitHub username here.',
                password: 'TODO: Add GitHub password here.',
            },
        }));
        if (err) debugger;
        sleep.sleep(1);
    }
};

main();