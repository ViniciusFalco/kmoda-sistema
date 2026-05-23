import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

interface TableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
}

interface TableProps<T extends { id: string }> {
  columns: Array<TableColumn<T>>
  data: T[]
  emptyMessage?: string
  tone?: 'light' | 'dark'
}

export function Table<T extends { id: string }>({
  columns,
  data,
  emptyMessage = 'Nenhum registro encontrado.',
  tone = 'light',
}: TableProps<T>) {
  if (data.length === 0) {
    return <EmptyState title={emptyMessage} tone={tone} />
  }

  return (
    <div className={`w-full overflow-hidden rounded-lg ${tone === 'dark' ? 'border border-white/10' : 'border border-gray-200'}`}>
      <div className="overflow-x-auto">
        <table className={`w-full min-w-[720px] border-collapse text-left text-sm ${tone === 'dark' ? 'bg-[#050505] text-white' : 'bg-white text-gray-700'}`}>
          <thead className={`text-xs uppercase ${tone === 'dark' ? 'bg-white/5 text-white' : 'bg-gray-50 text-gray-500'}`}>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`px-4 py-3 ${tone === 'dark' ? 'font-bold tracking-[0.08em]' : 'font-semibold'}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={tone === 'dark' ? 'divide-y divide-white/10' : 'divide-y divide-gray-100'}>
            {data.map((row) => (
              <tr key={row.id} className={tone === 'dark' ? 'text-white/85' : 'text-gray-700'}>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
