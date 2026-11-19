import type {PriceRow,Report,Region} from '../../../server/types';
export type Numbers={priced:number;included:number;low:number|null;high:number|null;mean:number|null;median:number|null;weighted:number|null;minLand:number|null;maxLand:number|null;avgLand:number|null;avgMarket:number|null;avgImprovement:number|null};
export const regionNames:Record<Region,string>={county_all:'Whole county',NE:'Northeast',NW:'Northwest',SE:'Southeast',SW:'Southwest'};
export const regionColors:Record<Region,string>={county_all:'#5782b8',NE:'#259687',NW:'#6283c7',SE:'#a273bd',SW:'#c99753'};
export function quantile(sorted:number[],p:number):number|null {if(!sorted.length)return null;const x=(sorted.length-1)*p,j=Math.floor(x),f=x-j;return sorted[j]+(sorted[Math.min(j+1,sorted.length-1)]-sorted[j])*f;}
export function bandMatch(acres:number,band:string):boolean {switch(band){case 'all':return true;case '50–<100':return acres>=50&&acres<100;case '100–<500':return acres>=100&&acres<500;case '500+':return acres>=500;case '100–<200':return acres>=100&&acres<200;case '200+':return acres>=200;case '50–<60':return acres>=50&&acres<60;case '60–<70':return acres>=60&&acres<70;case '70–<80':return acres>=70&&acres<80;case '80–<90':return acres>=80&&acres<90;case '90–<100':return acres>=90&&acres<100;case '200–<500':return acres>=200&&acres<500;case '500–<1000':return acres>=500&&acres<1000;case '1000+':return acres>=1000;default:return false;}}
export function calculate(rows:PriceRow[],region:Region,band:string,middle:number):Numbers {
 const chosen=rows.filter(r=>Number.isFinite(r[1])&&r[1]>0&&Number.isFinite(r[2])&&r[2]>0&&(region==='county_all'||r[0]===region)&&bandMatch(r[1],band));
 const values=chosen.map(r=>r[2]/r[1]).sort((a,b)=>a-b),tail=(100-middle)/200;
 const low=quantile(values,tail),high=quantile(values,1-tail);
 const selected=chosen.filter(r=>low!==null&&high!==null&&r[2]/r[1]>=low&&r[2]/r[1]<=high);
 const n=selected.length,prices=selected.map(r=>r[2]/r[1]).sort((a,b)=>a-b);
 const sum=(arr:number[])=>arr.reduce((a,b)=>a+b,0);
 const land=selected.map(r=>r[2]),acre=selected.map(r=>r[1]);
 const market=selected.map(r=>r[3]).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));
 const imp=selected.map(r=>r[4]).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));
 return {priced:chosen.length,included:n,low,high,mean:n?sum(prices)/n:null,median:quantile(prices,.5),weighted:n?sum(land)/sum(acre):null,minLand:n?land.reduce((a,b)=>Math.min(a,b),Infinity):null,maxLand:n?land.reduce((a,b)=>Math.max(a,b),-Infinity):null,avgLand:n?sum(land)/n:null,avgMarket:market.length?sum(market)/market.length:null,avgImprovement:imp.length?sum(imp)/imp.length:null};
}
export function precomputedCount(report:Report,region:Region,scheme='fisher',band='all'){return report.stats?.[region]?.[scheme]?.[band]?.['100']?.selected_properties??0;}
export const num=(x:number|null|undefined,d=0)=>x==null||!Number.isFinite(x)?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}).format(x);
export const usd=(x:number|null|undefined)=>x==null||!Number.isFinite(x)?'—':'$'+num(x);
export const pct=(x:number|null|undefined)=>x==null||!Number.isFinite(x)?'—':num(x,1)+'%';
