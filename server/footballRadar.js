import admin from 'firebase-admin';
import { WATCHED_COMPETITIONS, extractTrackedFixtures, preferredFootballMatch } from '../lib/footballFixtures.js';
import { brazilLocalParts } from '../lib/lifecycleSchedule.js';

const STORE_ID='csi';
const RADAR_DAYS=8;
const MAX_HTTP=8;

export function fixtureDays(from=new Date(),count=RADAR_DAYS) {
  const dates=[];
  for(let i=0;i<count;i++) {
    // Choose local calendar days independent of UTC midnight and DST.
    const utcNoon=new Date(Date.UTC(from.getUTCFullYear(),from.getUTCMonth(),from.getUTCDate()+i,16));
    dates.push(brazilLocalParts(utcNoon).dateKey);
  }
  return [...new Set(dates)];
}

async function getESPNScoreboard(competition,date) {
  const dateParam=date.replaceAll('-','');
  const url=`https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(competition)}/scoreboard?dates=${dateParam}`;
  const response=await fetch(url,{
    headers:{Accept:'application/json','User-Agent':'VeloDelivery-FixtureRadar/1.0'},
    signal:AbortSignal.timeout(7500)
  });
  if(!response.ok) throw new Error(`scoreboard_${response.status}`);
  const data=await response.json();
  if(!Array.isArray(data.events)) throw new Error('invalid_scoreboard_response');
  return data;
}

async function fetchFixtureBatch(now=new Date()) {
  const days=fixtureDays(now);
  const jobs=days.flatMap(date=>WATCHED_COMPETITIONS.map(c=>({date,competition:c.slug})));
  const out=[],errors=[];
  for(let i=0;i<jobs.length;i+=MAX_HTTP) {
    const results=await Promise.all(jobs.slice(i,i+MAX_HTTP).map(async job=>{
      try{
        const board=await getESPNScoreboard(job.competition,job.date);
        return {fixtures:extractTrackedFixtures(board,job.competition,now),day:job.date,competition:job.competition};
      }catch(error){
        return {error:String(error.message),day:job.date,competition:job.competition};
      }
    }));
    for(const row of results) {
      if(row.error) errors.push(row);
      else out.push(...row.fixtures);
    }
  }
  return {fixtures:out,errors,dates:days};
}

export async function handleFootballRadar(req,res,db) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return res.status(405).json({success:false,error:'method_not_allowed'});
  const cronSecret=process.env.CRON_SECRET;
  if(!cronSecret || req.headers.authorization!==`Bearer ${cronSecret}`) {
    return res.status(401).json({success:false,error:'unauthorized'});
  }
  const now=new Date();
  const {fixtures,errors,dates}=await fetchFixtureBatch(now);
  // Falha fechada: se não houver nenhum retorno válido do provedor, não atualiza dados.
  if(errors.length===dates.length*WATCHED_COMPETITIONS.length) {
    return res.status(503).json({success:false,error:'all_sources_unavailable',checked:errors.length});
  }

  const unique=new Map(fixtures.map(f=>[`${f.competition}_${f.sourceId}`,f]));
  const recordTime=admin.firestore.Timestamp.fromDate(now);
  const grouped=new Map();
  for(const event of unique.values()) {
    const list=grouped.get(event.date)||[];
    list.push(event);
    grouped.set(event.date,list);
  }

  // No client message is ever sent from this endpoint.
  let savedFixtures=0,savedEventDays=0;
  for(const [key,fixture] of unique) {
    await db.collection('football_fixtures').doc(key.replace(/[^a-z0-9_-]/gi,'_')).set({
      storeId:STORE_ID,...fixture,active:true,
      confirmed:true,verifiedBy:'sports_schedule_provider',
      lastVerifiedAt:recordTime,updatedAt:recordTime
    },{merge:true});
    savedFixtures++;
  }

  for(const date of dates) {
    const best=preferredFootballMatch(grouped.get(date)||[],date);
    const eventRef=db.collection('whatsapp_marketing_events').doc(`${STORE_ID}_${date}`);
    if(!best) {
      // Do not disable events if some league queries failed that day.
      if(errors.some(e=>e.day===date)) continue;
      await eventRef.set({
        storeId:STORE_ID,date,active:false,confirmed:false,
        lastCheckedAt:recordTime,updatedAt:recordTime
      },{merge:true});
      continue;
    }
    await eventRef.set({
      storeId:STORE_ID,date,type:'football_match',
      sourceId:best.sourceId,competition:best.competition,teams:best.teams,
      isGreNal:best.isGreNal,priority:best.priority,
      matchLabel:best.matchLabel,kickoffAt:best.kickoffAt,
      source:best.source,sourceUrl:best.sourceUrl,sourceState:best.sourceState,
      active:true,confirmed:true,verifiedBy:'sports_schedule_provider',
      lastVerifiedAt:recordTime,updatedAt:recordTime
    },{merge:true});
    savedEventDays++;
  }

  await db.collection('football_radar_status').doc(STORE_ID).set({
    lastCheckedAt:recordTime,success:true,checkedDays:dates.length,
    competitions:WATCHED_COMPETITIONS.map(x=>x.slug),
    fixturesFound:unique.size,eventDays:savedEventDays,errors:errors.length,
    notes:'ESPN is a public unofficial JSON endpoint. Stop automatically if it fails or changes.'
  },{merge:true});
  return res.status(200).json({
    success:true,storeId:STORE_ID,checkedDays:dates.length,
    fixturesFound:unique.size,savedFixtures,eventDays:savedEventDays,sourceErrors:errors.length,
    topMatches:[...unique.values()].sort((a,b)=>b.priority-a.priority).slice(0,4)
      .map(f=>({date:f.date,name:f.matchLabel,competition:f.competition,kickoffAt:f.kickoffAt})),
    note:'Radar updates fixture records only. Match WhatsApp template requires separate approval.'
  });
}
