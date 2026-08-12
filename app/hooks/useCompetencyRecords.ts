"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ApiErrorResponse,
  CompetencyRecord,
  CompetencyUpdateResponse,
  RecordsApiResponse,
} from "@/app/lib/types";
import type { SaveState } from "@/app/lib/status";

type StringMap = Record<string, string>;
type SaveStateMap = Record<string, SaveState>;

function isSuccessfulList(value: unknown): value is RecordsApiResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as RecordsApiResponse).ok === true &&
      Array.isArray((value as RecordsApiResponse).records),
  );
}

function isSuccessfulUpdate(value: unknown): value is CompetencyUpdateResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as CompetencyUpdateResponse).ok === true &&
      (value as CompetencyUpdateResponse).record,
  );
}

function readError(value: unknown, fallback: string) {
  if (value && typeof value === "object") {
    const message = (value as ApiErrorResponse).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function useCompetencyRecords() {
  const [records, setRecords] = useState<CompetencyRecord[]>([]);
  const [drafts, setDrafts] = useState<StringMap>({});
  const [saveStates, setSaveStates] = useState<SaveStateMap>({});
  const [feedback, setFeedback] = useState<StringMap>({});
  const [lastSyncAt, setLastSyncAt] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const recordsRef = useRef(records);
  const draftsRef = useRef(drafts);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setIsSyncing(true);
    setLoadError(undefined);

    try {
      const response = await fetch("/api/records", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload: unknown = await response.json();

      if (!response.ok || !isSuccessfulList(payload)) {
        throw new Error(
          readError(payload, "Não foi possível carregar os dados da planilha."),
        );
      }

      const previousById = new Map(
        recordsRef.current.map((record) => [record.id, record]),
      );
      setDrafts((currentDrafts) =>
        Object.fromEntries(
          payload.records.map((record) => {
            const previous = previousById.get(record.id);
            const currentDraft = currentDrafts[record.id];
            const hasLocalChange =
              previous !== undefined &&
              currentDraft !== undefined &&
              currentDraft !== previous.newCompetence;
            return [
              record.id,
              hasLocalChange ? currentDraft : record.newCompetence,
            ];
          }),
        ),
      );
      setRecords(payload.records);
      setLastSyncAt(payload.generatedAt);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados da planilha.",
      );
    } finally {
      refreshInFlightRef.current = false;
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(initialLoad);
    };
  }, [refresh]);

  const updateDraft = useCallback((recordId: string, value: string) => {
    setDrafts((current) => ({ ...current, [recordId]: value }));
    setSaveStates((current) => ({ ...current, [recordId]: "idle" }));
    setFeedback((current) => {
      const next = { ...current };
      delete next[recordId];
      return next;
    });
  }, []);

  const markPreviousCopied = useCallback((recordId: string) => {
    setFeedback((current) => ({
      ...current,
      [recordId]: "Texto de 2024 copiado.",
    }));
  }, []);

  const saveRecord = useCallback(async (recordId: string) => {
    const record = recordsRef.current.find((item) => item.id === recordId);
    if (!record) return;

    const draft = draftsRef.current[recordId] ?? record.newCompetence;
    if (draft === record.newCompetence) return;

    setSaveStates((current) => ({ ...current, [recordId]: "saving" }));
    setFeedback((current) => ({ ...current, [recordId]: "Salvando na planilha…" }));

    try {
      const response = await fetch("/api/records", {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          directorate: record.directorate,
          rowNumber: record.rowNumber,
          competence: draft,
          expectedCompetence: record.newCompetence,
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok || !isSuccessfulUpdate(payload)) {
        const state: SaveState = response.status === 409 ? "conflict" : "error";
        setSaveStates((current) => ({ ...current, [recordId]: state }));
        setFeedback((current) => ({
          ...current,
          [recordId]: readError(payload, "Não foi possível salvar a alteração."),
        }));
        return;
      }

      setRecords((current) =>
        current.map((item) => (item.id === recordId ? payload.record : item)),
      );
      setDrafts((current) => ({
        ...current,
        [recordId]: payload.record.newCompetence,
      }));
      setSaveStates((current) => ({ ...current, [recordId]: "saved" }));
      setFeedback((current) => ({
        ...current,
        [recordId]: "Alteração salva na planilha.",
      }));
      setLastSyncAt(payload.updatedAt);
    } catch {
      setSaveStates((current) => ({ ...current, [recordId]: "error" }));
      setFeedback((current) => ({
        ...current,
        [recordId]: "A conexão falhou. Tente salvar novamente.",
      }));
    }
  }, []);

  return {
    records,
    drafts,
    saveStates,
    feedback,
    lastSyncAt,
    isLoading,
    isSyncing,
    loadError,
    refresh,
    updateDraft,
    markPreviousCopied,
    saveRecord,
  };
}
