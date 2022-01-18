const fs = require('fs');
const path = require("path");

let paths;
try {
    paths = process.argv.slice(2);
    if (!paths) {
        console.error('No paths found');
        process.exit(1);
    }
} catch {
    console.error('No paths found');
    process.exit(1);
}


async function mergeEm() {
    const entries = {};
    (await Promise.all(paths.flatMap(async (p) => JSON.parse(await fs.promises.readFile(p, {encoding: 'utf-8'}))))).flat().map(entry => entries[entry['id']] = entry['data']);
    let dumpSorted = [];
    Object.entries(entries).forEach(([key, value]) => dumpSorted.push({'id': key, 'data': value}));
    dumpSorted.sort((a, b) => new Date(a['data']['dateListed']).valueOf() - new Date(b['data']['dateListed']).valueOf());
    const targetDir = path.dirname(paths[0]);
    let targetFile = `merged-${new Date().toISOString()}.json`;
    targetFile = targetFile.replace(/:/g, '_');
    const targetPath = `${targetDir}/${targetFile}`;
    await fs.promises.writeFile(targetPath, JSON.stringify(dumpSorted, null, 2))
    console.log('Finished wrote to:');
    console.log(targetPath);
}

mergeEm().catch((e) => console.error(e.toString()));
