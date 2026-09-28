// evaluate.js

import * as CONSTANTS from "../constants/constants";


// ============================================================
// HELPERS
// ============================================================

function valuesEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (!Array.isArray(a) || !Array.isArray(b)) {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}


function copyValue(value) {
  if (Array.isArray(value)) {
    return [...value];
  }

  return value;
}


function setNodeValue(node, nextValue) {
  const changed =
    !valuesEqual(
      node.value,
      nextValue
    );

  node.value =
    nextValue;

  return changed;
}


// ============================================================
// SINGLE-PASS GRAPH EVALUATOR
//
// Mainly used by CUSTOM components.
//
// The top-level simulator does NOT use this function for
// ordinary propagation.
// ============================================================

export function evaluate(graph) {

  const nodeMap =
    new Map();

  for (const node of graph) {
    nodeMap.set(
      node.id,
      node
    );
  }

  let changed =
    false;

  for (const node of graph) {

    if (
      node.type === "INPUT" ||
      node.type === "CLOCK" ||
      node.type === "EXT_SIGNAL"
    ) {
      continue;
    }

    const nodeChanged =
      evaluateNodeWithMap(
        node,
        graph,
        nodeMap
      );

    if (nodeChanged) {
      changed = true;
    }
  }

  return changed;
}


// ============================================================
// NODE EVALUATOR FOR CUSTOM / INTERNAL GRAPHS
// ============================================================

function evaluateNodeWithMap(
  node,
  graph,
  nodeMap
) {

  const values =
    (node.inputs ?? []).map(input => {

      if (
        !input ||
        input.index === -1
      ) {
        return false;
      }

      if (
        input.id === "__CUSTOM_INPUT__"
      ) {
        return input.value ?? false;
      }

      const source =
        nodeMap.get(
          input.id
        );

      return (
        source?.value?.[
          input.index
        ] ?? false
      );
    });


  const a = values[0] ?? false;
  const b = values[1] ?? false;
  const c = values[2] ?? false;
  const d = values[3] ?? false;
  const e = values[4] ?? false;
  const f = values[5] ?? false;

  let nodeChanged =
    false;


  switch (node.type) {

    // ========================================================
    // BASIC GATES
    // ========================================================

    case "WIRE":

      nodeChanged =
        setNodeValue(
          node,
          [a]
        );

      break;


    case "AND":

      nodeChanged =
        setNodeValue(
          node,
          [a && b]
        );

      break;


    case "OR":

      nodeChanged =
        setNodeValue(
          node,
          [a || b]
        );

      break;


    case "NOT":

      nodeChanged =
        setNodeValue(
          node,
          [!a]
        );

      break;


    case "XOR":

      nodeChanged =
        setNodeValue(
          node,
          [a !== b]
        );

      break;


    case "NAND":

      nodeChanged =
        setNodeValue(
          node,
          [!(a && b)]
        );

      break;


    case "NOR":

      nodeChanged =
        setNodeValue(
          node,
          [!(a || b)]
        );

      break;


    case "XNOR":

      nodeChanged =
        setNodeValue(
          node,
          [a === b]
        );

      break;


    // ========================================================
    // 3-INPUT GATES
    // ========================================================

    case "AND3":

      nodeChanged =
        setNodeValue(
          node,
          [a && b && c]
        );

      break;


    case "OR3":

      nodeChanged =
        setNodeValue(
          node,
          [a || b || c]
        );

      break;


    case "NAND3":

      nodeChanged =
        setNodeValue(
          node,
          [!(a && b && c)]
        );

      break;


    case "NOR3":

      nodeChanged =
        setNodeValue(
          node,
          [!(a || b || c)]
        );

      break;


    case "XOR3":

      nodeChanged =
        setNodeValue(
          node,
          [(a !== b) !== c]
        );

      break;


    case "XNOR3":

      nodeChanged =
        setNodeValue(
          node,
          [(a === b) === c]
        );

      break;


    // ========================================================
    // 4-INPUT GATES
    // ========================================================

    case "AND4":

      nodeChanged =
        setNodeValue(
          node,
          [a && b && c && d]
        );

      break;


    case "OR4":

      nodeChanged =
        setNodeValue(
          node,
          [a || b || c || d]
        );

      break;


    case "NAND4":

      nodeChanged =
        setNodeValue(
          node,
          [!(a && b && c && d)]
        );

      break;


    case "NOR4":

      nodeChanged =
        setNodeValue(
          node,
          [!(a || b || c || d)]
        );

      break;


    case "XOR4":

      nodeChanged =
        setNodeValue(
          node,
          [(a !== b) !== (c !== d)]
        );

      break;


    case "XNOR4":

      nodeChanged =
        setNodeValue(
          node,
          [((a === b) === c) === d]
        );

      break;


    // ========================================================
    // MUX
    // ========================================================

    case "MUX2":

      nodeChanged =
        setNodeValue(
          node,
          [c ? b : a]
        );

      break;


    case "MUX4":

      nodeChanged =
        setNodeValue(
          node,
          [
            f
              ? (e ? d : c)
              : (e ? b : a)
          ]
        );

      break;


    // ========================================================
    // OUTPUT
    // ========================================================

    case "BULB":

      nodeChanged =
        setNodeValue(
          node,
          [a]
        );

      break;


    // ========================================================
    // ADDERS
    // ========================================================

    case "HALF_ADDER":

      nodeChanged =
        setNodeValue(
          node,
          [
            a !== b,
            a && b
          ]
        );

      break;


    case "FULL_ADDER":

      nodeChanged =
        setNodeValue(
          node,
          [
            (a !== b) !== c,
            (a && b) ||
            (c && (a !== b))
          ]
        );

      break;


    // ========================================================
    // JK FLIP-FLOP
    // ========================================================

    case "JK": {

      const j =
        a;

      const clk =
        b;

      const k =
        c;


      const oldQ =
        node.value?.[0] ?? false;

      const oldQbar =
        node.value?.[1] ?? !oldQ;

      const oldLastClock =
        node.lastClock ?? false;


      let q =
        oldQ;


      // ------------------------------------------------------
      // Rising edge
      // ------------------------------------------------------

      if (
        clk &&
        !oldLastClock
      ) {

        if (j && k) {
          q = !q;
        }

        else if (j && !k) {
          q = true;
        }

        else if (!j && k) {
          q = false;
        }
      }


      node.lastClock =
        clk;


      const nextValue = [
        q,
        !q
      ];


      nodeChanged =
        oldQ !== nextValue[0] ||
        oldQbar !== nextValue[1];


      node.value =
        nextValue;

      break;
    }


    // ========================================================
    // CUSTOM
    // ========================================================

    case "CUSTOM":

      nodeChanged =
        evaluateCustom(
          node,
          graph,
          nodeMap
        );

      break;


    // ========================================================
    // SOURCE NODES
    // ========================================================

    case "INPUT":
    case "CLOCK":
    case "EXT_SIGNAL":

      break;


    default:
      break;
  }


  return nodeChanged;
}


