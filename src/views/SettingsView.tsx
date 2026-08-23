import { useRef, useState, type ChangeEvent } from 'react'
import { Archive, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { exportFullBackup, importFullBackup } from '@/lib/backup'
import {
  getStoredSessionBatchSize,
  persistSessionBatchSize,
  SESSION_BATCH_OPTIONS,
  sessionBatchLabel,
  type SessionBatchSize,
} from '@/lib/studyMode'
import { cn } from '@/lib/utils'

export function SettingsView() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [batchSize, setBatchSize] = useState<SessionBatchSize>(() =>
    getStoredSessionBatchSize(),
  )
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [pendingBackupFile, setPendingBackupFile] = useState<File | null>(null)

  const backupBusy = isExporting || isImporting

  function chooseBatchSize(size: SessionBatchSize) {
    setBatchSize(size)
    persistSessionBatchSize(size)
  }

  function clearBackupFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleExportBackup() {
    if (backupBusy) return
    setIsExporting(true)
    try {
      await exportFullBackup()
      toast.success('Backup downloaded successfully')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Backup export failed',
      )
    } finally {
      setIsExporting(false)
    }
  }

  function handleImportClick() {
    if (backupBusy) return
    fileInputRef.current?.click()
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setPendingBackupFile(file)
    setRestoreDialogOpen(true)
  }

  function handleRestoreCancel() {
    setRestoreDialogOpen(false)
    setPendingBackupFile(null)
    clearBackupFileInput()
  }

  async function handleRestoreConfirm() {
    if (!pendingBackupFile || isImporting) return

    setIsImporting(true)
    try {
      await importFullBackup(pendingBackupFile)
      toast.success('Backup restored successfully')
      window.location.reload()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Backup import failed',
      )
      setRestoreDialogOpen(false)
      setPendingBackupFile(null)
      clearBackupFileInput()
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="m-0 text-3xl tracking-tight">Settings</h1>
        <p className="m-0 text-sm text-muted-foreground">
          Appearance and study preferences.
        </p>
      </header>

      <div className="space-y-3">
        <h2 className="m-0 text-lg font-semibold tracking-tight">Preferences</h2>
        <ul className="flex flex-col gap-2">
          <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div>
              <p className="m-0 text-sm font-semibold">Theme</p>
              <p className="m-0 text-xs text-muted-foreground">
                Switch between light and dark.
              </p>
            </div>
            <ThemeToggle />
          </li>
          <li className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="space-y-3">
              <div>
                <p className="m-0 text-sm font-semibold">Session size</p>
                <p className="m-0 text-xs text-muted-foreground">
                  How many cards to review each session (10 / 20 / 40 / All).
                </p>
              </div>
              <div
                className="grid grid-cols-4 gap-2"
                role="radiogroup"
                aria-label="Session size"
              >
                {SESSION_BATCH_OPTIONS.map((size) => {
                  const selected = batchSize === size
                  return (
                    <button
                      key={String(size)}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => chooseBatchSize(size)}
                      className={cn(
                        'h-10 rounded-lg border text-sm font-semibold transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:bg-muted/40',
                      )}
                    >
                      {sessionBatchLabel(size)}
                    </button>
                  )
                })}
              </div>
            </div>
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="m-0 text-lg font-semibold tracking-tight">Data Management</h2>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="m-0 text-sm font-semibold">Full backup</p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            Export or restore all decks, cards, reviews, stats, and images.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="sm:flex-1"
              disabled={backupBusy}
              onClick={() => void handleExportBackup()}
            >
              {isExporting ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Archive aria-hidden />
              )}
              {isExporting ? 'Exporting…' : 'Export Backup (.zip)'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="sm:flex-1"
              disabled={backupBusy}
              onClick={handleImportClick}
            >
              {isImporting ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Upload aria-hidden />
              )}
              {isImporting ? 'Restoring…' : 'Import Backup'}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            hidden
            onChange={handleFileSelect}
          />
        </div>
      </div>

      <AlertDialog
        open={restoreDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isImporting) handleRestoreCancel()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite Database?</AlertDialogTitle>
            <AlertDialogDescription>
              This will completely erase your current progress, decks, and
              settings, and replace them with the backup. This action cannot be
              undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isImporting}
              onClick={(event) => {
                event.preventDefault()
                void handleRestoreConfirm()
              }}
            >
              {isImporting ? 'Restoring…' : 'Yes, Restore Backup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
