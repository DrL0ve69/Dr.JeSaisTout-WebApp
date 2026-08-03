# Angular — bonnes pratiques (cache local du MCP angular-cli)

> **Copié le 2026-08-03** depuis le cache du projet frère **AbrisTempo Local**
> (`2026/Templates/AbrisAutoOutaouais-WebApp/.claude/rules/angular-best-practices.md`), lui-même
> généré via l'outil MCP `mcp__angular-cli__get_best_practices` (Angular 21). Contenu **verbatim**
> ci-dessous — générique au framework, indépendant du projet.
>
> **Pourquoi ce cache.** L'appel MCP consomme des tokens à chaque session ; les agents lisent **CE
> fichier** au lieu de rappeler le MCP à chaque fois. **Régénérer ce cache** (rappeler
> `mcp__angular-cli__get_best_practices` avec le `workspacePath` du workspace Angular une fois créé, et
> mettre à jour la date ci-dessus) **dès que** : (a) le workspace Angular du projet est initialisé
> (`ng new`) — ce fichier a été copié **avant** la création du workspace, à valider dès que
> `angular.json` existe ; (b) une montée de version Angular **majeure** a lieu.

---

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
