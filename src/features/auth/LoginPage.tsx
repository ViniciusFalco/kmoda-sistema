import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PinCodeInput } from '../../components/auth/PinCodeInput'
import { useAuth } from '../../hooks/useAuth'
import { isSupabaseConfigured } from '../../lib/supabase'

export function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user, loading, authReady, profile, signInWithPin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && profile) {
      navigate(profile.role === 'admin' ? '/dashboard' : '/caixa', { replace: true })
    }
  }, [navigate, profile, user])

  if (user && profile) {
    return <Navigate to={profile.role === 'admin' ? '/dashboard' : '/caixa'} replace />
  }

  if (loading || !authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-sm text-gray-500">
        Carregando sessão...
      </main>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await signInWithPin(pin)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    navigate(result.role === 'admin' ? '/dashboard' : '/caixa', { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <img src="/logo-4k.png" alt="KModa" className="h-36 w-auto object-contain sm:h-44" />
        </div>

        {!isSupabaseConfigured ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Configure o Supabase no arquivo .env para habilitar o login por PIN.
          </div>
        ) : null}

        <form className="space-y-4 text-center" onSubmit={handleSubmit}>
          <PinCodeInput
            label="PIN de acesso"
            description="Use seu PIN de 6 dígitos para entrar no sistema."
            name="pin"
            value={pin}
            onChange={setPin}
            autoFocus
            size="compact"
            weight="regular"
            align="center"
            required
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting || pin.length !== 6}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </Button>
          <div className="text-center text-xs text-gray-500">
            <Link to="/redefinir-pin" className="font-medium text-gray-900 underline underline-offset-4">
              Esqueci meu PIN / primeiro acesso
            </Link>
          </div>
        </form>
      </Card>
    </main>
  )
}
