"use client";

import { RotateCcw } from "lucide-react";
import { AdvisorChat } from "@/components/advisor";
import { PageHeader, useWorkspace } from "@/components/workspace";
import { Button, Card } from "@/components/ui";
import { businessName } from "@/lib/project";
import { updateProject } from "@/lib/store";

export default function AdvisorPage() {
  const { project } = useWorkspace();
  return (
    <div>
      <PageHeader
        eyebrow="Business Advisor"
        title={`Ask anything about ${businessName(project)}`}
        description="Your advisor knows your plan, your numbers and your tasks. Ask what to do next, how to find customers, or what a business word means."
        actions={project.advisor.length > 0 && <Button variant="secondary" onClick={() => updateProject(project.id, (p) => ({ ...p, advisor: [] }))}><RotateCcw className="size-4" />New conversation</Button>}
      />
      <Card className="flex h-[calc(100vh-15rem)] min-h-[480px] flex-col p-4 sm:p-6">
        <AdvisorChat page className="flex-1" />
      </Card>
    </div>
  );
}
