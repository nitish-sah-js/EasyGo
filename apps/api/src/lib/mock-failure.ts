import { env } from "../config/env";

export function throwIfMockProviderDisabled(providerName: string): void {
  const failures = env.MOCK_FAIL_PROVIDERS?.split(",").map((value) => value.trim().toUpperCase()) ?? [];
  if (failures.includes(providerName.toUpperCase())) {
    throw new Error(`${providerName} is disabled by MOCK_FAIL_PROVIDERS`);
  }
}
