import * as React from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CirclePlus,
  Columns3,
  EllipsisVertical,
  Mail,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { Link, useSearchParams, useNavigate } from '@cookbook/router-react';
import { throttle } from 'throttle-debounce';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toArray } from '@/lib/utils';

interface DashboardUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  status: string;
  team: string;
  sections: number;
  lastActive: string;
}

const parseSearchToInt = (value: string | undefined): number | undefined => {
  return !value || isNaN(+value) ? undefined : +value;
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function StatusBadge({ status }: { status: DashboardUser['status'] }) {
  if (status === 'Active') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <CheckCircle2 className="size-3.5 fill-emerald-500 text-emerald-500" />
        Active
      </Badge>
    );
  }

  if (status === 'Pending') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <span className="size-2 rounded-full bg-amber-500" />
        Pending
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5">
      <span className="size-2 rounded-full bg-destructive" />
      Suspended
    </Badge>
  );
}

function RoleBadge({ role }: { role: DashboardUser['role'] }) {
  if (role === 'Owner') {
    return (
      <Badge className="gap-1.5">
        <ShieldCheck className="size-3.5" />
        Owner
      </Badge>
    );
  }

  if (role === 'Admin') {
    return <Badge variant="default">Admin</Badge>;
  }

  return <Badge variant="secondary">{role}</Badge>;
}

function SortableHeader({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className="-ml-3 h-8 px-3 text-muted-foreground"
      onClick={onClick}
    >
      {label}
      <ArrowUpDown className="ml-2 size-3.5" />
    </Button>
  );
}

