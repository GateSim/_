// evaluate.js  (optimized)

import * as CONSTANTS from "../constants/constants";

// ============================================================
// HELPERS
// ============================================================

const EMPTY = Object.freeze([]);

function isSource(type) {
  return type === "INPUT" || type === "CLOCK" || type === "EXT_SIGNAL";
}

// Return null when unchanged, otherwise a NEW array.
// Arrays are never mutated in place because value arrays are
// shared with undo snapshots (shallow copies in reindex).
function single(node, x) {
  const v = node.value;
  return v && v.length === 1 && v[0] === x ? null : [x];
}

function pair(node, x, y) {
  const v = node.value;
  return v && v.length === 2 && v[0] === x && v[1] === y ? null : [x, y];
}

function triple(node, x, y, z) {
  const v = node.value;
  return v && v.length === 3 && v[0] === x && v[1] === y && v[2] === z
    ? null
    : [x, y, z];
}

function readInput(input, graph, map) {
  if (!input || input.index === -1) return false;
  if (input.id === "__CUSTOM_INPUT__") return input.value ?? false;
  const src = map ? map.get(input.id) : graph[input.id];
  return src?.value?.[input.index] ?? false;
}

function buildMap(graph) {
  const map = new Map();
  for (let i = 0; i < graph.length; i++) map.set(graph[i].id, graph[i]);
  return map;
}

// ------------------------------------------------------------
// Caches for CUSTOM components (keyed by array identity)
// ------------------------------------------------------------

const internalMapCache = new WeakMap();
const sourceIndexCache = new WeakMap();

function getInternalMap(refGraph) {
  let m = internalMapCache.get(refGraph);
  if (!m || m.size !== refGraph.length) {
    m = buildMap(refGraph);
    internalMapCache.set(refGraph, m);
  }
  return m;
}

function getSourceIndex(extInputs) {
  let m = sourceIndexCache.get(extInputs);
  if (!m) {
    m = new Map();
    for (let i = 0; i < extInputs.length; i++) {
      const s = extInputs[i].sourceId;
      if (!m.has(s)) m.set(s, m.size);
    }
    sourceIndexCache.set(extInputs, m);
  }
  return m;
}

// Scratch: JK edge memory produced by the last computeNext() call.
let _lastClock = false;

// ============================================================
// CORE: compute next value WITHOUT mutating the node.
// Returns null if unchanged, otherwise the new value array.
// `map` is null for top-level graphs (index lookup),
// or a Map for custom-internal graphs.
// ============================================================

function computeNext(node, graph, map) {
  const type = node.type;
  if (isSource(type)) return null;

  const inp = node.inputs;
  const n = inp ? inp.length : 0;

  const a = n > 0 ? readInput(inp[0], graph, map) : false;
  const b = n > 1 ? readInput(inp[1], graph, map) : false;
  const c = n > 2 ? readInput(inp[2], graph, map) : false;
  const d = n > 3 ? readInput(inp[3], graph, map) : false;
  const e = n > 4 ? readInput(inp[4], graph, map) : false;
  const f = n > 5 ? readInput(inp[5], graph, map) : false;

  switch (type) {
    case "WIRE":
    case "BULB":
      return single(node, a);

    case "NOT":
      return single(node, !a);

    case "AND":
      return single(node, a && b);
    case "OR":
      return single(node, a || b);
    case "XOR":
      return single(node, a !== b);
    case "NAND":
      return single(node, !(a && b));
    case "NOR":
      return single(node, !(a || b));
    case "XNOR":
      return single(node, a === b);

    case "AND3":
      return single(node, a && b && c);
    case "OR3":
      return single(node, a || b || c);
    case "NAND3":
      return single(node, !(a && b && c));
    case "NOR3":
      return single(node, !(a || b || c));
    case "XOR3":
      return single(node, (a !== b) !== c);
    case "XNOR3":
      return single(node, (a === b) === c);

    case "AND4":
      return single(node, a && b && c && d);
    case "OR4":
      return single(node, a || b || c || d);
    case "NAND4":
      return single(node, !(a && b && c && d));
    case "NOR4":
      return single(node, !(a || b || c || d));
    case "XOR4":
      return single(node, (a !== b) !== (c !== d));
    case "XNOR4":
      return single(node, ((a === b) === c) === d);

    case "MUX2":
      return single(node, c ? b : a);
    case "MUX4":
      return single(node, f ? (e ? d : c) : e ? b : a);

    case "HALF_ADDER":
      return pair(node, a !== b, a && b);

    case "FULL_ADDER":
      return pair(node, (a !== b) !== c, (a && b) || (c && a !== b));

    case "JK": {
      // inputs: a = J, b = CLK, c = K
      const oldQ = node.value?.[0] ?? false;
      let q = oldQ;

      if (b && !(node.lastClock ?? false)) {
        if (a && c) q = !q;
        else if (a) q = true;
        else if (c) q = false;
      }

      _lastClock = b;
      return pair(node, q, !q);
    }

    case "CUSTOM":
      return evaluateCustom(node, graph, map);

    default:
      return null;
  }
}

