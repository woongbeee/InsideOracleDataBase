import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EMPLOYEE_COLUMNS, employeeCell, type Employee } from '@/data'

export function EmpRow({
  row,
  highlighted,
  deleted,
  columns,
  original,
}: {
  row: Employee
  highlighted: boolean
  deleted: boolean
  columns: string[]
  original?: Employee
}) {
  const cols: readonly (keyof Employee)[] =
    columns.length === 0 ? EMPLOYEE_COLUMNS : (columns as Array<keyof Employee>)

  return (
    <motion.tr
      layout
      animate={
        deleted ? { opacity: 0.35, scale: 0.97 } : { opacity: 1, scale: 1 }
      }
      transition={{ duration: 0.3 }}
      className={cn(
        'border-b transition-colors last:border-0',
        highlighted && !deleted && 'bg-blue/10',
        deleted && 'bg-red/10 line-through'
      )}
    >
      {cols.map((c) => {
        const val = employeeCell(row, c)
        const origVal = original ? employeeCell(original, c) : undefined
        const changed = origVal !== undefined && origVal !== val
        return (
          <td key={c} className="px-3 py-1.5 font-mono text-[11px]">
            {changed ? (
              <span>
                <span className="text-red mr-1 line-through">{origVal}</span>
                <span className="text-green font-bold">{val}</span>
              </span>
            ) : (
              val
            )}
          </td>
        )
      })}
    </motion.tr>
  )
}
