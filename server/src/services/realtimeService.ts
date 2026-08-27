/**
 * 实时广播服务（SSE）：任何写操作后向所有在线客户端推送事件
 * 前端收到事件后刷新列表/统计，实现多人实时同步
 */
import type { Response } from 'express';

type Listener = { res: Response; nickname?: string };

const listeners = new Set<Listener>();

/** 注册 SSE 连接 */
export function addListener(listener: Listener): void {
  listeners.add(listener);
}

/** 移除 SSE 连接 */
export function removeListener(listener: Listener): void {
  listeners.delete(listener);
}

/** 广播事件（payload 为 JSON 对象） */
export function broadcast(event: string, payload: Record<string, unknown>): void {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const l of listeners) {
    try {
      l.res.write(data);
    } catch {
      listeners.delete(l);
    }
  }
}

/** 写操作后的通用变更广播（前端据此刷新） */
export function notifyChanged(kind: 'assets' | 'productions' | 'tags' | 'stats'): void {
  broadcast('changed', { kind, ts: Date.now() });
}
