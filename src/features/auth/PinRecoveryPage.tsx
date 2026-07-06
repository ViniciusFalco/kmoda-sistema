import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PinCodeInput } from '../../components/auth/PinCodeInput'
import { useAuth } from '../../hooks/useAuth'
import { isSupabaseConfigured } from '../../lib/supabase'
import { sendPinRecoveryEmail, setMyPin } from '../../lib/profileSettings'

export function PinRecoveryPage() {
  const { user, profile, signOut } = useAuth()
  const [email, setEmail] = useState(user?.email ?? '')
  const [pin, setPin] = useState('')
  const [pinConfirmation, setPinConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (!isSupabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <Card className="w-full max-w-lg">
          <p className="text-sm text-amber-700">Configure o Supabase para usar a recuperação por e-mail.</p>
        </Card>
      </main>
    )
  }

  async function handleRecoveryRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      await sendPinRecoveryEmail(email)
      setMessage('Se o e-mail existir no sistema, enviaremos um link para criar ou redefinir o PIN.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar o e-mail de recuperação.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!user) {
      setError('Entre pelo link de recuperação para definir o PIN.')
      return
    }

    if (!/^\d{6}$/.test(pin)) {
      setError('O PIN precisa ter 6 dígitos.')
      return
    }

    if (pin !== pinConfirmation) {
      setError('A confirmação do PIN não confere.')
      return
    }

    setLoading(true)

    try {
      await setMyPin(user.id, pin)
      await signOut()
      setPin('')
      setPinConfirmation('')
      setMessage('PIN definido com sucesso. Agora você já pode entrar no sistema.')
    } catch (pinError) {
      setError(pinError instanceof Error ? pinError.message : 'Não foi possível definir o PIN.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="h-full">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Acesso KModa</p>
              <h1 className="mt-2 text-2xl font-semibold text-gray-950">Recuperar ou criar PIN</h1>
              <p className="mt-2 text-sm text-gray-600">
                Use esta tela para receber o link por e-mail e definir seu PIN de 6 dígitos pela primeira vez ou quando esquecer.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
              <p className="font-semibold text-gray-950">Fluxo recomendado</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>O admin cadastra o usuário no perfil e, se necessário, no Supabase Auth.</li>
                <li>O usuário informa o e-mail nesta tela e recebe o link de recuperação.</li>
                <li>No link, ele define o PIN e passa a entrar apenas com ele.</li>
              </ol>
            </div>

            {message ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>
            ) : null}

            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Solicitar e-mail de recuperação">
            <form className="space-y-4" onSubmit={handleRecoveryRequest}>
              <Input
                label="E-mail"
                type="email"
                name="email"
                value={user?.email ?? email}
                onChange={user?.email ? undefined : (event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                disabled={Boolean(user?.email)}
                required
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link por e-mail'}
              </Button>
            </form>
          </Card>

          {user ? (
            <Card title="Definir novo PIN">
              <form className="space-y-4" onSubmit={handlePinSubmit}>
                <p className="text-sm text-gray-600">
                  Você está autenticado como{' '}
                  <span className="font-semibold text-gray-950">{profile?.name ?? user.email ?? 'usuário'}</span>. Defina um novo PIN de 6 dígitos.
                </p>

                <PinCodeInput
                  label="Novo PIN"
                  value={pin}
                  onChange={setPin}
                  autoFocus
                  required
                />

                <PinCodeInput
                  label="Confirmar PIN"
                  value={pinConfirmation}
                  onChange={setPinConfirmation}
                  required
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar PIN'}
                </Button>
              </form>
            </Card>
          ) : (
            <Card title="Ainda não recebeu o link?">
              <p className="text-sm text-gray-600">
                Se o link ainda não chegou, verifique spam/lixo eletrônico ou peça para o admin reenviar.
              </p>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