// ============================================================
// CUSTOM COMPONENT
// ============================================================

function evaluateCustom(
  customNode,
  outerGraph,
  outerNodeMap
) {

  const extInputs =
    customNode.ext_inputs ?? [];

  const extOutputs =
    customNode.ext_outputs ?? [];

  const refGraph =
    customNode.ref_graph ?? [];


  // ----------------------------------------------------------
  // Map external source IDs -> custom input index
  // ----------------------------------------------------------

  const sourceToInputIndex =
    new Map();


  for (
    const extInput of extInputs
  ) {

    if (
      !sourceToInputIndex.has(
        extInput.sourceId
      )
    ) {

      sourceToInputIndex.set(
        extInput.sourceId,
        sourceToInputIndex.size
      );
    }
  }


  // ----------------------------------------------------------
  // Map internal IDs -> nodes
  // ----------------------------------------------------------

  const internalNodeMap =
    new Map();


  for (
    const node of refGraph
  ) {

    internalNodeMap.set(
      node.id,
      node
    );
  }


  // ----------------------------------------------------------
  // Connect external inputs
  // ----------------------------------------------------------

  for (
    const extInput of extInputs
  ) {

    const internalNode =
      internalNodeMap.get(
        extInput.id
      );

    if (!internalNode) {
      continue;
    }


    const customInputIndex =
      sourceToInputIndex.get(
        extInput.sourceId
      );

    if (
      customInputIndex === undefined
    ) {
      continue;
    }


    const externalConnection =
      customNode.inputs?.[
        customInputIndex
      ];

    if (!externalConnection) {
      continue;
    }


    const externalSource =
      outerNodeMap.get(
        externalConnection.id
      );

    if (!externalSource) {
      continue;
    }


    const signal =
      externalSource.value?.[
        externalConnection.index
      ] ?? false;


    // --------------------------------------------------------
    // Nested CUSTOM
    // --------------------------------------------------------

    if (
      internalNode.type === "CUSTOM"
    ) {

      const carrierId =
        `__ext_${extInput.id}_${extInput.index}__`;


      let carrier =
        internalNodeMap.get(
          carrierId
        );


      if (!carrier) {

        carrier = {
          type: "EXT_SIGNAL",
          id: carrierId,
          value: [signal],
          inputs: [],
          outputs: []
        };


        refGraph.push(
          carrier
        );


        internalNodeMap.set(
          carrierId,
          carrier
        );

      }

      else {

        carrier.value = [
          signal
        ];
      }


      if (
        internalNode.inputs
      ) {

        internalNode.inputs[
          extInput.index
        ] = {

          id:
            carrierId,

          index:
            0
        };
      }
    }


    // --------------------------------------------------------
    // Normal internal node
    // --------------------------------------------------------

    else {

      if (
        internalNode.inputs
      ) {

        internalNode.inputs[
          extInput.index
        ] = {

          id:
            "__CUSTOM_INPUT__",

          index:
            0,

          value:
            signal
        };
      }
    }
  }


  // ----------------------------------------------------------
  // Internal fixed-point iteration
  // ----------------------------------------------------------

  for (
    let iteration = 0;
    iteration <
    CONSTANTS.MAX_EVALUATION_ITERATIONS;
    iteration++
  ) {

    const internalChanged =
      evaluate(
        refGraph
      );


    if (!internalChanged) {
      break;
    }
  }


  // ----------------------------------------------------------
  // Resolve custom outputs
  // ----------------------------------------------------------

  const oldValue =
    customNode.value ?? [];


  const nextValue =
    extOutputs.map(
      output => {

        const internalNode =
          internalNodeMap.get(
            output.id
          );


        if (!internalNode) {
          return false;
        }


        return (
          internalNode.value?.[
            output.index
          ] ?? false
        );
      }
    );


  const outputChanged =
    !valuesEqual(
      oldValue,
      nextValue
    );


  customNode.value =
    nextValue;


  return outputChanged;
}


