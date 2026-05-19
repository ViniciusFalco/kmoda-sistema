import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { getDisplayName, setDisplayName } from '../../lib/appSettings'
import { isSupabaseConfigured } from '../../lib/supabase'

export function SettingsPage() {
  const [displayName, setDisplayNameState] = useState(getDisplayName())
  const [savedMessage, setSavedMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDisplayName(displayName)
    setSavedMessage('Nome salvo com sucesso.')
    window.setTimeout(() => setSavedMessage(''), 2000)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Perfil rápido" description="Nome exibido no topo e no menu, salvo neste navegador.">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Nome personalizado"
            value={displayName}
            onChange={(event) => setDisplayNameState(event.target.value)}
            placeholder="Ex.: Vinicius, Atendimento, Gerência"
          />
          {savedMessage ? <p className="text-sm text-emerald-700">{savedMessage}</p> : null}
          <div className="flex justify-end">
            <Button type="submit">Salvar nome</Button>
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
