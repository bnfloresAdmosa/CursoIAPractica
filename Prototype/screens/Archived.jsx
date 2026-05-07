// Archived tickets / Projects view
function ArchivedScreen() {
  const archived = [
    { id:'T-078', title:'Mover blog al subdominio blog.empresa.com', archivedBy:'Laura Méndez', when:'12 abr', from:'Rediseño Web', status:'done' },
    { id:'T-064', title:'Spike sobre motor de búsqueda Meilisearch',  archivedBy:'Marcos Peña',  when:'8 abr',  from:'Migración a Postgres', status:'todo' },
    { id:'T-052', title:'Documentar onboarding para nuevos hires',    archivedBy:'Laura Méndez', when:'3 abr',  from:'Onboarding RH', status:'progress' },
    { id:'T-041', title:'Duplicado: corregir logo en header mobile',  archivedBy:'Diana Ortiz',  when:'1 abr',  from:'Rediseño Web', status:'done' },
    { id:'T-033', title:'Campaña social de lanzamiento Q1',           archivedBy:'Ana Solís',    when:'22 mar', from:'Campaña Q1 2026', status:'done' },
  ];
  return (
    <div className="app">
      <TopBar breadcrumbs={['Espacio', 'Archivados']}/>
      <div className="main">
        <SideBar activeProject={null} activeView="archived"/>
        <div className="content">
          <div className="page-head">
            <div className="head-row">
              <div>
                <h1>Archivados</h1>
                <div className="sub">Los elementos archivados nunca se eliminan físicamente — conservan su historial.</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Segmented value="tickets" onChange={()=>{}} options={[
                  { value:'tickets', label:'Tickets' },
                  { value:'projects', label:'Proyectos' },
                ]}/>
                <div className="search">
                  <I.Search size={13}/>
                  <input className="input" placeholder="Buscar en archivados" style={{ width:220 }}/>
                </div>
              </div>
            </div>
          </div>

          <div className="mj-scroll" style={{ flex:1, overflow:'auto', padding:'20px 28px' }}>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{
                    background:'var(--bg)',
                    borderBottom:'1px solid var(--border)',
                    color:'var(--muted)', fontSize:11.5, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600, textAlign:'left',
                  }}>
                    <th style={{ padding:'10px 16px', width:70 }}>ID</th>
                    <th style={{ padding:'10px 16px' }}>Título</th>
                    <th style={{ padding:'10px 16px' }}>Estado</th>
                    <th style={{ padding:'10px 16px' }}>Proyecto</th>
                    <th style={{ padding:'10px 16px' }}>Archivado por</th>
                    <th style={{ padding:'10px 16px' }}>Fecha</th>
                    <th style={{ padding:'10px 16px', width:60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {archived.map((r,i) => (
                    <tr key={r.id} style={{ borderBottom: i===archived.length-1 ? 'none' : '1px solid var(--border)' }}>
                      <td style={{ padding:'12px 16px' }}><span className="mono">{r.id}</span></td>
                      <td style={{ padding:'12px 16px', fontWeight:500, color:'var(--muted)' }}>{r.title}</td>
                      <td style={{ padding:'12px 16px' }}><StatusChip status={r.status}/></td>
                      <td style={{ padding:'12px 16px', color:'var(--muted)' }}>{r.from}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                          <Avatar name={r.archivedBy} size="sm"/>
                          <span>{r.archivedBy}</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px 16px', color:'var(--muted)' }}>{r.when}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right' }}>
                        <button className="btn sm ghost">Restaurar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ArchivedScreen });
