import test from 'node:test';
import assert from 'node:assert/strict';
import {safeURL,plainSummary,searchFilms,csvCell,tvItem} from '../web/model.mjs';
test('source links reject credentials, lookalike domains and active URLs',()=>{for(const url of ['javascript:alert(1)','https://www.tvmaze.com.evil.test/','https://user@www.tvmaze.com/'])assert.equal(safeURL(url,'www.tvmaze.com'),'');assert.equal(tvItem(null),null);});
test('film search folds accents and combines query, decade and genre',()=>{const films=[{title:'Québec story',detail:'Director',genre:'Drama',year:2021},{title:'Quebec story',detail:'Director',genre:'Comedy',year:1999}];assert.equal(searchFilms(films,{query:'quebec',era:'2020s',genre:'Drama'}).length,1);});
test('summaries become text and exports neutralize spreadsheet formulas',()=>{assert.equal(plainSummary('<p>A &amp; B</p><br>Next'),'A & B Next');assert.equal(csvCell('=1+1'),'"\'=1+1"');});
