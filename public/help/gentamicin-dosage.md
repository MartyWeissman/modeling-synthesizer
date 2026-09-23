# Gentamicin Dosage Simulator

## Overview

Gentamicin is an antibiotic given by injection or infusion in hospitals. It is not broken down in the body; the kidneys clear it from the blood. This tool shows the gentamicin concentration in the blood over 48 hours of repeated doses, so you can look for a protocol that keeps the concentration in the therapeutic window and out of the toxic range.

The model is simplified. During each infusion, the concentration from that dose rises in a straight line to dose ÷ 14.3 L (a volume of distribution of about 0.2 L/kg for a 70 kg adult). After the infusion ends, it decays exponentially with the chosen half-life. The contributions of all doses are added.

## Parameters

**Dosage:** slider from 30 to 300 mg, default 240 mg. The amount given in each dose.

**Frequency:** slider from 4 to 24 hours, default 18 hours. The time between the starts of consecutive doses (the dosing interval). The first dose is at t = 0.

**Infusion duration:** slider from 15 to 180 minutes, default 60 minutes. How long each dose takes to run in. In this simplified model every dose reaches the same peak however long the infusion lasts; a longer infusion only makes the rise slower and the peak later.

**Half-life:** slider from 1 to 8 hours, default 3 hours. The time for the concentration to fall by half after an infusion. Kidney disease slows clearance and lengthens the half-life (the Lab Manual uses 6 hours for a patient with renal disease).

## Components

**Concentration graph:** gentamicin concentration (mg/L, axis 0–20) over 48 hours.

- **Blue line:** the concentration.
- **Green band, labeled "therapeutic 4–10":** the therapeutic window, 4–10 mg/L.
- **Red band, labeled "toxic > 12":** concentrations above 12 mg/L, where kidney and inner-ear damage are more likely.
- **Yellow vertical lines:** the start of each dose.

**Information display:**

- **Peak:** the highest concentration in the 48 hours.
- **Trough:** the lowest concentration from the start of the second dose onward (over the 48 hours shown).
- **Ideal:** the therapeutic window, 4–10 mg/L.
- **Toxic:** the toxic threshold, above 12 mg/L.

## What to Observe

1. **Therapeutic window:** adjust dosage, frequency and infusion duration to keep the curve in the green band as long as possible and out of the red band.
2. **Accumulation:** with frequent doses or a long half-life, a new dose starts before the last one has cleared, and the levels build up.
3. **Kidney function:** double the half-life from 3 to 6 hours and see how your protocol needs to change.
4. **Dosing interval:** compare one large dose a day with smaller, more frequent doses.
