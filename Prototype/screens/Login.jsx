// Login screen — Apple-inspired, centered card, minimal
function LoginScreen() {
  return (
    <div style={{
      width:'100%', height:'100%',
      background:'radial-gradient(1200px 600px at 50% -10%, #eef2fa 0%, transparent 60%), var(--bg)',
      display:'grid', placeItems:'center', fontFamily:'var(--font-ui)',
    }}>
      <div style={{ width: 380 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, marginBottom:28 }}>
          <div style={{
            width:44, height:44, borderRadius:12,
            background:'linear-gradient(180deg, #2c2c2e 0%, #1d1d1f 100%)',
            color:'white', display:'grid', placeItems:'center',
            fontWeight:700, fontSize:20, letterSpacing:'-0.04em',
            boxShadow:'0 10px 24px rgba(0,0,0,0.12)',
          }}>m</div>
          <div style={{ textAlign:'center' }}>
            <h1 style={{ margin:0, fontSize:24, fontWeight:600, letterSpacing:'-0.03em' }}>
              Inicia sesión en MiniJira
            </h1>
            <p style={{ margin:'6px 0 0', fontSize:13.5, color:'var(--muted)' }}>
              Herramienta interna de gestión de tickets
            </p>
          </div>
        </div>

        <div className="card" style={{ padding:24, borderRadius:'var(--r-lg)', boxShadow:'var(--shadow-2)' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="field">
              <label>Correo electrónico</label>
              <input className="input" defaultValue="laura@empresa.com" placeholder="tu@empresa.com" />
            </div>
            <div className="field">
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <label>Contraseña</label>
                <a style={{ fontSize:12, color:'var(--accent)', textDecoration:'none', fontWeight:500 }}>¿Olvidaste tu contraseña?</a>
              </div>
              <input className="input" type="password" defaultValue="••••••••••" />
            </div>
            <button className="btn primary" style={{ width:'100%', justifyContent:'center', padding:'10px 14px', fontSize:14, marginTop:4 }}>
              Iniciar sesión
            </button>
          </div>
        </div>

        <p style={{ textAlign:'center', marginTop:20, fontSize:12, color:'var(--subtle)' }}>
          ¿No tienes cuenta? Solicítala a tu administrador.
        </p>
      </div>
    </div>
  );
}

// Login — error variant (credenciales inválidas)
function LoginErrorScreen() {
  return (
    <div style={{
      width:'100%', height:'100%',
      background:'radial-gradient(1200px 600px at 50% -10%, #fbeeee 0%, transparent 60%), var(--bg)',
      display:'grid', placeItems:'center',
    }}>
      <div style={{ width: 380 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, marginBottom:28 }}>
          <div style={{
            width:44, height:44, borderRadius:12,
            background:'linear-gradient(180deg, #2c2c2e 0%, #1d1d1f 100%)',
            color:'white', display:'grid', placeItems:'center',
            fontWeight:700, fontSize:20, letterSpacing:'-0.04em',
          }}>m</div>
          <div style={{ textAlign:'center' }}>
            <h1 style={{ margin:0, fontSize:24, fontWeight:600, letterSpacing:'-0.03em' }}>
              Inicia sesión en MiniJira
            </h1>
            <p style={{ margin:'6px 0 0', fontSize:13.5, color:'var(--muted)' }}>
              Herramienta interna de gestión de tickets
            </p>
          </div>
        </div>

        <div className="card" style={{ padding:24, boxShadow:'var(--shadow-2)' }}>
          <div style={{
            padding:'10px 12px', marginBottom:14,
            background:'var(--p-high-soft)', color:'var(--p-high)',
            borderRadius:8, fontSize:12.5, fontWeight:500,
            display:'flex', gap:8, alignItems:'center'
          }}>
            <I.Info size={14} />
            Credenciales inválidas. Verifica tu correo y contraseña.
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="field">
              <label>Correo electrónico</label>
              <input className="input" defaultValue="ana@empresa.com" style={{ borderColor:'var(--p-high)', boxShadow:'0 0 0 3px rgba(217,45,32,0.12)' }} />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input className="input" type="password" defaultValue="••••••" style={{ borderColor:'var(--p-high)' }} />
            </div>
            <button className="btn primary" style={{ width:'100%', justifyContent:'center', padding:'10px 14px', fontSize:14 }}>
              Iniciar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen, LoginErrorScreen });
