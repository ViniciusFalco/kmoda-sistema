export const tutorialIds = {
  createSale: 'criar-venda',
  createProduct: 'cadastrar-produto',
  updateStock: 'atualizar-estoque',
} as const

export type TutorialId = (typeof tutorialIds)[keyof typeof tutorialIds]

export type TutorialCategory = 'vendas' | 'produtos' | 'estoque'

export interface TutorialStep {
  title: string
  description: string
}

export interface Tutorial {
  id: TutorialId
  title: string
  description: string
  category: TutorialCategory
  estimatedTime: string
  youtubeId?: string
  steps: TutorialStep[]
  notes?: string[]
  active: boolean
  order: number
}

export const tutorialFilterOptions: Array<{ value: 'all' | TutorialCategory; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'produtos', label: 'Produtos' },
  { value: 'estoque', label: 'Estoque' },
]

export const tutorialCategoryLabels: Record<TutorialCategory, string> = {
  vendas: 'Vendas',
  produtos: 'Produtos',
  estoque: 'Estoque',
}

export const tutorials: Tutorial[] = [
  {
    id: tutorialIds.createSale,
    title: 'Como criar uma venda',
    description: 'Aprenda como registrar uma venda no sistema, selecionar produtos, conferir valores e finalizar o atendimento.',
    category: 'vendas',
    estimatedTime: '2 min',
    youtubeId: 'COLOCAR_ID_DO_VIDEO_AQUI',
    steps: [
      {
        title: 'Acesse a aba Caixa',
        description: 'Entre na área de Caixa para iniciar o processo de venda.',
      },
      {
        title: 'Verifique se o caixa está aberto',
        description: 'Se o caixa estiver fechado, abra-o antes de registrar uma nova venda.',
      },
      {
        title: 'Clique em Registrar venda',
        description: 'O sistema abrirá o fluxo de venda para adicionar os produtos do cliente.',
      },
      {
        title: 'Adicione os produtos',
        description: 'Busque o produto pelo nome, referência ou código de barras e confira os dados.',
      },
      {
        title: 'Confira itens e valores',
        description: 'Antes de finalizar, verifique se quantidades e valores estão corretos.',
      },
      {
        title: 'Informe a forma de pagamento',
        description: 'Selecione a forma de pagamento usada pelo cliente e confira troco, se houver.',
      },
      {
        title: 'Finalize a venda',
        description: 'Após revisar tudo, conclua a venda. O sistema registra a entrada no caixa e atualiza o estoque.',
      },
    ],
    notes: [
      'Sempre confira os produtos antes de finalizar.',
      'Em caso de erro, revise as informações antes de concluir.',
      'O estoque será atualizado automaticamente após a venda.',
    ],
    active: true,
    order: 1,
  },
  {
    id: tutorialIds.createProduct,
    title: 'Como cadastrar um produto',
    description: 'Aprenda como adicionar um novo produto ao sistema com informações de identificação, preço e estoque.',
    category: 'produtos',
    estimatedTime: '3 min',
    steps: [
      {
        title: 'Acesse a aba Produtos',
        description: 'Entre na área de Produtos para visualizar e gerenciar os itens cadastrados.',
      },
      {
        title: 'Clique em Adicionar produto',
        description: 'O sistema abrirá o formulário de cadastro de produto.',
      },
      {
        title: 'Preencha as informações principais',
        description: 'Informe nome, tipo de roupa, marca, tamanho, cor e demais dados necessários.',
      },
      {
        title: 'Informe o código de barras, se houver',
        description: 'Cadastre o código para facilitar buscas e vendas futuras.',
      },
      {
        title: 'Preencha os preços',
        description: 'Informe o preço de custo e o preço de venda com atenção.',
      },
      {
        title: 'Informe o estoque inicial',
        description: 'Coloque a quantidade disponível no momento do cadastro.',
      },
      {
        title: 'Salve o produto',
        description: 'Após conferir os dados, salve o cadastro para liberar o item no sistema.',
      },
    ],
    notes: [
      'Cadastre as informações com atenção para facilitar buscas futuras.',
      'Use nomes claros e padronizados.',
      'Produtos parecidos devem manter referências parecidas quando fizer sentido.',
    ],
    active: true,
    order: 2,
  },
  {
    id: tutorialIds.updateStock,
    title: 'Como atualizar o estoque',
    description: 'Aprenda como registrar entrada, saída ou ajuste manual de estoque.',
    category: 'estoque',
    estimatedTime: '2 min',
    steps: [
      {
        title: 'Acesse a aba Estoque',
        description: 'Entre na área de Estoque para movimentar os produtos cadastrados.',
      },
      {
        title: 'Clique em Atualizar estoque',
        description: 'O sistema abrirá o formulário de movimentação de estoque.',
      },
      {
        title: 'Selecione o produto',
        description: 'Busque o produto pelo nome, referência ou código de barras.',
      },
      {
        title: 'Escolha o tipo de movimentação',
        description: 'Selecione se será entrada, saída ou ajuste manual.',
      },
      {
        title: 'Informe a quantidade',
        description: 'Digite a quantidade que será adicionada, removida ou corrigida.',
      },
      {
        title: 'Escolha o motivo da movimentação',
        description: 'Informe se a alteração é por compra, venda, troca, perda, ajuste ou outro motivo.',
      },
      {
        title: 'Adicione uma observação, se necessário',
        description: 'Use a observação apenas quando precisar explicar melhor a movimentação.',
      },
      {
        title: 'Salve a atualização',
        description: 'Após conferir os dados, finalize a movimentação para atualizar o estoque.',
      },
    ],
    notes: [
      'Use ajuste manual apenas quando for realmente necessário.',
      'Sempre confira o produto antes de alterar o estoque.',
      'Movimentações de venda devem ser feitas preferencialmente pelo fluxo de venda.',
    ],
    active: true,
    order: 3,
  },
]

export function getTutorialPath(tutorialId: TutorialId) {
  return `/tutoriais/${tutorialId}`
}

export function getTutorialById(tutorialId?: string | null) {
  if (!tutorialId) {
    return null
  }

  return tutorials.find((tutorial) => tutorial.id === tutorialId && tutorial.active) ?? null
}

export function getTutorialCategoryLabel(category: TutorialCategory) {
  return tutorialCategoryLabels[category]
}

export function getTutorialYoutubeEmbedUrl(youtubeId?: string | null) {
  const normalizedId = youtubeId?.trim()

  if (!normalizedId || normalizedId === 'COLOCAR_ID_DO_VIDEO_AQUI') {
    return null
  }

  if (!/^[a-zA-Z0-9_-]{6,}$/.test(normalizedId)) {
    return null
  }

  return `https://www.youtube-nocookie.com/embed/${normalizedId}`
}
