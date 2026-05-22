import { describe, expect, it } from 'vitest';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { Link, RouterProvider, useNavigate } from '@cookbook/router-react';

describe('public package exports used by an external app', () => {
  it('provides all APIs used by the consumer trial from package roots', () => {
    expect(typeof defineRoutes).toBe('function');
    expect(typeof createMemoryRouter).toBe('function');
    expect(typeof Link).toBe('function');
    expect(typeof RouterProvider).toBe('function');
    expect(typeof useNavigate).toBe('function');
  });
});
