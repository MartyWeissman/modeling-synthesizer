# Gentamicin Dosage Simulator

## Overview

This tool models the pharmacokinetics of gentamicin, an aminoglycoside antibiotic used to treat serious bacterial infections. The simulation shows how drug concentration changes over a 48-hour period with repeated dosing, helping visualize the balance between therapeutic efficacy and toxicity risk.

[VERIFY: Gentamicin pharmacokinetic model assumptions and typical clinical parameters]

## Parameters

### Dosage (30-300 mg)
The amount of gentamicin administered per dose. Higher doses produce higher peak concentrations. Default: 240 mg.

### Frequency (4-24 hours)
The interval between doses. Longer intervals allow drug levels to fall further between doses, affecting both trough levels and accumulation. Default: 18 hours.

### Infusion Duration (15-180 minutes)
The time over which each dose is administered intravenously. Longer infusion times produce lower, broader peaks. Default: 60 minutes.

### Half-life (1-8 hours)
The elimination half-life determines how quickly the drug is cleared from the body. Patients with impaired kidney function have longer half-lives. Default: 3 hours.

[VERIFY: Typical gentamicin half-life range in clinical populations]

## Components

### Concentration Graph
Displays gentamicin blood concentration (mg/L) over 48 hours.

- **Blue line**: Drug concentration over time
- **Green shaded region**: Therapeutic range (4-10 mg/L)
- **Red shaded region**: Toxic range (>12 mg/L)
- **Yellow vertical lines**: Dose administration times

### Information Display
Shows calculated values:
- **Peak**: Maximum concentration reached after dosing
- **Trough**: Minimum concentration before next dose
- **Ideal**: Target therapeutic range (4-10 mg/L)
- **Toxic**: Concentration associated with toxicity (>12 mg/L)

## What to Observe

1. **Therapeutic window**: Try to keep peaks below the toxic threshold while maintaining adequate trough levels for efficacy.

2. **Accumulation**: With frequent dosing or long half-life, observe how drug accumulates over multiple doses.

3. **Once-daily vs. traditional dosing**: Compare q24h high-dose regimens with q8h lower-dose regimens.

4. **Renal function effects**: Increase half-life to simulate impaired kidney function and observe drug accumulation.

5. **Infusion rate effects**: Compare rapid vs. slow infusions and their effect on peak concentrations.

## References

