// Ticket Detail — modal overlay showing ticket info, comments, audit, lock banner
function TicketDetailScreen({ variant = 'default' }) {
  // variants: 'default' | 'locked' | 'expired'
  const t = {
    id: 'T-112',
    title: 'Rediseñar la página de inicio con nueva hero',
    description: 'Crear una nueva sección hero que comunique el valor principal de la herramienta, con jerarquía clara de título, subtítulo y CTA. Usar componentes del design system y validar contraste AA.\n\nConsiderar:\n• Animación sutil al cargar\n• Versión reducida para mobile\n• Copy alineado con la guía de marca',
    status:'progress', priority:'high',
    assignees:['u1','u2'], tags:['t2','t4'],
    createdBy:'u3', createdAt:'18 abr 2026, 09:14',
    updatedAt:'hace 12 min · Diana Ortiz',
  };

  return (
    <div style={{ width:'100%', height:'100%', position:'relative', background:'var(--bg)' }}>
      {/* backdrop: board screen dimmed */}
      <div style={{ position:'absolute', inset:0, filter:'blur(2px) brightness(0.97)', opacity:0.55, pointerEvents:'none' }}>
        <BoardScreen />
      </div>
      <div style={{ position:'absolute', inset:0, background:'rgba(20,20,30,0.22)' }}/>

      {/* modal */}
      <div style={{
        position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)',
        width: 'min(880px, 92%)',
        maxHeight:'92%',
        background:'var(--surface)',
        borderRadius:16,
        boxShadow:'var(--shadow-modal)',
        display:'flex', flexDirection:'column',
        overflow:'hidden',
      }}>
        {/* header */}
        <div style={{
          padding:'14px 18px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:12,
        }}>
          <span className="mono" style={{ fontSize:11.5 }}>{t.id}</span>
          <span style={{ color:'var(--border-strong)' }}>·</span>
          <StatusChip status={t.status}/>
          <PriorityChip p={t.priority}/>
          <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
            <button className="btn sm ghost"><I.Eye size={13}/> Seguir</button>
            <button className="btn sm ghost"><I.Dots size={13}/></button>
            <button className="btn sm ghost" style={{ width:28, padding:6, justifyContent:'center' }}><I.X size={14}/></button>
          </div>
        </div>

        {/* Lock banner variants */}
        {variant === 'locked' && (
          <div style={{
            padding:'10px 18px',
            background:'#fff6e5',
            borderBottom:'1px solid #f2e1ba',
            display:'flex', alignItems:'center', gap:10, fontSize:13,
          }}>
            <I.Lock size={14} style={{ color:'var(--progress)' }}/>
            <span><b>En edición por Carlos Rivas</b> — hace 8 minutos</span>
            <span style={{ color:'var(--muted)', fontSize:12 }}>· El bloqueo se libera automáticamente a los 15 min.</span>
            <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
              <button className="btn sm">Solo lectura</button>
            </div>
          </div>
        )}
        {variant === 'expired' && (
          <div style={{
            padding:'10px 18px',
            background:'var(--p-high-soft)',
            borderBottom:'1px solid #f3c8c2',
            display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--p-high)',
          }}>
            <I.Info size={14}/>
            <span><b>Tu sesión de edición expiró.</b> Recarga el ticket para continuar.</span>
            <div style={{ marginLeft:'auto' }}>
              <button className="btn sm">Recargar</button>
            </div>
          </div>
        )}
        {variant === 'default' && (
          <div style={{
            padding:'8px 18px',
            background:'var(--accent-soft)',
            borderBottom:'1px solid #d3e4f9',
            display:'flex', alignItems:'center', gap:10, fontSize:12.5, color:'#0059b3',
          }}>
            <I.Edit size={13}/>
            <span>Tienes el bloqueo de edición — se libera al guardar o a los 15 min sin actividad.</span>
            <span className="mono" style={{ marginLeft:'auto', color:'#0059b3' }}>14:32 restantes</span>
          </div>
        )}

        {/* body */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', flex:1, minHeight:0 }}>
          <div className="mj-scroll" style={{ overflowY:'auto', padding:'22px 22px 8px', borderRight:'1px solid var(--border)' }}>
            <h2 style={{
              margin:0, fontSize:22, fontWeight:600, letterSpacing:'-0.02em', lineHeight:1.25,
            }}>{t.title}</h2>
            <div style={{ marginTop:6, color:'var(--muted)', fontSize:12 }}>
              Creado por {nameOf(t.createdBy)} · {t.createdAt} · Última modificación {t.updatedAt}
            </div>

            <div style={{ marginTop:22 }}>
              <div style={{ fontSize:12, color:'var(--muted)', fontWeight:500, marginBottom:8 }}>Descripción</div>
              <div style={{ fontSize:14, lineHeight:1.6, whiteSpace:'pre-line', color:'var(--text)' }}>
                {t.description}
              </div>
            </div>

            <div style={{ marginTop:28, paddingTop:20, borderTop:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>Comentarios</div>
                <span className="tag">3</span>
              </div>
              <Comment author="Diana Ortiz" when="hace 2 h"
                body="Ya subí las primeras exploraciones al Figma. @marcos ¿puedes revisar el tamaño de la tipografía del hero?" />
              <Comment author="Marcos Peña" when="hace 1 h"
                body="Revisado. Te dejo algunas notas — el subtítulo se ve pequeño en 1280px. Lo reduciría a 72/84 en escritorio." mine />
              <Comment author="Laura Méndez" when="hace 12 min"
                body="Coincido con Marcos. Avanzo a En progreso y agrego la variación para mobile." />

              <CommentComposer />
            </div>
          </div>

          {/* sidebar */}
          <div className="mj-scroll" style={{ overflowY:'auto', padding:'22px 18px', background:'var(--bg)', display:'flex', flexDirection:'column', gap:20 }}>
            <MetaItem label="Estado">
              <StatusChip status={t.status}/>
            </MetaItem>
            <MetaItem label="Prioridad">
              <PriorityChip p={t.priority}/>
            </MetaItem>
            <MetaItem label="Asignados">
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {t.assignees.map(id => (
                  <div key={id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5 }}>
                    <Avatar name={nameOf(id)} size="sm"/>
                    <span>{nameOf(id)}</span>
                  </div>
                ))}
                <button className="btn sm ghost" style={{ color:'var(--muted)', padding:'3px 6px', justifyContent:'flex-start' }}>
                  <I.Plus size={12}/> Agregar
                </button>
              </div>
            </MetaItem>
            <MetaItem label="Etiquetas">
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {t.tags.map(tg => {
                  const tag = tagById(tg);
                  return <span key={tg} className="tag" style={{ background:`${tag.color}12`, color:tag.color, borderColor:'transparent' }}>{tag.name}</span>;
                })}
                <button className="btn sm ghost" style={{ padding:'2px 6px', fontSize:11 }}><I.Plus size={10}/></button>
              </div>
            </MetaItem>
            <MetaItem label="Proyecto">
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5 }}>
                <span style={{ width:8, height:8, background:'#0071e3', borderRadius:2 }}/>
                Rediseño Web
              </div>
            </MetaItem>

            <div style={{ marginTop:'auto', paddingTop:16, borderTop:'1px solid var(--border)' }}>
              <div style={{ fontSize:11, color:'var(--subtle)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:10 }}>Actividad</div>
              <AuditItem who="Diana Ortiz" text={<>cambió estado <b>Por hacer</b> → <b>En progreso</b></>} when="hace 12 min"/>
              <AuditItem who="Laura Méndez" text={<>agregó etiqueta <b>diseño</b></>} when="hace 1 h"/>
              <AuditItem who="Diana Ortiz" text={<>asignó a <b>Carlos Rivas</b></>} when="hace 2 h"/>
              <AuditItem who="Diana Ortiz" text="creó el ticket" when="18 abr, 09:14"/>
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{
          padding:'12px 18px', borderTop:'1px solid var(--border)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:'var(--surface)',
        }}>
          <button className="btn danger ghost"><I.Archive size={13}/> Eliminar</button>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn">Cancelar</button>
            <button className="btn primary">Guardar cambios</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, children }) {
  return (
    <div>
      <div style={{ fontSize:11, color:'var(--subtle)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:8 }}>{label}</div>
      {children}
    </div>
  );
}

function Comment({ author, when, body, mine }) {
  return (
    <div style={{ display:'flex', gap:10, marginBottom:14 }}>
      <Avatar name={author}/>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
          <span style={{ fontSize:13, fontWeight:600 }}>{author}</span>
          <span style={{ fontSize:11.5, color:'var(--muted)' }}>{when}</span>
          {mine && <span className="tag" style={{ fontSize:10, padding:'1px 6px' }}>tú</span>}
        </div>
        <div style={{
          padding:'10px 12px', background:'var(--surface-2)', borderRadius:10, fontSize:13.5, lineHeight:1.5,
        }}>{highlightMentions(body)}</div>
      </div>
    </div>
  );
}

function highlightMentions(s) {
  const parts = s.split(/(@\w+)/g);
  return parts.map((p,i) => p.startsWith('@')
    ? <span key={i} style={{ color:'var(--accent)', fontWeight:500 }}>{p}</span>
    : <span key={i}>{p}</span>
  );
}

function CommentComposer() {
  return (
    <div style={{
      marginTop:10, border:'1px solid var(--border-strong)', borderRadius:12, padding:10,
      background:'var(--surface)',
    }}>
      <div style={{ display:'flex', gap:10 }}>
        <Avatar name="Laura Méndez" size="sm"/>
        <textarea className="textarea" placeholder="Escribe un comentario… usa @ para mencionar"
          style={{ border:'none', outline:'none', boxShadow:'none', padding:0, minHeight:36, resize:'none', flex:1, fontSize:13.5 }}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
        <div style={{ display:'flex', gap:6, color:'var(--muted)' }}>
          <button className="btn icon ghost"><I.At size={14}/></button>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--subtle)' }}>⌘↵ para enviar</span>
          <button className="btn primary sm">Comentar</button>
        </div>
      </div>
    </div>
  );
}

function AuditItem({ who, text, when }) {
  return (
    <div style={{ display:'flex', gap:8, marginBottom:10, fontSize:12, lineHeight:1.45 }}>
      <Avatar name={who} size="sm"/>
      <div>
        <div><b style={{ fontWeight:600 }}>{who}</b> <span style={{ color:'var(--muted)' }}>{text}</span></div>
        <div style={{ color:'var(--subtle)', fontSize:11 }}>{when}</div>
      </div>
    </div>
  );
}

Object.assign(window, { TicketDetailScreen });
