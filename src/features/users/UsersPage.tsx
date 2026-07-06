import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Send, Search, UserPlus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import { useAuth } from '../../hooks/useAuth'
import {
  findAdminUserByEmail,
  listAdminUserAccounts,
  saveAdminUserAccount,
  sendPinRecoveryEmail,
  type AdminUserAccount,
} from '../../lib/profileSettings'
import type { UserRole } from '../../types/database'

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Administradora' },
  { value: 'cashier', label: 'Operadora de caixa' },
]

export function UsersPage() {
  const { isAdmin } = useAuth()
  const [accounts, setAccounts] = useState<AdminUserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingEmailTo, setSendingEmailTo] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [lookupEmail, setLookupEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('cashier')
  const [active, setActive] = useState(true)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileModalMode, setProfileModalMode] = useState<'create' | 'edit'>('create')

  useEffect(() => {
    let active = true

    async function loadAccounts() {
      setError('')

      try {
        const rows = await listAdminUserAccounts()
        if (active) {
          setAccounts(rows)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os usuários.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadAccounts()

    return () => {
      active = false
    }
  }, [])

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.user_id === userId) ?? null,
    [accounts, userId],
  )
  const recoveryEmail = selectedAccount?.email ?? lookupEmail.trim()

  const tableAccounts = useMemo(
    () =>
      accounts.map((account) => ({
        ...account,
        id: account.user_id,
      })),
    [accounts],
  )

  function openCreateProfileModal() {
    setUserId('')
    setName('')
    setRole('cashier')
    setActive(true)
    setLookupEmail('')
    setMessage('')
    setError('')
    setProfileModalMode('create')
    setProfileModalOpen(true)
  }

  function openEditProfileModal(account: AdminUserAccount) {
    setUserId(account.user_id)
    setName(account.name)
    setRole(account.role === 'admin' ? 'admin' : 'cashier')
    setActive(account.active)
    setLookupEmail(account.email)
    setMessage('')
    setError('')
    setProfileModalMode('edit')
    setProfileModalOpen(true)
  }

  function closeProfileModal(options?: { preserveMessage?: boolean }) {
    setProfileModalOpen(false)
    setProfileModalMode('create')
    setUserId('')
    setName('')
    setRole('cashier')
    setActive(true)
    setLookupEmail('')
    if (!options?.preserveMessage) {
      setMessage('')
      setError('')
    }
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      const found = await findAdminUserByEmail(lookupEmail)
      if (!found) {
        setError('Nenhuma conta encontrada para este e-mail no Supabase Auth.')
        return
      }

      setUserId(found.user_id)
      setName(found.name || '')
      setRole(found.role === 'admin' ? 'admin' : 'cashier')
      setActive(found.active)
      setMessage('Conta localizada. Agora você pode salvar ou enviar o link de PIN.')
      setProfileModalOpen(true)
      setProfileModalMode('create')
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'Não foi possível localizar a conta.')
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isAdmin) {
      setError('Apenas a administradora pode gerenciar usuários.')
      return
    }

    if (!userId) {
      setError('Localize um usuário por e-mail antes de salvar o perfil.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      await saveAdminUserAccount({
        userId,
        name,
        role,
        active,
      })

      setMessage('Perfil salvo com sucesso.')
      setAccounts(await listAdminUserAccounts())
      closeProfileModal({ preserveMessage: true })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o perfil.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSendRecovery(email: string) {
    setSendingEmailTo(email)
    setError('')
    setMessage('')

    try {
      await sendPinRecoveryEmail(email)
      setMessage(`Link de PIN enviado para ${email}.`)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Não foi possível enviar o e-mail.')
    } finally {
      setSendingEmailTo('')
    }
  }

  return (
    <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Administração</p>
          <h1 className="text-2xl font-semibold text-gray-950">Usuários e acessos</h1>
          <p className="mt-1 text-sm text-gray-600">
            Cadastre o perfil interno do usuário, defina se ele é admin ou caixa e envie o link para ele criar ou redefinir o PIN.
          </p>
        </div>

        <Button type="button" variant="secondary" onClick={openCreateProfileModal}>
          <UserPlus className="h-4 w-4" />
          Novo cadastro
        </Button>
      </div>

      {!profileModalOpen && error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {!profileModalOpen && message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}

      <Modal
        open={profileModalOpen}
        title={profileModalMode === 'edit' ? 'Editar perfil interno' : 'Criar perfil interno'}
        onClose={closeProfileModal}
        size="5xl"
      >
        <div className="space-y-5">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
          {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}

          {profileModalMode === 'create' ? (
            <Card title="Localizar usuário por e-mail">
              <form className="space-y-4" onSubmit={handleLookup}>
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={lookupEmail}
                  onChange={(event) => setLookupEmail(event.target.value)}
                  required
                />

                <Button type="submit" className="w-full">
                  <Search className="h-4 w-4" />
                  Localizar
                </Button>
              </form>

              <p className="mt-4 text-sm text-gray-600">
                Se o usuário ainda não existir no <strong>Supabase Auth</strong>, crie a conta por lá primeiro e depois volte aqui para salvar o perfil.
              </p>
            </Card>
          ) : null}

          <form className="space-y-4" onSubmit={handleSave}>
            <Input
              label="ID do usuário"
              value={userId}
              disabled
              placeholder="Localize um usuário para preencher aqui"
            />

            <Input
              label="Nome interno"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Vinicius Falco"
              required
            />

            <label className="block text-sm font-medium text-gray-700">
              Perfil
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              />
              Usuário ativo
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" className="flex-1" disabled={saving || !isAdmin || !userId}>
                Salvar perfil
              </Button>
              {recoveryEmail ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => void handleSendRecovery(recoveryEmail)}
                  disabled={Boolean(sendingEmailTo)}
                >
                  {sendingEmailTo === recoveryEmail ? 'Enviando...' : 'Enviar link PIN'}
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </Modal>

      <Card title="Contas cadastradas">
        {loading ? (
          <p className="text-sm text-gray-500">Carregando usuários...</p>
        ) : (
          <Table
            data={tableAccounts}
            columns={[
              {
                key: 'name',
                header: 'Nome',
                render: (row) => row.name || '-',
              },
              {
                key: 'email',
                header: 'E-mail',
                render: (row) => row.email,
              },
              {
                key: 'role',
                header: 'Perfil',
                render: (row) => (row.role === 'admin' ? 'Administradora' : 'Operadora de caixa'),
              },
              {
                key: 'active',
                header: 'Status',
                render: (row) => (row.active ? 'Ativo' : 'Inativo'),
              },
              {
                key: 'pin',
                header: 'PIN',
                render: (row) => (row.pin_configured ? 'Definido' : 'Pendente'),
              },
              {
                key: 'actions',
                header: 'Ações',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openEditProfileModal(row)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleSendRecovery(row.email)}
                      disabled={sendingEmailTo === row.email}
                    >
                      <Send className="h-4 w-4" />
                      {sendingEmailTo === row.email ? 'Enviando...' : 'PIN por e-mail'}
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyMessage="Nenhuma conta encontrada."
          />
        )}
      </Card>
    </main>
  )
}
