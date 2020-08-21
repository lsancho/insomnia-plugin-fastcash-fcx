const jsSHA = require('jssha');
const { buildQueryStringFromParams, joinUrlAndQueryString, smartEncodeUrl } = require('insomnia-url');

const isEmpty = obj => Object.keys(obj).length === 0 && obj.constructor === Object

const generateRandomString = ({ length }) => {
    const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    array = array.map(x => validChars.charCodeAt(x % validChars.length));
    const randomState = String.fromCharCode.apply(null, array);
    return randomState;
}

const getHash256 = data => {
    let hash;

    if (data && !isEmpty(data)) {
        if (typeof (data) !== "string") data = JSON.stringify(data);

        const shaObj = new jsSHA("SHA-256", "TEXT");
        shaObj.update(data);

        hash = shaObj.getHash("HEX");
    } else {
        hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
    return hash;
}

const getDigest = (apiKey, nonce, timestamp, method, url, dataHash) => {
    const phase1 = (apiKey + nonce + timestamp + method + encodeURIComponent(url) + dataHash);
    const phase2 = phase1.toLowerCase();
    return phase2;
}

const getSignature = (apiSecret, digest) => {
    const hmacObj = new jsSHA("SHA-512", "TEXT");
    hmacObj.setHMACKey(apiSecret, "B64");
    hmacObj.update(digest);
    const signature = hmacObj.getHMAC("HEX");
    return signature;
}

const getFCX = (apiKey, apiSecret, method, url, data) => {
    const timestamp = new Date().getTime().toString();
    const nonce = generateRandomString({ length: 16 });
    const dataHash = getHash256(data.text);
    const digest = getDigest(apiKey, nonce, timestamp, method, url, dataHash);
    const signature = getSignature(apiSecret, digest);
    const fcx = (apiKey + ":" + nonce + ":" + timestamp + ":" + signature).toLowerCase();

    // console.log('apiKey', apiKey);
    // console.log('apiSecret', apiSecret);
    // console.log('method', method);
    // console.log('url', url);
    // console.log('data', data.text);

    // console.log('dataHash', dataHash);
    // console.log('digest', digest);
    // console.log('signature', signature);

    // console.log('fcx', fcx);

    return fcx;
}

const getKnownUrlsFromEnvironment = env => {
    const urls = new Set();
    const api = env.api;
    const getEntries = root => Object.keys(root)
        .filter(k => typeof root[k] === 'object' && root[k] !== null)
        .map(k => root[k]);

    for (entry of getEntries(api)) {
        const baseUrl = entry['baseUrl'];
        if (baseUrl) urls.add(baseUrl);
    }

    return Array.from(urls);
}

const getUrl = request => {
    const qs = buildQueryStringFromParams(request.getParameters());
    const url = joinUrlAndQueryString(request.getUrl(), qs);

    return url;
}

const canAddFcxAuthHeader = (request, currentUrl) => {
    const knownUrls = getKnownUrlsFromEnvironment(request.getEnvironment());
    const canHandle = knownUrls.some(url => currentUrl.includes(url));
    return canHandle;
}

const addFcxAuthHeader = async context => {
    const request = context.request;
    const publisher = request.getEnvironmentVariable('publisher');
    if (!publisher) throw new Error('Publisher data are required');

    const url = getUrl(request);

    if (canAddFcxAuthHeader(request, url)) {
        const apiKey = publisher.credentials.apiKey;
        const apiSecret = publisher.credentials.apiSecret;
        const method = request.getMethod();
        const data = request.getBody();

        const fcx = getFCX(apiKey, apiSecret, method, url, data);

        request.setHeader('Authorization', `FCX ${fcx}`);
    }
}

module.exports.requestHooks = [addFcxAuthHeader]

