import { useState, useEffect } from 'react';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { StapleItem } from '../types/domain';

type UseStaplesResult = {
  readonly staples: StapleItem[];
  readonly loading: boolean;
};

const parseStaplesFromSnapshot = (snapshot: { exists: () => boolean; data: () => any }): StapleItem[] => {
  if (!snapshot.exists()) return [];
  const data = snapshot.data();
  return data?.items ?? [];
};

export const useStaples = (db: Firestore, uid: string): UseStaplesResult => {
  const [staples, setStaples] = useState<StapleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'users', uid, 'data', 'staples');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      setStaples(parseStaplesFromSnapshot(snapshot));
      setLoading(false);
    });
    return unsubscribe;
  }, [db, uid]);

  return { staples, loading };
};
