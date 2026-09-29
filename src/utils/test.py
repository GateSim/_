import re

log_data = """
Propagation steps: 2050
useCircuit.js:49 Propagation time: 1500 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1199.999999254942 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1000 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1000 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1000 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1000 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1000 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1100.0000014901161 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 900.0000022351742 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1000 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 899.9999985098839 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1100.0000014901161 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1000 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 899.9999985098839 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1000 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1000 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 899.9999985098839 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1100.0000014901161 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1500 µs
useCircuit.js:48 Propagation steps: 2050
useCircuit.js:49 Propagation time: 1000 µs




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