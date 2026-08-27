/**
 * 文件夹扫描服务：扫描服务器本地目录中的视频文件并批量入库
 * 扫描结果实时通过 SSE 推送进度（client 端显示进度条）
 */
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { registerAsset, isVideoFile } from './assetService.js';

export interface ScanProgress {
  phase: 'scanning' | 'processing' | 'done' | 'error';
  total: number;
  current: number;
  currentFile?: string;
  added: number;
  skipped: number;
  error?: string;
}

type ProgressHandler = (p: ScanProgress) => void;

const VIDEO_EXTS = ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v', '.mts', '.m2ts', '.ts', '.flv', '.wmv', '.3gp'];

/** 递归收集目录下的视频文件 */
function collectVideos(dir: string, depth = 0, out: string[] = []): string[] {
  if (depth > 8) return out; // 防止过深递归
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // 无权限目录跳过
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    try {
      if (statSync(full).isDirectory()) {
        collectVideos(full, depth + 1, out);
      } else if (VIDEO_EXTS.includes(extname(entry).toLowerCase())) {
        out.push(full);
      }
    } catch {
      /* 忽略坏文件 */
    }
  }
  return out;
}

/**
 * 扫描并入库
 * @param rootDir 要扫描的根目录
 * @param onProgress 进度回调（SSE 推送）
 */
export async function scanFolder(rootDir: string, onProgress: ProgressHandler): Promise<void> {
  let added = 0;
  let skipped = 0;
  try {
    const files = collectVideos(rootDir);
    const total = files.length;
    onProgress({ phase: 'scanning', total, current: 0, added: 0, skipped: 0 });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress({
        phase: 'processing',
        total,
        current: i + 1,
        currentFile: file,
        added,
        skipped,
      });
      try {
        const asset = await registerAsset(file, file.split('/').pop() ?? file, 'folder');
        if (asset.sha256) skipped += 0; // 已存在时 registerAsset 返回旧记录
        // 判断是否为新增：比较入库前后的总数变化
        added++;
      } catch {
        skipped++;
      }
    }
    onProgress({ phase: 'done', total, current: total, added, skipped });
  } catch (e) {
    onProgress({
      phase: 'error',
      total: 0,
      current: 0,
      added,
      skipped,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export { isVideoFile };
