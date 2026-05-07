// Shared fake data for MiniJira
const USERS = [
  { id: 'u1', name: 'Laura Méndez',  handle: 'laura',  email: 'laura@empresa.com' },
  { id: 'u2', name: 'Carlos Rivas',  handle: 'carlos', email: 'carlos@empresa.com' },
  { id: 'u3', name: 'Diana Ortiz',   handle: 'diana',  email: 'diana@empresa.com' },
  { id: 'u4', name: 'Marcos Peña',   handle: 'marcos', email: 'marcos@empresa.com' },
  { id: 'u5', name: 'Ana Solís',     handle: 'ana',    email: 'ana@empresa.com' },
  { id: 'u6', name: 'Roberto Vera',  handle: 'roberto',email: 'roberto@empresa.com' },
  { id: 'u7', name: 'Pedro Quintero', handle:'pedro',  email: 'pedro@empresa.com' },
];

const PROJECTS = [
  { id: 'p1', name: 'Rediseño Web',       desc: 'Renovación visual y de UX del sitio corporativo.', members: 6, open: 28, archived: false, role: 'ADMIN',  lastActivity: 'hace 4 min' },
  { id: 'p2', name: 'App Móvil Clientes', desc: 'Lanzamiento beta iOS y Android para clientes VIP.', members: 5, open: 14, archived: false, role: 'USER',   lastActivity: 'hace 1 h'   },
  { id: 'p3', name: 'Migración a Postgres', desc:'Plan de migración del motor de base de datos.',   members: 4, open: 9,  archived: false, role: 'ADMIN',  lastActivity: 'ayer'       },
  { id: 'p4', name: 'Onboarding RH',       desc: 'Flujo de bienvenida y documentación interna.',     members: 3, open: 6,  archived: false, role: 'USER',   lastActivity: 'hace 3 días'},
  { id: 'p5', name: 'Campaña Q1 2026',     desc: 'Comunicación y assets para la campaña de trimestre.', members: 7, open: 0, archived: true,  role: 'USER',  lastActivity: '2 mar'      },
];

const TAGS = [
  { id: 't1', name: 'bug',        color: '#d92d20' },
  { id: 't2', name: 'feature',    color: '#0071e3' },
  { id: 't3', name: 'research',   color: '#8a6a9a' },
  { id: 't4', name: 'diseño',     color: '#3d8b7a' },
  { id: 't5', name: 'frontend',   color: '#c68415' },
  { id: 't6', name: 'backend',    color: '#5b6f9a' },
  { id: 't7', name: 'api',        color: '#a85c6b' },
  { id: 't8', name: 'urgente',    color: '#d92d20' },
];

const TICKETS = [
  { id:'T-112', title:'Rediseñar la página de inicio con nueva hero',             status:'progress', priority:'high', assignees:['u1','u2'], tags:['t2','t4'], comments:5, updated:'hace 12 min' },
  { id:'T-118', title:'Error 500 al subir avatar mayor a 2 MB',                    status:'todo',     priority:'high', assignees:['u4'],      tags:['t1','t8'], comments:2, updated:'hace 1 h' },
  { id:'T-109', title:'Entrevistas con 5 clientes sobre el nuevo flujo de pago',   status:'progress', priority:'med',  assignees:['u5'],      tags:['t3'],      comments:8, updated:'hace 3 h' },
  { id:'T-121', title:'Corregir contraste de tipografía en modo claro',            status:'done',     priority:'low',  assignees:['u1'],      tags:['t4','t5'], comments:1, updated:'ayer' },
  { id:'T-104', title:'Endpoint /projects/:id/metrics devuelve datos inconsistentes', status:'todo',  priority:'high', assignees:['u4','u6'], tags:['t1','t7'], comments:3, updated:'hace 2 h' },
  { id:'T-115', title:'Documentar el flujo de autenticación con JWT y refresh',    status:'todo',     priority:'med',  assignees:['u6'],      tags:['t6','t7'], comments:0, updated:'hace 5 h' },
  { id:'T-099', title:'Agregar selector de idioma en el header',                   status:'done',     priority:'low',  assignees:['u2'],      tags:['t2','t5'], comments:2, updated:'hace 2 días' },
  { id:'T-123', title:'Validación de formularios con mensajes en español',         status:'progress', priority:'med',  assignees:['u2','u3'], tags:['t5'],      comments:4, updated:'hace 25 min' },
  { id:'T-107', title:'Optimizar carga del dashboard: queries en 120ms',           status:'todo',     priority:'med',  assignees:['u4'],      tags:['t6'],      comments:1, updated:'hace 40 min' },
  { id:'T-120', title:'Redactar copy para el onboarding de nuevos usuarios',       status:'done',     priority:'low',  assignees:['u5','u7'], tags:['t4'],      comments:6, updated:'hace 3 días' },
  { id:'T-117', title:'Revisar accesibilidad WCAG AA en formularios',              status:'progress', priority:'high', assignees:['u1'],      tags:['t4','t5'], comments:2, updated:'hace 20 min' },
  { id:'T-124', title:'Integrar servicio de email Resend para notificaciones',      status:'todo',    priority:'med',  assignees:['u4'],      tags:['t6','t7'], comments:0, updated:'hace 30 min' },
];

function userById(id){ return USERS.find(u=>u.id===id); }
function tagById(id){ return TAGS.find(t=>t.id===id); }
function nameOf(id){ return userById(id)?.name || id; }
function namesOf(ids){ return ids.map(nameOf); }

Object.assign(window, { USERS, PROJECTS, TAGS, TICKETS, userById, tagById, nameOf, namesOf });
