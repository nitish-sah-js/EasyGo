import type { TransportMode, TransportOption, TransportSearchRequest } from "@nexttour/shared";

export interface TransportProvider {
  readonly name: string;
  readonly mode: TransportMode;
  search(request: TransportSearchRequest): Promise<TransportOption[]>;
}
