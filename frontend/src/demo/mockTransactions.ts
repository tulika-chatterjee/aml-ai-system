export type DemoTransaction = {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  country: string;
  timestamp: string;
};

/** Demo ingestion-style rows when no `/api/transactions` exists yet. */
export const MOCK_TRANSACTIONS: DemoTransaction[] = [
  { id: "1", sender: "ACC-1001", receiver: "ACC-2044", amount: 2000, country: "AU", timestamp: "2026-04-21T08:12:00Z" },
  { id: "2", sender: "ACC-5510", receiver: "ACC-8891", amount: 15000, country: "HighRisk", timestamp: "2026-04-22T14:33:00Z" },
  { id: "3", sender: "ACC-2044", receiver: "ACC-9102", amount: 780, country: "AU", timestamp: "2026-04-22T16:01:00Z" },
  { id: "4", sender: "ACC-3312", receiver: "ACC-7711", amount: 42000, country: "SG", timestamp: "2026-04-23T09:45:00Z" },
  { id: "5", sender: "ACC-8891", receiver: "ACC-OFF1", amount: 9850, country: "KY", timestamp: "2026-04-23T11:20:00Z" },
  { id: "6", sender: "ACC-1001", receiver: "ACC-5510", amount: 950, country: "AU", timestamp: "2026-04-24T07:55:00Z" },
  { id: "7", sender: "ACC-7711", receiver: "ACC-OFF1", amount: 31000, country: "KY", timestamp: "2026-04-24T13:10:00Z" },
  { id: "8", sender: "ACC-9102", receiver: "ACC-3312", amount: 640, country: "NZ", timestamp: "2026-04-25T10:22:00Z" },
];
