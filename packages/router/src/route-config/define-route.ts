import type { DefineRoutesOptions } from './define-routes';
import type { RouterPathConstraints, RouterPathOptions } from '../path';
import { registerUrlPathConstraints } from '../url-state/register-url-path-constraints';
import type { RouteDeclaration, RouteDefinition } from './contracts';
import { setDefineRoutesOptions } from './define-routes';
import { validateRoutes } from './validate-routes';

/** Options used by `defineRouteTree` while composing route declarations. */
export interface DefineRouteTreeOptions extends DefineRoutesOptions {
  readonly routes: readonly RouteDeclaration[];
  readonly pathOptions?: RouterPathOptions;
  readonly pathConstraints?: RouterPathConstraints;
}

interface CollectedRouteNode {
  readonly route: RouteDeclaration;
  readonly parentId?: string;
  readonly declarationOrder: number;
  readonly children: CollectedRouteNode[];
}

interface MutableCollectedRouteNode {
  readonly route: RouteDeclaration;
  readonly parentId?: string;
  readonly declarationOrder: number;
  readonly children: MutableCollectedRouteNode[];
}

interface CollectedRouteGraph {
  readonly nodes: Map<string, MutableCollectedRouteNode>;
  readonly roots: MutableCollectedRouteNode[];
}

interface CollectContext {
  readonly nodes: Map<string, MutableCollectedRouteNode>;
  readonly nextDeclarationOrder: () => number;
  readonly inlineParentId?: string;
}

/**
 * Defines one route declaration while preserving literal route IDs, URL state,
 * path patterns, metadata, and child declarations.
 */
export function defineRoute<const Route extends RouteDeclaration>(route: Route): Route {
  return route;
}

/**
 * Composes explicit route declarations into a nested runtime route tree.
 *
 * Nesting is controlled only by `parent` and inline `children`. File paths,
 * folder names, declaration order, and route ID prefixes are not used to infer
 * hierarchy.
 */
export function defineRouteTree<const Routes extends readonly RouteDeclaration[]>(
  options: DefineRouteTreeOptions & { readonly routes: Routes },
): readonly RouteDefinition[] {
  registerUrlPathConstraints(options.pathConstraints);

  const graph = collectRouteGraph(options.routes);
  attachParentedRoutes(graph);
  validateRouteGraph(graph);

  const routes = graph.roots.map(toRuntimeRoute);
  validateRoutes(routes, options.pathOptions);
  setDefineRoutesOptions(routes, {
    ...(options.pathOptions === undefined ? {} : { pathOptions: options.pathOptions }),
    ...(options.pathConstraints === undefined ? {} : { pathConstraints: options.pathConstraints }),
  });

  return routes;
}

function collectRouteGraph(routes: readonly RouteDeclaration[]): CollectedRouteGraph {
  if (!Array.isArray(routes)) {
    throw new Error('defineRouteTree routes must be an array.');
  }

  let declarationOrder = 0;
  const nodes = new Map<string, MutableCollectedRouteNode>();
  const nextDeclarationOrder = (): number => declarationOrder++;

  for (const route of routes) {
    collectRoute(route, { nodes, nextDeclarationOrder });
  }

  return { nodes, roots: [] };
}

function collectRoute(route: RouteDeclaration, context: CollectContext): MutableCollectedRouteNode {
  if (!route || typeof route !== 'object') {
    throw new Error('Every route declaration must be an object.');
  }

  if (!route.id || typeof route.id !== 'string') {
    throw new Error('Every route declaration must define a non-empty string id.');
  }

  if (context.nodes.has(route.id)) {
    throw new Error(`Duplicate route id "${route.id}".`);
  }

  if (route.parent !== undefined && typeof route.parent !== 'string') {
    throw new Error(`Route "${route.id}" parent must be a string when provided.`);
  }

  if (route.order !== undefined && typeof route.order !== 'number') {
    throw new Error(`Route "${route.id}" order must be a number when provided.`);
  }

  const parentId = route.parent ?? context.inlineParentId;
  const node: MutableCollectedRouteNode = {
    route,
    ...(parentId === undefined ? {} : { parentId }),
    declarationOrder: context.nextDeclarationOrder(),
    children: [],
  };

  context.nodes.set(route.id, node);

  for (const child of route.children ?? []) {
    const childParentId = child.parent ?? route.id;

    if (child.parent !== undefined && child.parent !== route.id) {
      throw new Error(
        `Route "${child.id}" is declared inline under "${route.id}" but declares parent "${child.parent}". Inline children must either omit parent or declare the containing route id.`,
      );
    }

    collectRoute(child, {
      nodes: context.nodes,
      nextDeclarationOrder: context.nextDeclarationOrder,
      inlineParentId: childParentId,
    });
  }

  return node;
}

function attachParentedRoutes(graph: CollectedRouteGraph): void {
  for (const node of graph.nodes.values()) {
    node.children.splice(0, node.children.length);
  }

  graph.roots.splice(0, graph.roots.length);

  for (const node of graph.nodes.values()) {
    if (node.parentId === undefined) {
      graph.roots.push(node);
      continue;
    }

    const parent = graph.nodes.get(node.parentId);

    if (!parent) {
      throw new Error(
        `Route "${node.route.id}" declares parent "${node.parentId}", but no route with id "${node.parentId}" exists.`,
      );
    }

    if (parent.route.redirect !== undefined) {
      throw new Error(
        `Route "${node.route.id}" declares parent "${parent.route.id}", but redirect routes cannot have children.`,
      );
    }

    parent.children.push(node);
  }

  for (const node of graph.nodes.values()) {
    node.children.sort(compareSiblingRoutes);
  }

  graph.roots.sort(compareSiblingRoutes);
}

