const fs = require('fs');

function main(packages, packagesDir) { // TODO: Get packages from packagesDir
    const packageNamesChanged = []; // Names to look for in dependencies
    console.log('[INFO] Updating ' + packages.length + ' packages...');
    packages.forEach((packageDir) => {
        const filename = (packagesDir || './') + packageDir + '/package.json';
        const packageJson = JSON.parse(fs.readFileSync(filename));
        if (packageJson.name.indexOf('tutorbook') < 0) {
            packageNamesChanged.push(packageJson.name);
            packageJson.name = 'tutorbook-' + packageJson.name;
            console.log('[DEBUG] Updating ' + packageJson.name + '...');
            fs.writeFileSync(filename, JSON.stringify(packageJson, null, 2));
            count++;
        }
    });
    console.log('[INFO] Checked ' + packages.length + ' packages and updated ' +
        packageNamesChanged.length + ' of those packages\' package.json file.');
    console.log('[INFO] Searching ' + packages.length + ' packages for ' +
        packageNamesChanged.length + ' changed package names...');
    var count, fileCount;
    count = fileCount = 0;
    packages.forEach((packageDir) => {
        const filename = (packagesDir || './') + packageDir + '/package.json';
        const packageJson = JSON.parse(fs.readFileSync(filename));
        const deps = packageJson.dependencies;
        if (typeof deps !== 'object') return;
        Object.entries(deps).forEach((dep) => {
            if (packageNamesChanged.indexOf(dep[0]) >= 0) {
                console.log('[DEBUG] Updating ' + dep[0] +
                    ' dependency name in ' + packageJson.name + '...');
                deps['tutorbook-' + dep[0]] = dep[1];
                delete deps[dep[0]];
                count++;
            }
        });
        fs.writeFileSync(filename, JSON.stringify(packageJson, null, 2));
        fileCount++;
    });
    console.log('[INFO] Updated ' + count + ' package dependency names in ' +
        fileCount + ' package.json files.');
};

function githubPackages(packages, packagesDir) {
    console.log('[INFO] Updating ' + packages.length + ' packages...');
    var count = 0;
    packages.forEach((packageDir) => {
        const filename = (packagesDir || './') + packageDir + '/package.json';
        const packageJson = JSON.parse(fs.readFileSync(filename));
        if (typeof packageJson.publishConfig !== 'object')
            packageJson.publishConfig = {};
        packageJson.publishConfig.registry = 'https://npm.pkg.github.com';
        console.log('[DEBUG] Updating ' + packageJson.name + '...');
        fs.writeFileSync(filename, JSON.stringify(packageJson, null, 2));
        count++;
    });
    console.log('[INFO] Checked ' + packages.length + ' packages and updated ' +
        count + ' of those packages\' package.json file.');
};

function addRepo(packages, packagesDir) {
    console.log('[INFO] Updating ' + packages.length + ' packages...');
    var count = 0;
    packages.forEach((packageDir) => {
        const filename = (packagesDir || './') + packageDir + '/package.json';
        const packageJson = JSON.parse(fs.readFileSync(filename));
        packageJson.repository = {
            type: 'git',
            url: 'ssh://git@github.com/nicholaschiang/tutorbook.git',
            directory: 'src/app/packages/' + packageDir,
        };
        console.log('[DEBUG] Updating ' + packageJson.name + '...');
        fs.writeFileSync(filename, JSON.stringify(packageJson, null, 2));
        count++;
    });
    console.log('[INFO] Checked ' + packages.length + ' packages and updated ' +
        count + ' of those packages\' package.json file.');
};

addRepo([
    'app',
    'card',
    'chats',
    'dashboard',
    'data',
    'dialogs',
    'feedback',
    'filters',
    'intercom',
    'listener',
    'login',
    'matching',
    'navigation',
    'notify',
    'payments',
    'profile',
    'render',
    'schedule',
    'schedule-card',
    'schedule-items',
    'search',
    'settings',
    'snackbar',
    'templates',
    'tracking',
    'user',
    'utils',
], '../');