import {openGraph} from './graph.js';
const graph = openGraph();
console.log(JSON.stringify(graph.snapshot(), null, 2));
