# Fetch holidays from rekini123.lv and likumi.lv

**Date:** 2026-06-25  
**Status:** Rejected

Originally planned to fetch holiday data from Latvian government sources via API. Rejected because holiday parsing was implemented as a separate `calendar2json` module (external tool, outside project scope). The app consumes pre-generated JSON files in `resources/` instead.
