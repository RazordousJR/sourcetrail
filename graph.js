import { Database } from '@relate/relate';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openGraph(path = process.env.SOURCETRAIL_STORE || './data/editorial') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = Database.open(path);
  const conn = db.connect();
  const rows = (q, p = {}) => conn.query(q, p).rows;
  function seed() {
    if (rows('MATCH (n) RETURN count(n) AS n')[0].n) return;
    conn.query(`CREATE
      (s1:Source {id:'s1', title:'River access survey', publisher:'Civic Lab', status:'current', revision:1, note:'Synthetic survey of 240 residents.'}),
      (s2:Source {id:'s2', title:'Waterfront project brief', publisher:'Planning Desk', status:'current', revision:1, note:'Synthetic public-space planning document.'}),
      (s3:Source {id:'s3', title:'Local economy digest', publisher:'Market Notes', status:'current', revision:1, note:'Synthetic digest citing the river survey.'}),
      (s4:Source {id:'s4', title:'Heritage walk field notes', publisher:'Culture Desk', status:'current', revision:1, note:'Synthetic independent observations.'}),
      (s3)-[:CITES]->(s1),
      (c1:Claim {id:'c1', title:'Most residents want better river access'}),
      (c2:Claim {id:'c2', title:'The plan adds two pedestrian links'}),
      (c3:Claim {id:'c3', title:'River access could support local shops'}),
      (c4:Claim {id:'c4', title:'Walking routes link three heritage stops'}),
      (c5:Claim {id:'c5', title:'The waterfront proposal has community support'}),
      (c1)-[:SUPPORTED_BY {reviewedRevision:1}]->(s1),
      (c2)-[:SUPPORTED_BY {reviewedRevision:1}]->(s2),
      (c3)-[:SUPPORTED_BY {reviewedRevision:1}]->(s3),
      (c4)-[:SUPPORTED_BY {reviewedRevision:1}]->(s4),
      (c5)-[:SUPPORTED_BY {reviewedRevision:1}]->(s1),
      (c5)-[:SUPPORTED_BY {reviewedRevision:1}]->(s2),
      (a1:Article {id:'a1', title:'A riverfront for everyone', desk:'City & community', stage:'Ready for proof', owner:'Nadia', edition:'December / 01'}),
      (a2:Article {id:'a2', title:'Small shops, connected streets', desk:'Business & people', stage:'In review', owner:'Amir', edition:'December / 02'}),
      (a3:Article {id:'a3', title:'The weekend heritage walk', desk:'Culture & places', stage:'Ready for proof', owner:'Mei', edition:'December / 03'}),
      (a1)-[:CONTAINS]->(c1), (a1)-[:CONTAINS]->(c2), (a1)-[:CONTAINS]->(c5),
      (a2)-[:CONTAINS]->(c3), (a2)-[:CONTAINS]->(c5),
      (a3)-[:CONTAINS]->(c4)`);
    db.checkpoint();
  }
  function snapshot() {
    const articles = rows('MATCH (a:Article) RETURN properties(a) AS data ORDER BY a.id').map(r => r.data);
    const sources = rows('MATCH (s:Source) RETURN properties(s) AS data ORDER BY s.id').map(r => r.data);
    const claims = rows('MATCH (c:Claim) RETURN properties(c) AS data ORDER BY c.id').map(r => r.data);
    const edges = rows('MATCH (a)-[r]->(b) RETURN a.id AS from, b.id AS to, type(r) AS type, properties(r) AS data');
    // Relate traverses citation chains, including indirect dependencies; no keyword matching.
    const impacts = rows(`MATCH (a:Article)-[:CONTAINS]->(c:Claim)-[e:SUPPORTED_BY]->(direct:Source)
      MATCH (direct)-[:CITES*0..8]->(s:Source)
      WHERE s.status <> 'current' OR (direct.id = s.id AND (e.reviewedRevision <> s.revision OR e.needsReview = true))
      RETURN DISTINCT a.id AS article, c.id AS claim, s.id AS source, direct.id AS via,
      s.status AS status, s.revision AS revision`);
    const history = rows('MATCH (e:Event) RETURN properties(e) AS data ORDER BY e.at DESC LIMIT 30').map(r => r.data);
    return {articles, sources, claims, edges, impacts, history};
  }
  function updateSource(id, status, note) {
    if (!['current', 'changed', 'withdrawn'].includes(status)) throw new Error('Invalid source status');
    if (!rows('MATCH (s:Source {id:$id}) RETURN s.id AS id', {id}).length) throw new Error('Source not found');
    conn.begin();
    try {
      conn.query('MATCH (:Claim)-[e:SUPPORTED_BY]->(direct:Source)-[:CITES*0..8]->(:Source {id:$id}) SET e.needsReview=true', {id});
      conn.query('MATCH (s:Source {id:$id}) SET s.status=$status, s.revision=s.revision+1, s.note=$note', {id, status, note});
      conn.query('CREATE (:Event {id:$event, source:$id, status:$status, note:$note, at:$at})', {event:crypto.randomUUID(), id, status, note, at:new Date().toISOString()});
      conn.commit();
    } catch (e) { conn.rollback(); throw e; }
    db.checkpoint();
    return snapshot();
  }
  function review(claim, source) {
    const exists = rows('MATCH (c:Claim {id:$claim})-[e:SUPPORTED_BY]->(s:Source {id:$source}) RETURN s.status AS status', {claim, source});
    if (!exists.length) throw new Error('Evidence link not found');
    // A direct link cannot be cleared while any upstream dependency is flagged.
    const blocked = rows(`MATCH (:Source {id:$source})-[:CITES*0..8]->(s:Source) WHERE s.status <> 'current' RETURN s.id AS id`, {source});
    if (blocked.length) throw new Error('Resolve the flagged source chain before recording review');
    conn.begin();
    try {
      conn.query('MATCH (c:Claim {id:$claim})-[e:SUPPORTED_BY]->(s:Source {id:$source}) SET e.reviewedRevision=s.revision, e.needsReview=false', {claim, source});
      conn.query('CREATE (:Event {id:$event, source:$source, claim:$claim, status:$status, note:$note, at:$at})', {event:crypto.randomUUID(), source, claim, status:'reviewed', note:'Human review recorded for the current source revision.', at:new Date().toISOString()});
      conn.commit();
    } catch(e) {conn.rollback(); throw e;}
    db.checkpoint();
    return snapshot();
  }
  seed();
  return {snapshot, updateSource, review};
}
