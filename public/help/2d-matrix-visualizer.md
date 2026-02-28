# 2D Matrix Visualizer

## Overview
This tool visualizes how a 2×2 matrix acts as a linear map on the plane. Choose a shape, apply the matrix repeatedly to watch it transform, place tracked points, and explore eigenvalues and matrix properties.

## Parameters

**Matrix M:** A 2×2 grid of number inputs (precision to 3 decimal places), default is the identity matrix [[1, 0], [0, 1]]. Each entry can be edited directly. The matrix is applied to the current shape when you press Next State.

**Shape:** Wheel selector choosing from five shapes: Unit Circle, Unit Square, Centered Square, Standard Basis, Plus Sign. Changing the shape resets to the original and clears tracked points.

**Zoom:** Numeric input, adjusts between 1 and 1000, default 3. Sets the view range as ±value on both axes. Increase after applying M repeatedly if the shape moves out of view.

## Components

**Visualization Canvas:** The large 6×6 canvas on the left displays the current state of the shape as a colored triangle mesh. Colors are assigned by the original polar coordinates of each point — hue encodes angle (direction from origin) and lightness encodes radius (distance from origin) — so the coloring stays fixed to the original shape even as it transforms. As the shape degenerates under repeated matrix application, triangles gracefully fade to line segments and then dots. Click anywhere on the canvas to place a tracked point at that location.

**Next State button (green):** Applies matrix M once to the current shape and all tracked points, incrementing the step counter. The legend in the top-left of the canvas shows the current state as "Original shape", "M · shape", "M² · shape", etc.

**Show/Hide Eigenvecs toggle:** When enabled, draws the real eigenvectors of M as arrows from the origin. The eigenvector for the larger-magnitude eigenvalue is labeled λ, the smaller μ. Each eigenvector is shown as a solid arrow in one direction and a dashed line in the opposite direction. Only available when eigenvalues are real; no arrows are drawn for complex eigenvalues.

**Reset Shape button:** Resets the shape to its original (undeformed) state, clears all tracked points, and resets the step counter to 0.

**Reset Points button:** Clears all tracked points without resetting the shape or step count.

**Reset M = I button:** Resets matrix M to the identity matrix [[1, 0], [0, 1]].

**Properties Display:** Shows three lines of matrix information:
- *det M* and *tr M* on one line (det is highlighted in amber if the matrix is singular)
- A label identifying the eigenvalue type: "Two real eigenvalues:", "One repeated eigenvalue:", or "Complex conjugate eigenvalues:"
- The eigenvalue values: λ and μ for real cases, or λ, μ = a ± bi for complex

## What to Observe

- Start with the default identity matrix and press **Next State** — the shape is unchanged, illustrating that I is the "do nothing" transformation.
- Enter a matrix like [[2, 0], [0, 0.5]] (stretch x, compress y) and press **Next State** repeatedly to see the shape stretch in one direction and compress in the other.
- Try [[0, -1], [1, 0]] (90° rotation) — the unit circle stays a circle, but the square rotates. The eigenvalues will be complex conjugates.
- Enter a matrix with a repeated eigenvalue (e.g., [[1, 1], [0, 1]], a shear) and observe "One repeated eigenvalue" in the properties display.
- Toggle **Show/Hide Eigenvecs** to see the eigenvector directions overlaid on the canvas. Notice how the shape stretches or compresses along these directions under repeated application.
- Click on the canvas to place a tracked point, then press **Next State** to watch it move with the transformation. Place a point on an eigenvector direction to see it stay on that line.
- After several steps, increase **Zoom** if the shape has moved far from the origin.
- Switch shapes using the wheel selector to compare how different starting shapes reveal different properties of the same matrix (e.g., the unit circle always maps to an ellipse under any invertible matrix).
- Watch the **det M** value — if it is 0, the matrix is singular and the shape will collapse to a lower-dimensional object (a line or a point).

## References
[To be added]
