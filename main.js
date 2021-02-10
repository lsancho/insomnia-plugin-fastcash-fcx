const jsSHA = require('jssha');
const { buildQueryStringFromParams, joinUrlAndQueryString } = require('insomnia-url');

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

const getKnownHostsFromEnvironment = env => {
    const variable = 'use-fastcash-fcx-on';
    const useFcxOn = env[variable];
    if (!useFcxOn) return [];

    const root = env[useFcxOn];
    const hosts = new Set();
    const getEntries = r => Object.keys(r)
        .filter(k => typeof r[k] === 'object' && r[k] !== null)
        .map(k => r[k]);

    for (entry of getEntries(root)) {
        const host = entry['host'];
        if (host) hosts.add(host);
    }

    const host = root['host'];
    if (host) hosts.add(host);

    return Array.from(hosts);
}

const getUrl = request => {
    const qs = buildQueryStringFromParams(request.getParameters());
    const url = joinUrlAndQueryString(request.getUrl(), qs);

    return url;
}

const canAddFcxAuthHeader = (request, currentUrl) => {
    const knownHosts = getKnownHostsFromEnvironment(request.getEnvironment());
    let canHandle = knownHosts.some(host => currentUrl.includes(host));

    const auth = request.getAuthentication();
    // caso ja tenha apikey definida, usa. exemplo: endpoints de PCI
    if (auth && !isEmpty(auth)) {
        canHandle = /bearer/.test(auth.type) && /apikey/.test(auth.prefix)
    }

    return canHandle;
}

const addFcxAuthHeader = async context => {
    const request = context.request;
    const url = getUrl(request);

    if (canAddFcxAuthHeader(request, url)) {
        const variable = 'fastcash';
        const user = request.getEnvironmentVariable(variable);
        if (!user) throw new Error(`Variable '${variable}' with 'credentials' are required`);

        const apiKey = user.credentials.apiKey;
        const apiSecret = user.credentials.apiSecret;
        const method = request.getMethod();
        const data = request.getBody();

        const fcx = getFCX(apiKey, apiSecret, method, url, data);

        request.setHeader('Authorization', `FCX ${fcx}`);
        console.log('FCX added to request', url);
    }
}

module.exports.requestHooks = [addFcxAuthHeader]

