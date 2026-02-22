import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { useNavigate } from 'react-router-dom'

const NODE_COLORS = {
  focal:   '#4091FF',
  cited:   '#00D2B4',
  similar: '#A855F7',
  citing:  '#FF8C40',
  default: '#646F96',
}

const LINK_COLORS = {
  cites:            '#00D2B4',
  cited_by:         '#FF8C40',
  semantic_similar: '#A855F7',
  method_shared:    '#4091FF',
  default:          '#252F50',
}

export default function CitationGraph({ lineage, focalPaperId, focalTitle, height = 520 }) {
  const svgRef   = useRef(null)
  const navigate = useNavigate()

  const buildGraph = useCallback(() => {
    if (!lineage || !svgRef.current) return

    const nodes = []
    const links = []
    const nodeSet = new Set()

    const addNode = (id, title, year, type) => {
      if (nodeSet.has(id)) return
      nodeSet.add(id)
      nodes.push({ id, title: title || 'Unknown', year, type })
    }

    // Focal node
    addNode(focalPaperId, focalTitle, null, 'focal')

    lineage.ancestors?.forEach(p => {
      if (p.id) {
        addNode(p.id, p.title, p.year, 'cited')
        links.push({ source: focalPaperId, target: p.id, type: 'cites' })
      }
    })

    lineage.descendants?.forEach(p => {
      if (p.id) {
        addNode(p.id, p.title, p.year, 'citing')
        links.push({ source: p.id, target: focalPaperId, type: 'cited_by' })
      }
    })

    lineage.similar?.forEach(p => {
      if (p.paper_id) {
        addNode(p.paper_id, p.title, p.year, 'similar')
        links.push({ source: focalPaperId, target: p.paper_id, type: 'semantic_similar' })
      }
    })

    const el   = svgRef.current
    const W    = el.clientWidth || 800
    const H    = height

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el)
      .attr('width', W)
      .attr('height', H)

    // Defs: arrowheads
    const defs = svg.append('defs')
    Object.entries(LINK_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 18)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', color)
        .attr('opacity', 0.6)
    })

    // Background
    svg.append('rect')
      .attr('width', W).attr('height', H)
      .attr('fill', '#0A0E1F')

    const g = svg.append('g')

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', e => g.attr('transform', e.transform))
    svg.call(zoom)

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d =>
        d.type === 'semantic_similar' ? 160 : 120
      ).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(36))

    // Links
    const link = g.append('g').selectAll('line')
      .data(links).enter().append('line')
      .attr('class', 'graph-link')
      .attr('stroke', d => LINK_COLORS[d.type] || LINK_COLORS.default)
      .attr('stroke-width', d => d.type === 'semantic_similar' ? 1 : 1.5)
      .attr('stroke-dasharray', d => d.type === 'semantic_similar' ? '4,3' : null)
      .attr('marker-end', d => `url(#arrow-${d.type})`)

    // Node groups
    const node = g.append('g').selectAll('g')
      .data(nodes).enter().append('g')
      .attr('class', 'graph-node')
      .style('cursor', d => d.type !== 'focal' && d.id ? 'pointer' : 'default')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('click', (_, d) => {
        if (d.id && d.type !== 'focal') navigate(`/papers/${d.id}`)
      })

    // Outer glow for focal
    node.filter(d => d.type === 'focal')
      .append('circle')
      .attr('r', 22)
      .attr('fill', 'none')
      .attr('stroke', '#4091FF')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3)

    // Circles
    node.append('circle')
      .attr('r', d => d.type === 'focal' ? 16 : 10)
      .attr('fill', d => {
        const c = NODE_COLORS[d.type] || NODE_COLORS.default
        return d.type === 'focal' ? c : c + '33'
      })
      .attr('stroke', d => NODE_COLORS[d.type] || NODE_COLORS.default)
      .attr('stroke-width', d => d.type === 'focal' ? 2.5 : 1.5)

    // Year labels on circles
    node.filter(d => d.year)
      .append('text')
      .text(d => d.year?.toString().slice(2))
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '8px')
      .attr('fill', d => NODE_COLORS[d.type] || NODE_COLORS.default)
      .attr('font-family', 'JetBrains Mono')

    // Title labels
    node.append('text')
      .text(d => (d.title || '').slice(0, 28) + ((d.title?.length || 0) > 28 ? '…' : ''))
      .attr('x', d => d.type === 'focal' ? 0 : 14)
      .attr('y', d => d.type === 'focal' ? 26 : 0)
      .attr('text-anchor', d => d.type === 'focal' ? 'middle' : 'start')
      .attr('dy', d => d.type === 'focal' ? '0' : '0.35em')
      .attr('font-size', d => d.type === 'focal' ? '11px' : '9px')
      .attr('fill', d => d.type === 'focal' ? '#F0F5FF' : '#A0AFD2')
      .attr('font-family', 'DM Sans')

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Initial zoom to fit after simulation settles
    setTimeout(() => {
      const bounds = g.node().getBBox()
      if (bounds.width && bounds.height) {
        const scale = 0.85 / Math.max(bounds.width / W, bounds.height / H)
        const tx = W / 2 - scale * (bounds.x + bounds.width / 2)
        const ty = H / 2 - scale * (bounds.y + bounds.height / 2)
        svg.transition().duration(600)
          .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))
      }
    }, 1500)

    return () => sim.stop()
  }, [lineage, focalPaperId, focalTitle, height, navigate])

  useEffect(() => {
    const cleanup = buildGraph()
    const observer = new ResizeObserver(buildGraph)
    if (svgRef.current) observer.observe(svgRef.current.parentElement)
    return () => { cleanup?.(); observer.disconnect() }
  }, [buildGraph])

  return (
    <div className="relative w-full" style={{ height }}>
      <svg ref={svgRef} className="w-full h-full rounded-xl" />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-3">
        {[
          { label: 'This paper',    color: NODE_COLORS.focal   },
          { label: 'Cites',         color: NODE_COLORS.cited   },
          { label: 'Cited by',      color: NODE_COLORS.citing  },
          { label: 'Similar',       color: NODE_COLORS.similar },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 bg-bg-dark/80 backdrop-blur-sm px-2 py-1 rounded-md">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-text-muted font-mono">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
