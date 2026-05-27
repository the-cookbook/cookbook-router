import { Link } from '@cookbook/router-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { usernameToSlug } from '../../users/details/components/utils';

import type { ReviewerWorkload } from './utils/reports';
import { getProgressPercentage } from './utils/reports';

interface ReviewerWorkloadCardProps {
  reviewers: ReviewerWorkload[];
}

export function ReviewerWorkloadCard({ reviewers }: ReviewerWorkloadCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviewer Workload</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-4">
        {reviewers.map((reviewer) => {
          const percentage = getProgressPercentage(
            reviewer.completed,
            reviewer.assigned
          );

          return (
            <div key={reviewer.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link
                    to="users.details"
                    params={{ slug: usernameToSlug(reviewer.username) }}
                    className="font-medium hover:underline"
                  >
                    {reviewer.reviewer}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    @{reviewer.username}
                  </p>
                </div>

                {reviewer.overdue ? (
                  <Badge variant="destructive">
                    {reviewer.overdue} overdue
                  </Badge>
                ) : (
                  <Badge variant="secondary">On track</Badge>
                )}
              </div>

              <div className="mt-4 grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span>
                    {reviewer.completed}/{reviewer.assigned}
                  </span>
                </div>

                <Progress value={percentage} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="font-medium">{reviewer.assigned}</p>
                  <p className="text-muted-foreground">Assigned</p>
                </div>
                <div>
                  <p className="font-medium">{reviewer.completed}</p>
                  <p className="text-muted-foreground">Done</p>
                </div>
                <div>
                  <p className="font-medium">{reviewer.inProcess}</p>
                  <p className="text-muted-foreground">In process</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
