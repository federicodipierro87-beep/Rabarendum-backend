const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      name: 'Administrator',
      role: 'ADMIN'
    }
  });
  console.log('Created admin user:', admin.username);

  // Create sample jurors
  const jurorPassword = await bcrypt.hash('juror123', 10);
  const jurors = [
    { username: 'giuria1', name: 'Marco Rossi' },
    { username: 'giuria2', name: 'Anna Bianchi' },
    { username: 'giuria3', name: 'Luigi Verdi' }
  ];

  for (const juror of jurors) {
    const user = await prisma.user.upsert({
      where: { username: juror.username },
      update: {},
      create: {
        username: juror.username,
        password: jurorPassword,
        name: juror.name,
        role: 'JUROR'
      }
    });
    console.log('Created juror:', user.username);
  }

  // Create sample participants
  const participants = [
    // Carri (floats)
    { name: 'Il Drago Volante', category: 'CARRI' },
    { name: 'Sogni di Mezzanotte', category: 'CARRI' },
    { name: 'La Nave dei Pirati', category: 'CARRI' },
    { name: 'Il Castello Incantato', category: 'CARRI' },

    // Gruppi (groups)
    { name: 'I Mascherati', category: 'GRUPPI' },
    { name: 'Le Stelle Danzanti', category: 'GRUPPI' },
    { name: 'Gli Arlecchini', category: 'GRUPPI' },
    { name: 'I Colori del Vento', category: 'GRUPPI' },

    // Tendine (small floats/curtains)
    { name: 'Piccolo Mondo', category: 'TENDINE' },
    { name: 'La Magia dei Bambini', category: 'TENDINE' },
    { name: 'Fiabe Animate', category: 'TENDINE' },

    // Guggen (brass bands)
    { name: 'Guggen Explosion', category: 'GUGGEN' },
    { name: 'Brass Monkeys', category: 'GUGGEN' },
    { name: 'I Rumorosi', category: 'GUGGEN' }
  ];

  for (const participant of participants) {
    const p = await prisma.participant.upsert({
      where: {
        name_category: {
          name: participant.name,
          category: participant.category
        }
      },
      update: {},
      create: participant
    });
    console.log('Created participant:', p.name, `(${p.category})`);
  }

  console.log('Seeding completed!');
  console.log('\nLogin credentials:');
  console.log('Admin: admin / admin123');
  console.log('Jurors: giuria1, giuria2, giuria3 / juror123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
