import { useEffect, useState } from 'react';
import { getCategories } from '@/services/api';
import type { Category } from '@/types/types';

interface UseCategoriesOptions {
  /** 僅取頂層分類（無 parent_id）。預設 false = 取所有 */
  topLevelOnly?: boolean;
}

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  /** 頂層分類（parent_id 為 null） */
  mainCategories: Category[];
  /** 根據父分類 ID 取子分類 */
  getChildren: (parentId: string) => Category[];
}

export function useCategories(options: UseCategoriesOptions = {}): UseCategoriesResult {
  const { topLevelOnly = false } = options;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCategories(true).then((data) => {
      if (cancelled) return;
      setCategories(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const mainCategories = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const getChildren = (parentId: string) =>
    categories
      .filter((c) => c.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);

  return {
    categories: topLevelOnly ? mainCategories : categories,
    loading,
    mainCategories,
    getChildren,
  };
}
