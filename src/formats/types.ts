export interface FormatAdapter {
  name: string;
  package(specsDir: string, outputDir: string, context: FormatContext): Promise<void>;
}

export interface FormatContext {
  projectName: string;
  projectDescription: string;
  sddContent: string;
  analyzedDir: string;
}
