import re

log_data = """
Propagation steps: 514
useCircuit.js:49 Propagation time: 699.9999992549419 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 600.0000014901161 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 500 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 500 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 500 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 500 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 400.0000022351742 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 399.9999985098839 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 400.0000022351742 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 500 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 599.9999977648258 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 500 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 400.0000022351742 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 399.9999985098839 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 500 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 599.9999977648258 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 500 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 500 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 500 µs
useCircuit.js:48 Propagation steps: 514
useCircuit.js:49 Propagation time: 500 µs
"""

# Extract all floating-point numbers immediately following "Propagation time: "
times = [float(match) for match in re.findall(r"Propagation time:\s+([\d.]+)", log_data)]

if times:
    average_time = sum(times) / len(times)
    
    print("Extracted Times Array (µs):")
    for t in times:
        print(f"  {t}")
        
    print(f"\nTotal values processed: {len(times)}")
    print(f"Average time: {average_time:.2f} µs")
else:
    print("No time values found in the provided log data.")