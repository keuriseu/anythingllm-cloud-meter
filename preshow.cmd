@echo off
rem Double-click right before the show: resets workspaces and chats, warms up the models, starts the meter.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0preshow.ps1"
