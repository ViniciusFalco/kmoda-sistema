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
  headerClassName?: string
}

export function Table<T extends { id: string }>({
  columns,
  data,
  emptyMessage = 'Nenhum registro encontrado.',
  tone = 'light',
  headerClassName,
}: TableProps<T>) {
  if (data.length === 0) {
    return <EmptyState title={emptyMessage} tone={tone} />
  }

  return (
    <div className={`w-full overflow-hidden rounded-xl ${tone === 'dark' ? 'border-2 border-gray-200' : 'border-2 border-gray-200'}`}>
      <div className="overflow-x-auto">
        <table className={`w-full min-w-[720px] border-collapse text-left text-sm ${tone === 'dark' ? 'bg-white text-gray-700' : 'bg-white text-gray-700'}`}>
          <thead className={`text-[11px] uppercase tracking-[0.14em] ${headerClassName ?? (tone === 'dark' ? 'bg-gray-50 text-gray-500' : 'bg-gray-50 text-gray-500')}`}>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-semibold">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => (
              <tr key={row.id} className="text-gray-700">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-2.5 align-middle">
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
