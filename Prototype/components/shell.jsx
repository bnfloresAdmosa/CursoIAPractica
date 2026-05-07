// App shell — topbar + sidebar used in most screens
function TopBar({ project, breadcrumbs, currentUser = 'Laura Méndez', activeTab }) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">m</div>
        MiniJira
      </div>
      <div className="crumbs">
        {breadcrumbs?.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span className={i === breadcrumbs.length - 1 ? 'current' : ''}>{b}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="spacer" />
      <div className="search">
        <I.Search size={14} />
        <input className="input" placeholder="Buscar tickets, proyectos…" style={{ width: 260 }} />
        <span className="kbd" style={{ position:'absolute', right:8 }}>⌘K</span>
      </div>
      <button className="btn icon ghost" title="Notificaciones"><I.Bell size={15} /></button>
      <Avatar name={currentUser} />
    </div>
  );
}

function SideBar({ activeProject = 'p1', activeView = 'board' }) {
  const projects = PROJECTS.filter(p => !p.archived);
  return (
    <div className="sidebar">
      <div>
        <div className="group-label">Espacio</div>
        <div className={`nav-item ${activeView==='projects'?'active':''}`}>
          <span className="nav-icon"><I.Folder size={15}/></span>
          Proyectos
        </div>
        <div className={`nav-item ${activeView==='dashboard'?'active':''}`}>
          <span className="nav-icon"><I.Dashboard size={15}/></span>
          Métricas
        </div>
        <div className="nav-item">
          <span className="nav-icon"><I.Archive size={15}/></span>
          Archivados
        </div>
      </div>

      <div>
        <div className="group-label">Proyectos</div>
        {projects.map(p => (
          <div key={p.id} className={`nav-item ${activeProject===p.id ? 'active' : ''}`}>
            <span className="nav-icon" style={{
              width:10, height:10, borderRadius:3,
              background: p.id==='p1'?'#0071e3' : p.id==='p2'?'#c68415' : p.id==='p3'?'#3d8b7a':'#8a6a9a'
            }} />
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
            <span className="count">{p.open}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop:'auto', padding:'10px', fontSize:11, color:'var(--subtle)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Avatar name="Laura Méndez" size="sm" />
          <div>
            <div style={{ color:'var(--text)', fontWeight:500, fontSize:12 }}>Laura Méndez</div>
            <div>Admin · Rediseño Web</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TopBar, SideBar });
