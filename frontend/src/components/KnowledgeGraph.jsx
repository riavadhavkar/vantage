// OWNER: Person B
// Lazy-loaded. Segments are small graded prints laid out in lanes by point of view.
import { memo, useMemo } from 'react'
import { ReactFlow, Background, Controls, Handle, Position, MarkerType } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { sceneDataUrl, sceneKindFor } from '../lib/scene.js'
import { FALLBACK_GRADE, COLORS } from '../constants/theme.js'
import GradeLayers from './GradeLayers.jsx'

const EDGE_STYLE = {
  caused_by: { label: 'Caused by', style: { stroke: COLORS.print, strokeOpacity: 0.6, strokeWidth: 1.5 } },
  happened_next: { label: 'Happened next', style: { stroke: COLORS.print, strokeOpacity: 0.6, strokeWidth: 1.5 }, arrow: true },
  same_event: { label: 'Same event, another view', style: { stroke: COLORS.print, strokeOpacity: 0.6, strokeWidth: 1.5, strokeDasharray: '1 5', strokeLinecap: 'round' } },
  deeper_context: { label: 'Deeper context', style: { stroke: COLORS.fog, strokeOpacity: 0.7, strokeWidth: 1 } },
  opposing_view: { label: 'Opposing view', style: { stroke: COLORS.safelight, strokeWidth: 1.5, strokeDasharray: '6 4' } },
}

const PrintNode = memo(function PrintNode({ data }) {
  const { segment, grade, isCurrent, thumb: real } = data
  const thumb = real || sceneDataUrl({ seed: segment.segment_id, kind: sceneKindFor(`${segment.scene_prompt || ''} ${segment.title}`), width: 320, height: 200 })
  return (
    <div className="graph-node-grow w-[188px]">
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-fog" />
      <div className={`relative h-[66px] w-full overflow-hidden rounded-md ${isCurrent ? 'pulse-twice ring-2 ring-print' : 'ring-1 ring-print/15'}`}>
        <img src={thumb} alt="" className={`${real ? '' : 'print-gray '}absolute inset-0 h-full w-full object-cover`} />
        {!real && <GradeLayers grade={grade} />}
      </div>
      <p className="mt-1.5 text-[14px] font-medium leading-[18px] text-print">{segment.title}</p>
      <p className="text-[12px] leading-[16px]" style={{ color: grade.text }}>
        {grade.label}
        {isCurrent ? ' · now' : ''}
      </p>
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-fog" />
    </div>
  )
})

const nodeTypes = { print: PrintNode }

export default function KnowledgeGraph({ nodes, edges, currentSegmentId, grades = {}, perspectives = [], onSelectNode, thumbs = {} }) {
  const lanes = useMemo(() => {
    const m = {}
    perspectives.forEach((p, i) => (m[p.perspective_id] = i))
    return m
  }, [perspectives])

  const rfNodes = useMemo(
    () =>
      nodes.map((s, i) => ({
        id: s.segment_id,
        type: 'print',
        position: { x: i * 230, y: (lanes[s.perspective] ?? perspectives.length) * 150 },
        data: { segment: s, grade: grades[s.perspective] || FALLBACK_GRADE, isCurrent: s.segment_id === currentSegmentId, thumb: thumbs[s.segment_id] },
        draggable: false,
        connectable: false,
        ariaLabel: `${s.title}${grades[s.perspective]?.label ? `, ${grades[s.perspective].label}` : ''}`,
      })),
    [nodes, lanes, grades, currentSegmentId, perspectives.length, thumbs],
  )

  const rfEdges = useMemo(
    () =>
      edges.map((e) => {
        const st = EDGE_STYLE[e.edge_type] || EDGE_STYLE.happened_next
        return {
          id: `${e.source}->${e.target}`,
          source: e.source,
          target: e.target,
          style: st.style,
          type: 'default',
          markerEnd: st.arrow ? { type: MarkerType.ArrowClosed, color: COLORS.print, width: 14, height: 14 } : undefined,
          focusable: false,
        }
      }),
    [edges],
  )

  return (
    <div className="relative h-full w-full bg-prussian">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
        minZoom={0.3}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={!!onSelectNode}
        onNodeClick={onSelectNode ? (_, n) => onSelectNode(n.id) : undefined}
        colorMode="dark"
        style={{ background: 'transparent' }}
      >
        <Background color="rgba(238,240,234,0.06)" gap={24} size={1} />
        <Controls showInteractive={false} position="top-right" />
      </ReactFlow>
      <ul aria-label="Legend" className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1 rounded-md bg-prussian/85 p-3 text-xs text-fog">
        {Object.entries(EDGE_STYLE).map(([key, st]) => (
          <li key={key} className="flex items-center gap-2">
            <svg aria-hidden="true" width="28" height="6">
              <line x1="0" y1="3" x2="28" y2="3" {...st.style} />
            </svg>
            {st.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