// ============================================================
// TOP-LEVEL NODE EVALUATOR
// ============================================================

export function evaluateNode(
  node,
  graph
) {

  const values =
    (node.inputs ?? []).map(
      input => {

        if (
          !input ||
          input.index === -1
        ) {
          return false;
        }


        if (
          input.id === "__CUSTOM_INPUT__"
        ) {
          return input.value ?? false;
        }


        const source =
          graph[input.id];


        return (
          source?.value?.[
            input.index
          ] ?? false
        );
      }
    );


  const a =
    values[0] ?? false;

  const b =
    values[1] ?? false;

  const c =
    values[2] ?? false;

  const d =
    values[3] ?? false;

  const e =
    values[4] ?? false;

  const f =
    values[5] ?? false;


  let nodeChanged =
    false;


  switch (node.type) {

    // ========================================================
    // BASIC GATES
    // ========================================================

    case "WIRE":

      nodeChanged =
        setNodeValue(
          node,
          [a]
        );

      break;


    case "AND":

      nodeChanged =
        setNodeValue(
          node,
          [a && b]
        );

      break;


    case "OR":

      nodeChanged =
        setNodeValue(
          node,
          [a || b]
        );

      break;


    case "NOT":

      nodeChanged =
        setNodeValue(
          node,
          [!a]
        );

      break;


    case "XOR":

      nodeChanged =
        setNodeValue(
          node,
          [a !== b]
        );

      break;


    case "NAND":

      nodeChanged =
        setNodeValue(
          node,
          [!(a && b)]
        );

      break;


    case "NOR":

      nodeChanged =
        setNodeValue(
          node,
          [!(a || b)]
        );

      break;


    case "XNOR":

      nodeChanged =
        setNodeValue(
          node,
          [a === b]
        );

      break;


    // ========================================================
    // 3-INPUT GATES
    // ========================================================

    case "AND3":

      nodeChanged =
        setNodeValue(
          node,
          [a && b && c]
        );

      break;


    case "OR3":

      nodeChanged =
        setNodeValue(
          node,
          [a || b || c]
        );

      break;


    case "NAND3":

      nodeChanged =
        setNodeValue(
          node,
          [!(a && b && c)]
        );

      break;


    case "NOR3":

      nodeChanged =
        setNodeValue(
          node,
          [!(a || b || c)]
        );

      break;


    case "XOR3":

      nodeChanged =
        setNodeValue(
          node,
          [(a !== b) !== c]
        );

      break;


    case "XNOR3":

      nodeChanged =
        setNodeValue(
          node,
          [(a === b) === c]
        );

      break;


    // ========================================================
    // 4-INPUT GATES
    // ========================================================

    case "AND4":

      nodeChanged =
        setNodeValue(
          node,
          [a && b && c && d]
        );

      break;


    case "OR4":

      nodeChanged =
        setNodeValue(
          node,
          [a || b || c || d]
        );

      break;


    case "NAND4":

      nodeChanged =
        setNodeValue(
          node,
          [!(a && b && c && d)]
        );

      break;


    case "NOR4":

      nodeChanged =
        setNodeValue(
          node,
          [!(a || b || c || d)]
        );

      break;


    case "XOR4":

      nodeChanged =
        setNodeValue(
          node,
          [(a !== b) !== (c !== d)]
        );

      break;


    case "XNOR4":

      nodeChanged =
        setNodeValue(
          node,
          [((a === b) === c) === d]
        );

      break;


    // ========================================================
    // MUX
    // ========================================================

    case "MUX2":

      nodeChanged =
        setNodeValue(
          node,
          [c ? b : a]
        );

      break;


    case "MUX4":

      nodeChanged =
        setNodeValue(
          node,
          [
            f
              ? (e ? d : c)
              : (e ? b : a)
          ]
        );

      break;


    // ========================================================
    // OUTPUT
    // ========================================================

    case "BULB":

      nodeChanged =
        setNodeValue(
          node,
          [a]
        );

      break;


    // ========================================================
    // ADDERS
    // ========================================================

    case "HALF_ADDER":

      nodeChanged =
        setNodeValue(
          node,
          [
            a !== b,
            a && b
          ]
        );

      break;


    case "FULL_ADDER":

      nodeChanged =
        setNodeValue(
          node,
          [
            (a !== b) !== c,
            (a && b) ||
            (c && (a !== b))
          ]
        );

      break;


    // ========================================================
    // JK
    // ========================================================

    case "JK": {

      const j =
        a;

      const clk =
        b;

      const k =
        c;


      const oldQ =
        node.value?.[0] ?? false;

      const oldQbar =
        node.value?.[1] ?? !oldQ;

      const oldLastClock =
        node.lastClock ?? false;


      let q =
        oldQ;


      if (
        clk &&
        !oldLastClock
      ) {

        if (j && k) {
          q = !q;
        }

        else if (j && !k) {
          q = true;
        }

        else if (!j && k) {
          q = false;
        }
      }


      node.lastClock =
        clk;


      const nextValue = [
        q,
        !q
      ];


      nodeChanged =
        oldQ !== nextValue[0] ||
        oldQbar !== nextValue[1];


      node.value =
        nextValue;

      break;
    }


    // ========================================================
    // CUSTOM
    // ========================================================

    case "CUSTOM":

      nodeChanged =
        evaluateCustom(
          node,
          graph,
          createNodeMap(graph)
        );

      break;


    // ========================================================
    // SOURCES
    // ========================================================

    case "INPUT":
    case "CLOCK":
    case "EXT_SIGNAL":

      break;


    default:
      break;
  }


  return nodeChanged;
}


