// ==UserScript==
// @name         Joe's Backpack.tf Classifieds Scanner/Cacher
// @namespace    https://joekiller.com
// @version      1.0.5
// @description  Scans through backpack.tf classifieds pages with ctrl+leftarrow. When scanning stops a list is created sorted by listing date ascending. Ctrl + down arrow to force stop.
// @author       Joseph Lawson
// @match        *backpack.tf/classifieds*
// @downloadURL  https://github.com/joekiller/joes-classifieds-scanner/raw/main/Joe's%20Classifieds%20Scanner.user.js
// @updateURL    https://github.com/joekiller/joes-classifieds-scanner/raw/main/Joe's%20Classifieds%20Scanner.meta.js
// ==/UserScript==
let searchDelay = 0;

let dataExclusions = ['data-listing_name'];

const programName = 'classifiedsCache';

let [searchState] = getCookie(programName);

function saveListings() {
    let listingCache = {};
    if(localStorage.getItem(programName)) {
        try {
            listingCache = JSON.parse(localStorage.getItem(programName));
        } catch {
            listingCache = {};
        }
    }
    let sellOrders = document.evaluate(
        "//*[@id=\"page-content\"]/div[2]/div[1]/div/div[2]/ul/li",
        document.body,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null);

    for (let i = 0; i < sellOrders.snapshotLength; i++) {
        let thisListing = sellOrders.snapshotItem(i);
        let thisItem = document.evaluate(
            "./div/div",
            thisListing,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null).snapshotItem(0);

        let thisListed = document.evaluate(
            "./div[2]/span/span[2]/time",
            thisListing,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null).snapshotItem(0);

        let listingId = thisListing.getAttribute('id').substring('listing-'.length);
        let entry = {};
        let attributes = thisItem.getAttributeNames();
        for (let j = 0; j < attributes.length; j++) {
            if(!dataExclusions.includes(attributes)) {
                entry[attributes[j]] = thisItem.getAttribute(attributes[j]);
            }
        }
        entry['dateListed'] = thisListed.getAttribute('datetime');
        listingCache[listingId] = entry;
        console.log(`wrote ${listingId}: ${JSON.stringify(entry)}`);
    }
    let cacheSize = Object.keys(listingCache).length;
    if (cacheSize > 0) {
        localStorage.setItem(programName, JSON.stringify(listingCache));
    }
    if (cacheSize > 3999) {
        downloadCache();
    }
}

function downloadCache() {
    let dumpObject = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const matcher = RegExp(`^${programName}.*`);
        if (key.match(matcher)) {
            dumpObject = JSON.parse(localStorage.getItem(key));
            localStorage.removeItem(key);
        }
    }
    // sort by oldest to newest listing
    let dumpSorted = [];
    Object.entries(dumpObject).forEach(([key, value]) => dumpSorted.push({'id': key, 'data': value}));
    dumpSorted = dumpSorted.sort((a, b) => new Date(a['data']['dateListed']).valueOf() - new Date(b['data']['dateListed']).valueOf());
    download(`listings-${new Date().toISOString()}.json`, JSON.stringify(dumpSorted, null, 2))
}

function download(filename, text) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}


// Loads a cookie from under backpack.tf
function getCookie(cname) {
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            console.log(c);
            try {
                let r = JSON.parse(c.substring(name.length, c.length));
                return r;
            } catch (e){
                console.log(e);
            }
        }
    }
    return [0];
}

// Saves a cookie under backpack.tf
function saveCookie(cname, cvalue) {
    let d = new Date();
    d.setTime(d.getTime() + (7 * 24 * 60 * 60 * 1000));
    let expires = "expires="+d.toUTCString();
    let cookie = cname + "=" + JSON.stringify([cvalue]) + ";" + expires + ";path=/";
    document.cookie = cookie;
}

function run() {
    // first time run
    if (searchState == -1) {
        setTimeout(function() {
            // snapshot every time (for science)
            saveListings();
            if(!onLastPage()) {
                openNextPage();
            } else {
                downloadCache();
                saveCookie(programName, 0);
                openFirstPage();
            }
        }, searchDelay);
    }
    // effectively init
    else if (searchState === 0) {
        saveCookie(programName, 0);
    }
}

function openNextPage() {
    let nextButton = document.getElementsByClassName('fa fa-angle-right')[0];
    nextButton.click();
}

function openFirstPage() {
    let firstPageButton = document.getElementsByClassName('fa fa-angle-double-left')[0];
    firstPageButton.click();
}

function onLastPage() {
    return document.getElementsByClassName('fa fa-angle-right')[0].parentElement.parentElement.className == "disabled";
}

// Handles keyboard inputs
window.onkeydown = function(e) {
    if (e.ctrlKey) {
        if (e.keyCode == 40) { // Ctrl + down arrow
            searchState = 0;
            saveCookie(programName, 0);
            run();
        }

        if (e.keyCode == 37) { // Ctrl + left arrow
            searchState = -1;
            saveCookie(programName, -1);
            run();
        }
    }
};

run();
