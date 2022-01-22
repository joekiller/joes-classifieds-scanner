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
    return dumpSorted;
}


async function sortEntries(entries, cmp, ascending) {
    const all = Array.from(entries);
    all.sort(cmp);
    if(!ascending) {
        all.reverse();
    }
    return all;
}

function sortByListingDate(a, b) {
    return new Date(a['data']['dateListed']).valueOf() - new Date(b['data']['dateListed']).valueOf();
}

function sortByOriginalId(a, b) {
    return Number.parseInt(a['data']['data-original_id']) - Number.parseInt(b['data']['data-original_id']);
}

function sortByPrice(a, b) {
    return Number.parseFloat(a['data']['data-listing_price'].split()[0]) - Number.parseFloat(b['data']['data-listing_price'].split()[0]);
}

async function saveEntries(entries, name) {
    const targetDir = path.dirname(paths[0]);
    const targetFile = name.replace(/:/g, '_');
    const targetPath = `${targetDir}/${targetFile}`;
    await fs.promises.writeFile(targetPath, JSON.stringify(entries, null, 2))
    console.log('Finished wrote to:');
    console.log(targetPath);
}

const sortFns = {
    'listingDate': sortByListingDate,
    'originalId': sortByOriginalId,
    'price': sortByPrice,
}

const useAscending = true;

const sortBy = 'price';
const filters = {
    'originalId': (entries) => entries.filter(entry => originalId <= Number.parseInt(entry['data']['data-original_id']))
}
const filter = null; // or a key of filters ie 'originalId'
const originalId = 3251762665;

mergeEm()
    .then(entries => sortEntries(entries, sortFns[sortBy], useAscending))
    .then(entries => filter ? filters[filter](entries) : entries)
    .then(entries => saveEntries(entries,  `merged-${[sortBy, useAscending?'asc':'dsc', filter].filter(e => null != e).join('-')}-${new Date().toISOString()}.json`))
    .catch((e) => console.error(e.toString()));
