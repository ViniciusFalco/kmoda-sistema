import { AlertTriangle, CheckCircle2, Database, Download, FileDown, Loader2, ShieldAlert, Table2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { buildBackupExport, buildCsvExport, downloadJsonFile, downloadTextFile, type CsvExportKind } from '../../lib/dataExport'
import { formatDateTimeBR } from '../../lib/utils'

const csvLabels: Record<CsvExportKind, string> = {
  products: 'Produtos',
  customers: 'Clientes',
  sales: 'Vendas',
  expenses: 'Despesas',
  stock: 'Estoque',
  cash: 'Caixa',
}

const warningCopy =
  'O backup será salvo localmente no seu computador. Guarde esse arquivo em um local seguro. A restauração/importação dos dados não é feita automaticamente pelo sistema. Existem dados nesse sistema que são sensíveis, tome muito cuidado ao exportar e guardar, sendo de total responsabilidade do administrador a segurança desse backup. Caso seja necessário restaurar um backup, entre em contato com o suporte para orçamento do serviço.'

const BACKUP_RECOMMENDED_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
const LAST_BACKUP_STORAGE_KEY_PREFIX = 'kmoda.last-backup-at'

function getLastBackupStorageKey(userId?: string | null) {
  return userId ? `${LAST_BACKUP_STORAGE_KEY_PREFIX}:${userId}` : LAST_BACKUP_STORAGE_KEY_PREFIX
}

function readLastBackupAt(storageKey: string) {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(storageKey)
}

function saveLastBackupAt(storageKey: string, value: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey, value)
}

function isValidDate(value?: string | null) {
  if (!value) {
    return false
  }

  return !Number.isNaN(new Date(value).getTime())
}

type SecurityDataSectionProps = {
  userId?: string | null
}

export function SecurityDataSection({ userId }: SecurityDataSectionProps) {
  const [exportingKind, setExportingKind] = useState<'backup' | CsvExportKind | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [lastBackupAt, setLastBackupAt] = useState(() => readLastBackupAt(getLastBackupStorageKey(userId)))
  const [now, setNow] = useState(() => Date.now())

  const backupStorageKey = getLastBackupStorageKey(userId)
  const hasLastBackup = isValidDate(lastBackupAt)
  const lastBackupDate = hasLastBackup ? new Date(lastBackupAt as string) : null
  const nextBackupDueAt = lastBackupDate ? new Date(lastBackupDate.getTime() + BACKUP_RECOMMENDED_INTERVAL_MS) : null
  const isBackupOverdue = !lastBackupDate || now > lastBackupDate.getTime() + BACKUP_RECOMMENDED_INTERVAL_MS

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  function resetMessages() {
    setSuccessMessage('')
    setErrorMessage('')
  }

  async function handleBackupExport() {
    setExportingKind('backup')
    resetMessages()

    try {
      const result = await buildBackupExport()
      downloadJsonFile(result.data, result.fileName)
      const exportedAt = result.data.meta.exported_at ?? new Date().toISOString()
      saveLastBackupAt(backupStorageKey, exportedAt)
      setLastBackupAt(exportedAt)
      setSuccessMessage('Backup completo gerado com sucesso.')

      if (result.warnings.length > 0) {
        setErrorMessage(`Algumas tabelas não puderam ser exportadas: ${result.warnings.join(' ')}`)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível gerar o backup completo.')
    } finally {
      setExportingKind(null)
    }
  }

  async function handleCsvExport(kind: CsvExportKind) {
    setExportingKind(kind)
    resetMessages()

    try {
      const result = await buildCsvExport(kind)
      downloadTextFile(result.csv, result.fileName, 'text/csv;charset=utf-8')
      setSuccessMessage(`Arquivo CSV de ${csvLabels[kind]} gerado com sucesso.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Não foi possível exportar ${csvLabels[kind].toLowerCase()}.`)
    } finally {
      setExportingKind(null)
    }
  }

  const isBusy = exportingKind !== null

  return (
    <div className="rounded-2xl border-2 border-gray-300 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="mb-4 flex items-start justify-center gap-4 border-b-2 border-gray-100 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-950 sm:text-base">Backup e Exportação de Dados</h2>
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-center rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <span className="flex items-center justify-center text-center gap-1 px-2 pb-3 text-sm font-bold text-yellow-700">
          <ShieldAlert className="h-4 w-4" />
          Aviso importante!
        </span>
          {warningCopy}
        </div>

        <div
          className={`rounded-xl border-2 p-4 text-sm leading-6 ${
            isBackupOverdue ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-300 bg-emerald-50 text-emerald-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isBackupOverdue ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {isBackupOverdue ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
            <div className="space-y-1">
              <p className="font-semibold">{isBackupOverdue ? 'Backup pendente' : 'Backup em dia'}</p>
              <p>
                {hasLastBackup && lastBackupAt
                  ? `Último backup realizado em ${formatDateTimeBR(lastBackupAt)}.`
                  : 'Nenhum backup foi realizado ainda.'}
              </p>
              <p>
                {isBackupOverdue
                  ? 'Recomendação: faça um backup pelo menos a cada 7 dias.'
                  : nextBackupDueAt
                    ? `Próximo backup recomendado até ${formatDateTimeBR(nextBackupDueAt.toISOString())}.`
                    : 'Recomendação: faça um backup pelo menos a cada 7 dias.'}
              </p>
            </div>
          </div>
        </div>

        {successMessage ? (
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-950">Backup completo</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Baixe uma cópia completa dos dados principais do sistema em formato JSON. Guarde com cuidado esse backup, ele pode conter informações sensíveis.
                </p>
              </div>
              <Database className="h-5 w-5 text-gray-400" />
            </div>

            <Button
              type="button"
              className="w-full justify-center"
              variant="primary"
              disabled={isBusy}
              onClick={() => {
                void handleBackupExport()
              }}
            >
              {exportingKind === 'backup' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exportingKind === 'backup' ? 'Gerando backup...' : 'Fazer backup completo'}
            </Button>
          </section>

          <section className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-950">Exportar dados em CSV</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Exporte dados específicos para abrir em planilhas como Excel ou Google Planilhas.
                </p>
              </div>
              <FileDown className="h-5 w-5 text-gray-400" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(csvLabels) as CsvExportKind[]).map((kind) => (
                <Button
                  key={kind}
                  type="button"
                  variant="secondary"
                  className="w-full justify-center"
                  disabled={isBusy}
                  onClick={() => {
                    void handleCsvExport(kind)
                  }}
                >
                  {exportingKind === kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Table2 className="h-4 w-4" />}
                  {exportingKind === kind ? 'Exportando...' : csvLabels[kind]}
                </Button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
