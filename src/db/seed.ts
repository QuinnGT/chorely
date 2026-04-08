import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Load .env.local for standalone script execution, fallback to .env
config({ path: '.env.local' });
config({ path: '.env' });

// Helper: generate date string N days ago from today
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// Helper: Monday of current week
function currentWeekMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Helper: Monday of N weeks ago
function weeksAgo(n: number): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff - n * 7);
  return d.toISOString().split('T')[0];
}

async function seed(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  console.log('🌱 Seeding database...');

  // ─── Clean existing data ───────────────────────────────────────────────────
  console.log('  🧹 Clearing existing data...');
  await db.delete(schema.storeOrders).catch(() => {});
  await db.delete(schema.storeItems).catch(() => {});
  await db.delete(schema.categoryBalances).catch(() => {});
  await db.delete(schema.spendingCategories).catch(() => {});
  await db.delete(schema.savingsGoals).catch(() => {});
  await db.delete(schema.allowanceLedger).catch(() => {});
  await db.delete(schema.allowanceRules).catch(() => {});
  await db.delete(schema.choreCompletions).catch(() => {});
  await db.delete(schema.choreAssignments).catch(() => {});
  await db.delete(schema.chores).catch(() => {});
  await db.delete(schema.kids).catch(() => {});
  await db.delete(schema.appSettings).catch(() => {});

  // ─── Kids ─────────────────────────────────────────────────────────────────
  const [liesl, gideon, leo, maya, sam] = await db
    .insert(schema.kids)
    .values([
      { name: 'Liesl', themeColor: '#006571', avatarUrl: null },
      { name: 'Gideon', themeColor: '#f43f5e', avatarUrl: null },
      { name: 'Leo', themeColor: '#0d9488', avatarUrl: null },
      { name: 'Maya', themeColor: '#7c3aed', avatarUrl: null },
      { name: 'Sam', themeColor: '#f59e0b', avatarUrl: null },
    ])
    .returning();

  console.log(`  ✅ Created kids: ${liesl.name}, ${gideon.name}, ${leo.name}, ${maya.name}, ${sam.name}`);

  // ─── Chores ───────────────────────────────────────────────────────────────
  const choreData = [
    { name: 'Make Bed', icon: '🛏️', frequency: 'daily' as const },
    { name: 'Brush Teeth', icon: '🪥', frequency: 'daily' as const },
    { name: 'Homework', icon: '📚', frequency: 'daily' as const },
    { name: 'Clean Room', icon: '🧹', frequency: 'daily' as const },
    { name: 'Set the Table', icon: '🍽️', frequency: 'daily' as const },
    { name: 'Feed the Dog', icon: '🐕', frequency: 'daily' as const },
    { name: 'Take Out Trash', icon: '🗑️', frequency: 'weekly' as const },
    { name: 'Vacuum', icon: '🧽', frequency: 'weekly' as const },
    { name: 'Dust Shelves', icon: '✨', frequency: 'weekly' as const },
    { name: 'Mow the Lawn', icon: '🌿', frequency: 'weekly' as const },
  ];

  const createdChores = await db
    .insert(schema.chores)
    .values(choreData)
    .returning();

  console.log(`  ✅ Created ${createdChores.length} chores`);

  const [
    makeBed, brushTeeth, homework, cleanRoom, setTable, feedDog,
    takeOutTrash, vacuum, dustShelves, mowLawn,
  ] = createdChores;

  // ─── Chore Assignments ────────────────────────────────────────────────────
  // Liesl: daily chores + weekly vacuum/dust
  // Gideon: daily chores + weekly trash/mow
  // Leo: daily chores + weekly vacuum
  // Maya: daily chores + weekly dust
  // Sam: daily chores + weekly trash/mow

  const assignmentRows = [
    // Liesl
    { choreId: makeBed.id, kidId: liesl.id },
    { choreId: brushTeeth.id, kidId: liesl.id },
    { choreId: homework.id, kidId: liesl.id },
    { choreId: cleanRoom.id, kidId: liesl.id },
    { choreId: setTable.id, kidId: liesl.id },
    { choreId: vacuum.id, kidId: liesl.id },
    { choreId: dustShelves.id, kidId: liesl.id },
    // Gideon
    { choreId: makeBed.id, kidId: gideon.id },
    { choreId: brushTeeth.id, kidId: gideon.id },
    { choreId: homework.id, kidId: gideon.id },
    { choreId: cleanRoom.id, kidId: gideon.id },
    { choreId: feedDog.id, kidId: gideon.id },
    { choreId: takeOutTrash.id, kidId: gideon.id },
    { choreId: mowLawn.id, kidId: gideon.id },
    // Leo (teal)
    { choreId: makeBed.id, kidId: leo.id },
    { choreId: brushTeeth.id, kidId: leo.id },
    { choreId: homework.id, kidId: leo.id },
    { choreId: cleanRoom.id, kidId: leo.id },
    { choreId: feedDog.id, kidId: leo.id },
    { choreId: vacuum.id, kidId: leo.id },
    // Maya (purple)
    { choreId: makeBed.id, kidId: maya.id },
    { choreId: brushTeeth.id, kidId: maya.id },
    { choreId: homework.id, kidId: maya.id },
    { choreId: setTable.id, kidId: maya.id },
    { choreId: cleanRoom.id, kidId: maya.id },
    { choreId: dustShelves.id, kidId: maya.id },
    // Sam (amber)
    { choreId: makeBed.id, kidId: sam.id },
    { choreId: brushTeeth.id, kidId: sam.id },
    { choreId: homework.id, kidId: sam.id },
    { choreId: cleanRoom.id, kidId: sam.id },
    { choreId: feedDog.id, kidId: sam.id },
    { choreId: takeOutTrash.id, kidId: sam.id },
    { choreId: mowLawn.id, kidId: sam.id },
  ];

  const assignments = await db
    .insert(schema.choreAssignments)
    .values(assignmentRows)
    .returning();

  console.log(`  ✅ Created ${assignments.length} chore assignments`);

  // ─── Chore Completions ────────────────────────────────────────────────────
  // Generate completions for the past 7 days
  // Daily chores: mostly completed with a few gaps
  // Weekly chores: completed once this week

  const completionRows: {
    assignmentId: string;
    date: string;
    completed: boolean;
    completedAt: Date | null;
  }[] = [];

  function addCompletionsForKid(
    kidId: string,
    dailyCompletionRate: number,
  ) {
    const kidAssignments = assignments.filter((a) => a.kidId === kidId);
    for (const assignment of kidAssignments) {
      const chore = createdChores.find((c) => c.id === assignment.choreId);
      if (!chore) continue;

      if (chore.frequency === 'daily') {
        for (let d = 1; d <= 7; d++) {
          const completed = Math.random() < dailyCompletionRate;
          completionRows.push({
            assignmentId: assignment.id,
            date: daysAgo(d),
            completed,
            completedAt: completed
              ? new Date(Date.now() - d * 86400000 + Math.random() * 36000000)
              : null,
          });
        }
      } else {
        // Weekly: completed once this week (on a random day 1-3 ago)
        const completedDay = 1 + Math.floor(Math.random() * 3);
        completionRows.push({
          assignmentId: assignment.id,
          date: daysAgo(completedDay),
          completed: true,
          completedAt: new Date(Date.now() - completedDay * 86400000 + 36000000),
        });
      }
    }
  }

  // Liesl: 90% daily completion rate (very consistent)
  addCompletionsForKid(liesl.id, 0.9);
  // Gideon: 75% daily completion rate
  addCompletionsForKid(gideon.id, 0.75);
  // Leo: 85% daily completion rate
  addCompletionsForKid(leo.id, 0.85);
  // Maya: 70% daily completion rate
  addCompletionsForKid(maya.id, 0.7);
  // Sam: 95% daily completion rate (super consistent!)
  addCompletionsForKid(sam.id, 0.95);

  await db.insert(schema.choreCompletions).values(completionRows);
  console.log(`  ✅ Created ${completionRows.length} chore completions`);

  // ─── Allowance Rules ──────────────────────────────────────────────────────
  await db.insert(schema.allowanceRules).values([
    {
      kidId: liesl.id,
      fullCompletionAmount: '5.00',
      partialCompletionAmount: '3.00',
      streakBonusAmount: '3.00',
      minStreakDays: 7,
    },
    {
      kidId: gideon.id,
      fullCompletionAmount: '5.00',
      partialCompletionAmount: '3.00',
      streakBonusAmount: '3.00',
      minStreakDays: 7,
    },
    {
      kidId: leo.id,
      fullCompletionAmount: '4.00',
      partialCompletionAmount: '2.50',
      streakBonusAmount: '2.00',
      minStreakDays: 7,
    },
    {
      kidId: maya.id,
      fullCompletionAmount: '4.00',
      partialCompletionAmount: '2.50',
      streakBonusAmount: '2.00',
      minStreakDays: 7,
    },
    {
      kidId: sam.id,
      fullCompletionAmount: '6.00',
      partialCompletionAmount: '4.00',
      streakBonusAmount: '4.00',
      minStreakDays: 7,
    },
  ]);
  console.log('  ✅ Created allowance rules for all kids');

  // ─── Allowance Ledger (past 4 weeks) ─────────────────────────────────────
  const ledgerRows: {
    kidId: string;
    weekStart: string;
    earned: string;
    bonusEarned: string;
    paid: boolean;
    paidAt: Date | null;
    paidVia: string | null;
  }[] = [];

  for (const kid of [liesl, gideon, leo, maya, sam]) {
    for (let w = 1; w <= 4; w++) {
      const earned = (3 + Math.random() * 3).toFixed(2);
      const bonus = w % 2 === 0 ? (1 + Math.random() * 2).toFixed(2) : '0.00';
      const paid = w >= 3;
      ledgerRows.push({
        kidId: kid.id,
        weekStart: weeksAgo(w),
        earned,
        bonusEarned: bonus,
        paid,
        paidAt: paid ? new Date(Date.now() - (w - 1) * 7 * 86400000) : null,
        paidVia: paid ? 'cash' : null,
      });
    }
  }

  await db.insert(schema.allowanceLedger).values(ledgerRows);
  console.log(`  ✅ Created ${ledgerRows.length} allowance ledger entries`);

  // ─── Savings Goals ────────────────────────────────────────────────────────
  await db.insert(schema.savingsGoals).values([
    // Liesl
    {
      kidId: liesl.id,
      name: 'Sketch Pad Set',
      targetAmount: '12.00',
      currentAmount: '7.50',
      status: 'active',
    },
    {
      kidId: liesl.id,
      name: 'New Headphones',
      targetAmount: '25.00',
      currentAmount: '10.00',
      status: 'active',
    },
    // Gideon
    {
      kidId: gideon.id,
      name: 'Science Kit',
      targetAmount: '15.00',
      currentAmount: '4.25',
      status: 'active',
    },
    // Leo (teal demo)
    {
      kidId: leo.id,
      name: 'Roller Skates',
      targetAmount: '30.00',
      currentAmount: '12.50',
      status: 'active',
    },
    {
      kidId: leo.id,
      name: 'LEGO Set',
      targetAmount: '20.00',
      currentAmount: '8.75',
      status: 'active',
    },
    // Maya (purple demo)
    {
      kidId: maya.id,
      name: 'Art Supplies',
      targetAmount: '18.00',
      currentAmount: '5.00',
      status: 'active',
    },
    {
      kidId: maya.id,
      name: 'Puzzle Book',
      targetAmount: '8.00',
      currentAmount: '6.50',
      status: 'active',
    },
    // Sam (amber demo)
    {
      kidId: sam.id,
      name: 'Skateboard',
      targetAmount: '45.00',
      currentAmount: '22.00',
      status: 'active',
    },
  ]);
  console.log('  ✅ Created savings goals');

  // ─── Spending Categories (Money Jars) ─────────────────────────────────────
  const spendingCatRows = [
    // Liesl
    { kidId: liesl.id, name: 'Save', percentage: 50, sortOrder: 0 },
    { kidId: liesl.id, name: 'Spend', percentage: 40, sortOrder: 1 },
    { kidId: liesl.id, name: 'Give', percentage: 10, sortOrder: 2 },
    // Gideon
    { kidId: gideon.id, name: 'Save', percentage: 50, sortOrder: 0 },
    { kidId: gideon.id, name: 'Spend', percentage: 40, sortOrder: 1 },
    { kidId: gideon.id, name: 'Give', percentage: 10, sortOrder: 2 },
    // Leo (teal)
    { kidId: leo.id, name: 'Save', percentage: 40, sortOrder: 0 },
    { kidId: leo.id, name: 'Spend', percentage: 45, sortOrder: 1 },
    { kidId: leo.id, name: 'Give', percentage: 15, sortOrder: 2 },
    // Maya (purple)
    { kidId: maya.id, name: 'Save', percentage: 60, sortOrder: 0 },
    { kidId: maya.id, name: 'Spend', percentage: 30, sortOrder: 1 },
    { kidId: maya.id, name: 'Give', percentage: 10, sortOrder: 2 },
    // Sam (amber)
    { kidId: sam.id, name: 'Save', percentage: 35, sortOrder: 0 },
    { kidId: sam.id, name: 'Spend', percentage: 50, sortOrder: 1 },
    { kidId: sam.id, name: 'Give', percentage: 15, sortOrder: 2 },
  ];

  const createdCategories = await db
    .insert(schema.spendingCategories)
    .values(spendingCatRows)
    .returning();

  // Create category balances
  const balanceRows = createdCategories.map((cat) => ({
    categoryId: cat.id,
    kidId: cat.kidId,
    balance: (Math.random() * 5 + 0.5).toFixed(2),
  }));

  await db.insert(schema.categoryBalances).values(balanceRows);
  console.log(`  ✅ Created ${createdCategories.length} spending categories with balances`);

  // ─── Store Items ──────────────────────────────────────────────────────────
  await db.insert(schema.storeItems).values([
    {
      name: 'Extra Screen Time (30 min)',
      description: 'Earn 30 extra minutes of screen time today!',
      imageUrl: null,
      price: '3.00',
      category: 'experiences',
      stock: 99,
      active: true,
    },
    {
      name: 'Pick Dinner',
      description: 'Choose what the family has for dinner tonight.',
      imageUrl: null,
      price: '5.00',
      category: 'experiences',
      stock: 99,
      active: true,
    },
    {
      name: 'Movie Night',
      description: 'Pick the movie for family movie night!',
      imageUrl: null,
      price: '8.00',
      category: 'experiences',
      stock: 99,
      active: true,
    },
    {
      name: 'Sticker Pack',
      description: 'A fun pack of assorted stickers.',
      imageUrl: null,
      price: '2.00',
      category: 'toys',
      stock: 20,
      active: true,
    },
    {
      name: 'Small LEGO Set',
      description: 'A small LEGO building set.',
      imageUrl: null,
      price: '10.00',
      category: 'toys',
      stock: 5,
      active: true,
    },
    {
      name: 'Coloring Book',
      description: 'A brand new coloring book with crayons.',
      imageUrl: null,
      price: '4.00',
      category: 'books',
      stock: 10,
      active: true,
    },
    {
      name: 'Board Game',
      description: 'A fun board game for the whole family.',
      imageUrl: null,
      price: '15.00',
      category: 'games',
      stock: 3,
      active: true,
    },
    {
      name: 'Ice Cream Trip',
      description: 'A trip to the ice cream shop with the family!',
      imageUrl: null,
      price: '6.00',
      category: 'experiences',
      stock: 99,
      active: true,
    },
  ]);
  console.log('  ✅ Created 8 store items');

  // ─── App Settings ─────────────────────────────────────────────────────────
  await db
    .insert(schema.appSettings)
    .values({ key: 'admin_pin', value: '1234' })
    .onConflictDoNothing();

  console.log('  ✅ Set default admin PIN (1234)');

  console.log('🎉 Seeding complete!');
  await pool.end();
}

seed().catch((error: unknown) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
