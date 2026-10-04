@echo off
rem Pre-warms the Deal Room model. Launch from a minimized shortcut on stage.
cd /d "%~dp0"
node prewarm.mjs deal-room
