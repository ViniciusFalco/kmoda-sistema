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
}

export function Table<T extends { id: string }>({
  columns,
  data,
  emptyMessage = 'Nenhum registro encontrado.',
}: TableProps<T>) {
  if (data.length === 0) {
    return <EmptyState title={emptyMessage} />
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse bg-white text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
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
