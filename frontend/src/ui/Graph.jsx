// The story graph for the new UI. Same data and layout as the classic KnowledgeGraph (lanes by
// point of view, one node per scene), with motion that explains it: nodes grow in along the
// path, edges draw themselves from cause to effect, the camera glides out from where the story
// began, and the scene you are on breathes twice and then rests.
import { memo, useEffect, useMemo } from 'react'
import { ReactFlow, Background, Controls, Handle, Position, MarkerType, useReactFlow, useNodesInitialized } from '@xyflow/react'
import { Sparkles } from 'lucide-react'
import '@xyflow/react/dist/style.css'
import { DURATION, STAGGER_STEP_MS } from '../constants/theme.js'
import { ms, useCalmMotion } from '../lib/motionMode.js'
import { gradedSceneUrl } from './gradedScene.js'
import { sceneKindFor } from '../lib/scene.js'
import { NEUTRAL_LOOK } from './looks.js'
import './graph.css'

const TEXT = '#F3F5F6'
const DIM = '#C6CDD5'
const SIGNAL = '#FF6A4D'
// Line style carries the meaning (solid, arrow, dotted, thin, dashed); color only backs it up.
const EDGE_STYLE = {
  caused_by: { label: 'caused by', style: { stroke: TEXT, strokeOpacity: 0.6, strokeWidth: 1.5 } },
  happened_next: { label: 'happened next', style: { stroke: TEXT, strokeOpacity: 0.6, strokeWidth: 1.5 }, arrow: true },
  same_event: { label: 'same event, another view', style: { stroke: TEXT, strokeOpacity: 0.6, strokeWidth: 1.5, strokeDasharray: '1 5', strokeLinecap: 'round' } },
  deeper_context: { label: 'deeper context', style: { stroke: DIM, strokeOpacity: 0.7, strokeWidth: 1 } },
  opposing_view: { label: 'opposing view', style: { stroke: SIGNAL, strokeWidth: 1.5, strokeDasharray: '6 4' } },
}

const SceneNode = memo(function SceneNode({ data }) {
  const { segment, look, isCurrent, order, real, onSelect } = data
  // The scene's own illustration when it had one (labeled, because it is AI-made); the drawn scene otherwise.
  const thumb = real || gradedSceneUrl({ seed: segment.segment_id, kind: sceneKindFor(`${segment.scene_prompt || ''} ${segment.title}`), width: 320, height: 200 }, look)
  const body = (
    <>
      <span className={`ui-node-thumb ${isCurrent ? 'is-current' : ''}`}>
        <img src={thumb} alt="" className={real ? 'print-color' : ''} />
        {real && (
          <span className="ui-node-ai" title="ai-generated illustration">
            <Sparkles aria-hidden="true" size={10} strokeWidth={2.2} />
            <span className="ui-sr">ai-generated illustration</span>
          </span>
        )}
      </span>
      <span className="ui-node-title">{segment.title}</span>
      <span className="ui-node-who">
        {look.label}
        {isCurrent ? ' · now' : ''}
      </span>
    </>
  )
  return (
    <div className="ui-node" style={{ '--order': order, '--accent': look.accent }}>
      <Handle type="target" position={Position.Left} className="ui-node-handle" />
      {onSelect ? (
        <button type="button" className="ui-node-btn nodrag nopan" onClick={() => onSelect(segment.segment_id)} aria-label={`${isCurrent ? 'Return to' : 'Look back at'} ${segment.title}${look.label ? `, ${look.label}` : ''}`}>
          {body}
        </button>
      ) : (
        <div className="ui-node-btn">{body}</div>
      )}
      <Handle type="source" position={Position.Right} className="ui-node-handle" />
    </div>
  )
})
const nodeTypes = { scene: SceneNode }

/** Row 43: start on the first scene, then glide out to the path (or, in a long story, to where you are). */
function Camera({ firstId, currentId, count, isCalm }) {
  const flow = useReactFlow()
  const isReady = useNodesInitialized()
  useEffect(() => {
    if (!isReady || !count) return
    const duration = isCalm ? 0 : ms(DURATION.scene)
    if (!isCalm && firstId) flow.fitView({ nodes: [{ id: firstId }], maxZoom: 1.1, padding: 0.6, duration: 0 })
    const t = setTimeout(
      () => {
        if (count <= 6) flow.fitView({ padding: 0.25, maxZoom: 1.1, duration })
        else flow.fitView({ nodes: [{ id: currentId }], maxZoom: 0.9, padding: 1.4, duration })
      },
      isCalm ? 0 : ms(DURATION.panel),
    )
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, currentId, count])
  return null
}

export default function Graph({ nodes, edges, currentSegmentId, looks = {}, perspectives = [], thumbs = {}, onSelectNode }) {
  const isCalm = useCalmMotion()
  const lanes = useMemo(() => Object.fromEntries(perspectives.map((p, i) => [p.perspective_id, i])), [perspectives])
  const rfNodes = useMemo(
    () =>
      nodes.map((s, i) => ({
        id: s.segment_id,
        type: 'scene',
        position: { x: i * 230, y: (lanes[s.perspective] ?? perspectives.length) * 150 },
        data: { segment: s, look: looks[s.perspective] || NEUTRAL_LOOK, isCurrent: s.segment_id === currentSegmentId, order: i, real: thumbs[s.segment_id] || null, onSelect: onSelectNode },
        draggable: false,
        connectable: false,
        ariaLabel: `${s.title}${looks[s.perspective]?.label ? `, ${looks[s.perspective].label}` : ''}${s.segment_id === currentSegmentId ? ', the scene you are on' : ''}`,
      })),
    [nodes, lanes, looks, currentSegmentId, perspectives.length, thumbs, onSelectNode],
  )
  const rfEdges = useMemo(
    () =>
      edges.map((e, i) => {
        const st = EDGE_STYLE[e.edge_type] || EDGE_STYLE.happened_next
        return {
          id: `${e.source}->${e.target}`,
          source: e.source,
          target: e.target,
          // row 42: each edge draws after the node it comes from has appeared
          style: { ...st.style, '--draw-delay': `${ms(DURATION.panel + (i + 1) * STAGGER_STEP_MS * 2)}ms` },
          type: 'default',
          markerEnd: st.arrow ? { type: MarkerType.ArrowClosed, color: TEXT, width: 14, height: 14 } : undefined,
          focusable: false,
        }
      }),
    [edges],
  )
  return (
    <div className="ui-graph">
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
        elementsSelectable={false}
        nodesFocusable={false}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      >
        <Background color="rgba(243,245,246,0.06)" gap={24} size={1} />
        <Controls showInteractive={false} position="top-right" />
        <Camera firstId={nodes[0]?.segment_id} currentId={currentSegmentId} count={nodes.length} isCalm={isCalm} />
      </ReactFlow>
      <ul aria-label="legend" className="ui-graph-legend">
        {Object.entries(EDGE_STYLE).map(([key, st]) => (
          <li key={key}>
            <svg aria-hidden="true" width="28" height="6">
              <line x1="0" y1="3" x2="28" y2="3" {...st.style} />
            </svg>
            {st.label}
          </li>
        ))}
        {Object.keys(thumbs).length > 0 && (
          <li>
            <span className="ui-node-ai is-legend"><Sparkles aria-hidden="true" size={10} strokeWidth={2.2} /></span>
            ai-generated illustration
          </li>
        )}
      </ul>
    </div>
  )
}
