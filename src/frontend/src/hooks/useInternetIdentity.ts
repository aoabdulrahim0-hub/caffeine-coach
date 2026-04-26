import {
  type InternetIdentityContext,
  useInternetIdentity as useCoreInternetIdentity,
} from "@caffeineai/core-infrastructure";

export function useInternetIdentity(): InternetIdentityContext {
  return useCoreInternetIdentity();
}
