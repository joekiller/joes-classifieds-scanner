const fs = require('fs');
const path = require("path");
const Steam64 = "76561197960265728";

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

const lookup = {};
const keys = [];

function findSum(str1, str2)
{
     
    // Before proceeding further, make
    // sure length of str2 is larger.
    if (str1.length > str2.length)
    {
        let t = str1;
        str1 = str2;
        str2 = t;
    }
     
    // Take an empty String for storing result
    let str = "";
     
    // Calculate length of both String
    let n1 = str1.length, n2 = str2.length;
     
    // Reverse both of Strings
    str1 = str1.split("").reverse().join("");
    str2 = str2.split("").reverse().join("");
     
    let carry = 0;
    for(let i = 0; i < n1; i++)
    {
         
        // Do school mathematics, compute sum of
        // current digits and carry
        let sum = ((str1[i].charCodeAt(0) -
                        '0'.charCodeAt(0)) +
                   (str2[i].charCodeAt(0) -
                        '0'.charCodeAt(0)) + carry);
        str += String.fromCharCode(sum % 10 +
                        '0'.charCodeAt(0));
     
        // Calculate carry for next step
        carry = Math.floor(sum / 10);
    }
     
    // Add remaining digits of larger number
    for(let i = n1; i < n2; i++)
    {
        let sum = ((str2[i].charCodeAt(0) -
                        '0'.charCodeAt(0)) + carry);
        str += String.fromCharCode(sum % 10 +
                        '0'.charCodeAt(0));
        carry = Math.floor(sum / 10);
    }
     
    // Add remaining carry
    if (carry > 0)
        str += String.fromCharCode(carry +
                       '0'.charCodeAt(0));
     
    // reverse resultant String
    str = str.split("").reverse().join("");
     
    return str;
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
        const newData = {id: entry['id']};
        Object.entries(entry['data'])
            .filter(([key,]) => allowedKeys.includes(key))
            .forEach(([key, value]) => {
                newData[key] = key === 'data-listing_account_id' ? findSum(value, Steam64) : value;
            });
        const oId = Number.parseInt(newData['data-original_id']);
        const itemId = Number.parseInt(entry['id'].split('_').pop())
        if(!keys.includes(oId)) {
            keys.push(oId);
            lookup[oId] = itemId;
            entries[oId] = newData;
        } else if (lookup[oId] < itemId) {
            prevItem = lookup[oId];
            lookup[oId] = itemId;
            entries[oId] = newData;
        }
    });
    let dumpSorted = [];
    Object.entries(entries).forEach(([key, value]) => dumpSorted.push(value));
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
    return new Date(a['dateListed']).valueOf() - new Date(b['dateListed']).valueOf();
}

function sortByOriginalId(a, b) {
    return Number.parseInt(a['data-original_id']) - Number.parseInt(b['data-original_id']);
}

function sortByPrice(a, b) {
    return Number.parseFloat(a['data-listing_price'].split()[0]) - Number.parseFloat(b['data-listing_price'].split()[0]);
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
        entry.hasOwnProperty("data-spell_1")
        && originalId <= Number.parseInt(entry['data-original_id'])
    ),
    'excludes': (entries) => 
        entries.filter(entry => 
            exclusions.every(exclusion => 
                findSum(exclusion, Steam64) !== entry['data-listing_account_id']))
}
// const filters = ['originalId']; // or a key of filters ie 'originalId' or 'excludes'
const filters = null; // or a key of filters ie 'originalId'
const originalId = 3251762665;
const exclusions = [];  // short steam id (partner id)

mergeEm()
    .then(entries => sortEntries(entries, sortFns[sortBy], useAscending))
    .then(entries => filters ? filters.reduce((input, current) => filterFn[current](input), entries) : entries)
    .then(entries => saveEntries(entries, `merged-${[sortBy, useAscending ? 'asc' : 'dsc', filters && filters.length > 0 ? filters.join('-') : null].filter(e => null != e).join('-')}-${new Date().toISOString()}.json`))
    .catch((e) => console.error(e.toString()));
