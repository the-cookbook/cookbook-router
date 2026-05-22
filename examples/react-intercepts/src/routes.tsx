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
      component: GalleryLayout,
      slots: {
        modal: {
          fallback: null,
        },
      },
    },
    intercepts: {
      modal: {
        to: ['/photos/{id:int}'],
        component: PhotoModal,
      },
    },
    meta: {
      title: 'Gallery',
    },
    children: [
      {
        id: 'gallery.index',
        index: true,
        component: GalleryIndexPage,
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
      source: 'optional-string',
    },
    hash: ['details', 'comments'],
    component: PhotoPage,
    meta: {
      title: 'Photo',
    },
  },
] as const);
