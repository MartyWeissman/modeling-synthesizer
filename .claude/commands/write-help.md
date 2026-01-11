# Write Help File for Tool

Write a help file for the specified tool. Follow this workflow exactly.

## Arguments
- `$ARGUMENTS` - The tool ID (e.g., "caffeine-metabolism", "insulin-glucose")

## Workflow

### Step 1: Locate and Read the Tool Source

Find the tool component file:
1. Check `src/data/tools.js` to find the component import for the tool ID
2. Read the full tool source file (e.g., `src/tools/CaffeineMetabolismTool.jsx`)

**Do not proceed until you have read the entire tool source file.**

### Step 2: Extract Facts from Code

Create a mental inventory of everything in the tool. Extract:

**Parameters (from useState calls):**
- Variable name and default value
- Find the corresponding UI control (GridSliderHorizontal, GridInput, GridStaircase, GridTimePicker, etc.)
- Extract min/max/range from control props
- Note the label text exactly as written

**UI Components (all GridXxx components):**
- GridGraph/GridGraphDualY: axis labels, units, ranges, what it displays
- GridDisplay: what information it shows
- GridLabel: any explanatory text or equations
- GridButton: what actions they trigger
- GridWindow: what interactive area it provides
- Any canvas drawing: what visualizations are rendered

**Equations:**
- Note any `<Equation name="..." />` references
- Check `src/equations/` for the actual MathML if needed

### Step 3: Write the Help File

Create the file at `public/help/{tool-id}.md` with these sections:

#### Overview
- 1-2 sentences describing what the tool models
- Keep biological context minimal
- Mark any biological claims with [VERIFY] for human review
- Do NOT invent mechanisms or details not evident from the code

#### Parameters
List every adjustable parameter in this format:
```
**Parameter Name (symbol):** [Control type] adjusts between [min] and [max], default [value]. [Brief description of what it represents - mark biological claims with [VERIFY]]
```

Example:
```
**Metabolic Rate (μ):** Slider adjusts between 0.0 and 0.5 hr⁻¹, default 0.2. Represents the first-order decay rate of caffeine. [VERIFY: typical physiological range]
```

For discrete controls like GridStaircase, list the available levels:
```
**Dose Amount:** Staircase selector with levels: 0mg, 40mg, 80mg, 120mg, 160mg, 200mg. Default 120mg (level 3).
```

#### Components
Describe every non-parameter UI element:
```
**Main Graph:** Displays [y-axis label] vs [x-axis label] over [range]. [What the visualization shows]
```

Example:
```
**Caffeine Graph:** Displays caffeine concentration (mg) vs time (hours) over a 72-hour period. Shows how caffeine levels rise after each dose and decay exponentially between doses.
```

Include displays, labels with equations, buttons, and any other UI elements.

#### What to Observe
Combine observations with actions. Each item should reference actual UI controls:
```
- Adjust [specific control] to observe [specific effect visible in specific component]
- Set [parameter] to [value] and notice [observable result]
```

Only describe behaviors that are actually implemented in the code. Do not invent features.

#### References
**Leave this section empty.** Write only:
```
## References
[To be added]
```

References will be provided by the user if needed.

### Step 4: Verification Checklist

Before finishing, verify:
- [ ] Every useState parameter is documented with correct default
- [ ] Every range/min/max matches the actual component props
- [ ] Every GridXxx component is described
- [ ] No features are described that don't exist in the code
- [ ] All biological claims are marked [VERIFY]
- [ ] No references are invented

## Output

Write the help file to `public/help/{tool-id}.md` and summarize:
1. Number of parameters documented
2. Number of components documented  
3. Items marked [VERIFY] that need human review
