/* eslint-disable */
export interface RouteParams {
  gallery: {};
  'gallery.index': {};
  'photos.show': { id: number };
}

export interface RouteSearch {
  gallery: {};
  'gallery.index': {};
  'photos.show': { source?: string };
}

export interface RouteHash {
  gallery: never;
  'gallery.index': never;
  'photos.show': 'details' | 'comments';
}

export interface RouteMeta {
  gallery: { title?: string };
  'gallery.index': { title?: string };
  'photos.show': { title?: string };
}

export interface RoutePaths {
  gallery: '/gallery';
  'gallery.index': '/gallery';
  'photos.show': '/photos/{id:int}';
}

export interface RouteOutletContext {
  'photos.show': { source: string };
}

export const routeIds = ['gallery', 'gallery.index', 'photos.show'] as const;
export const routePaths = {
  gallery: '/gallery',
  'gallery.index': '/gallery',
  'photos.show': '/photos/{id:int}',
} as const;

export interface RouterContracts {
  params: RouteParams;
  search: RouteSearch;
  hash: RouteHash;
  meta: RouteMeta;
  paths: RoutePaths;
  outletContext: RouteOutletContext;
}
/* eslint-enable */
