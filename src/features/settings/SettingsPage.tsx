import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { loadDisplayName, saveDisplayName } from '../../lib/profileSettings'
import { isSupabaseConfigured } from '../../lib/supabase'

export function SettingsPage() {
  const { user } = useAuth()
  const [displayName, setDisplayNameState] = useState('Administrador')
  const [loadingName, setLoadingName] = useState(true)
  const [savingName, setSavingName] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [error, setError] = useState('')

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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
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

      <Card title="Supabase" description="Status da conexão configurada via variáveis de ambiente.">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          {isSupabaseConfigured
            ? 'Variáveis encontradas. O login pode usar Supabase Auth.'
            : 'Variáveis ausentes. Crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'}
        </div>
      </Card>
    </div>
  )
}
