@echo off
rem Double-click to start the AI cost meter: helper plus full-screen page on the second display.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-meter.ps1" %*
