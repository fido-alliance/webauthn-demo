const crypto    = require('crypto');
const base64url = require('base64url');
const cbor      = require('cbor');

/**
 * U2F Presence constant
 */
let U2F_USER_PRESENTED = 0x01;

/**
 * Takes signature, data and PEM public key and tries to verify signature
 * @param  {Buffer} signature
 * @param  {Buffer} data
 * @param  {String} publicKey - PEM encoded public key
 * @return {Boolean}
 */
let verifySignature = (signature, data, publicKey) => {
    return crypto.createVerify('SHA256')
        .update(data)
        .verify(publicKey, signature);
}


/**
 * Returns base64url encoded buffer of the given length
 * @param  {Number} len - length of the buffer
 * @return {String}     - base64url random buffer
 */
let randomBase64URLBuffer = (len) => {
    len = len || 32;

    let buff = crypto.randomBytes(len);

    return base64url(buff);
}

/**
 * Generates makeCredentials request
 * @param  {String} username       - username
 * @param  {String} displayName    - user's personal display name
 * @param  {String} id             - user's base64url encoded id
 * @return {MakePublicKeyCredentialOptions} - server encoded make credentials request
 */
let generateServerMakeCredRequest = (username, displayName, id) => {
    return {
        challenge: randomBase64URLBuffer(32),

        rp: {
            name: "ACME Corporation"
        },

        user: {
            id: id,
            name: username,
            displayName: displayName
        },

        attestation: 'direct',

        pubKeyCredParams: [
            {
                type: "public-key", alg: -7 // "ES256" IANA COSE Algorithms registry
            }
        ]
    }
}

/**
 * Generates getAssertion request
 * @param  {Array} authenticators              - list of registered authenticators
 * @return {PublicKeyCredentialRequestOptions} - server encoded get assertion request
 */
let generateServerGetAssertion = (authenticators) => {
    let allowCredentials = [];
    for(let authr of authenticators) {
        allowCredentials.push({
              type: 'public-key',
              id: authr.credID,
              transports: ['usb', 'nfc', 'ble']
        })
    }
    return {
        challenge: randomBase64URLBuffer(32),
        allowCredentials: allowCredentials
    }
}


/**
 * Returns SHA-256 digest of the given data.
 * @param  {Buffer} data - data to hash
 * @return {Buffer}      - the hash
 */
let hash = (data) => {
    return crypto.createHash('SHA256').update(data).digest();
}

/**
 * Takes COSE encoded public key and converts it to RAW PKCS ECDHA key
 * @param  {Buffer} COSEPublicKey - COSE encoded public key
 * @return {Buffer}               - RAW PKCS encoded public key
 */
let COSEECDHAtoPKCS = (COSEPublicKey) => {
    /* 
       +------+-------+-------+---------+----------------------------------+
       | name | key   | label | type    | description                      |
       |      | type  |       |         |                                  |
       +------+-------+-------+---------+----------------------------------+
       | crv  | 2     | -1    | int /   | EC Curve identifier - Taken from |
       |      |       |       | tstr    | the COSE Curves registry         |
       |      |       |       |         |                                  |
       | x    | 2     | -2    | bstr    | X Coordinate                     |
       |      |       |       |         |                                  |
       | y    | 2     | -3    | bstr /  | Y Coordinate                     |
       |      |       |       | bool    |                                  |
       |      |       |       |         |                                  |
       | d    | 2     | -4    | bstr    | Private key                      |
       +------+-------+-------+---------+----------------------------------+
    */

    let coseStruct = cbor.decodeAllSync(COSEPublicKey)[0];
    let tag = Buffer.from([0x04]);
    let x   = coseStruct.get(-2);
    let y   = coseStruct.get(-3);

    return Buffer.concat([tag, x, y])
}

/**
 * Convert binary certificate or public key to an OpenSSL-compatible PEM text format.
 * @param  {Buffer} buffer - Cert or PubKey buffer
 * @return {String}             - PEM
 */
let ASN1toPEM = (pkBuffer) => {
    if (!Buffer.isBuffer(pkBuffer))
        throw new Error("ASN1toPEM: pkBuffer must be Buffer.")

    let type;
    if (pkBuffer.length == 65 && pkBuffer[0] == 0x04) {
        /*
            If needed, we encode rawpublic key to ASN structure, adding metadata:
            SEQUENCE {
              SEQUENCE {
                 OBJECTIDENTIFIER 1.2.840.10045.2.1 (ecPublicKey)
                 OBJECTIDENTIFIER 1.2.840.10045.3.1.7 (P-256)
              }
              BITSTRING <raw public key>
            }
            Luckily, to do that, we just need to prefix it with constant 26 bytes (metadata is constant).
        */
        
        pkBuffer = Buffer.concat([
            new Buffer.from("3059301306072a8648ce3d020106082a8648ce3d030107034200", "hex"),
            pkBuffer
        ]);

        type = 'PUBLIC KEY';
    } else {
        type = 'CERTIFICATE';
    }

    let b64cert = pkBuffer.toString('base64');

    let PEMKey = '';
    for(let i = 0; i < Math.ceil(b64cert.length / 64); i++) {
        let start = 64 * i;

        PEMKey += b64cert.substr(start, 64) + '\n';
    }

    PEMKey = `-----BEGIN ${type}-----\n` + PEMKey + `-----END ${type}-----\n`;
    
    return PEMKey
}

