import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface TermsSection {
  title: string;
  content: string[];
}

const termsSections: TermsSection[] = [
  {
    title: '1. Acceptance of Terms',
    content: [
      'By accessing or using Cookbook Router, you agree to be bound by these Terms of Service.',
      'If you do not agree with these terms, you should not use the project, documentation, examples, or related services.',
    ],
  },
  {
    title: '2. Development Status',
    content: [
      'Cookbook Router is currently under active development.',
      'APIs, generated contracts, route manifests, documentation, and examples may change without notice before a stable release.',
      'You are responsible for reviewing changes before using new versions in your own projects.',
    ],
  },
  {
    title: '3. Permitted Use',
    content: [
      'You may use Cookbook Router for evaluation, experimentation, development, and educational purposes.',
      'You agree not to misuse the project, attempt to disrupt related services, or represent unofficial versions as official releases.',
    ],
  },
  {
    title: '4. No Production Warranty',
    content: [
      'Cookbook Router is provided as-is and without warranties of any kind.',
      'The maintainers do not guarantee that the project is stable, secure, error-free, or suitable for production use.',
    ],
  },
  {
    title: '5. Breaking Changes',
    content: [
      'Breaking changes may be introduced at any time while the project is in active development.',
      'Generated files, route behavior, CLI output, package structure, and public APIs may change between versions.',
    ],
  },
  {
    title: '6. Limitation of Liability',
    content: [
      'The maintainers are not liable for damages, data loss, downtime, security issues, or other consequences resulting from your use of Cookbook Router.',
      'You use the project at your own risk.',
    ],
  },
  {
    title: '7. Documentation and Examples',
    content: [
      'Documentation and examples are provided for reference only.',
      'They may be incomplete, outdated, or changed as the project evolves.',
    ],
  },
  {
    title: '8. Changes to These Terms',
    content: [
      'These terms may be updated from time to time.',
      'Continued use of Cookbook Router after changes are published means you accept the updated terms.',
    ],
  },
];

export function TermsOfServicePage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 space-y-4">
        <Badge variant="secondary">Fake legal page</Badge>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Terms of Service
          </h1>

          <p className="text-muted-foreground">
            These sample terms are placeholder content for Cookbook Router and
            should not be treated as legal advice.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cookbook Router Terms</CardTitle>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Disclaimer:</strong> This is
            fake Terms of Service content intended for demos, prototypes, and
            documentation examples only.
          </div>

          {termsSections.map((section, index) => (
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
