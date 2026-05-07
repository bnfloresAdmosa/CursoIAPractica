// Seed Mini Jira — Demo dataset
// Pobla 7 usuarios, 1 proyecto "Rediseño Web", 8 tags, 12 tickets.
// Pasword universal: 'demo123' (bcrypt cost 12).
// Idempotente: limpia todas las tablas (en orden FK-safe) y reinserta.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'demo123';

const USERS_DATA = [
  { name: 'Laura Méndez', email: 'laura@empresa.com' },
  { name: 'Carlos Rivas', email: 'carlos@empresa.com' },
  { name: 'Diana Ortiz', email: 'diana@empresa.com' },
  { name: 'Marcos Peña', email: 'marcos@empresa.com' },
  { name: 'Ana Solís', email: 'ana@empresa.com' },
  { name: 'Roberto Vera', email: 'roberto@empresa.com' },
  { name: 'Pedro Quintero', email: 'pedro@empresa.com' },
];

const PRIORITIES_DATA = [
  { id: 1, name: 'Alta', order: 1 },
  { id: 2, name: 'Media', order: 2 },
  { id: 3, name: 'Baja', order: 3 },
];

const TAGS_DATA = [
  { name: 'bug', color: '#d92d20' },
  { name: 'feature', color: '#0071e3' },
  { name: 'research', color: '#8a6a9a' },
  { name: 'diseño', color: '#3d8b7a' },
  { name: 'frontend', color: '#c68415' },
  { name: 'backend', color: '#5b6f9a' },
  { name: 'api', color: '#a85c6b' },
  { name: 'urgente', color: '#d92d20' },
];

type TicketSeed = {
  title: string;
  status: 'Por hacer' | 'En progreso' | 'Listo';
  priorityName: 'Alta' | 'Media' | 'Baja';
  assigneeEmails: string[];
  tagNames: string[];
  updatedMinutesAgo: number;
};

const TICKETS_DATA: TicketSeed[] = [
  { title: 'Rediseñar la página de inicio con nueva hero', status: 'En progreso', priorityName: 'Alta', assigneeEmails: ['laura@empresa.com', 'carlos@empresa.com'], tagNames: ['feature', 'diseño'], updatedMinutesAgo: 12 },
  { title: 'Error 500 al subir avatar mayor a 2 MB', status: 'Por hacer', priorityName: 'Alta', assigneeEmails: ['marcos@empresa.com'], tagNames: ['bug', 'urgente'], updatedMinutesAgo: 60 },
  { title: 'Entrevistas con 5 clientes sobre el nuevo flujo de pago', status: 'En progreso', priorityName: 'Media', assigneeEmails: ['ana@empresa.com'], tagNames: ['research'], updatedMinutesAgo: 180 },
  { title: 'Corregir contraste de tipografía en modo claro', status: 'Listo', priorityName: 'Baja', assigneeEmails: ['laura@empresa.com'], tagNames: ['diseño', 'frontend'], updatedMinutesAgo: 1440 },
  { title: 'Endpoint /projects/:id/metrics devuelve datos inconsistentes', status: 'Por hacer', priorityName: 'Alta', assigneeEmails: ['marcos@empresa.com', 'roberto@empresa.com'], tagNames: ['bug', 'api'], updatedMinutesAgo: 120 },
  { title: 'Documentar el flujo de autenticación con JWT y refresh', status: 'Por hacer', priorityName: 'Media', assigneeEmails: ['roberto@empresa.com'], tagNames: ['backend', 'api'], updatedMinutesAgo: 300 },
  { title: 'Agregar selector de idioma en el header', status: 'Listo', priorityName: 'Baja', assigneeEmails: ['carlos@empresa.com'], tagNames: ['feature', 'frontend'], updatedMinutesAgo: 2880 },
  { title: 'Validación de formularios con mensajes en español', status: 'En progreso', priorityName: 'Media', assigneeEmails: ['carlos@empresa.com', 'diana@empresa.com'], tagNames: ['frontend'], updatedMinutesAgo: 25 },
  { title: 'Optimizar carga del dashboard: queries en 120ms', status: 'Por hacer', priorityName: 'Media', assigneeEmails: ['marcos@empresa.com'], tagNames: ['backend'], updatedMinutesAgo: 40 },
  { title: 'Redactar copy para el onboarding de nuevos usuarios', status: 'Listo', priorityName: 'Baja', assigneeEmails: ['ana@empresa.com', 'pedro@empresa.com'], tagNames: ['diseño'], updatedMinutesAgo: 4320 },
  { title: 'Revisar accesibilidad WCAG AA en formularios', status: 'En progreso', priorityName: 'Alta', assigneeEmails: ['laura@empresa.com'], tagNames: ['diseño', 'frontend'], updatedMinutesAgo: 20 },
  { title: 'Integrar servicio de email Resend para notificaciones', status: 'Por hacer', priorityName: 'Media', assigneeEmails: ['marcos@empresa.com'], tagNames: ['backend', 'api'], updatedMinutesAgo: 30 },
];

