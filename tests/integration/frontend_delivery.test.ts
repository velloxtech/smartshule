import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {createExpressApp} from '../../src/infrastructure/http/app';
import {AppContainer} from '../../src/infrastructure/container';

describe('frontend delivery across deployments',()=>{
 let app:any,dir:string,previous:string|undefined;
 beforeAll(()=>{
  dir=fs.mkdtempSync(path.join(os.tmpdir(),'smartshule-delivery-'));fs.mkdirSync(path.join(dir,'assets'));
  fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><title>School portal</title>');fs.writeFileSync(path.join(dir,'assets','app-abc123.js'),'console.log("ready")');
  for(const file of ['sitemap.xml','robots.txt'])fs.copyFileSync(path.resolve('Frontend/smartshule/public',file),path.join(dir,file));
  previous=process.env.FRONTEND_DIST_PATH;process.env.FRONTEND_DIST_PATH=dir;app=createExpressApp(new AppContainer());
 });
 afterAll(()=>{if(previous===undefined)delete process.env.FRONTEND_DIST_PATH;else process.env.FRONTEND_DIST_PATH=previous;fs.rmSync(dir,{recursive:true,force:true});});
 it('always revalidates the entry document while caching hashed assets',async()=>{
  const html=await request(app).get('/');expect(html.status).toBe(200);expect(html.headers['cache-control']).toBe('no-store');
  const script=await request(app).get('/assets/app-abc123.js');expect(script.status).toBe(200);expect(script.headers['cache-control']).toContain('immutable');
 });
 it('returns a real 404 for removed chunks instead of HTML with a JavaScript MIME mismatch',async()=>{
  const response=await request(app).get('/assets/old-deployment.js');expect(response.status).toBe(404);expect(response.headers['content-type']).toContain('text/plain');expect(response.headers['cache-control']).toBe('no-store');expect(response.text).not.toContain('<!doctype');
 });
 it('keeps SPA deep links available without caching stale HTML',async()=>{
  const response=await request(app).get('/school/lessons');expect(response.status).toBe(200);expect(response.text).toContain('School portal');expect(response.headers['cache-control']).toBe('no-store');
 });
 it('serves a public XML sitemap with absolute public URLs rather than the SPA document',async()=>{
  const response=await request(app).get('/sitemap.xml');
  expect(response.status).toBe(200);expect(response.headers['content-type']).toMatch(/xml/);
  expect(response.text).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  const urls=Array.from(response.text.matchAll(/<loc>([^<]+)<\/loc>/g),match=>new URL(match[1]));
  expect(urls.map(url=>url.href)).toEqual(['https://smartshule-vg15.onrender.com/']);
  expect(response.text).not.toContain('<!doctype');
 });
 it('lets crawlers discover the sitemap without listing private records',async()=>{
  const response=await request(app).get('/robots.txt');
  expect(response.status).toBe(200);expect(response.headers['content-type']).toContain('text/plain');
  expect(response.text).toContain('Sitemap: https://smartshule-vg15.onrender.com/sitemap.xml');
  expect(response.text).toContain('Disallow: /api/');expect(response.text).toContain('Disallow: /uploads/');
 });

});
