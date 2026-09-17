Put logo.png here (same folder as this file).
Vite serves everything in /public at the site root, so logo.png here becomes
available at /logo.png, which is exactly what the header component looks for.
If it's missing, the header just falls back to showing "MIA DYNAMICS" as text,
so nothing breaks either way.
