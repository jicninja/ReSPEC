export interface IngestorResult {
  files: number;
  artifacts: string[];
}

export interface Ingestor {
  name: string;
  ingest(): Promise<IngestorResult>;
}
