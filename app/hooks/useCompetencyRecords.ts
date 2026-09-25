"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ApiErrorResponse,
  CompetencyField,
  CompetencyRecord,
  CompetencyUpdateResponse,
  RecordsApiResponse,
} from "@/app/lib/types";
import type { SaveState } from "@/app/lib/status";

type StringMap = Record<string, string>;
type SaveStateMap = Record<string, SaveState>;

/** Rascunhos, estados e mensagens são separados por registro e por coluna. */
export function draftKey(recordId: string, field: CompetencyField) {
  return `${recordId}::${field}`;
}

function savedValue(record: CompetencyRecord, field: CompetencyField) {
  return record[field] ?? "";
}

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
      const fields: CompetencyField[] = ["newCompetence", "reviewedCompetence"];
      setDrafts((currentDrafts) =>
        Object.fromEntries(
          payload.records.flatMap((record) =>
            fields.map((field) => {
              const key = draftKey(record.id, field);
              const previous = previousById.get(record.id);
              const currentDraft = currentDrafts[key];
              const hasLocalChange =
                previous !== undefined &&
                currentDraft !== undefined &&
                currentDraft !== savedValue(previous, field);
              return [
                key,
                hasLocalChange ? currentDraft : savedValue(record, field),
              ];
            }),
          ),
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

  const updateDraft = useCallback(
    (recordId: string, field: CompetencyField, value: string) => {
      const key = draftKey(recordId, field);
      setDrafts((current) => ({ ...current, [key]: value }));
      setSaveStates((current) => ({ ...current, [key]: "idle" }));
      setFeedback((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const markTextCopied = useCallback(
    (recordId: string, field: CompetencyField, message: string) => {
      setFeedback((current) => ({
        ...current,
        [draftKey(recordId, field)]: message,
      }));
    },
    [],
  );

  const saveRecord = useCallback(
    async (recordId: string, field: CompetencyField) => {
      const record = recordsRef.current.find((item) => item.id === recordId);
      if (!record) return;

      const key = draftKey(recordId, field);
      const saved = savedValue(record, field);
      const draft = draftsRef.current[key] ?? saved;
      if (draft === saved) return;

      setSaveStates((current) => ({ ...current, [key]: "saving" }));
      setFeedback((current) => ({ ...current, [key]: "Salvando na planilha…" }));

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
            field,
            competence: draft,
            expectedCompetence: saved,
          }),
        });
        const payload: unknown = await response.json();

        if (!response.ok || !isSuccessfulUpdate(payload)) {
          const state: SaveState = response.status === 409 ? "conflict" : "error";
          setSaveStates((current) => ({ ...current, [key]: state }));
          setFeedback((current) => ({
            ...current,
            [key]: readError(payload, "Não foi possível salvar a alteração."),
          }));
          return;
        }

        setRecords((current) =>
          current.map((item) => (item.id === recordId ? payload.record : item)),
        );
        setDrafts((current) => ({
          ...current,
          [key]: savedValue(payload.record, field),
        }));
        setSaveStates((current) => ({ ...current, [key]: "saved" }));
        setFeedback((current) => ({
          ...current,
          [key]: "Alteração salva na planilha.",
        }));
        setLastSyncAt(payload.updatedAt);
      } catch {
        setSaveStates((current) => ({ ...current, [key]: "error" }));
        setFeedback((current) => ({
          ...current,
          [key]: "A conexão falhou. Tente salvar novamente.",
        }));
      }
    },
    [],
  );

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
    markTextCopied,
    saveRecord,
  };
}
