/**
 * Converts PublicKeyCredential into serialised JSON
 * @param  {Object} pubKeyCred
 * @return {Object}            - JSON encoded publicKeyCredential
 */
var publicKeyCredentialToJSON = (pubKeyCred) => {
    if(pubKeyCred instanceof Array) {
        let arr = [];
        for(let i of pubKeyCred)
            arr.push(publicKeyCredentialToJSON(i));

        return arr
    }

    if(pubKeyCred instanceof ArrayBuffer) {
        return base64url.encode(pubKeyCred)
    }

    if(pubKeyCred instanceof Object) {
        let obj = {};

        for (let key in pubKeyCred) {
            obj[key] = publicKeyCredentialToJSON(pubKeyCred[key])
        }

        return obj
    }

    return pubKeyCred
}

/**
 * Generate secure random buffer
 * @param  {Number} len - Length of the buffer (default 32 bytes)
 * @return {Uint8Array} - random string
 */
var generateRandomBuffer = (len) => {
    len = len || 32;

    let randomBuffer = new Uint8Array(len);
    window.crypto.getRandomValues(randomBuffer);

    return randomBuffer
}

/**
 * Decodes arrayBuffer required fields.
 */
var preformatMakeCredReq = (makeCredReq) => {
    makeCredReq.challenge = base64url.decode(makeCredReq.challenge);
    makeCredReq.user.id = base64url.decode(makeCredReq.user.id);

    return makeCredReq
}

/**
 * Decodes arrayBuffer required fields.
 */
var preformatGetAssertReq = (getAssert) => {
    getAssert.challenge = base64url.decode(getAssert.challenge);
    
    for(let allowCred of getAssert.allowCredentials) {
        allowCred.id = base64url.decode(allowCred.id);
    }

    return getAssert
}