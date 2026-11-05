// Lint for Operation REBIRTH: catches real bugs (undefined names, typos, unreachable code, duplicate keys,
// real-time clocks in match logic...), not style. `npm run lint` must pass with 0 errors before committing;
// CI runs it on every pull request. Warnings (unused variables) are worth tidying but never block.
import js from '@eslint/js';
import globals from 'globals';

const bugRules = {
  ...js.configs.recommended.rules,
  'no-empty': ['error', { allowEmptyCatch: true }],            // `catch {}` around localStorage is fine
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
  'no-self-compare': 'error',
  'no-unmodified-loop-condition': 'error',
  'no-unreachable-loop': 'error',
  'no-template-curly-in-string': 'error',
  'no-dupe-else-if': 'error',
};

// Same seed = same match (npm run sim, replays): match logic runs on frame counts and Math.random only.
const noRealTime = {
  'no-restricted-properties': ['error',
    { object: 'Date', property: 'now', message: 'Match logic must use frame counts, not real time (AGENTS.md: Testing).' },
    { object: 'performance', property: 'now', message: 'Match logic must use frame counts, not real time (AGENTS.md: Testing).' }],
  'no-restricted-syntax': ['error', { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'Match logic must use frame counts, not real time.' }],
};

export default [
  { ignores: ['dist/**', 'node_modules/**', 'recordings/**', 'public/**', '**/*.min.js', 'tools/sprites/mr-wake-reference.js'] },
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, Phaser: 'readonly', __GAME_COMMIT__: 'readonly' } },
    rules: bugRules,
  },
  {
    files: ['src/fighters/**/*.js', 'src/stage/**/*.js', 'src/ai/**/*.js', 'src/items/**/*.js', 'src/scenes/MatchScene.js', 'src/scenes/matchExtras.js'],
    rules: noRealTime,
  },
  {
    files: ['tools/**/*.{js,mjs}', '*.config.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: bugRules,
  },
];
