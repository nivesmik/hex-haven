import {test} from 'node:test';import assert from 'node:assert/strict';
import {ThumbRotation} from '../src/thumb-controls.js';
test('thumb rotation is immediate at distance threshold, not at a hold deadline',()=>{const r=new ThumbRotation();r.begin(100);assert.deepEqual(r.move(131),[]);assert.deepEqual(r.move(132),[1]);assert.deepEqual(r.move(132),[]);});
test('large drag resolves every 60 degree step without queued future turns',()=>{const r=new ThumbRotation();r.begin(100);assert.deepEqual(r.move(200),[1,1,1]);assert.deepEqual(r.move(200),[]);});
test('reverse movement requires hysteresis and preserves the last committed direction',()=>{const r=new ThumbRotation();r.begin(100);r.move(132);assert.deepEqual(r.move(95),[]);assert.deepEqual(r.move(92),[-1]);assert.deepEqual(r.move(92),[]);});
test('new gesture origin resets movement; vertical-only movement yields no turn',()=>{const r=new ThumbRotation();r.begin(100);r.move(132);r.begin(300);assert.deepEqual(r.move(300),[]);assert.deepEqual(r.move(268),[-1]);});
