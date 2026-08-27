/**
 * 视频处理层：基于 ffmpeg-static / ffprobe-static
 * 功能：读取视频元数据（时长/分辨率/帧率）、生成缩略图、文件指纹
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { join, basename } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import { THUMB_DIR } from './db.js';

const execFileAsync = promisify(execFile);

export interface VideoMeta {
  duration: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
}

/** 执行 ffprobe 读取视频元数据 */
export async function probeVideo(filePath: string): Promise<VideoMeta> {
  try {
    const { stdout } = await execFileAsync(ffprobe.path, [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate,duration:format=duration',
      '-of', 'json',
      filePath,
    ]);
    const data = JSON.parse(stdout);
    const stream = data.streams?.[0] ?? {};
    const fpsRaw = stream.r_frame_rate as string | undefined;
    let fps: number | null = null;
    if (fpsRaw && fpsRaw.includes('/')) {
      const [n, d] = fpsRaw.split('/').map(Number);
      if (d > 0) fps = Math.round((n / d) * 100) / 100;
    }
    return {
      duration: Number(stream.duration ?? data.format?.duration ?? null) || null,
      width: stream.width ?? null,
      height: stream.height ?? null,
      fps,
    };
  } catch {
    // 某些编码无法探测时降级返回空元数据，不阻塞入库
    return { duration: null, width: null, height: null, fps: null };
  }
}

/**
 * 生成缩略图（取视频 1 秒处一帧，宽 480 等比缩放）
 * @returns 缩略图相对路径（如 thumbs/xxxx.jpg）
 */
export async function makeThumbnail(filePath: string, thumbName: string): Promise<string> {
  const outPath = join(THUMB_DIR, `${thumbName}.jpg`);
  if (!ffmpegPath) throw new Error('ffmpeg-static 未提供可执行文件');
  await execFileAsync(ffmpegPath, [
    '-y',
    '-ss', '1',
    '-i', filePath,
    '-frames:v', '1',
    '-vf', 'scale=480:-2',
    '-q:v', '3',
    outPath,
  ]);
  return `thumbs/${basename(outPath)}`;
}

/** 计算文件 SHA-256 指纹（用于去重与识别） */
export function sha256Of(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
