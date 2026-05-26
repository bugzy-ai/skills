/**
 * Zephyr Scale Cloud REST API v2 types
 */

export interface ZephyrTestStepInput {
  description: string;
  testData?: string;
  expectedResult?: string;
}

export interface ZephyrTestStep {
  inline?: {
    description?: string;
    testData?: string;
    expectedResult?: string;
  };
}

/** Reference object returned by Zephyr GET (contains id + self URL) */
export interface ZephyrRef {
  id: number;
  self?: string;
  name?: string;
}

export interface ZephyrTestCase {
  id: number;
  key: string;
  name: string;
  project: ZephyrRef & { key?: string };
  folder?: ZephyrRef | null;
  status?: ZephyrRef | null;
  priority?: ZephyrRef | null;
  objective?: string | null;
  precondition?: string | null;
  createdOn?: string;
  updatedOn?: string;
}

export interface ZephyrFolder {
  id: number;
  name: string;
  folderType: 'TEST_CASE' | 'TEST_CYCLE' | 'TEST_PLAN';
  parentId?: number | null;
}

export interface ZephyrListResponse<T> {
  values: T[];
  total: number;
  startAt: number;
  maxResults: number;
  isLast: boolean;
}

export type ZephyrTestStepsResponse = ZephyrListResponse<ZephyrTestStep>;
