import { defineSearch } from '@cookbook/router';

export const paginationSearch = defineSearch({
  page: { type: 'int', optional: true },
  pageSize: { type: 'int', optional: true },
} as const);
