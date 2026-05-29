'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface SectionTypeOption {
  value: string;
  label: string;
}

interface ReviewerOption {
  value: string;
  label: string;
}

interface StatusOption {
  value: 'done' | 'in-process';
  label: string;
}

interface MockSection {
  id: string;
  header: string;
  sectionType: string;
  status: 'done' | 'in-process';
  target: number;
  limit: number;
  reviewer: string;
}

const sectionTypes: SectionTypeOption[] = [
  {
    value: 'cover-page',
    label: 'Cover page',
  },
  {
    value: 'table-of-contents',
    label: 'Table of contents',
  },
  {
    value: 'narrative',
    label: 'Narrative',
  },
  {
    value: 'technical-content',
    label: 'Technical content',
  },
];

const statusOptions: StatusOption[] = [
  {
    value: 'in-process',
    label: 'In Process',
  },
  {
    value: 'done',
    label: 'Done',
  },
];

const reviewerOptions: ReviewerOption[] = [
  {
    value: 'eddie-lake',
    label: 'Eddie Lake',
  },
  {
    value: 'jamik-tashpulatov',
    label: 'Jamik Tashpulatov',
  },
  {
    value: 'unassigned',
    label: 'Assign reviewer',
  },
];

const mockSections: MockSection[] = [
  {
    id: 'section-1',
    header: 'Cover page',
    sectionType: 'Cover page',
    status: 'in-process',
    target: 18,
    limit: 5,
    reviewer: 'Eddie Lake',
  },
  {
    id: 'section-2',
    header: 'Table of contents',
    sectionType: 'Table of contents',
    status: 'done',
    target: 29,
    limit: 24,
    reviewer: 'Eddie Lake',
  },
  {
    id: 'section-3',
    header: 'Executive summary',
    sectionType: 'Narrative',
    status: 'done',
    target: 10,
    limit: 13,
    reviewer: 'Eddie Lake',
  },
];

function StatusBadge({ status }: { status: MockSection['status'] }) {
  if (status === 'done') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <span className="size-2 rounded-full bg-emerald-500" />
        Done
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5">
      <span className="size-2 rounded-full border border-muted-foreground" />
      In Process
    </Badge>
  );
}

export function CreateContent() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="header">Header</Label>
          <Input
            id="header"
            placeholder="Example: Executive summary"
            defaultValue="Innovation and Advantages"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="section-type">Section type</Label>
          <Select defaultValue="narrative">
            <SelectTrigger id="section-type">
              <SelectValue placeholder="Select section type" />
            </SelectTrigger>
            <SelectContent>
              {sectionTypes.map((sectionType) => (
                <SelectItem key={sectionType.value} value={sectionType.value}>
                  {sectionType.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select defaultValue="in-process">
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="target">Target</Label>
          <Input
            id="target"
            type="number"
            min={0}
            defaultValue={25}
            placeholder="25"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="limit">Limit</Label>
          <Input
            id="limit"
            type="number"
            min={0}
            defaultValue={26}
            placeholder="26"
          />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="reviewer">Reviewer</Label>
          <Select defaultValue="jamik-tashpulatov">
            <SelectTrigger id="reviewer">
              <SelectValue placeholder="Assign reviewer" />
            </SelectTrigger>
            <SelectContent>
              {reviewerOptions.map((reviewer) => (
                <SelectItem key={reviewer.value} value={reviewer.value}>
                  {reviewer.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Add internal notes for this section..."
            defaultValue="Focus on concise positioning, measurable advantages, and reviewer-ready structure."
          />
        </div>
      </div>

      <Separator />

      <div className="grid gap-3">
        <div>
          <h3 className="text-sm font-medium">Preview</h3>
          <p className="text-sm text-muted-foreground">
            Recently created mock sections matching the outline table.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.5fr_0.5fr_1fr] bg-muted px-4 py-3 text-sm font-medium">
            <span>Header</span>
            <span>Section Type</span>
            <span>Status</span>
            <span>Target</span>
            <span>Limit</span>
            <span>Reviewer</span>
          </div>

          {mockSections.map((section) => (
            <div
              key={section.id}
              className="grid grid-cols-[1.5fr_1fr_0.8fr_0.5fr_0.5fr_1fr] items-center border-t px-4 py-3 text-sm"
            >
              <span className="font-medium">{section.header}</span>
              <span>
                <Badge variant="secondary">{section.sectionType}</Badge>
              </span>
              <span>
                <StatusBadge status={section.status} />
              </span>
              <span>{section.target}</span>
              <span>{section.limit}</span>
              <span>{section.reviewer}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
