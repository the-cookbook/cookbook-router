import React from 'react';
import { useNavigate, useSearchParams } from '@cookbook/router-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';

import { CreateContent } from '../create/create-content';

import { ChartAreaInteractive } from './components/chart-area-interactive';
import { DataTable } from './components/data-table';
import { SectionCards } from './components/section-cards';
import data from './data.json';

export function OverviewLayoutHeader() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Overview</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function OverviewCreateModal() {
  const navigate = useNavigate();

  const handleOnClose = React.useCallback(() => {
    navigate.back();
  }, [navigate]);

  return (
    <Dialog onOpenChange={handleOnClose} open>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add section</DialogTitle>
          <DialogDescription>
            Create a new outline section with ownership, status, target, and
            limit details.
          </DialogDescription>
        </DialogHeader>

        <CreateContent />
        <DialogFooter>
          <Button variant="outline" onClick={handleOnClose}>
            Cancel
          </Button>
          <Button>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OverviewPage() {
  const searchParams = useSearchParams('overview');

  return (
    <div className="flex flex-1 animate-in flex-col duration-500 fade-in slide-in-from-bottom-2">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive timeRange={searchParams.visitors} />
          </div>
          <DataTable data={data} />
        </div>
      </div>
    </div>
  );
}
