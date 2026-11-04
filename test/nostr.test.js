// The race's Nostr signatures (src/game/platform/nostr.js) match the BIP-340 test vectors, so relays accept them.
// Run with `npm test`. The game file is a plain script, so it's evaluated in a sandbox with Node's Web Crypto.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob, BigInt, Uint8Array, JSON, Math, Date };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'game', 'platform', 'nostr.js'), 'utf8')
  + ';this.api={nostrKey,schnorrSign,nUnhex,nInt};', ctx);
const { nostrKey, schnorrSign, nUnhex, nInt } = ctx.api;

// from https://github.com/bitcoin/bips/blob/master/bip-0340/test-vectors.csv
const VECTORS = [
  ['0000000000000000000000000000000000000000000000000000000000000003', 'F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9',
    '0000000000000000000000000000000000000000000000000000000000000000', '0000000000000000000000000000000000000000000000000000000000000000',
    'E907831F80848D1069A5371B402410364BDF1C5F8307B0084C55F1CE2DCA821525F66A4A85EA8B71E482A74F382D2CE5EBEEE8FDB2172F477DF4900D310536C0'],
  ['B7E151628AED2A6ABF7158809CF4F3C762E7160F38B4DA56A784D9045190CFEF', 'DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B502BA659',
    '0000000000000000000000000000000000000000000000000000000000000001', '243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC4E6C89',
    '6896BD60EEAE296DB48A229FF71DFE071BDE413E6D43F917DC8DCF8C78DE33418906D11AC976ABCCB20B091292BFF4EA897EFCB639EA871CFA95F6DE339E4B0A'],
];
test('Schnorr signatures match the BIP-340 vectors', async () => {
  for (const [sk, pk, aux, msg, sig] of VECTORS) {
    const key = nostrKey(nInt(nUnhex(sk.toLowerCase())));
    assert.equal(key.pk, pk.toLowerCase(), 'public key');
    assert.equal(await schnorrSign(nUnhex(msg.toLowerCase()), key, nUnhex(aux.toLowerCase())), sig.toLowerCase(), 'signature');
  }
});
test('fresh keys are 32-byte x-only public keys', () => {
  for (let i = 0; i < 5; i++) assert.match(nostrKey().pk, /^[0-9a-f]{64}$/);
});
