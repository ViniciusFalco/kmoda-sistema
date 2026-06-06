import { useNavigate } from 'react-router-dom'
import { SystemFallbackScreen } from '../components/fallback/SystemFallbackScreen'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <SystemFallbackScreen
      title="Página não encontrada"
      description="Essa página não existe ou foi movida."
      primaryActionLabel="Voltar para a página inicial"
      onPrimaryAction={() => {
        navigate('/', { replace: true })
      }}
    />
  )
}
