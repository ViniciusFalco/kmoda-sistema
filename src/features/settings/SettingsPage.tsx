import { Card } from '../../components/ui/Card'
import { isSupabaseConfigured } from '../../lib/supabase'

export function SettingsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Configurações da loja" description="Base pronta para dados reais do estabelecimento.">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Nome</dt>
            <dd className="font-medium text-gray-950">KModa</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Ambiente</dt>
            <dd className="font-medium text-gray-950">Administrativo</dd>
          </div>
        </dl>
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
