// Icons + shared primitives for MiniJira
// Plain stroke icons (Apple-ish feather style), original.

const Icon = ({ d, size = 16, stroke = 1.6, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
    style={style}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const I = {
  Search:   (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></>} />,
  Plus:     (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  Check:    (p) => <Icon {...p} d="M4 12l5 5L20 6" />,
  X:        (p) => <Icon {...p} d="M6 6l12 12M18 6L6 18" />,
  ChevDown: (p) => <Icon {...p} d="M6 9l6 6 6-6" />,
  ChevRight:(p) => <Icon {...p} d="M9 6l6 6-6 6" />,
  ChevLeft: (p) => <Icon {...p} d="M15 6l-6 6 6 6" />,
  Lock:     (p) => <Icon {...p} d={<><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></>} />,
  Filter:   (p) => <Icon {...p} d="M4 5h16l-6 8v6l-4-2v-4L4 5z" />,
  Clock:    (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} />,
  User:     (p) => <Icon {...p} d={<><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6"/></>} />,
  Users:    (p) => <Icon {...p} d={<><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1.2-3.6 4-4.8 6.5-4.8s5.3 1.2 6.5 4.8"/><circle cx="17" cy="9" r="2.8"/><path d="M17 14.5c2 0 4 .8 4.8 3.5"/></>} />,
  Tag:      (p) => <Icon {...p} d={<><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="8" cy="8" r="1.3"/></>} />,
  Folder:   (p) => <Icon {...p} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
  Archive:  (p) => <Icon {...p} d={<><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 12h4"/></>} />,
  Dashboard:(p) => <Icon {...p} d={<><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>} />,
  Board:    (p) => <Icon {...p} d={<><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="8" rx="1"/></>} />,
  List:     (p) => <Icon {...p} d="M4 6h16M4 12h16M4 18h16" />,
  Dots:     (p) => <Icon {...p} d={<><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></>} />,
  Bell:     (p) => <Icon {...p} d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15L6 16zM10 20a2 2 0 004 0" />,
  Comment:  (p) => <Icon {...p} d="M4 5h16v11H9l-5 4V5z" />,
  Edit:     (p) => <Icon {...p} d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4" />,
  Trash:    (p) => <Icon {...p} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />,
  ArrowRight:(p)=> <Icon {...p} d="M5 12h14M13 6l6 6-6 6" />,
  Eye:      (p) => <Icon {...p} d={<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>} />,
  Info:     (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></>} />,
  At:       (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="4"/><path d="M16 12v2a2 2 0 004 0v-2a8 8 0 10-3 6.2"/></>} />,
  Sparkle:  (p) => <Icon {...p} d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zM19 14l.8 2 2 .8-2 .8L19 20l-.8-1.4-2-.8 2-.8.8-2z" />,
};

// ---- Avatar helper ----
function Avatar({ name, size = 'md', className = '' }) {
  if (!name) return null;
  const parts = name.split(' ');
  const initials = (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  // stable color from name
  let h = 0; for (let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
  const cls = 'c' + ((h % 7) + 1);
  const sz = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : '';
  return <div className={`avatar ${cls} ${sz} ${className}`}>{initials}</div>;
}

function AvatarStack({ names, size = 'md', max = 3 }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className="avatar-stack">
      {shown.map((n, i) => <Avatar key={i} name={n} size={size} />)}
      {rest > 0 && (
        <div className={`avatar ${size === 'sm' ? 'sm' : ''}`} style={{ background: '#c7c7cc', color: '#1d1d1f' }}>
          +{rest}
        </div>
      )}
    </div>
  );
}

// ---- Status + priority pills ----
const STATUS_LABEL = { todo: 'Por hacer', progress: 'En progreso', done: 'Listo' };
const PRIORITY_LABEL = { high: 'Alta', med: 'Media', low: 'Baja' };

function StatusChip({ status }) {
  return (
    <span className={`chip ${status}`}>
      <span className={`dot ${status}`}></span>
      {STATUS_LABEL[status]}
    </span>
  );
}
function PriorityChip({ p }) {
  return <span className={`chip ${p}`}><span className={`dot ${p}`}></span>{PRIORITY_LABEL[p]}</span>;
}

// ---- Segmented ----
function Segmented({ value, onChange, options }) {
  return (
    <div className="nav" style={{ display:'flex', background:'var(--surface-2)', padding:3, borderRadius:8, gap:2 }}>
      {options.map(o => (
        <button key={o.value}
          onClick={() => onChange(o.value)}
          className={value === o.value ? 'active' : ''}
          style={{
            border:'none',
            background: value === o.value ? 'var(--surface)' : 'transparent',
            padding:'5px 12px', fontSize:12.5, fontWeight:500,
            color: value === o.value ? 'var(--text)' : 'var(--muted)',
            borderRadius:5,
            boxShadow: value === o.value ? 'var(--shadow-1)' : 'none',
            display:'inline-flex', alignItems:'center', gap:5,
          }}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { I, Icon, Avatar, AvatarStack, StatusChip, PriorityChip, Segmented, STATUS_LABEL, PRIORITY_LABEL });
