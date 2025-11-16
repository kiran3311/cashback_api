const CryptoJS = require("crypto-js");

const SECRET_KEY = "YOUR_SECRET_KEY_32_CHARACTERS"; 
// Make sure this key is 32 characters for AES-256

// Encrypt
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

// Decrypt
function decrypt(cipherText) {
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

module.exports = { encrypt, decrypt };
