import type { Request, Response } from 'express';
import { authEnabled, context, countyId, latestReport, validateSlug } from './core.js';

export async function config(_req:Request,res:Response) { res.setHeader('Cache-Control','no-store');res.json({authEnabled:authEnabled()}); }
export async function counties(req:Request,res:Response) {
 const db=await context(req);
 // Fetch only published reports, not incomplete/failed county entries.
 const {data:published,error}=await db.from('txgio_county_reports').select('county_id,tax_year,version').eq('status','ready');
 if(error) throw error;
 const ids=[...new Set((published||[]).map(r=>r.county_id))];
 if(!ids.length){res.json([]);return;}
 const {data:list,error:e}=await db.from('txgio_counties').select('id,name,slug').in('id',ids).order('name');
 if(e)throw e;
 const latest=new Map<string,number>(); for(const r of published||[])latest.set(r.county_id,Math.max(latest.get(r.county_id)||0,Number(r.tax_year)));
 res.setHeader('Cache-Control','private, no-store');res.json((list||[]).map(c=>({...c,latestYear:latest.get(c.id)})));
}
export async function report(req:Request,res:Response) {
 const slug=validateSlug(req.query.county); const db=await context(req);
 const c=await countyId(db,slug);
 const r=await latestReport(db,c.id,'tax_year,min_acres,version,property_count,land_coverage_pct,gis_coverage_pct,report_data,quadrant_map_path,land_value_map_path,generated_at');
 const storage=db.storage.from('txgio-report-maps');
 async function sign(key:unknown) {if(typeof key!=='string'||!key)return null;const {data,error}=await storage.createSignedUrl(key,600);if(error)throw error;return data.signedUrl;}
 const [quadrants,landPerAcre]=await Promise.all([sign(r.quadrant_map_path),sign(r.land_value_map_path)]);
 res.setHeader('Cache-Control','private, no-store');
 res.json({county:c,meta:{taxYear:r.tax_year,minAcres:r.min_acres,version:r.version,propertyCount:r.property_count,landCoverage:r.land_coverage_pct,gisCoverage:r.gis_coverage_pct,generatedAt:r.generated_at},report:r.report_data,maps:{quadrants,landPerAcre}});
}
