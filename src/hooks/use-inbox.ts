"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import axios, { isAxiosError } from "axios";
import type {
  ApiErrorBody,
  GmailErrorCode,
  InboxPage,
} from "@/lib/gmail/types";

export class InboxRequestError extends Error {
  constructor(
    public readonly code: GmailErrorCode | "NETWORK",
    message: string,
  ) {
    super(message);
  }
}

async function fetchInbox(
  pageToken: string | undefined,
  q: string,
  endpoint: string,
): Promise<InboxPage> {
  try {
    const { data } = await axios.get<InboxPage>(endpoint, {
      params: { pageToken, q: q || undefined },
    });
    return data;
  } catch (err) {
    if (isAxiosError<ApiErrorBody>(err) && err.response?.data?.code) {
      throw new InboxRequestError(
        err.response.data.code,
        err.response.data.message,
      );
    }
    throw new InboxRequestError(
      "NETWORK",
      "Network error. Check your connection.",
    );
  }
}

export function useInbox(query: string, endpoint = "/api/gmail/messages") {
  return useInfiniteQuery({
    queryKey: ["gmail", "inbox", endpoint, query],
    queryFn: ({ pageParam }) => fetchInbox(pageParam, query, endpoint),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
  });
}
