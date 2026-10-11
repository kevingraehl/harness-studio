const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const code=fs.readFileSync(__dirname+'/i18n.js','utf8');
const dom=new JSDOM(html,{url:'https://example.test',runScripts:'outside-only'});
const {window:w}=dom, d=w.document;
const next=()=>new Promise(r=>setTimeout(r,0));
const fixture=d.createElement('div');
fixture.innerHTML='<div data-no-i18n>Project</div><p class="endpoint-text">Battery · pin 1</p><label>Gender<select id="test-gender"><option>female</option><option>male</option></select></label><input value="Ground"><textarea>Notes</textarea><svg><text>Battery</text></svg>';
d.body.append(fixture);
const originalValues=[...d.querySelectorAll('input,textarea,select:not(#ui-language)')].map(e=>e.value);
w.eval(code);
async function language(lang){const p=d.querySelector('#ui-language');p.value=lang;p.dispatchEvent(new w.Event('change'));await next();}
(async()=>{
  for(const [lang,save] of [['ru','Сохранить'],['zh-CN','保存'],['es','Guardar'],['en','Save']]){
    await language(lang);
    assert.equal(d.documentElement.lang,lang);
    assert.equal(d.querySelector('#save-project').textContent,save);
    assert.equal(w.localStorage.getItem('harness-studio-ui-language'),lang);
    assert.deepEqual([...d.querySelectorAll('input,textarea,select:not(#ui-language)')].map(e=>e.value),originalValues);
    assert.equal(fixture.querySelector('[data-no-i18n]').textContent,'Project');
    assert.equal(fixture.querySelector('svg text').textContent,'Battery');
    assert.equal(fixture.querySelector('.endpoint-text').textContent,'Battery · pin 1');
  }
  await language('es');
  const b=d.createElement('button');b.textContent='Save';fixture.append(b);await next();assert.equal(b.textContent,'Guardar');
  b.textContent='Show grid';await next();assert.equal(b.textContent,'Mostrar cuadrícula');
  await language('en');assert.equal(b.textContent,'Show grid');
  const saved=w.localStorage.getItem('harness-studio-ui-language');assert.equal(saved,'en');
  assert.ok(w.HarnessI18n.t('Start a new project? Export first if you need a backup.'));
  console.log('PASS: four locales, dynamic controls, English restoration, storage, original option values, SVG and user text preservation');
  w.close();
})().catch(error=>{console.error(error);w.close();process.exitCode=1;});
