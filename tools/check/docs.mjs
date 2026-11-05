// Docs rule (progressive): every NEW function, method or class gets a /** doc block */ saying what it does
// in game terms, so the game's internals stay readable as it grows. Only code this change adds is checked,
// never old code; when you touch an old function, adding its doc block is welcome but not required.
//
// Needs a doc block: a named function, a class, a class method or getter/setter, or a top-level
// `const name = (...) => ...` - when it's new in this change and spans 3 or more lines, or is exported.
// Skipped: one- and two-line helpers, constructors, callbacks passed inline, and generated files
// ("do not edit by hand").
//
//   npm run check:docs          (compares with origin/main; CHECK_BASE=<ref> to change that)
import fs from 'node:fs';
import * as espree from 'espree';
import { changedLines, isAdded } from './changed.mjs';

const MIN_LINES = 3;
const changes = changedLines();
const problems = [];

for (const file of changes.keys()) {
  if (!/^(src|tools)\/.*\.(m?js)$/.test(file) || !fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (/do not edit by hand/i.test(text.slice(0, 600))) continue;
  let ast;
  try { ast = espree.parse(text, { ecmaVersion: 'latest', sourceType: 'module', loc: true, range: true, comment: true }); } catch (e) { continue; }   // lint reports syntax errors
  const docEnds = new Set(ast.comments.filter((c) => c.type === 'Block' && c.value.startsWith('*')).map((c) => c.loc.end.line));
  const documented = (node) => {
    // the doc block must end on the line above (or the same line, for one-liners like /** ... */ fn(){})
    for (let l = node.loc.start.line; l >= node.loc.start.line - 1; l--) if (docEnds.has(l)) return true;
    return false;
  };

  const check = (node, name, holder, exported) => {
    const lines = node.loc.end.line - node.loc.start.line + 1;
    if (!isAdded(changes, file, holder.loc.start.line)) return;
    if (lines < MIN_LINES && !exported) return;
    if (!documented(holder)) problems.push(`${file}:${holder.loc.start.line}  ${name}`);
  };

  const visitClass = (cls, holder, exported) => {
    check(cls, 'class ' + (cls.id ? cls.id.name : '(anonymous)'), holder, exported);
    for (const m of cls.body.body) {
      if (m.type !== 'MethodDefinition' || m.kind === 'constructor') continue;
      const key = m.key.name || (m.key.value !== undefined ? String(m.key.value) : '[computed]');
      check(m, (cls.id ? cls.id.name + '.' : '') + key + '()', m, false);
    }
  };

  const visitTop = (node, holder, exported) => {
    if (!node) return;
    if (node.type === 'FunctionDeclaration') check(node, node.id ? node.id.name + '()' : 'function', holder, exported);
    else if (node.type === 'ClassDeclaration') visitClass(node, holder, exported);
    else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        const init = d.init;
        if (!init || d.id.type !== 'Identifier') continue;
        if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') check(init, d.id.name + '()', holder, exported);
        else if (init.type === 'ClassExpression') visitClass(init, holder, exported);
      }
    }
  };

  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') visitTop(node.declaration, node, true);
    else visitTop(node, node, false);
  }
}

if (problems.length) {
  console.log(`check:docs - ${problems.length} new function(s)/class(es) without a /** doc block */ (AGENTS.md: Docs rule):`);
  for (const p of problems) console.log('  ' + p);
  console.log('Add a short /** ... */ above each: what it does in game terms, its parameters if not obvious, what it returns.');
  process.exit(1);
}
console.log('check:docs - ok (every new function, method and class has a doc block)');
