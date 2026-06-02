import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import { formatDateTimeBR } from '../../lib/utils'
import { loadAppPauseRisk, loadKmodaStorageUsage, getMonitoringPauseLabel, getMonitoringSpaceLabel } from '../../lib/monitoring'
import { loadDisplayName, saveDisplayName } from '../../lib/profileSettings'
import { isSupabaseConfigured } from '../../lib/supabase'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import type { AppPauseRisk, KmodaStorageUsage, MonitoringPauseRisk, MonitoringSpaceStatus } from '../../types/database'

type SettingsTab = 'geral' | 'monitoramento'

const tabs: Array<{ key: SettingsTab; label: string }> = [
  { key: 'geral', label: 'Geral' },
  { key: 'monitoramento', label: 'Monitoramento' },
]

const supportWhatsAppUrl = 'https://wa.me/5532984669122?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20no%20Kmoda'

function formatMegabytes(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-'
  }

  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} MB`
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-'
  }

  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`
}

function badgeClass(status: MonitoringSpaceStatus | MonitoringPauseRisk | 'indisponivel') {
  switch (status) {
    case 'normal':
    case 'baixo':
      return 'border-emerald-300 bg-emerald-50 text-emerald-700'
    case 'attention':
    case 'médio':
      return 'border-amber-300 bg-amber-50 text-amber-800'
    case 'warning':
    case 'alto':
      return 'border-orange-300 bg-orange-50 text-orange-800'
    case 'critical':
    case 'crítico':
      return 'border-red-300 bg-red-50 text-red-700'
    default:
      return 'border-gray-300 bg-gray-100 text-gray-600'
  }
}

function fillClass(status: MonitoringSpaceStatus | MonitoringPauseRisk | 'indisponivel') {
  switch (status) {
    case 'normal':
    case 'baixo':
      return 'bg-emerald-600'
    case 'attention':
    case 'médio':
      return 'bg-amber-500'
    case 'warning':
    case 'alto':
      return 'bg-orange-600'
    case 'critical':
    case 'crítico':
      return 'bg-red-600'
    default:
      return 'bg-gray-300'
  }
}

function statusCopy(status: MonitoringSpaceStatus | MonitoringPauseRisk | 'indisponivel') {
  switch (status) {
    case 'normal':
      return 'Tudo dentro do esperado.'
    case 'attention':
      return 'Uso subindo, mas ainda controlado.'
    case 'warning':
      return 'O limite está ficando próximo.'
    case 'critical':
      return 'Ação recomendada imediatamente.'
    case 'baixo':
      return 'Ainda há bastante tempo disponível.'
    case 'médio':
      return 'Já vale acompanhar com frequência.'
    case 'alto':
      return 'A janela de pausa está próxima.'
    case 'crítico':
      return 'A pausa pode acontecer a qualquer momento.'
    default:
      return 'Sem dados disponíveis no momento.'
  }
}

function MonitoringBadge({
  status,
  label,
}: {
  status: MonitoringSpaceStatus | MonitoringPauseRisk | 'indisponivel'
  label: string
}) {
  return (
    <span className={`inline-flex items-center rounded-full border-2 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${badgeClass(status)}`}>
      {label}
    </span>
  )
}

function MonitoringMetricCard({
  title,
  description,
  children,
  action,
  className,
}: {
  title: string
  description: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <Card title={title} description={description} action={action} className={className}>
      {children}
    </Card>
  )
}