// ============================================================
// CUSTOM COMPONENT
// Returns null if outputs unchanged, else the new output array.
// ============================================================

function evaluateCustom(customNode, graph, map) {
  const extInputs = customNode.ext_inputs ?? EMPTY;
  const extOutputs = customNode.ext_outputs ?? EMPTY;
  const refGraph = customNode.ref_graph ?? EMPTY;

  const internalMap = getInternalMap(refGraph);
  const sourceToIndex = getSourceIndex(extInputs);
  const extConns = customNode.inputs;

  // ---- connect external inputs ----
  for (let i = 0; i < extInputs.length; i++) {
    const ext = extInputs[i];

    const internalNode = internalMap.get(ext.id);
    if (!internalNode) continue;

    const conn = extConns?.[sourceToIndex.get(ext.sourceId)];
    if (!conn) continue;

    const src = map ? map.get(conn.id) : graph[conn.id];
    if (!src) continue;

    const signal = src.value?.[conn.index] ?? false;

    if (internalNode.type === "CUSTOM") {
      const carrierId =
        ext._carrierId ?? (ext._carrierId = `__ext_${ext.id}_${ext.index}__`);

      let carrier = internalMap.get(carrierId);

      if (!carrier) {
        carrier = {
          type: "EXT_SIGNAL",
          id: carrierId,
          value: [signal],
          inputs: [],
          outputs: []
        };
        refGraph.push(carrier);
        internalMap.set(carrierId, carrier);
      } else if (carrier.value[0] !== signal) {
        carrier.value = [signal];
      }

      if (internalNode.inputs) {
        const cur = internalNode.inputs[ext.index];
        if (!cur || cur.id !== carrierId) {
          internalNode.inputs[ext.index] = { id: carrierId, index: 0 };
        }
      }
    } else if (internalNode.inputs) {
      const cur = internalNode.inputs[ext.index];
      if (cur && cur.id === "__CUSTOM_INPUT__") {
        cur.value = signal; // reuse object, no allocation
      } else {
        internalNode.inputs[ext.index] = {
          id: "__CUSTOM_INPUT__",
          index: 0,
          value: signal
        };
      }
    }
  }

  // ---- internal fixed point ----
  const maxIter = CONSTANTS.MAX_EVALUATION_ITERATIONS;
  for (let it = 0; it < maxIter; it++) {
    if (!evaluateGraph(refGraph, internalMap)) break;
  }

  // ---- resolve outputs ----
  const old = customNode.value ?? EMPTY;
  const len = extOutputs.length;
  const next = new Array(len);
  let differs = old.length !== len;

  for (let k = 0; k < len; k++) {
    const o = extOutputs[k];
    const node = internalMap.get(o.id);
    const v = node ? node.value?.[o.index] ?? false : false;
    next[k] = v;
    if (!differs && old[k] !== v) differs = true;
  }

  return differs ? next : null;
}

