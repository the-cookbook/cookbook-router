import { CheckCircle2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { PermissionItem } from './utils';

interface UserPermissionsCardProps {
  permissions: PermissionItem[];
}

export function UserPermissionsCard({ permissions }: UserPermissionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-4">
        {permissions.map((permission) => (
          <div
            key={permission.id}
            className="flex items-start justify-between gap-4 rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">{permission.label}</p>
              <p className="text-sm text-muted-foreground">
                {permission.description}
              </p>
            </div>

            {permission.enabled ? (
              <Badge variant="outline" className="gap-1.5">
                <CheckCircle2 className="size-3.5 fill-emerald-500 text-emerald-500" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
