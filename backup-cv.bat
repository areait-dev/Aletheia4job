@echo off
REM Backup incrementale dei file CV di Supabase Storage (cvs, candidates) in locale.
REM Doppio clic per avviarlo a mano. Pianificato: vedi docs/backup-storage.md (argomento "auto" = niente pausa finale).
setlocal
cd /d "%~dp0"
set "BACKUP_DEST=%USERPROFILE%\Desktop\Progetti next\backup-db\storage"
set "BACKUP_LOG_DIR=%USERPROFILE%\Desktop\Progetti next\backup-db\log"

call npx tsx scripts/maintenance/storage-download-buckets.ts
set "ESITO=%ERRORLEVEL%"

echo.
if "%ESITO%"=="0" (echo BACKUP COMPLETATO) else (echo BACKUP CON ERRORI - codice %ESITO% - vedi %BACKUP_LOG_DIR%\backup-storage.log)
if /i not "%~1"=="auto" pause
exit /b %ESITO%
