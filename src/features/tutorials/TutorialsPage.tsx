import { BookOpenText, Clock3, VideoOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { cn } from '../../lib/utils'
import {
  getTutorialById,
  getTutorialCategoryLabel,
  getTutorialPath,
  getTutorialYoutubeEmbedUrl,
  tutorialFilterOptions,
  tutorials,
  type Tutorial,
  type TutorialCategory,
} from './tutorials'

type TutorialFilterValue = 'all' | TutorialCategory

const activeTutorialCount = tutorials.filter((tutorial) => tutorial.active).length

function TutorialCard({
  tutorial,
  onOpen,
}: {
  tutorial: Tutorial
  onOpen: (tutorialId: Tutorial['id']) => void
}) {
  return (
    <Card
      title={tutorial.title}
      description={tutorial.description}
      action={
        <span className="inline-flex items-center rounded-full border-2 border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
          {tutorial.estimatedTime}
        </span>
      }
      className="flex h-full flex-col"
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border-2 border-gray-900 bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
            {getTutorialCategoryLabel(tutorial.category)}
          </span>
          <span className="inline-flex items-center rounded-full border-2 border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            {tutorial.steps.length} etapas
          </span>
        </div>

        <div className="mt-auto">
          <Button type="button" variant="secondary" className="w-full justify-center" onClick={() => onOpen(tutorial.id)}>
            <BookOpenText className="h-4 w-4" />
            Ver tutorial
          </Button>
        </div>
      </div>
    </Card>
  )
}

function TutorialDetailModal({
  tutorial,
  onClose,
}: {
  tutorial: Tutorial | null
  onClose: () => void
}) {
  const videoUrl = getTutorialYoutubeEmbedUrl(tutorial?.youtubeId)

  return (
    <Modal
      open={Boolean(tutorial)}
      title={tutorial ? tutorial.title : 'Central de Ajuda'}
      onClose={onClose}
      size="6xl"
      position="start"
      bodyClassName="p-0"
      headerCenter={tutorial ? `${getTutorialCategoryLabel(tutorial.category)} • ${tutorial.estimatedTime}` : undefined}
    >
      {tutorial ? (
        <div className="space-y-5 p-4 sm:p-6">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border-2 border-gray-900 bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                {getTutorialCategoryLabel(tutorial.category)}
              </span>
              <span className="inline-flex items-center rounded-full border-2 border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                {tutorial.estimatedTime}
              </span>
            </div>

            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-gray-950 sm:text-3xl">{tutorial.title}</h2>
            <p className="max-w-3xl text-sm leading-6 text-gray-600">{tutorial.description}</p>
          </div>

          <section className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 sm:p-5">
            {videoUrl ? (
              <div className="overflow-hidden rounded-xl border-2 border-gray-900 bg-black">
                <div className="aspect-video">
                  <iframe
                    className="h-full w-full"
                    src={videoUrl}
                    title={tutorial.title}
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white px-6 text-center text-sm text-gray-500">
                <div className="space-y-2">
                  <VideoOff className="mx-auto h-5 w-5 text-gray-400" />
                  <p>Vídeo em breve</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border-2 border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b-2 border-gray-100 pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-950">Passo a passo</h3>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                <Clock3 className="h-3.5 w-3.5" />
                {tutorial.steps.length} etapas
              </span>
            </div>

            <ol className="mt-4 space-y-4">
              {tutorial.steps.map((step, index) => (
                <li key={`${tutorial.id}-${step.title}`} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-gray-900 bg-black text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-950">{step.title}</p>
                    <p className="text-sm leading-6 text-gray-600">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {tutorial.notes?.length ? (
            <section className="rounded-2xl border-2 border-gray-200 bg-white p-4 sm:p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-950">Observações rápidas</h3>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-600">
                {tutorial.notes.map((note) => (
                  <li key={note} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

export function TutorialsPage() {
  const navigate = useNavigate()
  const { tutorialId } = useParams<{ tutorialId?: string }>()
  const [activeFilter, setActiveFilter] = useState<TutorialFilterValue>('all')

  const selectedTutorial = useMemo(() => getTutorialById(tutorialId), [tutorialId])

  const visibleTutorials = useMemo(() => {
    return [...tutorials]
      .filter((tutorial) => tutorial.active)
      .filter((tutorial) => activeFilter === 'all' || tutorial.category === activeFilter)
      .sort((a, b) => a.order - b.order)
  }, [activeFilter])

  useEffect(() => {
    if (tutorialId && !selectedTutorial) {
      navigate('/tutoriais', { replace: true })
    }
  }, [navigate, selectedTutorial, tutorialId])

  function openTutorial(id: Tutorial['id']) {
    navigate(getTutorialPath(id))
  }

  function closeTutorial() {
    navigate('/tutoriais')
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="inline-flex w-fit items-center rounded-full border-2 border-gray-900 bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
            Central de Ajuda
          </div>
          <div className="max-w-4xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-gray-950 sm:text-4xl">
              Tutoriais rápidos para consultar sempre que surgir alguma dúvida no uso do sistema.
            </h1>
            <p className="text-sm leading-6 text-gray-600 sm:text-base">
              Guias objetivos, com passo a passo escrito e vídeo incorporado quando disponível, para tarefas do dia a dia
              da loja.
            </p>
          </div>
          <div className="inline-flex w-fit items-center rounded-full border-2 border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            {activeTutorialCount} tutoriais ativos
          </div>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="flex flex-col gap-3 border-b-2 border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Filtros</p>
            <p className="mt-1 text-sm text-gray-600">Escolha a categoria e encontre o tutorial mais rápido.</p>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
            Exibindo {visibleTutorials.length} de {activeTutorialCount}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tutorialFilterOptions.map((option) => {
            const active = activeFilter === option.value

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveFilter(option.value)}
                className={cn(
                  'rounded-full border-2 px-4 py-2 text-sm font-semibold transition',
                  active
                    ? 'border-gray-900 bg-black text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-950',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </section>

      {visibleTutorials.length === 0 ? (
        <EmptyState
          title="Nenhum tutorial encontrado."
          description="Tente outra categoria ou volte para todos os tutoriais."
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setActiveFilter('all')
              }}
            >
              Mostrar todos
            </Button>
          }
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTutorials.map((tutorial) => (
            <TutorialCard key={tutorial.id} tutorial={tutorial} onOpen={openTutorial} />
          ))}
        </section>
      )}

      <TutorialDetailModal tutorial={selectedTutorial} onClose={closeTutorial} />
    </div>
  )
}
