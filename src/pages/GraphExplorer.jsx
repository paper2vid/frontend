import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from 'react-query'
import { Search, Info, Layers } from 'lucide-react'
import * as d3 from 'd3'
import { getPapers, semanticSearch, fieldTimeline } from '../utils/api'
import { useNavigate } from 'react-router-dom'

const NODE_COLORS = {
  done:       '#00D2B4',
  scripting:  '#4091FF',
  embedding:  '#A855F7',
  failed:     '#FF4560',
  default:    '#646F96',
}

export default function GraphExplorer() {
  const svgRef   = useRef(null)
  const navigate = useNavigate()
  const [query,    setQuery]    = useState('')
  const [concept,  setConcept]  = useState('')
  const [hoveredId, setHovered] = useState(null)

  const { data: papers = [] } = useQuery('papers-all', () => getPapers({ limit: 100 }))

  const buildFullGraph = useCallback(() => {
    if (!papers.length || !svgRef.current) return
    const el = svgRef.current
    const W  = el.clientWidth
    const H  = el.clientHeight

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el).attr('width', W).attr('height', H)
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#0A0E1F')

    const g    = svg.append('g')
    const zoom = d3.zoom().scaleExtent([0.1, 4])
      .on('zoom', e => g.attr('transform', e.transform))
    svg.call(zoom)

    const nodes = papers.map(p => ({
      id:     p.id,
      title:  p.title,
      year:   p.year,
      venue:  p.venue,
      status: p.status,
    }))

    const sim = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center',    d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(30))

    const node = g.append('g').selectAll('g')
      .data(nodes).enter().append('g')
      .attr('class', 'graph-node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('click', (_, d) => navigate(`/papers/${d.id}`))
      .on('mouseover', (_, d) => setHovered(d))
      .on('mouseout',  ()     => setHovered(null))

    node.append('circle')
      .attr('r', 12)
      .attr('fill', d => (NODE_COLORS[d.status] || NODE_COLORS.default) + '22')
      .attr('stroke', d => NODE_COLORS[d.status] || NODE_COLORS.default)
      .attr('stroke-width', 1.5)

    node.append('text')
      .text(d => (d.title || '').slice(0, 22))
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('fill', '#646F96')
      .attr('font-family', 'DM Sans')

    sim.on('tick', () => {
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, [papers, navigate])

  useEffect(() => {
    const cleanup = buildFullGraph()
    const obs = new ResizeObserver(buildFullGraph)
    if (svgRef.current) obs.observe(svgRef.current)
    return () => { cleanup?.(); obs.disconnect() }
  }, [buildFullGraph])

  return (
    <div className="relative h-full flex flex-col">
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search papers…"
            className="input pl-8 w-72 text-xs h-9"
          />
        </div>
        <div className="relative">
          <Layers size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={concept}
            onChange={e => setConcept(e.target.value)}
            placeholder="Field / concept…"
            className="input pl-8 w-52 text-xs h-9"
          />
        </div>
        <div className="bg-bg-dark/80 backdrop-blur-sm border border-bg-border rounded-lg px-3 py-2 text-xs text-text-muted font-mono">
          {papers.length} papers
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5">
        {Object.entries(NODE_COLORS).filter(([k]) => k !== 'default').map(([status, color]) => (
          <div key={status} className="flex items-center gap-2 bg-bg-dark/80 backdrop-blur-sm px-2.5 py-1 rounded-md">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-text-muted font-mono capitalize">{status}</span>
          </div>
        ))}
      </div>

      {/* Hovered paper tooltip */}
      {hoveredId && (
        <div className="absolute bottom-4 right-4 z-10 card p-4 max-w-xs pointer-events-none">
          <p className="font-display font-semibold text-sm text-text-primary line-clamp-2">{hoveredId.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {hoveredId.year && <span className="text-xs text-text-muted">{hoveredId.year}</span>}
            {hoveredId.venue && <span className="text-xs text-text-dim">{hoveredId.venue}</span>}
          </div>
          <p className="text-xs text-accent-blue mt-1.5">Click to open →</p>
        </div>
      )}

      {/* Graph canvas */}
      <svg ref={svgRef} className="w-full flex-1" />
    </div>
  )
}
