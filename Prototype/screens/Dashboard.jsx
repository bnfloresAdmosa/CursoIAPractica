// Metrics dashboard — bars + donut + priority
function DashboardScreen() {
  return (
    <div className="app">
      <TopBar breadcrumbs={['Espacio', 'Rediseño Web', 'Métricas']} />
      <div className="main">
        <SideBar activeProject="p1" />
        <div className="content">
          <div className="page-head">
            <div className="head-row">
              <div>
                <h1>Métricas — Rediseño Web</h1>
                <div className="sub">Los datos se calculan a partir del log de auditoría, no del estado actual.</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <Segmented value="metrics" onChange={()=>{}} options={[
                  { value:'board', label:'Tablero' },
                  { value:'list',  label:'Lista' },
                  { value:'metrics', label:'Métricas' },
                ]}/>
                <Segmented value="6m" onChange={()=>{}} options={[
                  { value:'1m', label:'1M' },
                  { value:'3m', label:'3M' },
                  { value:'6m', label:'6M' },
                  { value:'1y', label:'1A' },
                ]}/>
              </div>
            </div>
          </div>

          <div className="mj-scroll" style={{ flex:1, overflow:'auto', padding:'22px 28px' }}>
            {/* KPI row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:18 }}>
              <Kpi label="Tickets abiertos" value="28" delta="+4" tone="accent"/>
              <Kpi label="Cerrados este mes" value="17" delta="+12%" tone="done"/>
              <Kpi label="Prioridad alta" value="6" delta="−2" tone="high"/>
              <Kpi label="Tiempo medio a Listo" value="3.4 días" delta="−0.6d" tone="done"/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:14 }}>
              <ChartCard title="Tickets cerrados por mes" subtitle="Basado en cambios de estado a “Listo”">
                <BarChart/>
              </ChartCard>
              <ChartCard title="Distribución por estado" subtitle="Tickets activos">
                <DonutChart/>
              </ChartCard>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:14 }}>
              <ChartCard title="Distribución por prioridad" subtitle="Tickets activos">
                <PriorityBars/>
              </ChartCard>
              <ChartCard title="Actividad reciente" subtitle="Últimas 24 horas">
                <ActivityList/>
              </ChartCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, tone }) {
  const color = tone==='done' ? 'var(--done)' : tone==='high' ? 'var(--p-high)' : 'var(--accent)';
  return (
    <div className="card" style={{ padding:'16px 18px' }}>
      <div style={{ fontSize:12, color:'var(--muted)', fontWeight:500 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:6 }}>
        <div style={{ fontSize:28, fontWeight:600, letterSpacing:'-0.03em' }}>{value}</div>
        <div style={{ fontSize:12, color, fontWeight:500 }}>{delta}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card" style={{ padding:'18px 20px' }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:600, letterSpacing:'-0.01em' }}>{title}</div>
        <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function BarChart() {
  const data = [
    { m:'Nov', v:8 }, { m:'Dic', v:11 }, { m:'Ene', v:14 }, { m:'Feb', v:9 }, { m:'Mar', v:22 }, { m:'Abr', v:17 },
  ];
  const max = 25;
  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:16, height:200, padding:'0 4px', borderBottom:'1px solid var(--border)' }}>
        {data.map((d,i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, height:'100%', justifyContent:'flex-end' }}>
            <div style={{ fontSize:11, color:'var(--muted)', fontVariantNumeric:'tabular-nums' }}>{d.v}</div>
            <div style={{
              width:'100%', maxWidth:48,
              height: `${(d.v/max)*100}%`,
              background: i === data.length-1 ? 'var(--accent)' : 'linear-gradient(180deg, #d9e4f3 0%, #c4d3eb 100%)',
              borderRadius:'6px 6px 2px 2px',
            }}/>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:16, padding:'8px 4px 0' }}>
        {data.map((d,i) => (
          <div key={i} style={{ flex:1, textAlign:'center', fontSize:11, color:'var(--muted)' }}>{d.m}</div>
        ))}
      </div>
    </div>
  );
}

function DonutChart() {
  // 12 todo, 8 progress, 8 done (from TICKETS it's 4/4/3 but visually normalized)
  const segs = [
    { k:'todo',    label:'Por hacer',   v:12, c:'#8e8e93' },
    { k:'progress',label:'En progreso', v:10, c:'#c68415' },
    { k:'done',    label:'Listo',       v:6,  c:'#2b8a4a' },
  ];
  const total = segs.reduce((s,x)=>s+x.v,0);
  const R=52, C=2*Math.PI*R;
  let acc = 0;
  return (
    <div style={{ display:'flex', gap:20, alignItems:'center' }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={R} fill="none" stroke="var(--surface-3)" strokeWidth={16}/>
        {segs.map((s,i) => {
          const len = (s.v/total) * C;
          const el = (
            <circle key={i}
              cx={70} cy={70} r={R} fill="none"
              stroke={s.c} strokeWidth={16}
              strokeDasharray={`${len} ${C-len}`}
              strokeDashoffset={-acc}
              transform="rotate(-90 70 70)"
              strokeLinecap="butt"
            />
          );
          acc += len;
          return el;
        })}
        <text x={70} y={66} textAnchor="middle" style={{ fontSize:10, fill:'var(--muted)' }}>Total</text>
        <text x={70} y={84} textAnchor="middle" style={{ fontSize:22, fontWeight:600, fill:'var(--text)' }}>{total}</text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1 }}>
        {segs.map(s => (
          <div key={s.k} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5 }}>
            <span style={{ width:8, height:8, borderRadius:2, background:s.c }}/>
            <span style={{ flex:1 }}>{s.label}</span>
            <span style={{ fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{s.v}</span>
            <span style={{ color:'var(--muted)', fontSize:11, width:36, textAlign:'right' }}>{Math.round(s.v/total*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriorityBars() {
  const rows = [
    { k:'high', label:'Alta',  v:6,  c:'var(--p-high)' },
    { k:'med',  label:'Media', v:12, c:'var(--p-med)' },
    { k:'low',  label:'Baja',  v:10, c:'var(--p-low)' },
  ];
  const max = 14;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {rows.map(r => (
        <div key={r.k}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12.5 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <span className={`dot ${r.k}`}/>
              {r.label}
            </span>
            <span style={{ fontVariantNumeric:'tabular-nums', color:'var(--muted)' }}>{r.v} tickets</span>
          </div>
          <div style={{ height:8, background:'var(--surface-3)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ width:`${(r.v/max)*100}%`, height:'100%', background:r.c, borderRadius:4 }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityList() {
  const rows = [
    { who:'Laura Méndez', t:'cerró', tgt:'T-099', when:'hace 10 min' },
    { who:'Diana Ortiz',  t:'comentó en', tgt:'T-112', when:'hace 12 min' },
    { who:'Carlos Rivas', t:'cambió estado de', tgt:'T-123', when:'hace 25 min' },
    { who:'Marcos Peña',  t:'creó', tgt:'T-124', when:'hace 30 min' },
    { who:'Ana Solís',    t:'asignó', tgt:'T-109', when:'hace 45 min' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {rows.map((r,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:12.5 }}>
          <Avatar name={r.who} size="sm"/>
          <div style={{ flex:1 }}>
            <b style={{ fontWeight:600 }}>{r.who}</b>{' '}
            <span style={{ color:'var(--muted)' }}>{r.t}</span>{' '}
            <span className="mono" style={{ color:'var(--text)', fontSize:11 }}>{r.tgt}</span>
          </div>
          <span style={{ color:'var(--subtle)', fontSize:11 }}>{r.when}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { DashboardScreen });
