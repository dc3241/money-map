import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, moneyCoachChat } from '../config/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useBudgetStore } from '../store/useBudgetStore';
import {
  buildMoneyMapContextSnapshot,
  type BuildSnapshotStoreSlice,
  type MoneyMapContextSnapshot,
} from '../assistant/moneyMapSnapshot';
import { MONEY_COACH_PRIMARY_THREAD_ID } from '../context/MoneyCoachContext';
import type { MoneyCoachPlaidOverlay } from '../context/MoneyCoachContext';
import { plaidOverlayMatchesReference } from '../context/MoneyCoachContext';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
};

const MAX_TRANSCRIPT = 20;
const MAX_USER_CHARS = 6000;

function sliceTranscript(msgs: ChatMessage[]): { role: 'user' | 'assistant'; content: string }[] {
  const core = msgs
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content.length > 0);
  return core.slice(-MAX_TRANSCRIPT);
}

export function useAssistantChat(options: {
  referenceDate: Date;
  dashboardPlaidOverlay: MoneyCoachPlaidOverlay | null;
  usePlaidLinkedActuals: boolean;
}) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadRef = useMemo(() => {
    if (!user?.uid) return null;
    return doc(db, 'users', user.uid, 'assistantThreads', MONEY_COACH_PRIMARY_THREAD_ID);
  }, [user?.uid]);

  const messagesCol = useMemo(() => {
    if (!user?.uid) return null;
    return collection(db, 'users', user.uid, 'assistantThreads', MONEY_COACH_PRIMARY_THREAD_ID, 'messages');
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !messagesCol) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingHistory(true);
      setError(null);
      try {
        const q = query(messagesCol, orderBy('createdAt', 'asc'), limit(80));
        const snap = await getDocs(q);
        if (cancelled) return;
        const loaded: ChatMessage[] = [];
        snap.forEach((d) => {
          const data = d.data() as { role?: string; content?: string; createdAt?: { toDate?: () => Date } };
          const role = data.role === 'assistant' ? 'assistant' : 'user';
          const content = typeof data.content === 'string' ? data.content : '';
          if (!content) return;
          loaded.push({
            id: d.id,
            role,
            content,
            createdAt: data.createdAt?.toDate?.(),
          });
        });
        setMessages(loaded);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Could not load previous messages.');
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, messagesCol]);

  const buildSnapshot = useCallback((): MoneyMapContextSnapshot => {
    const store = useBudgetStore.getState() as unknown as BuildSnapshotStoreSlice;
    const overlay = plaidOverlayMatchesReference(options.dashboardPlaidOverlay, options.referenceDate)
      ? options.dashboardPlaidOverlay
      : null;
    return buildMoneyMapContextSnapshot(store, options.referenceDate, {
      usePlaidLinkedActuals: options.usePlaidLinkedActuals,
      plaidOverlay: overlay,
    });
  }, [options.dashboardPlaidOverlay, options.referenceDate, options.usePlaidLinkedActuals]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || !user?.uid || !threadRef || !messagesCol) return;
      if (text.length > MAX_USER_CHARS) {
        setError('Message is too long.');
        return;
      }

      setError(null);
      setLoading(true);

      const snapshot = buildSnapshot();
      const userMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        await setDoc(threadRef, { updatedAt: serverTimestamp() }, { merge: true });
        const userDocRef = await addDoc(messagesCol, {
          role: 'user',
          content: text,
          createdAt: serverTimestamp(),
        });

        const transcript = sliceTranscript([...messages, userMsg]);

        const result = await moneyCoachChat({
          snapshot,
          messages: transcript,
        });

        const reply =
          result.data && typeof (result.data as { reply?: string }).reply === 'string'
            ? (result.data as { reply: string }).reply
            : '';

        if (!reply.trim()) {
          throw new Error('empty_reply');
        }

        const assistantRef = await addDoc(messagesCol, {
          role: 'assistant',
          content: reply.trim(),
          createdAt: serverTimestamp(),
        });

        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== userMsg.id);
          return [
            ...withoutTemp,
            { id: userDocRef.id, role: 'user', content: text, createdAt: new Date() },
            { id: assistantRef.id, role: 'assistant', content: reply.trim(), createdAt: new Date() },
          ];
        });
      } catch (e: unknown) {
        console.error(e);
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        const code =
          e && typeof e === 'object' && 'code' in e
            ? String((e as { code?: string }).code)
            : '';
        const msg =
          e && typeof e === 'object' && 'message' in e
            ? String((e as { message?: string }).message)
            : '';
        if (code === 'functions/resource-exhausted') {
          setError('Too many requests. Try again in a little while.');
        } else {
          setError(msg || 'Something went wrong. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    [user?.uid, threadRef, messagesCol, messages, buildSnapshot]
  );

  return {
    messages,
    loading,
    loadingHistory,
    error,
    setError,
    sendMessage,
    buildSnapshot,
  };
}
