import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  console.log('   NIVASPAY LANDING PAGE ROUTING & VISUAL INTEGRATION TESTS     ');
  console.log('================================================================\n');

  const tests = [
    // -------------------------------------------------------------------------
    // 1. Landing Page Card Routing Verification
    // -------------------------------------------------------------------------
    runTest("HeroLandingPage triggers onSelectToRent and onSelectListProperty callbacks", () => {
      const heroPath = path.resolve(__dirname, '../../src/components/landing/HeroLandingPage.tsx');
      assert.ok(fs.existsSync(heroPath), 'HeroLandingPage.tsx must exist');
      const content = fs.readFileSync(heroPath, 'utf-8');

      // Check click handlers on the two cards
      assert.ok(content.includes('onClick={onSelectToRent}'), 'To Rent card must call onSelectToRent on click');
      assert.ok(content.includes('onClick={onSelectListProperty}'), 'List Your Property card must call onSelectListProperty on click');
      assert.ok(content.includes('onKeyDown='), 'Cards must support keyboard navigation (Enter / Space)');
    }),

    runTest("App.tsx maps 'To Rent' action to '#/rent' and rent_category_selection", () => {
      const appPath = path.resolve(__dirname, '../../src/App.tsx');
      assert.ok(fs.existsSync(appPath), 'App.tsx must exist');
      const content = fs.readFileSync(appPath, 'utf-8');

      // Verify handleSelectToRent sets intent and navigates to rent_category_selection (#/rent)
      assert.ok(
        content.includes("handleNavigateSection('rent_category_selection')"),
        "handleSelectToRent must navigate to 'rent_category_selection'"
      );
      assert.ok(
        content.includes("window.location.hash = '#/rent'"),
        "Navigating to rent_category_selection must set hash to '#/rent'"
      );
      assert.ok(
        content.includes("setIntent('tenant')"),
        "handleSelectToRent must set navigation intent to 'tenant'"
      );
    }),

    runTest("App.tsx maps 'List Your Property' action to '#/owner/login' for unauthenticated users", () => {
      const appPath = path.resolve(__dirname, '../../src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');

      // Verify handleSelectListProperty sets hash to '#/owner/login' and opens auth modal
      assert.ok(
        content.includes("window.location.hash = '#/owner/login'"),
        "handleSelectListProperty must set window.location.hash to '#/owner/login'"
      );
      assert.ok(
        content.includes("openAuthModal('login', 'owner')"),
        "handleSelectListProperty must trigger openAuthModal('login', 'owner')"
      );
      assert.ok(
        content.includes("setIntent('owner')"),
        "handleSelectListProperty must set navigation intent to 'owner'"
      );
    }),

    runTest("App.tsx listens for '#/owner/login' hash and triggers owner authentication modal", () => {
      const appPath = path.resolve(__dirname, '../../src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');

      // Verify hash listener and initial deep link handling recognizes 'owner/login'
      assert.ok(
        content.includes("hash.includes('owner/login')"),
        "handleHashChange must detect 'owner/login' route"
      );
      assert.ok(
        content.includes("window.location.hash.toLowerCase().includes('owner/login')"),
        "Initial mount must detect 'owner/login' deep link"
      );
    }),

    // -------------------------------------------------------------------------
    // 2. High-Quality Lucide SVG Iconography Verification
    // -------------------------------------------------------------------------
    runTest("HeroLandingPage renders high-quality Lucide SVG iconography for To Rent and List Your Property", () => {
      const heroPath = path.resolve(__dirname, '../../src/components/landing/HeroLandingPage.tsx');
      assert.ok(fs.existsSync(heroPath), 'HeroLandingPage.tsx must exist');
      const heroContent = fs.readFileSync(heroPath, 'utf-8');

      // Verify Lucide imports and SVG rendering
      assert.ok(heroContent.includes('Home'), 'HeroLandingPage must import Home from lucide-react');
      assert.ok(heroContent.includes('Compass'), 'HeroLandingPage must import Compass from lucide-react');
      assert.ok(heroContent.includes('Building2'), 'HeroLandingPage must import Building2 from lucide-react');
      assert.ok(heroContent.includes('KeyRound'), 'HeroLandingPage must import KeyRound from lucide-react');

      // Verify rendering of high-quality Lucide SVG iconography
      assert.ok(heroContent.includes('<Home'), 'To Rent card must render Home Lucide SVG icon');
      assert.ok(heroContent.includes('<Compass'), 'To Rent card must render Compass Lucide SVG emblem badge');
      assert.ok(heroContent.includes('<Building2'), 'List Your Property card must render Building2 Lucide SVG icon');
      assert.ok(heroContent.includes('<KeyRound'), 'List Your Property card must render KeyRound Lucide SVG seal badge');
    }),

    // -------------------------------------------------------------------------
    // 3. Motion Variants from motion/react & Transition Effects Verification
    // -------------------------------------------------------------------------
    runTest("HeroLandingPage imports motion and applies motion variants from 'motion/react' for scale-up and shadow-lift", () => {
      const heroPath = path.resolve(__dirname, '../../src/components/landing/HeroLandingPage.tsx');
      const content = fs.readFileSync(heroPath, 'utf-8');

      // Check motion import from 'motion/react'
      assert.ok(
        content.includes("from 'motion/react'"),
        "HeroLandingPage must import motion and Variants from 'motion/react'"
      );

      // Check variants definitions with scale-up and shadow-lift
      assert.ok(
        content.includes('toRentCardVariants'),
        'HeroLandingPage must define toRentCardVariants'
      );
      assert.ok(
        content.includes('listPropertyCardVariants'),
        'HeroLandingPage must define listPropertyCardVariants'
      );
      assert.ok(
        content.includes('scale: 1.018'),
        'Motion variants must include subtle scale-up effect (scale: 1.018)'
      );
      assert.ok(
        content.includes('y: -8'),
        'Motion variants must include shadow-lift translation (y: -8)'
      );

      // Check motion.div elements with variants
      assert.ok(
        content.includes('<motion.div'),
        'Cards must be wrapped in motion.div components'
      );
      assert.ok(
        content.includes('variants={toRentCardVariants}'),
        'To Rent card must bind toRentCardVariants'
      );
      assert.ok(
        content.includes('variants={listPropertyCardVariants}'),
        'List Your Property card must bind listPropertyCardVariants'
      );
      assert.ok(
        content.includes('whileHover="hover"'),
        'Cards must specify whileHover="hover"'
      );

      // Check CSS class fallbacks for physical translation & drop-shadow
      assert.ok(
        content.includes('hover:scale-[1.018]'),
        "Cards must feature scale class (hover:scale-[1.018])"
      );
      assert.ok(
        content.includes('hover:-translate-y-2'),
        "Cards must feature lift class (hover:-translate-y-2)"
      );
      assert.ok(
        content.includes('hover:shadow-2xl'),
        "Cards must feature elevated drop-shadow (hover:shadow-2xl)"
      );
    }),

    // -------------------------------------------------------------------------
    // 4. Regression & Copy Integrity Verification
    // -------------------------------------------------------------------------
    runTest("All critical landing page titles and action labels remain intact", () => {
      const heroPath = path.resolve(__dirname, '../../src/components/landing/HeroLandingPage.tsx');
      const content = fs.readFileSync(heroPath, 'utf-8');

      assert.ok(content.includes('Find your place'), 'Must contain "Find your place"');
      assert.ok(content.includes('Rent with confidence'), 'Must contain "Rent with confidence"');
      assert.ok(content.includes('To Rent'), 'Must contain "To Rent"');
      assert.ok(content.includes('List Your Property'), 'Must contain "List Your Property"');
      assert.ok(content.includes('Explore Properties'), 'Must contain "Explore Properties"');
      assert.ok(content.includes('Start Listing'), 'Must contain "Start Listing"');
    }),
  ];

  for (const t of tests) {
    await t();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Landing Routing Integration Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('----------------------------------------------------------------\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Landing Routing Integration Test Error]:', err);
  process.exit(1);
});
