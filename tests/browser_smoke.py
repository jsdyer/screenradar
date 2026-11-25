"""Check the built app at its actual Pages subpath using deterministic data."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, re, shutil, tempfile, threading
from datetime import datetime, timedelta, timezone
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
SLUG='screenradar'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def main():
    with tempfile.TemporaryDirectory() as temporary:
        shutil.copytree(ROOT/'dist',Path(temporary)/SLUG)
        assets=Path(temporary)/'assets';assets.mkdir();(assets/'tool-metrics.js').write_text('')
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=temporary))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch()
                page=browser.new_page(viewport={'width':1280,'height':900})
                errors=[];failed=[]
                page.on('pageerror',lambda error:errors.append(str(error)))
                page.on('console',lambda message:errors.append(message.text) if message.type=='error' else None)
                page.on('response',lambda response:failed.append(response.url) if response.status>=400 and response.url.startswith('http://127.0.0.1:') else None)
                actors={'results':{'bindings':[{'person':{'value':'http://www.wikidata.org/entity/Q123'},'personLabel':{'value':'Test actor'},'birthplace':{'value':'http://www.wikidata.org/entity/Q2141'},'birthplaceLabel':{'value':'Halifax'},'distance':{'value':'0.3'}}]}}
                credits={'data':{'person':{'id':123,'name':'Test actor'},'credits':[{'id':9876,'media_type':'movie','title':'Test credit','release_date':'2020-01-01','character':'Example role'}]}}
                page.route('https://query.wikidata.org/sparql?**',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(actors)))
                page.route('https://coolcode-visitor-api.jeffdyer.workers.dev/api/screenradar/person?**',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(credits)))
                response=page.goto(f'http://127.0.0.1:{server.server_port}/{SLUG}/')
                assert response.ok
                expect(page.locator('h1')).to_be_visible()
                page.locator('[data-view="film"]').click()
                expect(page.locator('#results article').first).to_be_visible()
                page.locator('#film-query').fill('No matching fixture')
                expect(page.locator('#results article')).to_have_count(0)
                page.locator('#film-query').fill('')
                expect(page.locator('#results article').first).to_be_visible()
                page.locator('[data-view="actors"]').click()
                page.get_by_role('button',name='Find actors',exact=True).click()
                expect(page.locator('#actor-results')).to_contain_text('Test actor')
                expect(page.locator('#actor-results')).to_contain_text('Born in Halifax')
                page.get_by_role('button',name='Show notable credits').click()
                expect(page.locator('#actor-results')).to_contain_text('Test credit')
                page.get_by_role('button',name='Save Test credit to watchlist').click()
                page.reload();page.locator('[data-view="saved"]').click()
                expect(page.locator('#results')).to_contain_text('Test credit')
                expect(page.locator('#results a')).to_have_attribute('href','https://www.themoviedb.org/movie/9876')
                page.locator('[data-view="actors"]').click()
                for width,height in [(1280,900),(390,844),(320,700)]:
                    page.set_viewport_size({'width':width,'height':height})
                    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'horizontal overflow at {width}px'
                assert not errors,errors
                assert not failed,failed
                browser.close()
            print(SLUG+': subpath, interaction, JavaScript errors and mobile overflow checks passed')
        finally:server.shutdown();server.server_close()
if __name__=='__main__':main()