const columns: ColumnDef<DashboardUser>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all users"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Select ${row.original.name}`}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'user',
    accessorFn: (row) => `${row.name} ${row.email}`,
    header: ({ column }) => (
      <SortableHeader
        label="User"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => {
      const user = row.original;

      return (
        <div className="flex min-w-[260px] items-center gap-3">
          <Link
            to="users.details"
            params={{ slug: user.username.replace('.', '-') }}
          >
            <Avatar className="size-9 border">
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
          </Link>

          <div className="min-w-0">
            <div className="truncate font-medium">
              <Link
                to="users.details"
                params={{ slug: user.username.replace('.', '-') }}
              >
                {user.name}
              </Link>
            </div>
            <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <Link
                to="users.details"
                params={{ slug: user.username.replace('.', '-') }}
              >
                <Mail className="size-3" />
                {user.email}
              </Link>
            </div>
          </div>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <SortableHeader
        label="Role"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <SortableHeader
        label="Status"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'team',
    header: ({ column }) => (
      <SortableHeader
        label="Team"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => (
      <span className="block max-w-[180px] truncate">{row.original.team}</span>
    ),
  },
  {
    accessorKey: 'sections',
    header: ({ column }) => (
      <div className="text-right">
        <SortableHeader
          label="Sections"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium">{row.original.sections}</div>
    ),
  },
  {
    accessorKey: 'lastActive',
    header: 'Last active',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.lastActive}</span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
            >
              <EllipsisVertical className="size-4" />
              <span className="sr-only">Open actions for {user.name}</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link
                to="users.details"
                params={{ slug: user.username.replace('.', '-') }}
              >
                View user
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Edit user</DropdownMenuItem>
            <DropdownMenuItem>Change role</DropdownMenuItem>
            <DropdownMenuItem>View sections</DropdownMenuItem>
            <DropdownMenuItem>Send invite</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              Suspend user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

export function UsersDataTable({ data }: { data: DashboardUser[] }) {
  const navigate = useNavigate();
  const search = useSearchParams('users.index');

  const initialQuery = toArray(search.q)[0] ?? '';
  const initialStatus = toArray(search.status)[0] ?? 'all';
  const initialRole = toArray(search.role)[0] ?? 'all';

  const [sorting, setSorting] = React.useState<SortingState>([]);

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    () => {
      const filters: ColumnFiltersState = [];

      if (initialQuery) {
        filters.push({
          id: 'user',
          value: initialQuery,
        });
      }

      if (initialStatus !== 'all') {
        filters.push({
          id: 'status',
          value: initialStatus,
        });
      }

      if (initialRole !== 'all') {
        filters.push({
          id: 'role',
          value: initialRole,
        });
      }

      return filters;
    }
  );

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const [rowSelection, setRowSelection] = React.useState({});

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: parseSearchToInt(toArray(search.page)[0]) ?? 0,
    pageSize: parseSearchToInt(toArray(search.pageSize)[0]) ?? 10,
  });

  const navigateWithSearch = React.useCallback(
    (nextSearch: Partial<typeof search>) => {
      navigate.to('users.index', {
        search: {
          ...search,
          ...nextSearch,
        },
        preventScrollReset: true,
      });
    },
    [navigate, search]
  );

  const handleOnPaginationChange: OnChangeFn<PaginationState> =
    React.useCallback(
      (updater) => {
        setPagination((currentPagination) => {
          const nextPagination =
            typeof updater === 'function'
              ? updater(currentPagination)
              : updater;

          navigateWithSearch({
            page: nextPagination.pageIndex.toString(),
            pageSize: nextPagination.pageSize.toString(),
          });

          return nextPagination;
        });
      },
      [navigateWithSearch]
    );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    enableRowSelection: true,

    /**
     * Important:
     * React Table resets the page index when filters change by default.
     * That triggers onPaginationChange and can overwrite freshly updated
     * search params like role/status/q.
     */
    autoResetPageIndex: false,

    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handleOnPaginationChange,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const resetPagination = React.useCallback(() => {
    setPagination((currentPagination) => ({
      ...currentPagination,
      pageIndex: 0,
    }));
  }, []);

  const handleOnStatusChange = React.useCallback(
    (status: string) => {
      table
        .getColumn('status')
        ?.setFilterValue(status === 'all' ? undefined : status);

      resetPagination();

      navigateWithSearch({
        status,
        page: '0',
      });
    },
    [table, resetPagination, navigateWithSearch]
  );

  const handleOnRoleChange = React.useCallback(
    (role: string) => {
      table
        .getColumn('role')
        ?.setFilterValue(role === 'all' ? undefined : role);

      resetPagination();

      navigateWithSearch({
        role,
        page: '0',
      });
    },
    [table, resetPagination, navigateWithSearch]
  );

  const throttledSearchChange = React.useMemo(
    () =>
      throttle(150, (value: string) => {
        table.getColumn('user')?.setFilterValue(value || undefined);

        resetPagination();

        navigateWithSearch({
          q: value,
          page: '0',
        });
      }),
    [table, resetPagination, navigateWithSearch]
  );

  React.useEffect(() => {
    return () => {
      throttledSearchChange.cancel({ upcomingOnly: true });
    };
  }, [throttledSearchChange]);

  const handleSearchChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      throttledSearchChange(event.target.value);
    },
    [throttledSearchChange]
  );
  const selectedRows = table.getFilteredSelectedRowModel().rows.length;
  const filteredRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={(table.getColumn('user')?.getFilterValue() as string) ?? ''}
            onChange={handleSearchChange}
            placeholder="Search users or emails..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={
              (table.getColumn('status')?.getFilterValue() as string) ?? 'all'
            }
            onValueChange={handleOnStatusChange}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={
              (table.getColumn('role')?.getFilterValue() as string) ?? 'all'
            }
            onValueChange={handleOnRoleChange}
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="Owner">Owner</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Editor">Editor</SelectItem>
              <SelectItem value="Reviewer">Reviewer</SelectItem>
              <SelectItem value="Viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Columns3 className="mr-2 size-4" />
                Columns
                <ChevronDown className="ml-2 size-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    className="capitalize"
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button>
            <CirclePlus className="mr-2 size-4" />
            Add User
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-11">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="h-14"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
        <div>
          {selectedRows} of {filteredRows} row(s) selected.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>

            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger id="rows-per-page" className="h-9 w-[76px]">
                <SelectValue />
              </SelectTrigger>

              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="font-medium text-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="hidden size-9 lg:inline-flex"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
            >
              <ChevronsLeft className="size-4" />
              <span className="sr-only">First page</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="size-9"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous page</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="size-9"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next page</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="hidden size-9 lg:inline-flex"
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            >
              <ChevronsRight className="size-4" />
              <span className="sr-only">Last page</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
