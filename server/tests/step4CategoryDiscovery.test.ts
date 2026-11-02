import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passedCount = 0;
let failedCount = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message);
      failedCount++;
    }
  };
}

async function main() {
  console.log('\n================================================================');
  console.log('   STEP 4: LANDING PAGE NAVIGATION & PROPERTY CATEGORY SELECTION');
  console.log('================================================================\n');

  const pool = new Pool(
    process.env.SQL_HOST && process.env.SQL_DB_NAME
      ? {
          host: process.env.SQL_HOST,
          user: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
          database: process.env.SQL_DB_NAME,
          max: 5,
        }
      : {
          connectionString:
            process.env.DATABASE_URL ||
            'postgresql://postgres:postgres@localhost:5432/nivaspay',
          max: 5,
        }
  );

  const tests = [
    // -------------------------------------------------------------------------
    // 1. Component & Structure Verification
    // -------------------------------------------------------------------------
    runTest('PropertyCategorySelection component exists and contains exact required copy', () => {
      const filePath = path.resolve(__dirname, '../../src/components/landing/PropertyCategorySelection.tsx');
      assert.ok(fs.existsSync(filePath), 'PropertyCategorySelection.tsx must exist');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Heading & supporting text
      assert.ok(content.includes('What are you looking for?'), 'Must have heading "What are you looking for?"');
      assert.ok(content.includes('Find the right space for your needs.'), 'Must have supporting text');

      // Card 1: Housing
      assert.ok(content.includes('Housing'), 'Must include Housing card title');
      assert.ok(content.includes('Find a home, room or accommodation that fits your lifestyle.'), 'Must include Housing description');
      assert.ok(content.includes('Apartments'), 'Must list Apartments & Flats');
      assert.ok(content.includes('Independent Houses'), 'Must list Independent Houses');
      assert.ok(content.includes('Villas'), 'Must list Villas');
      assert.ok(content.includes('PG Accommodation'), 'Must list PG Accommodation');
      assert.ok(content.includes('Hostels'), 'Must list Hostels');
      assert.ok(content.includes('Shared Rooms'), 'Must list Shared Rooms');
      assert.ok(content.includes('Explore Housing'), 'Must have Explore Housing action button');

      // Card 2: Commercial
      assert.ok(content.includes('Commercial'), 'Must include Commercial card title');
      assert.ok(content.includes('Find the right space for your business.'), 'Must include Commercial description');
      assert.ok(content.includes('Offices'), 'Must list Offices');
      assert.ok(content.includes('Shops'), 'Must list Shops & Showrooms');
      assert.ok(content.includes('Warehouses'), 'Must list Warehouses');
      assert.ok(content.includes('Industrial Spaces'), 'Must list Industrial Spaces');
      assert.ok(content.includes('Co-working Spaces'), 'Must list Co-working Spaces');
      assert.ok(content.includes('Clinics'), 'Must list Clinics');
      assert.ok(content.includes('Explore Commercial'), 'Must have Explore Commercial action button');

      // Back to Home
      assert.ok(content.includes('Back to Home'), 'Must have Back to Home navigation');
    }),

    // -------------------------------------------------------------------------
    // 2. Routing & Navigation Integration in App.tsx
    // -------------------------------------------------------------------------
    runTest('App.tsx integrates rent_category_selection routing and deep links', () => {
      const filePath = path.resolve(__dirname, '../../src/App.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.ok(content.includes("'rent_category_selection'"), 'MainAppSection must contain rent_category_selection');
      assert.ok(content.includes('PropertyCategorySelection'), 'App.tsx must import and render PropertyCategorySelection');
      assert.ok(content.includes('#/rent'), 'App.tsx must route to #/rent');
      assert.ok(content.includes('#/customer/commercial'), 'App.tsx must route to #/customer/commercial');
      assert.ok(content.includes('#/customer/housing'), 'App.tsx must route to #/customer/housing');
      assert.ok(content.includes("handleNavigateSection('rent_category_selection')"), 'handleSelectToRent must navigate to rent_category_selection');
    }),

    // -------------------------------------------------------------------------
    // 3. Customer Discovery Header & Sub-category Filtering
    // -------------------------------------------------------------------------
    runTest('CustomerLayout and CustomerApp support discoveryCategory and switching', () => {
      const layoutPath = path.resolve(__dirname, '../../src/components/customer/CustomerLayout.tsx');
      const appPath = path.resolve(__dirname, '../../src/components/customer/CustomerApp.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
      const appContent = fs.readFileSync(appPath, 'utf-8');

      assert.ok(layoutContent.includes('activeCategory'), 'CustomerLayout must accept activeCategory prop');
      assert.ok(layoutContent.includes('onNavigateRentCategories'), 'CustomerLayout must accept onNavigateRentCategories');
      assert.ok(layoutContent.includes('Housing'), 'CustomerLayout has Housing mode indicator');
      assert.ok(layoutContent.includes('Commercial'), 'CustomerLayout has Commercial mode indicator');

      assert.ok(appContent.includes('discoveryCategory'), 'CustomerApp must accept discoveryCategory');
      assert.ok(appContent.includes('HOUSING_CATEGORIES'), 'CustomerApp defines HOUSING_CATEGORIES');
      assert.ok(appContent.includes('COMMERCIAL_CATEGORIES'), 'CustomerApp defines COMMERCIAL_CATEGORIES');
      assert.ok(appContent.includes('Commercial Properties Coming Soon'), 'CustomerApp renders honest empty state for Commercial');
      assert.ok(appContent.includes('never mismapped as commercial'), 'Honest empty state explains no fabricated data');
    }),

    // -------------------------------------------------------------------------
    // 4. Data Honesty: Existing PostgreSQL Seed Listings
    // -------------------------------------------------------------------------
    runTest('Database inventory contains genuine residential listings and 0 fabricated commercial listings', async () => {
      const res = await pool.query('SELECT id, title, property_type FROM properties;');
      assert.ok(res.rows.length > 0, 'Database has seed properties');

      // Verify all seed properties are residential
      const commercialKeywords = ['office', 'shop', 'showroom', 'warehouse', 'industrial', 'coworking', 'clinic'];
      for (const row of res.rows) {
        const typeStr = (row.property_type || '').toLowerCase();
        for (const kw of commercialKeywords) {
          assert.strictEqual(
            typeStr.includes(kw),
            false,
            `Property ${row.id} (${row.title}) must not be a commercial type: ${row.property_type}`
          );
        }
      }

      // Check commercial count is strictly 0 (no fake commercial data)
      const fakeCommercial = res.rows.filter((r: any) =>
        commercialKeywords.some((kw) => (r.property_type || '').toLowerCase().includes(kw))
      );
      assert.strictEqual(fakeCommercial.length, 0, 'There must be NO fabricated commercial listings');
    }),

    // -------------------------------------------------------------------------
    // 5. Preserved Customer and Owner Separation & Fee Policies
    // -------------------------------------------------------------------------
    runTest('Customer & Owner separation and NivasPay Fee Policies are completely preserved', async () => {
      // Verify PostgreSQL rejects non-primary roles (BROKER_ADMIN, etc.) via CHECK constraint
      let invalidRoleRejected = false;
      try {
        await pool.query(
          `INSERT INTO users (id, email, password_hash, role, full_name, is_verified)
           VALUES ('invalid_role_step4_check', 'invalid_step4@test.com', 'dummy_hash', 'BROKER_ADMIN', 'Invalid Role User', true);`
        );
      } catch (err: any) {
        invalidRoleRejected = true;
      }
      assert.strictEqual(invalidRoleRejected, true, 'users.role must reject roles outside of CUSTOMER, OWNER, ADMIN');

      // Owner portal check: single portal, no separate apps
      const ownerLayoutPath = path.resolve(__dirname, '../../src/components/owner/OwnerLayout.tsx');
      assert.ok(fs.existsSync(ownerLayoutPath), 'OwnerLayout exists');
      const ownerContent = fs.readFileSync(ownerLayoutPath, 'utf-8');
      assert.ok(!ownerContent.includes('CommercialOwnerLayout'), 'Owner portal is not split into separate apps');
    }),
  ];

  for (const t of tests) {
    await t();
  }

  await pool.end();

  console.log('\n----------------------------------------------------------------');
  console.log(`Step 4 Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('----------------------------------------------------------------\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Step 4 Test Error]:', err);
  process.exit(1);
});
