import {Database} from '@relate/relate';
const conn=Database.open('./fixtures/editorial',{readOnly:true}).connect();
console.log(JSON.stringify({
  store:'fixtures/editorial (read-only)',
  nodes:conn.query('MATCH (n) RETURN labels(n) AS labels, properties(n) AS data').rows,
  edges:conn.query('MATCH (a)-[r]->(b) RETURN a.id AS from, type(r) AS type, b.id AS to').rows
},null,2));
