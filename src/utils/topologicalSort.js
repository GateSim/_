export function topologicalOrderAndReindex(graph) {

    let remaining = graph.map(node => ({
        ...node,

        // Deep-copy inputs
        inputs: (node.inputs ?? []).map(input =>
            input === null
                ? null
                : { ...input }
        ),

        // Deep-copy outputs
        outputs: (node.outputs ?? []).map(id => id)
    }));


    const newGraph = [];
    const idMap = new Map();


    // ============================================================
    // 1. Add source nodes
    // ============================================================

    for (let i = remaining.length - 1; i >= 0; i--) {

        const node = remaining[i];

        if (
            node.type === "INPUT" ||
            node.type === "CLOCK"
        ) {

            const oldId = node.id;
            const newId = newGraph.length;

            idMap.set(oldId, newId);

            node.id = newId;

            newGraph.push(node);
            remaining.splice(i, 1);
        }
    }


    // ============================================================
    // 2. Topological ordering
    // ============================================================

    let progress = true;

    while (remaining.length > 0 && progress) {

        progress = false;

        for (let i = 0; i < remaining.length; i++) {

            const node = remaining[i];

            const allInputsReady = node.inputs.every(input =>
                input === null ||
                idMap.has(input.id)
            );

            if (allInputsReady) {

                const oldId = node.id;
                const newId = newGraph.length;

                idMap.set(oldId, newId);

                node.id = newId;

                newGraph.push(node);
                remaining.splice(i, 1);

                progress = true;
                break;
            }
        }
    }


    // ============================================================
    // 3. Add cyclic nodes
    // ============================================================

    for (const node of remaining) {

        const oldId = node.id;
        const newId = newGraph.length;

        idMap.set(oldId, newId);

        node.id = newId;

        newGraph.push(node);
    }


    // ============================================================
    // 4. Remap input IDs AND output IDs
    // ============================================================

    for (const node of newGraph) {

        // --------------------------------------------------------
        // Inputs
        // --------------------------------------------------------

        node.inputs = (node.inputs ?? []).map(input => {

            // Disconnected input
            if (input === null) {
                return null;
            }

            // Valid connection
            if (idMap.has(input.id)) {
                return {
                    id: idMap.get(input.id),
                    index: input.index
                };
            }

            // Invalid / stale connection
            return null;
        });


        // --------------------------------------------------------
        // Outputs
        // --------------------------------------------------------

        node.outputs = (node.outputs ?? [])
            .filter(outputId => idMap.has(outputId))
            .map(outputId => idMap.get(outputId));
    }


    // ============================================================
    // 5. Rebuild clock delays
    // ============================================================

    const new_clock_delays = [];

    for (const node of newGraph) {

        if (node.type === "CLOCK") {

            new_clock_delays.push({
                id: node.id,
                delay: node.delay,
                next_delay:
                    performance.now() + node.delay
            });
        }
    }


    return [
        newGraph,
        new_clock_delays,
        idMap
    ];
}