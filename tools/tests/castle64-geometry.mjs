import assert from 'node:assert/strict';
import {Castle64Stage,CASTLE64_PLATFORMS,buildCastle64Mesh,projectCastle64Vertex} from '../../src/stage/castle64Stage.js';

const mesh=buildCastle64Mesh(),faces=[...mesh.back,...mesh.arena];
assert.ok(faces.length>1000,'Castle should have a modeled courtyard and scenery');
for(const face of faces)for(const v of face.points){assert.equal(v.length,3);assert.ok(v.every(Number.isFinite));const p=projectCastle64Vertex(v);assert.ok(Number.isFinite(p.x+p.y));}
assert.ok(projectCastle64Vertex([100,0,900]).x<projectCastle64Vertex([100,0,0]).x,'Depth must use real perspective');
for(const p of CASTLE64_PLATFORMS)for(const x of [p.x1,p.x2])assert.deepEqual(projectCastle64Vertex([x,-p.y,0]),{x,y:p.y});
assert.equal(CASTLE64_PLATFORMS.length,3);assert.equal(CASTLE64_PLATFORMS[0].solid,true);
const stage=new Castle64Stage({});stage.hazardsOn=true;const before=JSON.stringify(stage.platforms);
for(let i=0;i<600;i++)assert.deepEqual(stage.step(),[]);
assert.equal(JSON.stringify(stage.platforms),before);assert.equal(stage.spawns.length,4);assert.equal(stage.music,'bgm_dreamland');
console.log('PASS perspective depth, finite mesh, exact collision lips, fixed platforms and hazard-free stage');
