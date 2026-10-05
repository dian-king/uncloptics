import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const initialTasks = [
  { id: 1, title: 'Design onboarding flow', tag: 'Design', done: true, members: 'AK' },
  { id: 2, title: 'Build analytics chart', tag: 'Dev', done: false, members: 'JM' },
  { id: 3, title: 'Write launch copy', tag: 'Marketing', done: false, members: 'RS' },
  { id: 4, title: 'User testing session', tag: 'Research', done: false, members: 'AK' },
]

const stats = [
  { label: 'Active users', value: '12,482', delta: '+18.2%' },
  { label: 'Revenue', value: '$48.2k', delta: '+12.4%' },
  { label: 'Conversion', value: '3.84%', delta: '+0.6%' },
  { label: 'Churn', value: '0.42%', delta: '-0.1%' },
]

const bars = [42, 68, 55, 80, 62, 92, 74, 88, 58, 96, 70, 84]

export default function DemoPage() {
  const [tab, setTab] = useState('Overview')
  const [tasks, setTasks] = useState(initialTasks)
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [sidebar, setSidebar] = useState(true)

  const filtered = useMemo(
    () => tasks.filter((t) => t.title.toLowerCase().includes(query.toLowerCase())),
    [tasks, query]
  )
  const progress = Math.round((tasks.filter((t) => t.done).length / Math.max(1, tasks.length)) * 100)

  const toggle = (id) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const addTask = (e) => {
    e.preventDefault()
    if (!newTask.trim()) return
    setTasks((ts) => [...ts, { id: Date.now(), title: newTask.trim(), tag: 'New', done: false, members: 'YOU' }])
    setNewTask('')
    setModal(false)
  }

  return (
    <div className="demo-root">
      <style>{`
        .demo-root{--dbg:#0b0b10;--dbg2:#121218;--dbg3:#1a1a24;--dink:#f2f0ea;--dink2:rgba(242,240,234,.62);--dink3:rgba(242,240,234,.34);--dline:rgba(255,255,255,.09);--dacc:#7c6cf0;--dacc2:#a78bfa;--dgreen:#34d399;min-height:100vh;background:radial-gradient(1200px 600px at 80% -10%,rgba(124,108,240,.22),transparent),var(--dbg);color:var(--dink);font-family:Inter,system-ui,sans-serif;padding:calc(var(--nav-h) + 28px) 0 60px}
        .demo-shell{width:min(1180px,92vw);margin-inline:auto;border:1px solid var(--dline);border-radius:18px;overflow:hidden;background:rgba(18,18,24,.86);backdrop-filter:blur(16px);box-shadow:0 40px 120px rgba(0,0,0,.5)}
        .demo-top{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--dline);background:rgba(255,255,255,.02)}
        .demo-dots{display:flex;gap:7px}.demo-dots i{width:11px;height:11px;border-radius:50%;display:block}
        .demo-url{flex:1;background:var(--dbg3);border:1px solid var(--dline);border-radius:999px;padding:7px 16px;font-size:12.5px;color:var(--dink2);display:flex;gap:8px;align-items:center}
        .demo-body{display:grid;grid-template-columns:${sidebar ? '230px 1fr' : '0 1fr'};min-height:620px;transition:grid-template-columns .3s ease}
        .demo-side{border-right:1px solid var(--dline);padding:20px 14px;overflow:hidden;white-space:nowrap}
        .demo-side h4{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--dink3);margin:18px 10px 8px}
        .demo-link{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;font-size:13.5px;color:var(--dink2);cursor:pointer;border:1px solid transparent;width:100%;text-align:left}
        .demo-link:hover{background:rgba(255,255,255,.05);color:var(--dink)}
        .demo-link.active{background:rgba(124,108,240,.16);border-color:rgba(124,108,240,.35);color:#fff}
        .demo-main{padding:26px clamp(18px,3vw,32px);min-width:0}
        .demo-head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:20px}
        .demo-head h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(28px,3.4vw,40px);font-weight:300;line-height:1.1}
        .demo-head p{color:var(--dink2);font-size:13.5px;margin-top:6px}
        .demo-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--dacc),#5b4fe0);border:none;color:#fff;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;padding:12px 20px;border-radius:999px;cursor:pointer;box-shadow:0 12px 30px rgba(124,108,240,.35)}
        .demo-btn:hover{filter:brightness(1.1);transform:translateY(-1px)}
        .demo-btn.ghost{background:transparent;border:1px solid var(--dline);box-shadow:none;color:var(--dink2)}
        .demo-tabs{display:flex;gap:8px;margin:18px 0 22px;flex-wrap:wrap}
        .demo-tab{padding:8px 18px;border-radius:999px;border:1px solid var(--dline);font-size:12px;letter-spacing:.08em;color:var(--dink2);cursor:pointer}
        .demo-tab.active{background:#fff;color:#111;border-color:#fff}
        .demo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
        .demo-card{background:var(--dbg3);border:1px solid var(--dline);border-radius:14px;padding:16px}
        .demo-card .k{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--dink3)}
        .demo-card .v{font-size:24px;font-weight:600;margin:8px 0 4px}
        .demo-card .d{font-size:12px;color:var(--dgreen)}
        .demo-panels{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}
        .demo-panel{background:var(--dbg3);border:1px solid var(--dline);border-radius:14px;padding:18px;min-width:0}
        .demo-panel h3{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--dink2);margin-bottom:14px}
        .demo-chart{display:flex;align-items:flex-end;gap:8px;height:150px}
        .demo-bar{flex:1;border-radius:6px 6px 3px 3px;background:linear-gradient(to top,var(--dacc),var(--dacc2));min-height:8px;transition:height .5s ease;cursor:pointer}
        .demo-bar:hover{filter:brightness(1.25)}
        .demo-search{width:100%;background:var(--dbg);border:1px solid var(--dline);border-radius:10px;padding:10px 14px;color:var(--dink);font-size:13px;outline:none;margin-bottom:12px}
        .demo-search:focus{border-color:var(--dacc)}
        .demo-task{display:flex;align-items:center;gap:12px;padding:11px 10px;border-radius:10px;border:1px solid transparent;cursor:pointer;font-size:13.5px}
        .demo-task:hover{background:rgba(255,255,255,.04)}
        .demo-check{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--dink3);display:grid;place-items:center;flex:none;font-size:12px}
        .demo-task.done .demo-check{background:var(--dgreen);border-color:var(--dgreen);color:#06281d}
        .demo-task.done span.t{text-decoration:line-through;color:var(--dink3)}
        .demo-tag{margin-left:auto;font-size:10px;letter-spacing:.12em;text-transform:uppercase;background:rgba(124,108,240,.18);border:1px solid rgba(124,108,240,.35);padding:4px 10px;border-radius:999px;color:#cfc6ff;flex:none}
        .demo-progress{height:8px;background:var(--dbg);border-radius:999px;overflow:hidden;margin:10px 0 6px;border:1px solid var(--dline)}
        .demo-progress i{display:block;height:100%;background:linear-gradient(90deg,var(--dgreen),#6ee7b7);border-radius:999px;transition:width .4s ease}
        .demo-modal{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);padding:20px}
        .demo-modal-card{width:min(440px,100%);background:#17171f;border:1px solid var(--dline);border-radius:16px;padding:26px;box-shadow:0 30px 80px rgba(0,0,0,.6)}
        .demo-input{width:100%;background:var(--dbg);border:1px solid var(--dline);border-radius:10px;padding:12px 14px;color:#fff;font-size:14px;outline:none;margin:14px 0}
        .demo-input:focus{border-color:var(--dacc)}
        .demo-note{text-align:center;margin-top:26px;color:var(--dink3);font-size:12.5px}
        .demo-note a{color:var(--dacc2)}
        @media(max-width:900px){.demo-grid{grid-template-columns:repeat(2,1fr)}.demo-panels{grid-template-columns:1fr}.demo-body{grid-template-columns:1fr}.demo-side{display:none}}
      `}</style>

      <div className="demo-shell">
        <div className="demo-top">
          <div className="demo-dots"><i style={{ background: '#ff5f57' }} /><i style={{ background: '#febc2e' }} /><i style={{ background: '#28c840' }} /></div>
          <div className="demo-url">🔒&nbsp; figma-clone.demo/app/overview — interactive prototype</div>
          <button className="demo-btn ghost" onClick={() => setSidebar((s) => !s)} style={{ padding: '8px 14px' }}>{sidebar ? '⟨' : '⟩'}</button>
        </div>

        <div className="demo-body">
          <aside className="demo-side">
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, padding: '2px 10px' }}>◆ Nova</div>
            <h4>Workspace</h4>
            {['Overview', 'Analytics', 'Projects', 'Team', 'Settings'].map((t) => (
              <button key={t} className={`demo-link${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                <span>{t === 'Overview' ? '◉' : t === 'Analytics' ? '◭' : t === 'Projects' ? '▦' : t === 'Team' ? '◍' : '⚙'}</span> {t}
              </button>
            ))}
            <h4>Shortcuts</h4>
            <button className="demo-link" onClick={() => setModal(true)}>＋ New task</button>
            <button className="demo-link" onClick={() => setQuery('design')}>⌕ Filter: design</button>
          </aside>

          <div className="demo-main">
            <div className="demo-head">
              <div>
                <p style={{ fontSize: 11, letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--dacc2)' }}>Yes — I can build this ✓ live demo</p>
                <h1>{tab} dashboard</h1>
                <p>Like Figma Sites / Claude artifacts: real React UI, hover states, tabs, search, modal — all working.</p>
              </div>
              <button className="demo-btn" onClick={() => setModal(true)}>+ New task</button>
            </div>

            <div className="demo-tabs">
              {['Overview', 'Analytics', 'Projects', 'Team'].map((t) => (
                <button key={t} className={`demo-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>

            <div className="demo-grid">
              {stats.map((s) => (
                <div key={s.label} className="demo-card">
                  <div className="k">{s.label}</div>
                  <div className="v">{s.value}</div>
                  <div className="d">{s.delta} vs last week</div>
                </div>
              ))}
            </div>

            <div className="demo-panels">
              <div className="demo-panel">
                <h3>Revenue — last 12 weeks (hover bars)</h3>
                <div className="demo-chart">
                  {bars.map((h, i) => (
                    <div key={i} className="demo-bar" style={{ height: `${h}%` }} title={`${h}%`} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dink3)', marginTop: 10 }}>
                  <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span>
                </div>
              </div>

              <div className="demo-panel">
                <h3>Tasks — {progress}% complete</h3>
                <div className="demo-progress"><i style={{ width: `${progress}%` }} /></div>
                <input className="demo-search" placeholder="Search tasks…" value={query} onChange={(e) => setQuery(e.target.value)} />
                {filtered.length === 0 && <p style={{ fontSize: 13, color: 'var(--dink3)' }}>No tasks match “{query}”.</p>}
                {filtered.map((t) => (
                  <div key={t.id} className={`demo-task${t.done ? ' done' : ''}`} onClick={() => toggle(t.id)}>
                    <div className="demo-check">{t.done ? '✓' : ''}</div>
                    <span className="t">{t.title}</span>
                    <span className="demo-tag">{t.tag}</span>
                  </div>
                ))}
                <form onSubmit={addTask} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input className="demo-search" style={{ margin: 0 }} placeholder="Quick add + Enter…" value={newTask} onChange={(e) => setNewTask(e.target.value)} />
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="demo-modal" onClick={() => setModal(false)}>
          <div className="demo-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 28 }}>Create task</h2>
            <p style={{ fontSize: 13, color: 'var(--dink2)' }}>This modal, like everything here, is real working UI — same way Claude / Figma Make generate apps.</p>
            <form onSubmit={addTask}>
              <input className="demo-input" autoFocus placeholder="e.g. Design pricing page" value={newTask} onChange={(e) => setNewTask(e.target.value)} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="demo-btn ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="demo-btn">Create →</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p className="demo-note">Proof it works: sidebar, tabs, search, progress bar, chart, modal, quick-add. <Link to="/">← Back to site</Link> · I can build landing pages, dashboards, mobile UIs, full multi-screen prototypes in this stack.</p>
    </div>
  )
}
