import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

function env(name: string): string { return process.env[name]?.trim() ?? ''; }
export function authEnabled(): boolean { return env('AUTH_ENABLED').toLowerCase() === 'true'; }
export function requireConfig() {
  const url=env('SUPABASE_URL'); const anon=env('SUPABASE_PUBLISHABLE_KEY'); const secret=env('SUPABASE_SECRET_KEY')||env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url) throw new Error('SUPABASE_URL missing on server');
  if (authEnabled() && !anon) throw new Error('SUPABASE_PUBLISHABLE_KEY missing for authentication');
  if (!authEnabled() && !secret) throw new Error('SUPABASE_SECRET_KEY missing for public demo mode');
  return {url,anon,secret};
}
export async function context(req: Request): Promise<SupabaseClient> {
  const c=requireConfig();
  if(!authEnabled()) return createClient(c.url,c.secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=(req.headers.authorization || '').match(/^Bearer\s+(\S+)$/i)?.[1];
  if(!token) throw Object.assign(new Error('Sign in to access county reports.'),{status:401});
  const client=createClient(c.url,c.anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data,error}=await client.auth.getUser(token);
  if(error || !data.user) throw Object.assign(new Error('Session expired. Please sign in again.'),{status:401});
  return client;
}
export function withApi(fn:(req:Request,res:Response)=>Promise<void>) {
  return async (req:Request,res:Response,next?:NextFunction) => {
    try { await fn(req,res); } catch(e) {
      const er=e as Error & {status?:number;code?:string}; const code=er.status||500;
      if(code>=500) console.error('TxGIO API error',er);
      if(!res.headersSent) res.status(code).json({error:code>=500?'Unable to load the data. Check server configuration and Supabase permissions.':er.message});
      else next?.(er);
    }
  };
}
export function validateSlug(v:unknown) { if(typeof v!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)) throw Object.assign(new Error('Choose a valid county.'),{status:400}); return v; }
export async function countyId(db:SupabaseClient,slug:string) {
  const {data,error}=await db.from('txgio_counties').select('id,name,slug').eq('slug',slug).maybeSingle();
  if(error) throw error;
  if(!data) throw Object.assign(new Error('County not available or access denied.'),{status:404});
  return data;
}
export async function latestReport(db:SupabaseClient,county:string,fields:string) {
  const {data,error}=await db.from('txgio_county_reports').select(fields).eq('county_id',county).eq('status','ready').order('tax_year',{ascending:false}).order('version',{ascending:false}).limit(1).maybeSingle();
  if(error) throw error;
  if(!data) throw Object.assign(new Error('No completed report exists for this county.'),{status:404});
  return data as Record<string,unknown>;
}
