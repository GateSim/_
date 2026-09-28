// hooks/useCircuit.js

import {
  evaluate,
  propagate
} from "../utils/evaluate";

import {
  topologicalOrderAndReindex
} from "../utils/topologicalSort";

import * as CONSTANTS from "../constants/constants";

import {
  benchmarkCircuit
} from "../utils/benchmark";


export function useCircuit(
  graph,
  setGraph,
  clock_delays,
  setClockDelays,
  view,
  addToUndoStack,
  setoPin,
  setSelectedGate,
  setSelectedWire,
  setShowClockWindow,
  setClockDelayInput,
  onReindex
) {


  // ============================================================
  // INPUT COUNT
  // ============================================================

  function getInputCount(gate) {

    switch (gate) {

      case "NOT":
        return 1;

      case "AND":
      case "OR":
      case "NAND":
      case "NOR":
      case "XOR":
      case "XNOR":
      case "HALF_ADDER":
        return 2;

      case "AND3":
      case "OR3":
      case "NAND3":
      case "NOR3":
      case "XOR3":
      case "XNOR3":
      case "MUX2":
      case "FULL_ADDER":
        return 3;

      case "AND4":
      case "OR4":
      case "NAND4":
      case "NOR4":
      case "XOR4":
      case "XNOR4":
        return 4;

      case "MUX4":
        return 6;

      default:
        return 0;
    }
  }


  // ============================================================
  // TOGGLE
  // ============================================================

  function toggle(id) {

    // ----------------------------------------------------------
    // Reindex graph first.
    // ----------------------------------------------------------

    const [
      newgraph,
      new_clock_delays,
      idMap
    ] =
      topologicalOrderAndReindex(
        graph
      );


    // ----------------------------------------------------------
    // Find new ID after reindexing.
    // ----------------------------------------------------------

    const newId =
      idMap.get(id);


    if (
      newId === undefined
    ) {

      console.warn(
        `toggle(): Node ${id} disappeared during reindex.`
      );

      return;
    }


    const node =
      newgraph[newId];


    if (!node) {
      return;
    }


    // ----------------------------------------------------------
    // Toggle source.
    //
    // We do NOT evaluate the source itself.
    //
    // propagate() starts from its already-changed outputs.
    // ----------------------------------------------------------

    node.value = [
      !(node.value?.[0] ?? false)
    ];


    // ----------------------------------------------------------
    // Propagate only through the affected region.
    // ----------------------------------------------------------

    propagate(
      newgraph,
      newId
    );


    // ----------------------------------------------------------
    // Save result.
    // ----------------------------------------------------------

    setGraph(
      newgraph
    );


    setClockDelays(
      new_clock_delays
    );


    if (onReindex) {
      onReindex(
        idMap
      );
    }
  }


  // ============================================================
  // ADD GATE
  // ============================================================

  function Add(
    gate,
    wireData = null,
    inputpin = null,
    clockDelay = null,
    customComponent = null
  ) {

    if (!gate) {
      return;
    }


    // ==========================================================
    // CLOCK
    // ==========================================================

    if (
      gate === "CLOCK" &&
      clockDelay === null
    ) {

      setClockDelayInput(
        ""
      );

      setShowClockWindow(
        true
      );

      return;
    }


    addToUndoStack(
      graph,
      clock_delays
    );


    let newGate;


    // ==========================================================
    // CLOCK
    // ==========================================================

    if (gate === "CLOCK") {

      const delay =
        Number(clockDelay);


      newGate = {

        type:
          gate,

        id:
          graph.length,

        value: [
          false
        ],

        inputs: [],

        outputs: [],

        x:
          view.x +
          view.width / 2,

        y:
          view.y +
          view.height / 2,

        z:
          Math.max(
            0,
            ...graph.map(
              node =>
                node.z ?? 0
            )
          ) + 1,

        rotation:
          0,

        delay:
          delay
      };


      const newdelay = {

        id:
          graph.length,

        delay:
          delay,

        next_delay:
          performance.now() +
          delay
      };


      setClockDelays(
        prev => [
          ...prev,
          newdelay
        ]
      );
    }


    // ==========================================================
    // WIRE
    // ==========================================================

    else if (
      gate === "WIRE"
    ) {

      newGate = {

        type:
          gate,

        id:
          graph.length,

        value: [
          false
        ],

        outputs: [],

        path:
          wireData.path,

        inputs: [
          {
            id:
              wireData.inputId,

            index:
              wireData.outputIndex
          }
        ]
      };


      console.log(
        "else if of wire entered"
      );
    }


    // ==========================================================
    // CUSTOM
    // ==========================================================

    else if (
      gate === "CUSTOM"
    ) {

      if (!customComponent) {
        return;
      }


      const n =
        new Set(
          customComponent.inputs.map(
            x =>
              x.sourceId
          )
        ).size;


      newGate = {

        type:
          "CUSTOM",

        id:
          graph.length,

        outputs: [],

        name:
          customComponent.name,

        inputs:
          Array(n).fill(null),

        ext_inputs:
          structuredClone(
            customComponent.inputs
          ),

        value:
          customComponent.outputs.map(
            () => false
          ),

        ext_outputs:
          structuredClone(
            customComponent.outputs
          ),

        ref_graph:
          structuredClone(
            customComponent.ref_graph
          ),

        x:
          view.x +
          view.width / 2,

        y:
          view.y +
          view.height / 2,

        z:
          Math.max(
            0,
            ...graph.map(
              node =>
                node.z ?? 0
            )
          ) + 1,

        rotation:
          0
      };


      console.table(
        newGate
      );
    }


    // ==========================================================
    // TEXT
    // ==========================================================

    else if (
      gate === "TEXT"
    ) {

      newGate = {

        type:
          "TEXT",

        id:
          graph.length,

        text:
          "Label",

        x:
          view.x +
          view.width / 2,

        y:
          view.y +
          view.height / 2,

        z:
          Math.max(
            0,
            ...graph.map(
              node =>
                node.z ?? 0
            )
          ) + 1,

        rotation:
          0,

        inputs: [],

        value: []
      };
    }


    // ==========================================================
    // NORMAL GATE
    // ==========================================================

    else {

      newGate = {

        type:
          gate,

        id:
          graph.length,

        value: [
          false
        ],

        outputs: [],

        inputs:
          Array(
            getInputCount(
              gate
            )
          ).fill(null),

        x:
          view.x +
          view.width / 2,

        y:
          view.y +
          view.height / 2,

        z:
          Math.max(
            0,
            ...graph.map(
              node =>
                node.z ?? 0
            )
          ) + 1,

        rotation:
          0
      };
    }


    // ==========================================================
    // CONNECT
    // ==========================================================

    const oldId =
      newGate.id;


    if (wireData) {

      graph[
        wireData.inputId
      ].outputs.push(
        newGate.id
      );
    }


    if (inputpin) {

      graph[
        inputpin.gateId
      ].inputs[
        inputpin.gateIndex
      ] = {

        id:
          newGate.id,

        index:
          0
      };


      newGate.outputs.push(
        inputpin.gateId
      );


      console.log(
        "if inputpin entered"
      );


      const current_input =
        graph[
          inputpin.gateId
        ];


      if (
        current_input.type ===
        "CUSTOM"
      ) {

        let nullCount =
          0;


        for (
          const node of
          current_input.ref_graph
        ) {

          if (!node.inputs) {
            continue;
          }


          for (
            let i = 0;
            i < node.inputs.length;
            i++
          ) {

            if (
              node.inputs[i] === null
            ) {

              if (
                nullCount ===
                inputpin.gateIndex
              ) {

                node.inputs[i] = {

                  id:
                    newGate.id,

                  index:
                    0
                };


                break;
              }


              nullCount++;
            }
          }
        }
      }
    }


    // ==========================================================
    // REINDEX
    // ==========================================================

    const [
      newGraph,
      new_clock_delays,
      idMap
    ] =
      topologicalOrderAndReindex(
        [
          ...graph,
          newGate
        ]
      );


    // ==========================================================
    // INITIAL SETTLE AFTER EDIT
    //
    // This is only for establishing values after a circuit
    // modification. Runtime propagation uses propagate().
    // ==========================================================

    for (
      let i = 0;
      i <
      CONSTANTS.MAX_EVALUATION_ITERATIONS;
      i++
    ) {

      const changed =
        evaluate(
          newGraph
        );


      if (!changed) {
        break;
      }
    }


    const newId =
      idMap.get(
        oldId
      );


    if (onReindex) {
      onReindex(
        idMap
      );
    }


    setGraph(
      newGraph
    );


    setClockDelays(
      new_clock_delays
    );


    console.log(
      `in Add(), newId = ${newId}`
    );


    return newId;
  }


  // ============================================================
  // CLEAR GRAPH
  // ============================================================

  function clearGraph() {

    if (
      graph.length === 0
    ) {

      alert(
        "Circuit is already empty."
      );

      return;
    }


    if (
      window.confirm(
        "Are you sure you want to clear the circuit?"
      )
    ) {

      addToUndoStack(
        graph,
        clock_delays
      );


      setGraph(
        []
      );


      setClockDelays(
        []
      );
    }
  }


  // ============================================================
  // BENCHMARK
  // ============================================================

  function runBenchmark(
    options = {}
  ) {

    return benchmarkCircuit(
      graph,
      options
    );
  }


  // ============================================================
  // RETURN
  // ============================================================

  return {

    toggle,

    Add,

    clearGraph,

    runBenchmark
  };
}