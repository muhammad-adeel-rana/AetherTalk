// Utility for Asymmetric Cryptography (Digital Signatures) using Web Crypto API

// Algorithm: RSA-PSS with SHA-256 (Standard for signatures)
const ALGO = {
    name: "RSA-PSS",
    hash: "SHA-256",
};

// Key Generation
export const generateKeyPair = async () => {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            ...ALGO,
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]), // 65537
        },
        true, // extractable
        ["sign", "verify"]
    );
    return keyPair;
};

// Export Key to JSON (JWK) for storage
export const exportKey = async (key) => {
    return await window.crypto.subtle.exportKey("jwk", key);
};

// Import Key from JSON (JWK)
export const importKey = async (jwkData, type) => {
    return await window.crypto.subtle.importKey(
        "jwk",
        jwkData,
        ALGO,
        true,
        [type] // "sign" for private, "verify" for public
    );
};

// Sign Data (String)
// Returns Base64 signature
export const signMessage = async (privateKey, text) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const signatureBuffer = await window.crypto.subtle.sign(
        {
            name: "RSA-PSS",
            saltLength: 32,
        },
        privateKey,
        data
    );

    // Convert buffer to Base64 string for transmission
    return bufferToBase64(signatureBuffer);
};

// Verify Signature
// Returns boolean
export const verifyMessage = async (publicKey, text, signatureBase64) => {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const signatureBuffer = base64ToBuffer(signatureBase64);

        const isValid = await window.crypto.subtle.verify(
            {
                name: "RSA-PSS",
                saltLength: 32,
            },
            publicKey,
            signatureBuffer,
            data
        );
        return isValid;
    } catch (e) {
        console.error("Verification error:", e);
        return false;
    }
};

// --- Helpers for Base64 conversion ---

function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