async function main() {
  console.log('🌱 Seeding...');

  // Limpieza en orden FK-safe (hijas primero)
  await prisma.refreshToken.deleteMany({});
  await prisma.ticketLock.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.ticketTag.deleteMany({});
  await prisma.ticketAssignee.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.priority.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('  ✓ tablas limpiadas');

  // Priority (IDs hardcodeados)
  for (const p of PRIORITIES_DATA) {
    await prisma.priority.create({ data: p });
  }
  console.log(`  ✓ ${PRIORITIES_DATA.length} prioridades`);

  // Users (todos con la misma contraseña)
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const users = await Promise.all(
    USERS_DATA.map((u) =>
      prisma.user.create({ data: { name: u.name, email: u.email, passwordHash } }),
    ),
  );
  const userByEmail = new Map(users.map((u) => [u.email, u]));
  console.log(`  ✓ ${users.length} usuarios (password: ${PASSWORD})`);

  // Tags
  const tags = await Promise.all(
    TAGS_DATA.map((t) => prisma.tag.create({ data: t })),
  );
  const tagByName = new Map(tags.map((t) => [t.name, t]));
  console.log(`  ✓ ${tags.length} tags`);

  // Project — Laura crea "Rediseño Web"
  const laura = userByEmail.get('laura@empresa.com')!;
  const project = await prisma.project.create({
    data: {
      name: 'Rediseño Web',
      description: 'Renovación visual y de UX del sitio corporativo.',
      createdBy: laura.id,
    },
  });
  console.log(`  ✓ proyecto "${project.name}" (id=${project.id})`);

  // ProjectMember — Laura ADMIN, los demás USER
  await prisma.projectMember.create({
    data: { userId: laura.id, projectId: project.id, role: 'ADMIN' },
  });
  for (const u of users.filter((u) => u.email !== laura.email)) {
    await prisma.projectMember.create({
      data: { userId: u.id, projectId: project.id, role: 'USER' },
    });
  }
  console.log(`  ✓ ${users.length} memberships (Laura=ADMIN, resto=USER)`);

  // Tickets
  const priorityByName = new Map([
    ['Alta', 1],
    ['Media', 2],
    ['Baja', 3],
  ]);
  const now = Date.now();
  for (const t of TICKETS_DATA) {
    const updatedAt = new Date(now - t.updatedMinutesAgo * 60_000);
    await prisma.ticket.create({
      data: {
        title: t.title,
        status: t.status,
        priorityId: priorityByName.get(t.priorityName)!,
        projectId: project.id,
        createdBy: laura.id,
        createdAt: updatedAt,
        updatedAt,
        assignees: {
          create: t.assigneeEmails.map((email) => ({
            userId: userByEmail.get(email)!.id,
          })),
        },
        tags: {
          create: t.tagNames.map((name) => ({
            tagId: tagByName.get(name)!.id,
          })),
        },
      },
    });
  }
  console.log(`  ✓ ${TICKETS_DATA.length} tickets`);

  console.log(`\n🎉 Seed completo.\n   Login: laura@empresa.com / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