/**
 * Parses authenticatorData buffer.
 * @param  {Buffer} buffer - authenticatorData buffer
 * @return {Object}        - parsed authenticatorData struct
 */
let parseMakeCredAuthData = (buffer) => {
    let rpIdHash      = buffer.slice(0, 32);          buffer = buffer.slice(32);
    let flagsBuf      = buffer.slice(0, 1);           buffer = buffer.slice(1);
    let flags         = flagsBuf[0];
    let counterBuf    = buffer.slice(0, 4);           buffer = buffer.slice(4);
    let counter       = counterBuf.readUInt32BE(0);
    let aaguid        = buffer.slice(0, 16);          buffer = buffer.slice(16);
    let credIDLenBuf  = buffer.slice(0, 2);           buffer = buffer.slice(2);
    let credIDLen     = credIDLenBuf.readUInt16BE(0);
    let credID        = buffer.slice(0, credIDLen);   buffer = buffer.slice(credIDLen);
    let COSEPublicKey = buffer;

    return {rpIdHash, flagsBuf, flags, counter, counterBuf, aaguid, credID, COSEPublicKey}
}

let verifyAuthenticatorAttestationResponse = (webAuthnResponse) => {
    let attestationBuffer = base64url.toBuffer(webAuthnResponse.response.attestationObject);
    let ctapMakeCredResp  = cbor.decodeAllSync(attestationBuffer)[0];

    let response = {'verified': false};
    if(ctapMakeCredResp.fmt === 'fido-u2f') {
        let authrDataStruct = parseMakeCredAuthData(ctapMakeCredResp.authData);

        if(!(authrDataStruct.flags & U2F_USER_PRESENTED))
            throw new Error('User was NOT presented durring authentication!');

        let clientDataHash  = hash(base64url.toBuffer(webAuthnResponse.response.clientDataJSON))
        let reservedByte    = Buffer.from([0x00]);
        let publicKey       = COSEECDHAtoPKCS(authrDataStruct.COSEPublicKey)
        let signatureBase   = Buffer.concat([reservedByte, authrDataStruct.rpIdHash, clientDataHash, authrDataStruct.credID, publicKey]);

        let PEMCertificate = ASN1toPEM(ctapMakeCredResp.attStmt.x5c[0]);
        let signature      = ctapMakeCredResp.attStmt.sig;

        response.verified = verifySignature(signature, signatureBase, PEMCertificate)

        if(response.verified) {
            response.authrInfo = {
                fmt: 'fido-u2f',
                publicKey: base64url.encode(publicKey),
                counter: authrDataStruct.counter,
                credID: base64url.encode(authrDataStruct.credID)
            }
        }
    }

    return response
}


/**
 * Takes an array of registered authenticators and find one specified by credID
 * @param  {String} credID        - base64url encoded credential
 * @param  {Array} authenticators - list of authenticators
 * @return {Object}               - found authenticator
 */
let findAuthr = (credID, authenticators) => {
    for(let authr of authenticators) {
        if(authr.credID === credID)
            return authr
    }

    throw new Error(`Unknown authenticator with credID ${credID}!`)
}

/**
 * Parses AuthenticatorData from GetAssertion response
 * @param  {Buffer} buffer - Auth data buffer
 * @return {Object}        - parsed authenticatorData struct
 */
let parseGetAssertAuthData = (buffer) => {
    let rpIdHash      = buffer.slice(0, 32);          buffer = buffer.slice(32);
    let flagsBuf      = buffer.slice(0, 1);           buffer = buffer.slice(1);
    let flags         = flagsBuf[0];
    let counterBuf    = buffer.slice(0, 4);           buffer = buffer.slice(4);
    let counter       = counterBuf.readUInt32BE(0);

    return {rpIdHash, flagsBuf, flags, counter, counterBuf}
}

let verifyAuthenticatorAssertionResponse = (webAuthnResponse, authenticators) => {
    let authr = findAuthr(webAuthnResponse.id, authenticators);
    let authenticatorData = base64url.toBuffer(webAuthnResponse.response.authenticatorData);

    let response = {'verified': false};
    if(authr.fmt === 'fido-u2f') {
        let authrDataStruct  = parseGetAssertAuthData(authenticatorData);

        if(!(authrDataStruct.flags & U2F_USER_PRESENTED))
            throw new Error('User was NOT presented durring authentication!');

        let clientDataHash   = hash(base64url.toBuffer(webAuthnResponse.response.clientDataJSON))
        let signatureBase    = Buffer.concat([authrDataStruct.rpIdHash, authrDataStruct.flagsBuf, authrDataStruct.counterBuf, clientDataHash]);

        let publicKey = ASN1toPEM(base64url.toBuffer(authr.publicKey));
        let signature = base64url.toBuffer(webAuthnResponse.response.signature);

        response.verified = verifySignature(signature, signatureBase, publicKey)

        if(response.verified) {
            if(response.counter <= authr.counter)
                throw new Error('Authr counter did not increase!');

            authr.counter = authrDataStruct.counter
        }
    }

    return response
}

module.exports = {
    randomBase64URLBuffer,
    generateServerMakeCredRequest,
    generateServerGetAssertion,
    verifyAuthenticatorAttestationResponse,
    verifyAuthenticatorAssertionResponse
}