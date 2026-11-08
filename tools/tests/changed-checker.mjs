import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const fixture=mkdtempSync(path.join(tmpdir(),'rebirth-large-diff-')),previous=process.cwd(),base=process.env.CHECK_BASE;
const run=(...args)=>execFileSync('git',args,{cwd:fixture,stdio:'ignore'});
try{
 run('init','-q');mkdirSync(path.join(fixture,'src'));
 const rows=8000,payload='x'.repeat(150),file=path.join(fixture,'src/generated.js');
 writeFileSync(file,Array.from({length:rows},(_,i)=>`const row_${i}="before_${payload}";`).join('\n')+'\n');
 run('add','.');run('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','baseline');
 writeFileSync(file,Array.from({length:rows},(_,i)=>`const row_${i}="after_${payload}";`).join('\n')+'\n');
 const size=execFileSync('git',['diff','--no-color','-U0','HEAD'],{cwd:fixture,maxBuffer:8*1024*1024}).length;
 assert.ok(size>1024*1024,'fixture must reproduce the default child-process buffer overflow');
 process.chdir(fixture);process.env.CHECK_BASE='HEAD';
 const {changedLines}=await import('../check/changed.mjs'),changes=changedLines();
 assert.equal(changes.size,1);assert.equal(changes.get('src/generated.js').size,rows);assert.ok(changes.get('src/generated.js').has(rows));
 console.log('PASS large generated diff:',size,'bytes,',rows,'changed lines');
}finally{
 process.chdir(previous);if(base===undefined)delete process.env.CHECK_BASE;else process.env.CHECK_BASE=base;
 rmSync(fixture,{recursive:true,force:true});
}
