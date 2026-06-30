# Fluid timer controls

**Date:** 2026-06-26  
**Branch:** `tracker-ui-timer-control-display-size-fluid-fix`

Action buttons and timer cards scale responsively. Buttons collapse to icon-only below 640px. Timer text uses `clamp()`. Cards stay in 3-column row down to 500px before stacking vertically. Also fixed pause button innerHTML in JS (3 places) to preserve responsive span classes.

