import {test} from 'node:test';import assert from 'node:assert/strict';
import {calculate,quantile} from '../client/src/lib/stats';
test('quantile interpolation',()=>{assert.equal(quantile([1,2,3,4],.5),2.5);assert.equal(quantile([],0.5),null);});
test('100 percent includes every priceable parcel',()=>{const rows=[['NE',50,5000,5500,500,'a'],['SW',100,20000,20000,0,'b'],['NE',200,60000,60000,0,'c']] as any;const x=calculate(rows,'county_all','all',100);assert.equal(x.included,3);assert.equal(x.weighted,85000/350);assert.equal(x.median,200);});
test('trimmed middle 50 excludes low and high extremes',()=>{const rows=[100,200,300,400,500].map((p,i)=>['NE',50,p*50,p*50,0,String(i)]) as any;const x=calculate(rows,'NE','all',50);assert.equal(x.included,3);assert.equal(x.low,200);assert.equal(x.high,400);assert.equal(x.median,300);});
test('unlocated properties only count in whole-county group',()=>{const rows=[['',100,10000,10000,0,'a'],['NE',100,30000,30000,0,'b']] as any;assert.equal(calculate(rows,'county_all','all',100).included,2);assert.equal(calculate(rows,'NE','all',100).included,1);});
