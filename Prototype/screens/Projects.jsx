// Projects list — grid of project cards
function ProjectsScreen() {
  const active = PROJECTS.filter(p => !p.archived);
  return (
    <div className="app">
      <TopBar breadcrumbs={['Espacio de trabajo', 'Proyectos']} />
      <div className="main">
        <SideBar activeProject={null} activeView="projects" />
        <div className="content">
          <div className="page-head">
            <div className="head-row">
              <div>
                <h1>Proyectos</h1>
                <div className="sub">{active.length} proyectos activos · puedes ser Admin en unos y Usuario en otros.</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <Segmented value="active" onChange={()=>{}} options={[
                  { value:'active', label:'Activos' },
                  { value:'archived', label:'Archivados', icon:<I.Archive size={12} style={{marginRight:4}}/> },
                ]} />
                <div className="search" style={{ marginLeft:8 }}>
                  <I.Search size={13}/>
                  <input className="input" placeholder="Buscar proyectos" style={{ width:220 }}/>
                </div>
                <button className="btn primary">
                  <I.Plus size={14}/> Nuevo proyecto
                </button>
              </div>
            </div>
          </div>

          <div className="mj-scroll" style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))',
              gap:16,
            }}>
              {active.map(p => <ProjectCard key={p.id} p={p} />)}
              <NewProjectCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ p }) {
  const color = p.id==='p1'?'#0071e3' : p.id==='p2'?'#c68415' : p.id==='p3'?'#3d8b7a':'#8a6a9a';
  return (
    <div className="card" style={{
      padding:20, display:'flex', flexDirection:'column', gap:14,
      cursor:'pointer', transition:'box-shadow .15s, transform .1s',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <div style={{
            width:40, height:40, borderRadius:10,
            background:`${color}14`, color,
            display:'grid', placeItems:'center', fontWeight:700, fontSize:15,
            letterSpacing:'-0.02em',
          }}>
            {p.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:600, fontSize:15, letterSpacing:'-0.01em' }}>{p.name}</div>
            <div className="mono" style={{ fontSize:10.5 }}>{p.id.toUpperCase()}</div>
          </div>
        </div>
        <span className={`chip ${p.role==='ADMIN'?'':''}`} style={{
          background: p.role==='ADMIN' ? '#1d1d1f' : 'var(--surface-2)',
          color: p.role==='ADMIN' ? 'white' : 'var(--muted)',
          border:'none', fontSize:10.5, textTransform:'uppercase', letterSpacing:'0.05em',
        }}>{p.role==='ADMIN' ? 'Admin' : 'Usuario'}</span>
      </div>

      <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.5, minHeight:40 }}>
        {p.desc}
      </div>

      <div style={{
        display:'flex', alignItems:'center', gap:12,
        paddingTop:14, borderTop:'1px solid var(--border)',
      }}>
        <AvatarStack size="sm" max={4}
          names={USERS.slice(0, p.members).map(u=>u.name)} />
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14, fontSize:12, color:'var(--muted)' }}>
          <span style={{ display:'inline-flex', gap:4, alignItems:'center' }}>
            <I.Board size={12}/> {p.open} abiertos
          </span>
          <span>·</span>
          <span>{p.lastActivity}</span>
        </div>
      </div>
    </div>
  );
}

function NewProjectCard() {
  return (
    <div style={{
      border:'1.5px dashed var(--border-strong)',
      borderRadius:'var(--r-lg)',
      padding:20, minHeight:168,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:8, color:'var(--muted)', cursor:'pointer',
      background:'transparent',
    }}>
      <div style={{
        width:36, height:36, borderRadius:10,
        background:'var(--surface)', border:'1px solid var(--border)',
        display:'grid', placeItems:'center', color:'var(--accent)'
      }}>
        <I.Plus size={16}/>
      </div>
      <div style={{ fontSize:13.5, fontWeight:500, color:'var(--text)' }}>Nuevo proyecto</div>
      <div style={{ fontSize:12 }}>Se asigna como Admin al creador</div>
    </div>
  );
}

Object.assign(window, { ProjectsScreen });
