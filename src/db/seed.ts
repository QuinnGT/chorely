import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

async function seed(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  console.log('🌱 Seeding database...');

  // Create kids
  const [alex, jordan] = await db
    .insert(schema.kids)
    .values([
      { name: 'Alex', themeColor: '#0d9488', avatarUrl: null },
      { name: 'Jordan', themeColor: '#7c3aed', avatarUrl: null },
    ])
    .returning();

  console.log(`  ✅ Created kids: ${alex.name}, ${jordan.name}`);

  // Create chores
  const choreData = [
    { name: 'Make Bed', icon: '🛏️', frequency: 'daily' as const },
    { name: 'Brush Teeth', icon: '🪥', frequency: 'daily' as const },
    { name: 'Homework', icon: '📚', frequency: 'daily' as const },
    { name: 'Clean Room', icon: '🧹', frequency: 'daily' as const },
    { name: 'Take Out Trash', icon: '🗑️', frequency: 'weekly' as const },
    { name: 'Vacuum', icon: '🧽', frequency: 'weekly' as const },
  ];

  const createdChores = await db
    .insert(schema.chores)
    .values(choreData)
    .returning();

  console.log(`  ✅ Created ${createdChores.length} chores`);

  // Assign all chores to both kids
  const assignments = createdChores.flatMap((chore) => [
    { choreId: chore.id, kidId: alex.id },
    { choreId: chore.id, kidId: jordan.id },
  ]);

  await db.insert(schema.choreAssignments).values(assignments);
  console.log(`  ✅ Created ${assignments.length} chore assignments`);

  // Set default admin PIN
  await db
    .insert(schema.appSettings)
    .values({ key: 'admin_pin', value: '1234' });

  console.log('  ✅ Set default admin PIN (1234)');

  console.log('🎉 Seeding complete!');
  await pool.end();
}

seed().catch((error: unknown) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
