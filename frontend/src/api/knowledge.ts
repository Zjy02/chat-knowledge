import { request } from './client';
import type { DocumentItem, KnowledgeStats, SearchResponse } from '../types';

export const knowledgeApi = {
  stats: () => request<KnowledgeStats>('/knowledge/stats'),
  documents: (status?: string, q?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<DocumentItem[]>(`/knowledge/documents${suffix}`);
  },
  upload: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    // XMLHttpRequest is used only here because fetch has no upload progress.
    return new Promise<DocumentItem>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${import.meta.env.VITE_API_BASE_URL || '/api'}/knowledge/documents`);
      const token = localStorage.getItem('zhiwen_token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onerror = () => reject(new Error('上传失败，请检查网络'));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText) as DocumentItem);
          return;
        }
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(body.message || '上传失败'));
        } catch {
          reject(new Error('上传失败'));
        }
      };
      xhr.send(form);
    });
  },
  toggle: (id: number, enabled: boolean) =>
    request<DocumentItem>(`/knowledge/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
  remove: (id: number) =>
    request<void>(`/knowledge/documents/${id}`, {
      method: 'DELETE',
    }),
  search: (query: string, topK = 5) =>
    request<SearchResponse>('/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, top_k: topK }),
    }),
};
