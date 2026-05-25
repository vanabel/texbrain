#!/usr/bin/env node
/**
 * Smoke-test CTAN fetch for physics.sty (Node has no CORS).
 * Usage: node scripts/test-ctan-fetch.mjs
 */
import { unzipSync } from 'fflate';

const CTAN_JSON = 'https://www.ctan.org/json/2.0/pkg/physics';
const ZIP_URL = 'https://mirrors.ustc.edu.cn/CTAN/macros/latex/contrib/physics.zip';

const metaRes = await fetch(CTAN_JSON);
if (!metaRes.ok) throw new Error(`pkg meta HTTP ${metaRes.status}`);
const meta = await metaRes.json();
console.log('pkg', meta.id, meta.ctan);

const zipRes = await fetch(ZIP_URL);
if (!zipRes.ok) throw new Error(`zip HTTP ${zipRes.status}`);
const buf = await zipRes.arrayBuffer();
const unzipped = unzipSync(new Uint8Array(buf));
const sty = Object.keys(unzipped).filter((p) => p.endsWith('physics.sty'));
console.log('physics.sty entries:', sty);
console.log('ok');
