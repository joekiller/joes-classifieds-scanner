const fs = require('fs');
const path = require("path");
const Steam64 = 76561198118254940;

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
    const allowedKeys = [
        'title',
        'data-listing_account_id',
        'data-listing_comment',
        'data-listing_offers_url',
        'data-listing_price',
        'data-name',
        'data-original_id',
        'data-spell_1',
        'data-spell_2',
    ];
    const entries = {};
    (await Promise.all(paths.flatMap(async (p) => JSON.parse(await fs.promises.readFile(p, { encoding: 'utf-8' }))))).flat().map(entry => {
        const newData = {};
        Object.entries(entry['data'])
            .filter(([key,]) => allowedKeys.includes(key))
            .forEach(([key, value]) => {
                newData[key] = key === 'data-listing_account_id' ? (Number.parseInt(value) + Steam64).toString() : value;
            });
        entries[entry['id']] = newData;
    });
    let dumpSorted = [];
    Object.entries(entries).forEach(([key, value]) => dumpSorted.push({ 'id': key, 'data': value }));
    return dumpSorted;
}


async function sortEntries(entries, cmp, ascending) {
    const all = Array.from(entries);
    all.sort(cmp);
    if (!ascending) {
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

const sortBy = 'originalId';
const filterFn = {
    'originalId': (entries) => entries.filter(entry =>
        entry['data'].hasOwnProperty("data-spell_1")
        && originalId <= Number.parseInt(entry['data']['data-original_id'])
    ),
    'excludes': (entries) => 
        entries.filter(entry => 
            exclusions.every(exclusion => 
                (Number.parseInt(exclusion) + Steam64).toString() !== entry['data']['data-listing_account_id']))
}
const filters = []; // or a key of filters ie 'originalId' or 'excludes'
// const filters = null; // or a key of filters ie 'originalId'
const originalId = 3251762665;
const exclusions = [];  // short steam id (partner id)

mergeEm()
    .then(entries => sortEntries(entries, sortFns[sortBy], useAscending))
    .then(entries => filters ? filters.reduce((input, current) => filterFn[current](input), entries) : entries)
    .then(entries => saveEntries(entries, `merged-${[sortBy, useAscending ? 'asc' : 'dsc', filters && filters.length > 0 ? filters.join('-') : null].filter(e => null != e).join('-')}-${new Date().toISOString()}.json`))
    .catch((e) => console.error(e.toString()));
