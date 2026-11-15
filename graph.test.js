import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {openGraph} from './graph.js';
test('withdrawal propagates through citations but leaves unrelated article alone',()=>{
 const g=openGraph(':memory:'); assert.equal(g.snapshot().impacts.length,0);
 const state=g.updateSource('s1','withdrawn','Sampling issue');
 assert.deepEqual([...new Set(state.impacts.map(i=>i.article))].sort(),['a1','a2']);
 assert.ok(state.impacts.some(i=>i.claim==='c3'&&i.source==='s1'&&i.via==='s3'));
 assert.throws(()=>g.review('c3','s3'),/Resolve/);
 assert.equal(state.history.length,1);
});
test('restoring availability keeps direct and indirect evidence stale until reviewed',()=>{
 const g=openGraph(':memory:');g.updateSource('s1','changed','New survey');g.updateSource('s1','current','Correction available');
 assert.ok(g.snapshot().impacts.some(i=>i.claim==='c3'));
 g.review('c3','s3'); assert.ok(!g.snapshot().impacts.some(i=>i.claim==='c3'));
 g.review('c1','s1');g.review('c5','s1');assert.equal(g.snapshot().impacts.length,0);
 assert.equal(g.snapshot().history.length,5);
});
test('graph state survives a process restart; seeding is idempotent',()=>{
 const path=join(mkdtempSync(join(tmpdir(),'sourcetrail-test-')),'graph');
 function run(code){const r=spawnSync(process.execPath,['--input-type=module','-e',`import {openGraph} from './graph.js'; const g=openGraph(${JSON.stringify(path)}); ${code}`],{cwd:import.meta.dirname,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
 run("g.updateSource('s1','withdrawn','Persistence check'); console.log(JSON.stringify(g.snapshot()));");
 const state=run('console.log(JSON.stringify(g.snapshot()));');
 assert.equal(state.sources.length,4);assert.equal(state.history.length,1);assert.equal(state.sources[0].status,'withdrawn');assert.ok(state.impacts.length>0);
});
test('invalid updates cannot mutate state',()=>{const g=openGraph(':memory:');assert.throws(()=>g.updateSource('s1','fake','bad'));assert.throws(()=>g.updateSource('missing','current','bad'));assert.throws(()=>g.review('missing','s1'));assert.equal(g.snapshot().history.length,0);});
