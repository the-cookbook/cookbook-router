import { defineRoutes } from '@cookbook/router';
import { GalleryIndexPage, GalleryLayout, PhotoModal, PhotoPage } from './pages';

export const routes = defineRoutes([
  {
    id: 'entry',
    path: '/',
    redirect: {
      route: 'gallery',
    },
  },
  {
    id: 'gallery',
    path: '/gallery',
    layout: {
      view: GalleryLayout,
      slots: {
        modal: true,
      },
    },
    intercepts: {
      modal: {
        to: 'photos.show',
        view: PhotoModal,
      },
    },
    meta: {
      title: 'Gallery',
    },
    children: [
      {
        id: 'gallery.index',
        index: true,
        view: GalleryIndexPage,
        meta: {
          title: 'Photos',
        },
      },
    ],
  },
  {
    id: 'photos.show',
    path: '/photos/{id:int}',
    search: {
      source: { type: 'string', optional: true },
    },
    hash: { type: 'enum', values: ['details', 'comments'], optional: true },
    view: PhotoPage,
    meta: {
      title: 'Photo',
    },
  },
] as const);
