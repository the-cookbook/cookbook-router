import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PrivacySection {
  title: string;
  content: string[];
}

const privacySections: PrivacySection[] = [
  {
    title: '1. Overview',
    content: [
      'This Privacy Policy explains how Cookbook Router may collect, use, and handle information in demo, documentation, and example environments.',
      'This page is placeholder content and does not describe a real production data-processing policy.',
    ],
  },
  {
    title: '2. Information We Collect',
    content: [
      'Cookbook Router itself does not require personal information to use the routing library.',
      'Example applications may include placeholder forms, demo routes, or mock user flows that appear to collect information, but they are intended for demonstration purposes only.',
      'If analytics, hosting logs, or third-party services are added later, they may collect technical information such as browser type, device information, IP address, pages visited, and timestamps.',
    ],
  },
  {
    title: '3. How Information Is Used',
    content: [
      'Information in demo environments may be used to show routing behavior, form handling, redirects, layouts, and SSR examples.',
      'Technical information may be used to debug issues, improve documentation, understand usage patterns, and maintain the project.',
    ],
  },
  {
    title: '4. Cookies and Local Storage',
    content: [
      'Cookbook Router examples may use cookies, local storage, or session storage to demonstrate routing, authentication flows, preferences, or state persistence.',
      'Any such storage in examples should be treated as demo-only unless clearly documented otherwise.',
    ],
  },
  {
    title: '5. Third-Party Services',
    content: [
      'The project may link to third-party services such as GitHub, package registries, hosting providers, documentation platforms, or analytics tools.',
      'Those services are governed by their own privacy policies, and Cookbook Router is not responsible for their practices.',
    ],
  },
  {
    title: '6. Data Sharing',
    content: [
      'Cookbook Router does not sell personal information.',
      'Demo data may be visible in browser tools, logs, mock APIs, or example code depending on how the example application is configured.',
      'Do not enter sensitive or real personal information into demo forms or example routes.',
    ],
  },
  {
    title: '7. Data Retention',
    content: [
      'Demo data may be temporary, reset frequently, or not stored at all.',
      'If hosting, analytics, or logging services are used, retention periods depend on those service providers and their configuration.',
    ],
  },
  {
    title: '8. Security',
    content: [
      'Reasonable care should be taken when building applications with Cookbook Router, but the project is currently under active development.',
      'No demo, example, or placeholder implementation should be treated as production-ready security guidance.',
    ],
  },
  {
    title: '9. Children’s Privacy',
    content: [
      'Cookbook Router is a developer tool and is not intended for use by children.',
      'The project does not knowingly collect personal information from children.',
    ],
  },
  {
    title: '10. Changes to This Policy',
    content: [
      'This Privacy Policy may be updated as the project evolves.',
      'Changes may be made without notice while the project is under active development.',
    ],
  },
  {
    title: '11. Contact',
    content: [
      'For questions about this placeholder Privacy Policy, open an issue in the project repository or contact the maintainers through the documented project channels.',
    ],
  },
];

export function PrivacyPolicyPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 space-y-4">
        <Badge variant="secondary">Fake legal page</Badge>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>

          <p className="text-muted-foreground">
            This sample privacy policy is placeholder content for Cookbook
            Router and should not be treated as legal advice.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cookbook Router Privacy Policy</CardTitle>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Disclaimer:</strong> This is
            fake Privacy Policy content intended for demos, prototypes, and
            documentation examples only.
          </div>

          {privacySections.map((section, index) => (
            <section key={section.title} className="space-y-3">
              {!!index && <Separator className="mb-6" />}

              <h2 className="text-xl font-semibold tracking-tight">
                {section.title}
              </h2>

              <div className="space-y-3 text-muted-foreground">
                {section.content.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
