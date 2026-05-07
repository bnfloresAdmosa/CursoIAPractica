// Kanban Board — 3 columns, filters, search
function BoardScreen({ variant = 'default' }) {
  const project = PROJECTS[0];
  const cols = [
    { key:'todo',     label:'Por hacer',   count: TICKETS.filter(t=>t.status==='todo').length },
    { key:'progress', label:'En progreso', count: TICKETS.filter(t=>t.status==='progress').length },
    { key:'done',     label:'Listo',       count: TICKETS.filter(t=>t.status==='done').length },
  ];

  const showEmpty = variant === 'empty-filter';
  const filters = variant === 'empty-filter'
    ? [{ label:'Prioridad: Alta', key:'p' }, { label:'Etiqueta: api', key:'t' }, { label:'Asignado: Pedro', key:'a' }]
    : [{ label:'Prioridad: Alta', key:'p' }, { label:'Asignado: Laura', key:'a' }];

  return (
    <div className="app">
      <TopBar breadcrumbs={['Espacio', 'Rediseño Web']} />
      <div className="main">
        <SideBar activeProject="p1" />
        <div className="content">
          <div className="page-head">
            <div className="head-row">
              <div>
                <h1>Rediseño Web</h1>
                <div className="sub" style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span>Renovación visual y de UX del sitio corporativo</span>
                  <span className="chip" style={{ background:'#1d1d1f', color:'white', border:'none' }}>Admin</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <Segmented value="board" onChange={()=>{}} options={[
                  { value:'board', label:'Tablero', icon:<I.Board size={12} style={{marginRight:4}}/> },
                  { value:'list',  label:'Lista',   icon:<I.List size={12} style={{marginRight:4}}/> },
                  { value:'metrics', label:'Métricas', icon:<I.Dashboard size={12} style={{marginRight:4}}/> },
                ]} />
                <button className="btn primary"><I.Plus size={14}/> Nuevo ticket</button>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:16, flexWrap:'wrap' }}>
              <div className="search">
                <I.Search size={13}/>
                <input className="input" placeholder="Buscar en títulos…" defaultValue={showEmpty?'onboarding':''} style={{ width:240 }} />
              </div>
              <FilterPill icon={<I.Tag size={12}/>} label="Etiqueta" value="2" />
              <FilterPill icon={<I.User size={12}/>} label="Asignado" value="Laura" />
              <FilterPill icon={<I.Clock size={12}/>} label="Prioridad" value="Alta" />
              <FilterPill icon={<I.Clock size={12}/>} label="Creado" value="Últ. 30 días" />
              <button className="btn sm ghost" style={{ color:'var(--muted)' }}>
                <I.Plus size={12}/> Agregar filtro
              </button>

              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, color:'var(--muted)', fontSize:12 }}>
                <span>{showEmpty? '0' : TICKETS.length} resultados</span>
              </div>
            </div>
          </div>

          {showEmpty
            ? <EmptyBoard />
            : <div style={{ flex:1, overflow:'hidden', padding:'20px 20px', display:'flex', gap:16 }}>
                {cols.map(c => <Column key={c.key} col={c} />)}
              </div>
          }
        </div>
      </div>
    </div>
  );
}

function FilterPill({ icon, label, value }) {
  return (
    <div className="chip" style={{
      background:'var(--surface)', border:'1px solid var(--border)', padding:'4px 10px',
      cursor:'pointer', gap:6, fontSize:12, fontWeight:500,
    }}>
      <span style={{ color:'var(--muted)' }}>{icon}</span>
      <span style={{ color:'var(--muted)' }}>{label}:</span>
      <span>{value}</span>
      <I.ChevDown size={11} style={{ color:'var(--muted)' }}/>
    </div>
  );
}

function Column({ col }) {
  const tickets = TICKETS.filter(t => t.status === col.key);
  return (
    <div style={{
      flex:1, minWidth:280, display:'flex', flexDirection:'column',
      background:'transparent', borderRadius:'var(--r-lg)',
    }}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 6px 10px', fontSize:13, fontWeight:600, letterSpacing:'-0.01em',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className={`dot ${col.key}`} style={{ width:8, height:8 }}/>
          {col.label}
          <span style={{ color:'var(--muted)', fontWeight:500, fontSize:12 }}>{col.count}</span>
        </div>
        <button className="btn icon ghost" style={{ width:22, height:22 }}><I.Plus size={13}/></button>
      </div>
      <div className="mj-scroll" style={{
        flex:1, overflowY:'auto', padding:'2px 4px', display:'flex', flexDirection:'column', gap:8,
      }}>
        {tickets.map(t => <TicketCard key={t.id} t={t} />)}
      </div>
    </div>
  );
}

function TicketCard({ t }) {
  return (
    <div style={{
      background:'var(--surface)',
      border:'1px solid var(--border)',
      borderRadius:12,
      padding:'12px 12px 10px',
      boxShadow:'var(--shadow-1)',
      display:'flex', flexDirection:'column', gap:10,
      cursor:'pointer',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span className="mono" style={{ fontSize:10.5 }}>{t.id}</span>
        <PriorityChip p={t.priority} />
      </div>
      <div style={{ fontSize:13.5, lineHeight:1.4, fontWeight:500, color:'var(--text)', letterSpacing:'-0.01em' }}>
        {t.title}
      </div>
      {t.tags.length > 0 && (
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {t.tags.map(tg => {
            const tag = tagById(tg);
            return (
              <span key={tg} className="tag" style={{
                background:`${tag.color}12`, color:tag.color, borderColor:'transparent'
              }}>{tag.name}</span>
            );
          })}
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}>
        <AvatarStack size="sm" names={namesOf(t.assignees)} />
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10, fontSize:11.5, color:'var(--muted)' }}>
          {t.comments > 0 && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>
              <I.Comment size={11}/> {t.comments}
            </span>
          )}
          <span>{t.updated}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyBoard() {
  return (
    <div style={{
      flex:1, display:'grid', placeItems:'center', padding:24,
    }}>
      <div style={{ textAlign:'center', maxWidth:320 }}>
        <div style={{
          width:48, height:48, borderRadius:14, background:'var(--surface-2)',
          display:'grid', placeItems:'center', margin:'0 auto 14px', color:'var(--muted)'
        }}>
          <I.Search size={20}/>
        </div>
        <div style={{ fontSize:15, fontWeight:600, letterSpacing:'-0.02em' }}>
          No se encontraron tickets con estos filtros
        </div>
        <div style={{ fontSize:13, color:'var(--muted)', marginTop:6 }}>
          Prueba limpiar la búsqueda o eliminar uno de los filtros aplicados.
        </div>
        <button className="btn" style={{ marginTop:14 }}>Limpiar filtros</button>
      </div>
    </div>
  );
}

Object.assign(window, { BoardScreen });