export function SettingsPage() {
  const { user } = useAuth()
  const { installed, supportsPrompt, canPromptInstall, message, promptInstall, clearMessage } = usePwaInstall()
  const [activeTab, setActiveTab] = useState<SettingsTab>('geral')
  const [supportPolicyOpen, setSupportPolicyOpen] = useState(false)
  const [displayName, setDisplayNameState] = useState('Administrador')
  const [loadingName, setLoadingName] = useState(true)
  const [savingName, setSavingName] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [error, setError] = useState('')
  const [storageUsage, setStorageUsage] = useState<KmodaStorageUsage | null>(null)
  const [pauseRisk, setPauseRisk] = useState<AppPauseRisk | null>(null)
  const [monitoringLoading, setMonitoringLoading] = useState(false)
  const [monitoringError, setMonitoringError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoadingName(true)
      setError('')

      if (!user) {
        if (active) {
          setDisplayNameState('Administrador')
          setLoadingName(false)
        }
        return
      }

      try {
        const name = await loadDisplayName(user.id)
        if (active) {
          setDisplayNameState(name || 'Administrador')
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o nome.')
        }
      } finally {
        if (active) {
          setLoadingName(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (activeTab !== 'monitoramento') {
      return
    }

    let active = true

    async function loadMonitoring() {
      setMonitoringLoading(true)
      setMonitoringError('')

      const [storageResult, pauseResult] = await Promise.allSettled([loadKmodaStorageUsage(), loadAppPauseRisk()])

      if (!active) {
        return
      }

      const nextErrors: string[] = []

      if (storageResult.status === 'fulfilled') {
        setStorageUsage(storageResult.value)
      } else {
        nextErrors.push(storageResult.reason instanceof Error ? storageResult.reason.message : 'Não foi possível carregar o uso do banco.')
      }

      if (pauseResult.status === 'fulfilled') {
        setPauseRisk(pauseResult.value)
      } else {
        nextErrors.push(pauseResult.reason instanceof Error ? pauseResult.reason.message : 'Não foi possível carregar o risco de pausa.')
      }

      setMonitoringError(nextErrors.join(' '))
      setMonitoringLoading(false)
    }

    void loadMonitoring()

    return () => {
      active = false
    }
  }, [activeTab])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      setError('Usuário não autenticado.')
      return
    }

    setSavingName(true)
    setError('')

    try {
      const saved = await saveDisplayName(user.id, displayName)
      setDisplayNameState(saved)
      setSavedMessage('Nome salvo com sucesso.')
      window.setTimeout(() => setSavedMessage(''), 2000)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o nome.')
    } finally {
      setSavingName(false)
    }
  }

  const storagePercent = storageUsage?.percent_used ?? 0
  const storageRemaining = storageUsage ? Math.max(storageUsage.limit_mb - storageUsage.used_mb, 0) : null
  const storageStatus = storageUsage?.status ?? 'indisponivel'
  const pauseStatus = pauseRisk?.pause_risk ?? 'indisponivel'
  const pauseDays = pauseRisk?.estimated_days_until_pause
  const isPauseCritical = pauseDays !== null && pauseDays !== undefined && pauseDays < 1
  const estimatedPauseAt = pauseRisk?.estimated_pause_at ?? null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b-2 border-gray-300 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md border-2 px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'geral' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Perfil rápido" description="Nome exibido no topo e no menu, salvo no seu usuário do Supabase.">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Nome personalizado"
                value={displayName}
                onChange={(event) => setDisplayNameState(event.target.value)}
                placeholder="Ex.: Vinicius, Atendimento, Gerência"
                disabled={loadingName || savingName}
              />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {savedMessage ? <p className="text-sm text-emerald-700">{savedMessage}</p> : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={loadingName || savingName || !user}>
                  {savingName ? 'Salvando...' : 'Salvar nome'}
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Aplicativo" description="Atalho de instalação e status do PWA desta loja.">
            <div className="space-y-3">
              <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                {installed
                  ? 'Aplicativo instalado neste dispositivo.'
                  : supportsPrompt
                    ? 'Instalação disponível. Você pode adicionar o sistema à tela inicial.'
                    : 'Instalação indisponível neste navegador. Em celulares, use o menu do navegador.'}
              </div>
              {!installed ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-center"
                  disabled={!canPromptInstall}
                  onClick={async () => {
                    await promptInstall()
                  }}
                >
                  {canPromptInstall ? 'Instalar aplicativo' : 'Aguardando instalação'}
                </Button>
              ) : null}
              {!supportsPrompt && message ? (
                <button
                  type="button"
                  className="text-left text-sm text-gray-500"
                  onClick={clearMessage}
                >
                  {message}
                </button>
              ) : null}
            </div>
          </Card>

          <Card title="Supabase" description="Status da conexão configurada via variáveis de ambiente.">
            <div className="rounded-md border-2 border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              {isSupabaseConfigured
                ? 'Variáveis encontradas. O login pode usar Supabase Auth.'
                : 'Variáveis ausentes. Crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">


          {monitoringError ? (
            <div className="rounded-md border-2 border-red-300 bg-red-50 p-4 text-sm text-red-700 lg:col-span-2">
              {monitoringError}
            </div>
          ) : null}

          {monitoringLoading ? (
            <div className="rounded-md border-2 border-gray-300 bg-white p-4 text-sm text-gray-600 lg:col-span-2">
              Carregando dados de monitoramento...
            </div>
          ) : null}

          {!isSupabaseConfigured ? (
            <div className="rounded-md border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 lg:col-span-2">
              O Supabase ainda não está configurado neste ambiente. Depois de preencher `VITE_SUPABASE_URL` e
              `VITE_SUPABASE_ANON_KEY`, os cards passam a buscar os dados por RPC segura.
            </div>
          ) : null}

          <MonitoringMetricCard
            title="Uso do banco Kmoda"
            description="Somatório das tabelas principais do sistema."
            action={<MonitoringBadge status={storageStatus} label={storageUsage ? getMonitoringSpaceLabel(storageUsage.status) : 'Indisponível'} />}
            className="lg:col-span-2"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-3xl font-semibold text-gray-950">
                    {storageUsage ? formatMegabytes(storageUsage.used_mb) : '-'}
                  </div>
                  <p className="text-sm text-gray-600">
                    {storageUsage ? `${formatPercent(storageUsage.percent_used)} do limite reservado` : 'Sem dados ainda.'}
                  </p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>Limite reservado</p>
                  <p className="font-semibold text-gray-900">250 MB</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>Espaço livre</p>
                  <p className="font-semibold text-gray-900">
                    {storageRemaining !== null ? formatMegabytes(storageRemaining) : '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-5 overflow-hidden rounded-sm border-2 border-gray-300 bg-white">
                  <div
                    className={`h-full ${fillClass(storageUsage?.status ?? 'indisponivel')}`}
                    style={{ width: `${Math.min(Math.max(storagePercent, 0), 100)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-700">{statusCopy(storageUsage?.status ?? 'indisponivel')}</p>
              </div>
            </div>
          </MonitoringMetricCard>

          <MonitoringMetricCard
            title="Última atividade"
            description="Último evento real gravado no sistema."
            action={<MonitoringBadge status={pauseStatus} label={pauseRisk ? getMonitoringPauseLabel(pauseRisk.pause_risk) : 'Indisponível'} />}
          >
            <div className="space-y-3">
              <div className="text-2xl font-semibold text-gray-950">
                {pauseRisk?.last_activity_at ? formatDateTimeBR(pauseRisk.last_activity_at) : 'Sem registros ainda'}
              </div>
              <p className="text-sm text-gray-700">
                {pauseRisk?.last_activity_at
                  ? 'Esse carimbo de data e hora é a base para calcular a estimativa de pausa.'
                  : 'Faça uma ação no sistema para começar a medir a atividade real.'}
              </p>
            </div>
          </MonitoringMetricCard>

          <MonitoringMetricCard
            title="Prazo sem movimentação"
            description="Cálculo baseado em 7 dias após a última atividade."
            action={<MonitoringBadge status={pauseRisk?.pause_risk ?? 'indisponivel'} label={pauseRisk ? getMonitoringPauseLabel(pauseRisk.pause_risk) : 'Indisponível'} />}
          >
            <div className="space-y-3">
              <div className="text-2xl font-semibold text-gray-950">
                {estimatedPauseAt ? formatDateTimeBR(estimatedPauseAt) : '-'}
              </div>
              <p className="text-sm text-gray-700">
                {pauseRisk?.estimated_days_until_pause !== null && pauseRisk?.estimated_days_until_pause !== undefined
                  ? `${new Intl.NumberFormat('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(pauseRisk.estimated_days_until_pause)} dia(s) restantes`
                  : 'Sem dados suficientes para calcular.'}
              </p>
              <div className="rounded-md border-2 border-gray-300 bg-white p-4 text-sm text-gray-700">
                {isPauseCritical
                  ? 'O sistema entrou na faixa crítica. Se houver pouca atividade, a pausa pode ocorrer a qualquer momento.'
                  : pauseRisk?.pause_risk === 'alto'
                    ? 'A estimativa já está próxima da janela crítica.'
                    : pauseRisk?.pause_risk === 'médio'
                      ? 'O risco já merece acompanhamento frequente.'
                      : pauseRisk?.pause_risk === 'baixo'
                        ? 'Ainda há uma boa folga, mas o painel seguirá acompanhando.'
                        : 'Sem dados suficientes para calcular a pausa.'}
              </div>
              <p className="text-xs uppercase tracking-[0.14em] text-gray-500">
                Esta é apenas uma estimativa, considere adiantar o uso antes do vencimento.
              </p>
            </div>
          </MonitoringMetricCard>

          <Card className="lg:col-span-2">
            <div className="space-y-5 text-left">
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-semibold text-gray-950">Canal de Suporte</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">|</span>
                  <img src="/delta.svg" alt="Delta" className="h-8 w-auto max-w-full object-contain" />
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="primary"
                  className="min-w-[210px] justify-center gap-3 border-emerald-700 bg-emerald-600 px-6 py-3 text-white shadow-[0_10px_0_rgba(4,120,87,0.14)] transition hover:-translate-y-[1px] hover:bg-emerald-700 hover:shadow-[0_12px_0_rgba(4,120,87,0.12)] active:translate-y-[1px] active:shadow-[0_6px_0_rgba(4,120,87,0.12)]"
                  onClick={() => {
                    window.open(supportWhatsAppUrl, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span>Abrir WhatsApp</span>
                  <ArrowUpRight className="h-4 w-4 opacity-80" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-w-[180px] justify-center border-gray-400 bg-white px-5 shadow-[0_8px_0_rgba(15,23,42,0.06)] hover:bg-gray-50"
                  onClick={() => {
                    setSupportPolicyOpen(true)
                  }}
                >
                  Política de suporte
                </Button>
              </div>

              <p className="text-center text-sm text-gray-700">
                Quando precisar de suporte, use o WhatsApp da Delta para falar sobre ajustes do sistema, dúvidas de
                operação e validação de dados.
              </p>
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={supportPolicyOpen}
        title="Política de suporte Delta"
        size="5xl"
        onClose={() => {
          setSupportPolicyOpen(false)
        }}
      >
        <div className="kmoda-scrollbar max-h-[70vh] space-y-5 overflow-y-scroll pr-1 text-left text-sm leading-6 text-gray-800">
          <p>
            Este sistema conta com suporte técnico da Delta para ajustes, dúvidas de operação, validação de dados,
            reativação de serviços, expansão de banco de dados e análise de eventuais problemas.
          </p>

          <section className="space-y-2">
            <h3 className="text-base font-semibold text-gray-950">1. Análise inicial</h3>
            <p>
              Todo atendimento passa por uma análise técnica inicial para identificar a origem do problema.
            </p>
            <p>
              Após essa análise, a Delta informará se o caso está coberto pela garantia acordada ou se será necessário
              orçamento de suporte técnico.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold text-gray-950">2. Casos cobertos pela garantia</h3>
            <p>
              Problemas estruturais do sistema, falhas de funcionamento causadas por erro interno da aplicação ou
              comportamentos diferentes do que foi entregue e aprovado poderão ser corrigidos sem cobrança, desde que
              estejam dentro da garantia acordada.
            </p>
            <p>Exemplos:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>erro em uma função já entregue;</li>
              <li>falha de cálculo causada pelo sistema;</li>
              <li>problema visual ou funcional que impeça o uso correto de uma tela entregue;</li>
              <li>comportamento diferente do fluxo aprovado.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold text-gray-950">3. Casos sujeitos a orçamento</h3>
            <p>
              Algumas situações podem gerar cobrança de suporte técnico, principalmente quando envolvem uso,
              configuração externa, manutenção de banco de dados ou demandas fora do escopo inicial.
            </p>
            <p>Exemplos:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>reativação de projeto pausado por inatividade;</li>
              <li>banco de dados próximo ou acima do limite disponível;</li>
              <li>aumento de capacidade do banco de dados;</li>
              <li>recuperação, restauração ou reorganização de dados;</li>
              <li>análise de backup;</li>
              <li>nova configuração de banco de dados;</li>
              <li>alterações ou novas funcionalidades não previstas inicialmente;</li>
              <li>correções causadas por exclusão, alteração indevida ou mau uso operacional;</li>
              <li>problemas causados por alterações feitas por terceiros.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold text-gray-950">4. Pausa do banco de dados</h3>
            <p>
              Caso o projeto pause por inatividade, a reativação com suporte técnico da Delta poderá ter custo de R$
              150,00.
            </p>
            <p>
              Esse valor se refere ao serviço técnico da Delta para análise, reativação, validação e testes do sistema,
              e não a uma cobrança do Supabase.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold text-gray-950">5. Limite de armazenamento</h3>
            <p>
              O sistema possui um limite de referência para uso do banco de dados.
            </p>
            <p>
              Quando o banco se aproxima do limite, pode ser necessário realizar limpeza, reorganização, expansão de
              capacidade ou migração de plano/estrutura.
            </p>
            <p>Esses serviços poderão ser orçados separadamente conforme a necessidade do projeto.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold text-gray-950">6. Restauração e backup</h3>
            <p>
              Se o projeto permanecer pausado por tempo prolongado, a restauração simples pode não ser possível.
            </p>
            <p>
              Nesses casos, poderá ser necessário avaliar backup, recriar configurações, reorganizar tabelas ou subir
              novamente o banco de dados. Esse tipo de recuperação depende de análise técnica e poderá gerar orçamento
              específico.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold text-gray-950">7. Boas práticas de uso</h3>
            <p>Para evitar problemas:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>não deixe o sistema longos períodos sem uso;</li>
              <li>não salve imagens diretamente no banco de dados;</li>
              <li>não compartilhe acessos administrativos com pessoas não autorizadas;</li>
              <li>não altere configurações técnicas sem orientação;</li>
              <li>entre em contato ao perceber alertas de limite, pausa ou falha de conexão.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold text-gray-950">8. Solicitação de suporte</h3>
            <p>Para solicitar suporte, entre em contato pelo WhatsApp da Delta e informe:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>nome da loja;</li>
              <li>descrição do problema;</li>
              <li>print da tela, se possível;</li>
              <li>o que estava tentando fazer quando o problema aconteceu.</li>
            </ul>
            <p>
              A Delta analisará o caso e informará o melhor procedimento antes de qualquer cobrança.
            </p>
          </section>
        </div>
      </Modal>
    </div>
  )
}
