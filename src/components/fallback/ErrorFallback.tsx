import { SystemFallbackScreen } from './SystemFallbackScreen'

interface ErrorFallbackProps {
  onHome: () => void
  onRetry: () => void
}

export function ErrorFallback({ onHome, onRetry }: ErrorFallbackProps) {
  return (
    <SystemFallbackScreen
      title="Ops, algo deu errado."
      description="Não conseguimos carregar esta página no momento."
      primaryActionLabel="Voltar para a página inicial"
      onPrimaryAction={onHome}
      secondaryActionLabel="Tentar novamente"
      onSecondaryAction={onRetry}
    />
  )
}
