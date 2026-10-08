import { brazilLocalParts } from './lifecycleSchedule.js';

export const WATCHED_COMPETITIONS = Object.freeze([
  {slug:'bra.1',name:'Brasileirão Série A'},
  {slug:'bra.copa_do_brazil',name:'Copa do Brasil'},
  {slug:'conmebol.libertadores',name:'Libertadores'},
  {slug:'conmebol.sudamericana',name:'Sul-Americana'}
]);
export const GRENAL_IDS = Object.freeze({gremio:'6273',internacional:'1936'});

export function clubFromEspn(competitor) {
  const id=String(competitor?.team?.id || competitor?.id || '');
  if(id===GRENAL_IDS.gremio) return 'gremio';
  if(id===GRENAL_IDS.internacional) return 'internacional';
  return null;
}

export function extractTrackedFixtures(scoreboard,competition,now=new Date()) {
  if(!WATCHED_COMPETITIONS.some(c=>c.slug===competition)) return [];
  if(!Array.isArray(scoreboard?.events)) return [];
  const output=[];
  for(const event of scoreboard.events) {
    const match=event.competitions?.[0];
    if(!match || !Array.isArray(match.competitors)) continue;
    const home=match.competitors.find(c=>c.homeAway==='home');
    const away=match.competitors.find(c=>c.homeAway==='away');
    const clubHome=clubFromEspn(home), clubAway=clubFromEspn(away);
    if(!clubHome && !clubAway) continue;
    const state=String(match.status?.type?.state || event.status?.type?.state || '').toLowerCase();
    if(state!=='pre' || match.timeValid===false || event.timeValid===false) continue;
    const kickoff=new Date(event.date || match.date);
    if(!Number.isFinite(kickoff.getTime()) || kickoff.getTime()<=now.getTime()) continue;
    const homeName=String(home?.team?.displayName||home?.team?.name||'').trim();
    const awayName=String(away?.team?.displayName||away?.team?.name||'').trim();
    if(!homeName || !awayName || !event.id) continue;
    const isGreNal=!!clubHome && !!clubAway;
    const teams=[clubHome,clubAway].filter(Boolean);
    const localDate=brazilLocalParts(kickoff).dateKey;
    output.push({
      sourceId:String(event.id),competition,teams,isGreNal,
      matchLabel:`${homeName} x ${awayName}`,
      kickoffAt:kickoff.toISOString(),date:localDate,
      priority:isGreNal?100:competition==='bra.1'?80:90,
      source:'ESPN scoreboard',sourceUrl:`https://www.espn.com.br/futebol/calendario/_/liga/${competition}`,
      sourceState:'scheduled'
    });
  }
  return output;
}

// Default-deny gate: the emitter's policy eligibility must be separately reviewed.
export function footballNotificationReady(settings={}) {
  return settings.enabled===true &&
    settings.policyClearedForThisStore===true &&
    settings.contentType==='sports_information_only' &&
    /^[a-z0-9_]{4,100}$/.test(String(settings.approvedTemplateName||''));
}

export function matchAudienceAllowed(customer,event,unsegmented=false) {
  if(!customer || !customer.consent || !customer.adult) return false;
  if(customer.team==='none') return false;
  if(event.isGreNal===true) return true;
  if(customer.team==='both') return true;
  return (event.teams || []).includes(customer.team) ||
    (unsegmented===true && !customer.team);
}

export function preferredFootballMatch(fixtures, date) {
  return fixtures.filter(f=>f.date===date)
    .sort((a,b)=>b.priority-a.priority||Date.parse(a.kickoffAt)-Date.parse(b.kickoffAt))[0] || null;
}

// Event must be refreshed recently by the sports radar, otherwise no message.
export function safeCurrentFixture(event,date,now=new Date()) {
  if(!event || event.date!==date || event.confirmed!==true || event.active!==true) return false;
  if(event.type!=='football_match'|| !Array.isArray(event.teams)||!event.teams.length) return false;
  const verified=event.lastVerifiedAt?.toDate?event.lastVerifiedAt.toDate():new Date(event.lastVerifiedAt);
  const kickoff=event.kickoffAt?.toDate?event.kickoffAt.toDate():new Date(event.kickoffAt);
  return Number.isFinite(verified.getTime()) && Number.isFinite(kickoff.getTime()) &&
    now.getTime()-verified.getTime() <= 30*3600000 && now.getTime()-verified.getTime()>=0 &&
    kickoff.getTime()>now.getTime();
}
