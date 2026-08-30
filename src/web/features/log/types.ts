export type LogEntry = {
  slug: string;
  date: string;
  title: string;
  summary: string;
  tags: string[];
  decisions: string[];
  milestones: string[];
  validation: string[];
  commit?: string;
  pullRequest?: string;
  visibility: "public" | "private";
};
