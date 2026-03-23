import { useState, useRef, useCallback, useEffect } from 'react'
import { OracleDiagram } from '@/components/OracleDiagram'
import { QueryInput } from '@/components/QueryInput'
import { DataPanel } from '@/components/DataPanel'
import { SchemaDiagramView } from '@/components/SchemaDiagram'
import { OptimizerPanel } from '@/components/OptimizerPanel'
import { useSimulationStore } from '@/store/simulationStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type MainView = 'simulator' | 'erd'

const QUERY_PANEL_MIN = 120
const QUERY_PANEL_MAX = 520
const QUERY_PANEL_DEFAULT = 208 // h-52 = 13rem = 208px

export function App() {
  const [dataPanelOpen, setDataPanelOpen] = useState(false)
  const [mainView, setMainView] = useState<MainView>('simulator')
  const [optimizerOpen, setOptimizerOpen] = useState(false)
  const [queryPanelHeight, setQueryPanelHeight] = useState(QUERY_PANEL_DEFAULT)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)
  const optimizerResult = useSimulationStore((s) => s.optimizerResult)
  const isRunning = useSimulationStore((s) => s.isRunning)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartHeight.current = queryPanelHeight
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [queryPanelHeight])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = dragStartY.current - e.clientY
      const next = Math.min(QUERY_PANEL_MAX, Math.max(QUERY_PANEL_MIN, dragStartHeight.current + delta))
      setQueryPanelHeight(next)
    }
    const onMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">

      {/* ── Header ── */}
      <header className="flex h-11 shrink-0 items-center gap-3 border-b bg-card px-4">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>

        <Separator orientation="vertical" className="h-4" />

        <span className="font-mono text-sm font-semibold tracking-tight">Oracle</span>
        <span className="font-mono text-sm text-muted-foreground">Database Internals Simulator</span>

        {/* View toggle */}
        <div className="ml-4 flex items-center rounded-lg border bg-muted p-0.5">
          {(['simulator', 'erd'] as MainView[]).map((v) => (
            <button
              key={v}
              onClick={() => setMainView(v)}
              className={cn(
                'rounded-md px-3 py-1 font-mono text-xs font-medium transition-all',
                mainView === v
                  ? 'bg-card text-foreground shadow-xs ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {v === 'simulator' ? '⚙ Simulator' : '⬡ Schema ERD'}
            </button>
          ))}
        </div>

        {/* Optimizer toggle */}
        {mainView === 'simulator' && (
          <Button
            variant={optimizerOpen ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setOptimizerOpen((v) => !v)}
            className="font-mono text-xs"
          >
            ▶ Optimizer
            {optimizerResult && !optimizerOpen && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-orange-400 align-middle" />
            )}
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isRunning ? (
            <Badge variant="outline" className="font-mono text-[10px]">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
              RUNNING
            </Badge>
          ) : (
            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
              READY
            </Badge>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flex flex-1 overflow-hidden">
        {mainView === 'simulator' && (
          <DataPanel open={dataPanelOpen} onToggle={() => setDataPanelOpen((v) => !v)} />
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            {mainView === 'simulator' ? <OracleDiagram /> : <SchemaDiagramView />}
          </div>

          {/* Optimizer panel */}
          {mainView === 'simulator' && optimizerOpen && (
            <div className="flex min-h-0 w-[420px] shrink-0 flex-col overflow-hidden border-l bg-card">
              <div className="flex shrink-0 items-center gap-2 border-b bg-muted/50 px-3 py-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  CBO Optimizer
                </span>
                {optimizerResult && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    cost {optimizerResult.plan.totalCost.toFixed(1)} · {optimizerResult.plan.estimatedRows} rows
                  </span>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <OptimizerPanel result={optimizerResult} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Query Input ── */}
      {mainView === 'simulator' && (
        <div className="shrink-0 border-t" style={{ height: queryPanelHeight }}>
          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            className="group flex h-1.5 w-full cursor-row-resize items-center justify-center bg-transparent hover:bg-border/60 active:bg-border"
          >
            <div className="h-0.5 w-10 rounded-full bg-border transition-all group-hover:bg-muted-foreground/50 group-active:bg-muted-foreground" />
          </div>
          <div className="h-[calc(100%-6px)]">
            <QueryInput />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