// ============================================================
// SINGLE-PASS, IN-PLACE GRAPH EVALUATOR
// (used for custom internals and post-edit settling)
// ============================================================

function evaluateGraph(graph, map) {
  let changed = false;

  for (let i = 0; i < graph.length; i++) {
    const node = graph[i];
    if (isSource(node.type)) continue;

    const next = computeNext(node, graph, map);

    if (node.type === "JK") node.lastClock = _lastClock;

    if (next !== null) {
      node.value = next;
      changed = true;
    }
  }

  return changed;
}

export function evaluate(graph, nodeMap = null) {
  return evaluateGraph(graph, nodeMap ?? buildMap(graph));
}

// Run evaluate() to a fixed point with ONE node map.
// (Drop-in replacement for the loop in useCircuit.Add.)
export function settle(graph) {
  const map = buildMap(graph);
  const maxIter = CONSTANTS.MAX_EVALUATION_ITERATIONS;
  for (let i = 0; i < maxIter; i++) {
    if (!evaluateGraph(graph, map)) return true;
  }
  return false;
}

// Top-level single node evaluate + apply (kept for compatibility).
export function evaluateNode(node, graph) {
  const next = computeNext(node, graph, null);
  if (node.type === "JK") node.lastClock = _lastClock;
  if (next === null) return false;
  node.value = next;
  return true;
}

// ============================================================
// RUNTIME PROPAGATION
// Level-synchronous frontier, two-phase commit.
// Allocation-free per node: no Sets, no temp node copies,
// value arrays are created only when a value actually changes.
// ============================================================

let marks = new Uint32Array(0);
let stampCounter = 0;

function nextStamp() {
  stampCounter++;
  if (stampCounter >= 0xffffffff) {
    marks.fill(0);
    stampCounter = 1;
  }
  return stampCounter;
}

export function propagate(graph, id) {
  const source = graph[id];
  if (!source) return;

  const len = graph.length;
  if (marks.length < len) marks = new Uint32Array(len * 2);

  let cur = [];
  let nxt = [];

  // seed frontier
  {
    const outs = source.outputs ?? EMPTY;
    const stamp = nextStamp();
    for (let i = 0; i < outs.length; i++) {
      const o = outs[i];
      if (marks[o] !== stamp) {
        marks[o] = stamp;
        cur.push(o);
      }
    }
  }

  const MAX_STEPS = Math.max(len + 1, CONSTANTS.MAX_EVALUATION_ITERATIONS * 100);

  // reusable result buffers
  const resNodes = [];
  const resVals = [];
  const resLc = [];

  let step = 0;

  while (cur.length > 0 && step < MAX_STEPS) {
    step++;

    // ---- PHASE 1: evaluate all against the same committed state ----
    resNodes.length = 0;
    resVals.length = 0;
    resLc.length = 0;

    for (let i = 0; i < cur.length; i++) {
      const node = graph[cur[i]];
      if (!node) continue;

      const val = computeNext(node, graph, null);
      const isJK = node.type === "JK";

      if (val !== null || isJK) {
        resNodes.push(node);
        resVals.push(val);
        resLc.push(isJK ? _lastClock : false);
      }
    }

    // ---- PHASE 2: commit together, build next frontier ----
    nxt.length = 0;
    const stamp = nextStamp();

    for (let i = 0; i < resNodes.length; i++) {
      const node = resNodes[i];

      if (node.type === "JK") node.lastClock = resLc[i];

      const val = resVals[i];
      if (val === null) continue;

      node.value = val;

      const outs = node.outputs;
      if (!outs) continue;

      for (let k = 0; k < outs.length; k++) {
        const o = outs[k];
        if (marks[o] !== stamp) {
          marks[o] = stamp;
          nxt.push(o);
        }
      }
    }

    const tmp = cur;
    cur = nxt;
    nxt = tmp;
  }

  if (cur.length > 0) {
    console.warn("propagate(): did not settle within propagation limit.");
  }
}