// Create/Edit ticket — modal form
function CreateTicketScreen() {
  return (
    <div style={{ width:'100%', height:'100%', position:'relative', background:'var(--bg)' }}>
      <div style={{ position:'absolute', inset:0, filter:'blur(2px) brightness(0.97)', opacity:0.55, pointerEvents:'none' }}>
        <BoardScreen />
      </div>
      <div style={{ position:'absolute', inset:0, background:'rgba(20,20,30,0.22)' }}/>

      <div style={{
        position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)',
        width: 'min(640px, 92%)',
        background:'var(--surface)',
        borderRadius:16,
        boxShadow:'var(--shadow-modal)',
        display:'flex', flexDirection:'column',
        overflow:'hidden',
      }}>
        <div style={{
          padding:'16px 20px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{ fontSize:16, fontWeight:600, letterSpacing:'-0.02em' }}>Nuevo ticket</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>en <b>Rediseño Web</b></div>
          </div>
          <button className="btn icon ghost"><I.X size={14}/></button>
        </div>

        <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
          <div className="field">
            <label>Título <span style={{ color:'var(--p-high)' }}>*</span></label>
            <input className="input" placeholder="¿Qué hay que hacer?" defaultValue="Corregir validación del formulario de login"/>
            <div style={{ fontSize:11, color:'var(--subtle)', textAlign:'right' }}>47 / 255</div>
          </div>

          <div className="field">
            <label>Descripción</label>
            <textarea className="textarea" placeholder="Agrega contexto, pasos para reproducir, criterios de aceptación…"
              defaultValue="Al enviar el formulario con campos vacíos, el backend responde 500 en lugar de mostrar errores de validación inline. Reproducir con Safari 17."
            />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="field">
              <label>Estado</label>
              <div style={{ position:'relative' }}>
                <select className="select" style={{ width:'100%', appearance:'none' }} defaultValue="todo">
                  <option value="todo">Por hacer</option>
                  <option value="progress">En progreso</option>
                  <option value="done">Listo</option>
                </select>
                <I.ChevDown size={13} style={{ position:'absolute', right:10, top:12, color:'var(--muted)', pointerEvents:'none' }}/>
              </div>
            </div>
            <div className="field">
              <label>Prioridad <span style={{ color:'var(--p-high)' }}>*</span></label>
              <div style={{ display:'flex', gap:6 }}>
                <PriorityPick value="high" selected="high"/>
                <PriorityPick value="med"  selected="high"/>
                <PriorityPick value="low"  selected="high"/>
              </div>
            </div>
          </div>

          <div className="field">
            <label>Asignados</label>
            <div style={{
              padding:'6px 8px', border:'1px solid var(--border-strong)', borderRadius:8,
              display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', minHeight:38,
            }}>
              <UserChip name="Carlos Rivas"/>
              <UserChip name="Diana Ortiz"/>
              <span style={{ fontSize:12.5, color:'var(--subtle)' }}>Escribe un nombre…</span>
            </div>
            <div style={{ fontSize:11, color:'var(--subtle)' }}>Los asignados reciben una notificación por email.</div>
          </div>

          <div className="field">
            <label>Etiquetas</label>
            <div style={{
              padding:'6px 8px', border:'1px solid var(--border-strong)', borderRadius:8,
              display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', minHeight:38,
            }}>
              <span className="tag" style={{ background:'#d92d2015', color:'#d92d20', borderColor:'transparent' }}>bug</span>
              <span className="tag" style={{ background:'#c6841515', color:'#c68415', borderColor:'transparent' }}>urgente</span>
              <span style={{ fontSize:12.5, color:'var(--subtle)' }}>Seleccionar del catálogo…</span>
            </div>
          </div>
        </div>

        <div style={{
          padding:'12px 20px', borderTop:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg)',
        }}>
          <div style={{ fontSize:11.5, color:'var(--subtle)' }}>
            Creado como <b style={{ color:'var(--muted)' }}>Laura Méndez</b> · {new Date().toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'})}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn">Cancelar</button>
            <button className="btn primary">Crear ticket</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityPick({ value, selected }) {
  const is = value === selected;
  const map = { high:{l:'Alta', c:'var(--p-high)'}, med:{l:'Media', c:'var(--p-med)'}, low:{l:'Baja', c:'var(--p-low)'} };
  const m = map[value];
  return (
    <div style={{
      flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
      padding:'8px 10px', borderRadius:8, fontSize:13, fontWeight:500,
      border: is ? `1.5px solid ${m.c}` : '1px solid var(--border-strong)',
      background: is ? `${m.c}0d` : 'var(--surface)',
      color: is ? m.c : 'var(--text)',
      cursor:'pointer',
    }}>
      <span className={`dot ${value}`}/>
      {m.l}
    </div>
  );
}

function UserChip({ name }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'3px 8px 3px 3px', borderRadius:999, background:'var(--surface-2)', fontSize:12.5,
    }}>
      <Avatar name={name} size="sm"/>
      {name}
      <button className="btn icon ghost" style={{ width:16, height:16, padding:0, color:'var(--muted)' }}><I.X size={10}/></button>
    </div>
  );
}

Object.assign(window, { CreateTicketScreen });
