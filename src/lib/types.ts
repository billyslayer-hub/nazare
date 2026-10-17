import type { Scenario } from "./finance";
import type { Asset, FinancialAssumptions, Profile, ResearchResult, RoadmapStage, SectionData, SectionKey, StudioRequest } from "./schemas";

export type Mode = "ai" | "demo";

export type SectionVersion<K extends SectionKey = SectionKey> = {
  id: string;
  data: SectionData[K];
  createdAt: string;
  source: "ai" | "demo" | "edit" | "restore";
  note?: string;
};

export type SectionState<K extends SectionKey = SectionKey> = {
  versions: SectionVersion<K>[]; // newest first
  currentId: string;
};

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type Priority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description: string;
  stage: RoadmapStage;
  priority: Priority;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
  dependsOn: string[]; // task ids
  blocker: string;
  origin: "ai" | "user";
  createdAt: string;
};

export type FinanceState = {
  /** The working assumptions shown and edited in the financial workspace. */
  assumptions: FinancialAssumptions;
  /** Latest assumptions proposed by the Financial Plan section. */
  proposed: FinancialAssumptions;
  basis: Mode | "manual";
  edited: boolean;
  /** True when the plan proposed new assumptions after the founder edited the model. */
  proposalPending?: boolean;
  scenarios: Scenario[];
  bufferMonths: number;
};

export type SavedAsset = {
  id: string;
  createdAt: string;
  request: StudioRequest;
  data: Asset;
  mode: Mode;
};

export type ManualFinding = {
  id: string;
  finding: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceDate: string;
  whyItMatters: string;
  confidence: "low" | "medium" | "high";
  createdAt: string;
};

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string };

export type Project = {
  id: string;
  version: 1;
  createdAt: string;
  updatedAt: string;
  profile: Profile;
  sections: { [K in SectionKey]?: SectionState<K> };
  tasks: Task[];
  finance?: FinanceState;
  assets: SavedAsset[];
  research: { runs: (ResearchResult & { id: string })[]; manual: ManualFinding[] };
  advisor: ChatMessage[];
  checklist: Record<string, boolean>;
};
