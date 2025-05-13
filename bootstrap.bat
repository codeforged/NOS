@echo off
:loop
echo Starting
node nos.js %1 %2 %3 %4
set "exitcode=%ERRORLEVEL%"

if "%exitcode%"=="0" (
  echo .
  echo .
  echo System halted.
  goto end
) else if "%exitcode%"=="1" (
  echo Restarting
  goto loop
) else (
  echo Error code: %exitcode%
  goto end
)

:end