function validateRouteGraph(graph: CollectedRouteGraph): void {
  validateParentCycles(graph.nodes);
  validateCompositionRoutes(graph.nodes);
  validateInterceptTargets(graph.nodes);
}

function validateParentCycles(nodes: ReadonlyMap<string, CollectedRouteNode>): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  for (const node of nodes.values()) {
    visitParentChain(node, nodes, visiting, visited, []);
  }
}

function visitParentChain(
  node: CollectedRouteNode,
  nodes: ReadonlyMap<string, CollectedRouteNode>,
  visiting: Set<string>,
  visited: Set<string>,
  trail: readonly string[],
): void {
  if (visited.has(node.route.id)) {
    return;
  }

  if (visiting.has(node.route.id)) {
    const cycleStart = trail.indexOf(node.route.id);
    const cycle = [...trail.slice(cycleStart), node.route.id];
    throw new Error(`Route parent cycle found: ${cycle.join(' -> ')}.`);
  }

  visiting.add(node.route.id);

  if (node.parentId !== undefined) {
    const parent = nodes.get(node.parentId);

    if (parent) {
      visitParentChain(parent, nodes, visiting, visited, [...trail, node.route.id]);
    }
  }

  visiting.delete(node.route.id);
  visited.add(node.route.id);
}

function validateCompositionRoutes(nodes: ReadonlyMap<string, CollectedRouteNode>): void {
  for (const node of nodes.values()) {
    if (node.parentId !== undefined && node.route.path?.startsWith('/')) {
      throw new Error(
        `Route "${node.route.id}" has parent "${node.parentId}" but uses absolute path "${node.route.path}". Child route paths must be relative.`,
      );
    }

    if (node.route.redirect !== undefined && node.children[0]) {
      throw new Error(`Route "${node.route.id}" defines redirect and must not define children.`);
    }

    validateDuplicateIndexChildren(node);
  }
}

function validateDuplicateIndexChildren(node: CollectedRouteNode): void {
  let indexRouteId: string | undefined;

  for (const child of node.children) {
    if (child.route.index !== true) {
      continue;
    }

    if (indexRouteId !== undefined) {
      throw new Error(
        `Routes "${indexRouteId}" and "${child.route.id}" are duplicate index routes under parent "${node.route.id}".`,
      );
    }

    indexRouteId = child.route.id;
  }
}

function validateInterceptTargets(nodes: ReadonlyMap<string, CollectedRouteNode>): void {
  for (const node of nodes.values()) {
    for (const [slotName, intercept] of Object.entries(node.route.intercepts ?? {})) {
      const targets = normalizeInterceptTargets(intercept.to);

      for (const target of targets) {
        if (!nodes.has(target)) {
          throw new Error(
            `Route "${node.route.id}" intercept "${slotName}" targets unknown route id "${target}" (targets missing route "${target}").`,
          );
        }
      }

      if (!routeOrAncestorDeclaresSlot(node, nodes, slotName)) {
        throw new Error(
          `Route "${node.route.id}" intercept "${slotName}" uses a slot that is not declared by the source route layout or an ancestor layout.`,
        );
      }
    }
  }
}

function normalizeInterceptTargets(targets: string | readonly string[]): readonly string[] {
  return typeof targets === 'string' ? [targets] : targets;
}

function routeOrAncestorDeclaresSlot(
  node: CollectedRouteNode,
  nodes: ReadonlyMap<string, CollectedRouteNode>,
  slotName: string,
): boolean {
  let current: CollectedRouteNode | undefined = node;

  while (current) {
    if (
      current.route.layout?.slots &&
      Object.prototype.hasOwnProperty.call(current.route.layout.slots, slotName)
    ) {
      return true;
    }

    current = current.parentId === undefined ? undefined : nodes.get(current.parentId);
  }

  return false;
}

function compareSiblingRoutes(left: CollectedRouteNode, right: CollectedRouteNode): number {
  const leftOrder = left.route.order ?? Number.POSITIVE_INFINITY;
  const rightOrder = right.route.order ?? Number.POSITIVE_INFINITY;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  if (left.route.index === true && right.route.index !== true) {
    return -1;
  }

  if (right.route.index === true && left.route.index !== true) {
    return 1;
  }

  const specificity = getRouteSpecificity(right.route) - getRouteSpecificity(left.route);

  if (specificity) {
    return specificity;
  }

  return left.declarationOrder - right.declarationOrder;
}

function getRouteSpecificity(route: RouteDeclaration): number {
  if (route.index) {
    return 1000;
  }

  if (!route.path) {
    return 0;
  }

  return route.path
    .split('/')
    .filter(Boolean)
    .reduce((score, segment) => {
      if (segment.startsWith('{*')) {
        return score + 1;
      }

      if (segment.startsWith('{')) {
        return score + 3;
      }

      return score + 5;
    }, 0);
}

function toRuntimeRoute(node: CollectedRouteNode): RouteDefinition {
  const { parent: _parent, order: _order, children: _children, ...route } = node.route;
  const children = node.children.map(toRuntimeRoute);

  return {
    ...route,
    ...(children[0] ? { children } : {}),
  };
}
