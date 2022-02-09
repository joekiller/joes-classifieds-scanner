const fs = require('fs');
const path = require("path");
const Steam64 = "76561198118254940";

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

function findSum(first, second) {
    if (first.length < second.length) {
        return findSum(second, first)
    }
	var sum = '';
	var carry = 0;
	var diff = second.length - first.length;
	for (i = first.length - 1; i >= 0; i--) {
		var temp =
			(Number(first.charAt(i)) % 10) +
			(Number(second.charAt(i + diff)) % 10) +
			carry;
		if (temp >= 10) {
			sum = (temp % 10) + sum;
			carry = Math.floor(temp / 10);
		} else {
			sum = temp + sum;
			carry = 0;
		}
	}
	if (carry) {
		sum = carry + sum;
	}
	return sum;
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
