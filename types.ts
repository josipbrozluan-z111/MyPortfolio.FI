
export interface PortfolioEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  name: string;
  createdAt: string;
  entries: PortfolioEntry[];
}

export interface PortfolioData {
  topics: Topic[];
}
