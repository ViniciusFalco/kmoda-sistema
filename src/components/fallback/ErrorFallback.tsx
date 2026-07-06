import { SystemFallbackScreen } from './SystemFallbackScreen'

interface ErrorFallbackProps {
  onHome: () => void
}

export function ErrorFallback({ onHome }: ErrorFallbackProps) {
  return (
    <SystemFallbackScreen
      title="Ops, algo deu errado."
      description="Não conseguimos carregar esta página no momento."
      primaryActionLabel="Voltar para a página inicial"
      onPrimaryAction={onHome}
    />
  )
}
