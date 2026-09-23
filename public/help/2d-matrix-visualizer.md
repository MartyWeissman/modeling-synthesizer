# 2D Matrix Visualizer

## Overview
This tool visualizes how a 2×2 matrix acts as a linear map on the plane. Choose a shape, apply the matrix repeatedly to watch it transform, place tracked points, and explore eigenvalues and matrix properties.

## Parameters

**Matrix M:** A 2×2 grid of numbers, default the identity matrix [[1, 0], [0, 1]]. Click an entry and type a number; Tab or Enter moves to the next entry. The matrix is applied to the current shape when you press Next State.

**Shape:** Wheel selector choosing from five shapes: Unit Circle, Unit Square, Centered Square, Standard Basis, Plus Sign. Changing the shape resets to the original and clears tracked points.

**Range ±:** Numeric input from 0.1 to 1000 (decimals allowed), default 3. Each axis runs from −value to +value, so a larger value zooms out. Increase it if the shape or points move out of view; decrease it to look closely near the origin.

## Components

**Visualization Canvas:** The large 6×6 canvas on the left displays the current state of the shape as a colored triangle mesh. Colors are assigned by the original polar coordinates of each point — hue encodes the angle (direction from the origin), and the lightness varies in periodic bands with the distance from the origin (one light-to-dark cycle per unit of distance) — so the coloring stays attached to the original points even as the shape transforms. As the shape degenerates under repeated matrix application, triangles gracefully fade to line segments and then dots. Click anywhere on the canvas to place a tracked point at that location. Each time you press Next State the point moves to M times its old position, and a thin trail with small dots shows its earlier positions.

**Next State button (green):** Applies matrix M once to the current shape and all tracked points, incrementing the step counter. The legend in the top-left of the canvas shows the current state as "Original shape", "M · shape", "M² · shape", etc. If you edit M between steps, the shape is no longer a power of the current M, and the legend says "After n steps (M was edited)" instead.

**Show/Hide Eigenvecs toggle:** When enabled, draws the real eigenvectors of M as arrows from the origin, labeled with their eigenvalues. The eigenvector for the eigenvalue of larger magnitude is labeled λ, the other μ. Each eigenvector direction is shown as a solid arrow one way and a dashed line the other way (an eigenvector can point either way). Longer arrows mean larger |eigenvalue|, but every arrow has a minimum length, so the direction of a zero eigenvalue (the direction M collapses) is still visible. If M = kI (a multiple of the identity), every direction is an eigenvector and both axes are drawn. If M has a repeated eigenvalue with only one eigenvector direction (such as a shear), one arrow is drawn. No arrows are drawn for complex eigenvalues.

**Reset Shape button:** Resets the shape to its original (undeformed) state, clears all tracked points, and resets the step counter to 0.

**Reset Points button:** Clears all tracked points without resetting the shape or step count.

**Reset M = I button:** Resets matrix M to the identity matrix [[1, 0], [0, 1]].

**Properties Display:** Shows four lines of matrix information:
- *det M* and *tr M* (det is highlighted in amber, with "singular", if it is 0)
- The eigenvalue type: "Two real eigenvalues", "Repeated; M = λI, every vector is an eigenvector", "Repeated; only one eigenvector direction", or, for complex eigenvalues, their modulus |λ| and argument arg λ (the angle the map turns each step)
- The eigenvalues: λ and μ for real cases, or λ, μ = a ± bi for complex
- "Long run": a one-line summary of what happens to the shape if you keep pressing Next State (for example "shrinks to 0 along λ", "stretches along λ, shrinks along μ", "spirals in to 0, turning 45.0° per step")

## What to Observe

- Start with the default identity matrix and press **Next State** — the shape is unchanged, illustrating that I is the "do nothing" transformation.
- Enter a matrix like [[2, 0], [0, 0.5]] (stretch x, compress y) and press **Next State** repeatedly to see the shape stretch in one direction and compress in the other.
- Try [[0, -1], [1, 0]] (90° rotation) — the unit circle stays a circle, but the square rotates. The eigenvalues will be complex conjugates.
- Enter a matrix with a repeated eigenvalue: compare [[2, 0], [0, 2]] (every direction is an eigenvector) with the shear [[1, 1], [0, 1]] (only one eigenvector direction).
- Toggle **Show/Hide Eigenvecs** to see the eigenvector directions overlaid on the canvas. Notice how the shape stretches or compresses along these directions under repeated application.
- Click on the canvas to place a tracked point, then press **Next State** several times and follow its trail. Place a point on an eigenvector direction to see it stay on that line.
- After several steps, increase **Range ±** if the shape has moved far from the origin.
- Switch shapes using the wheel selector to compare how different starting shapes reveal different properties of the same matrix (e.g., any invertible matrix maps the unit circle to an ellipse).
- Watch the **det M** value: |det M| is the factor by which areas change at each step. If det M = 0, the matrix is singular and the shape collapses onto a line (or to a point).
