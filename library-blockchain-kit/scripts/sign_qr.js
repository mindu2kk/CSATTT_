// Sign QR payloads with ECDSA for anti-forgery
// Usage: npm run sign:qr
const { ethers } = require("ethers");
const QRCode = require("qrcode");
require("dotenv").config();

const priv = process.env.QR_SIGNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!priv) { throw new Error("Set QR_SIGNER_PRIVATE_KEY in .env"); }
const wallet = new ethers.Wallet(priv);

async function signPayload(payload) {
  const hash = ethers.utils.solidityKeccak256(
    ["string","string","uint256","string"],
    [payload.bookId, payload.uid, payload.ts, payload.nonce]
  );
  const sig = await wallet.signMessage(ethers.utils.arrayify(hash));
  return { ...payload, sig };
}

(async () => {
  const now = Math.floor(Date.now()/1000);
  const payload = {
    bookId: "BK-2025-000123",
    uid: "SHELF-A-001",
    ts: now,
    nonce: Math.random().toString(36).slice(2,8)
  };
  const signed = await signPayload(payload);
  const b64 = Buffer.from(JSON.stringify(signed)).toString("base64");
  console.log("Base64 payload for QR:", b64);
  await QRCode.toFile("qr.png", b64, { margin: 1, width: 400 });
  console.log("Saved qr.png");
})();
