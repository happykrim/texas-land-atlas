import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import type {Report} from '../../../server/types';
export type County={id:string;name:string;slug:string;latestYear:number};
export type DashboardData={county:County;meta:{taxYear:number;minAcres:number;version:number;propertyCount:number;landCoverage:number|null;gisCoverage:number|null;generatedAt:string};report:Report;maps:{quadrants:string|null;landPerAcre:string|null}};
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
let singleton:SupabaseClient|null=null;
export function getAuthClient(){if(!url||!key)throw new Error('Missing browser Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');return singleton??(singleton=createClient(url,key,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}}));}
export async function api<T>(path:string,token?:string|null):Promise<T>{
 const response=await fetch(path,{headers:token?{Authorization:`Bearer ${token}`}:{},cache:'no-store'});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body.error||`Request failed (${response.status})`);
 return body as T;
}
