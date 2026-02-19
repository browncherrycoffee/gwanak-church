interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="border-b bg-muted/30 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {description && (
          <p className="mt-3 text-lg text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