// ============================================================
// CREATE NODE MAP
// ============================================================

function createNodeMap(graph) {

  const map =
    new Map();


  for (
    const node of graph
  ) {

    map.set(
      node.id,
      node
    );
  }


  return map;
}


export function propagate(graph, id) {
  const source = graph[id];
  if (!source) return;

  let frontier = new Set(source.outputs ?? []);
  const MAX_STEPS = CONSTANTS.MAX_EVALUATION_ITERATIONS * 100;

  for (let step = 0; step < MAX_STEPS && frontier.size > 0; step++) {

    // Phase 1: compute next state of every frontier node from the SAME snapshot
    const results = [];
    for (const nid of frontier) {
      const node = graph[nid];
      if (!node) continue;
      if (node.type === "INPUT" || node.type === "CLOCK" || node.type === "EXT_SIGNAL") continue;

      const tmp = { ...node, value: copyValue(node.value) };
      const changed = evaluateNode(tmp, graph);   // reads OLD values only
      results.push({ node, tmp, changed });
    }

    // Phase 2: apply all at once, build next frontier
    const next = new Set();
    for (const { node, tmp, changed } of results) {
      node.lastClock = tmp.lastClock;             // JK edge memory
      if (changed) {
        node.value = tmp.value;
        for (const o of node.outputs ?? []) next.add(o);
      }
    }
    frontier = next;
  }

  if (frontier.size > 0) {
    console.warn("propagate(): did not settle (oscillation?)");
  }
}