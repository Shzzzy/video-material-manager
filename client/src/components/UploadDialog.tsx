/** 导入素材对话框：浏览器上传（带进度） / 服务器文件夹扫描（SSE 进度） */
import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, FolderSearch, Loader2, XCircle } from 'lucide-react';
import { Modal } from './Modal';
import { useStore } from '../store';
import { api } from '../api';

type ScanProgress = {
  phase: 'scanning' | 'processing' | 'done' | 'error';
  total: number;
  current: number;
  currentFile?: string;
  added: number;
  skipped: number;
  error?: string;
};

export function UploadDialog() {
  const { uploadOpen, setUploadOpen, bumpAssets, reloadCategories } = useStore();
  const [mode, setMode] = useState<'upload' | 'scan'>('upload');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<
    Array<{ filename: string; ok: boolean; duplicated?: boolean; msg: string }>
  >([]);
  const [scanFolder, setScanFolder] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanProg, setScanProg] = useState<ScanProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    if (uploading || scanning) return;
    setUploadOpen(false);
    setUploadResults([]);
    setScanProg(null);
    setScanFolder('');
    setMode('upload');
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      setProgress(0);
      setUploadResults([]);
      try {
        const { results } = await api.uploadAssets(Array.from(files), (done, total) => {
          setProgress(total > 0 ? Math.round((done / total) * 100) : 0);
        });
        setUploadResults(
          results.map((r) => ({
            filename: r.filename,
            ok: !r.error && !!r.asset,
            duplicated: r.duplicated,
            msg: r.error
              ? r.error
              : r.duplicated
                ? `内容重复，已关联 ${r.asset?.code}（原文件 ${r.asset?.filename}）`
                : `已入库 ${r.asset?.code}`,
          })),
        );
        bumpAssets();
        void reloadCategories();
      } catch (e) {
        setUploadResults([
          { filename: '上传', ok: false, msg: e instanceof Error ? e.message : '上传失败' },
        ]);
      } finally {
        setUploading(false);
      }
    },
    [bumpAssets, reloadCategories],
  );

  const startScan = () => {
    if (!scanFolder.trim() || scanning) return;
    setScanning(true);
    setScanProg({ phase: 'scanning', total: 0, current: 0, added: 0, skipped: 0 });
    // 使用 fetch 流式读取 SSE（POST 方式）
    void (async () => {
      try {
        const res = await fetch('/api/assets/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: scanFolder.trim() }),
        });
        if (!res.ok || !res.body) throw new Error('扫描请求失败');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const p = JSON.parse(line.slice(6)) as ScanProgress;
            setScanProg(p);
            if (p.phase === 'done' || p.phase === 'error') {
              bumpAssets();
              void reloadCategories();
            }
          }
        }
      } catch (e) {
        setScanProg({
          phase: 'error',
          total: 0,
          current: 0,
          added: 0,
          skipped: 0,
          error: e instanceof Error ? e.message : '扫描失败',
        });
      } finally {
        setScanning(false);
      }
    })();
  };

  const percent =
    scanProg && scanProg.total > 0
      ? Math.round((scanProg.current / scanProg.total) * 100)
      : scanProg?.phase === 'scanning'
        ? 2
        : 0;

  return (
    <Modal
      open={uploadOpen}
      onClose={close}
      title="导入素材"
      subtitle="支持视频文件上传，或扫描服务器上的素材文件夹"
      width={620}
    >
      {/* 模式切换 */}
      <div className="flex gap-1 border-b border-ink-900/6 px-5 pt-3 pb-3">
        <button
          onClick={() => setMode('upload')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all ${
            mode === 'upload' ? 'bg-forest-100 text-forest-800' : 'text-ink-400 hover:bg-ink-900/4'
          }`}
        >
          <FileUp size={13} /> 上传文件
        </button>
        <button
          onClick={() => setMode('scan')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all ${
            mode === 'scan' ? 'bg-forest-100 text-forest-800' : 'text-ink-400 hover:bg-ink-900/4'
          }`}
        >
          <FolderSearch size={13} /> 扫描文件夹
        </button>
      </div>

      <div className="p-5">
        {mode === 'upload' ? (
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleFiles(e.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              uploading
                ? 'border-forest-300 bg-forest-50/50'
                : 'border-ink-900/12 bg-cream-200/40 hover:border-forest-400 hover:bg-forest-50/40'
            }`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-700 text-cream-50 shadow-card">
              {uploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <FileUp size={18} />
              )}
            </div>
            <p className="text-[13px] font-medium text-ink-900">
              {uploading ? `正在上传 ${progress}%` : '点击选择或拖拽视频文件到这里'}
            </p>
            <p className="text-[11.5px] text-ink-400">
              支持 mp4 / mov / mkv / avi / webm 等常见格式，单文件最大 4GB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,.mp4,.mov,.mkv,.avi,.webm,.m4v,.mts,.ts,.flv,.wmv,.3gp"
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-700">
                服务器文件夹路径
              </label>
              <input
                value={scanFolder}
                onChange={(e) => setScanFolder(e.target.value)}
                placeholder="例如：/data/videos/2026-08 或 D:\素材库\外拍"
                disabled={scanning}
                className="h-9 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 text-[12.5px] text-ink-900 placeholder:text-ink-300 transition-all outline-none focus:border-forest-500/50 focus:bg-cream-50 focus:ring-2 focus:ring-forest-500/15 disabled:opacity-50"
              />
            </div>
            <button
              onClick={startScan}
              disabled={scanning || !scanFolder.trim()}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-forest-700 text-[12.5px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.99] disabled:opacity-40"
            >
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <FolderSearch size={14} />}
              {scanning ? `扫描中 ${percent}%` : '开始扫描并入库'}
            </button>
            <p className="text-[11px] leading-relaxed text-ink-400">
              系统会递归查找文件夹内的视频文件，自动生成编号、缩略图与指纹（重复文件自动去重）。
            </p>
          </div>
        )}

        {/* 上传结果 */}
        {uploadResults.length > 0 && (
          <div className="fade-in mt-4 max-h-44 space-y-1 overflow-y-auto rounded-lg bg-cream-200/60 p-3">
            {uploadResults.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                {r.ok ? (
                  r.duplicated ? (
                    <AlertTriangle size={13} className="shrink-0 text-gold" />
                  ) : (
                    <CheckCircle2 size={13} className="shrink-0 text-forest-600" />
                  )
                ) : (
                  <XCircle size={13} className="shrink-0 text-alert" />
                )}
                <span className="truncate text-ink-700">{r.filename}</span>
                <span
                  className={`ml-auto shrink-0 ${
                    r.ok ? (r.duplicated ? 'text-[#8a6a1d]' : 'text-forest-600') : 'text-alert'
                  }`}
                >
                  {r.msg}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 扫描进度 */}
        {scanProg && scanProg.phase !== 'done' && scanProg.phase !== 'error' && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="text-ink-500">
                {scanProg.phase === 'scanning' ? '正在遍历文件夹…' : '正在生成缩略图与指纹…'}
              </span>
              <span className="tabular text-ink-700">
                {scanProg.current}/{scanProg.total || '?'}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-900/8">
              <div
                className="progress-stripes h-full rounded-full bg-forest-600 transition-all duration-200"
                style={{ width: `${Math.max(percent, 3)}%` }}
              />
            </div>
            {scanProg.currentFile && (
              <p className="mt-1.5 truncate text-[11px] text-ink-400">{scanProg.currentFile}</p>
            )}
          </div>
        )}

        {scanProg?.phase === 'done' && (
          <div className="fade-in mt-4 flex items-center gap-2 rounded-lg bg-forest-50 px-3 py-2.5 text-[12.5px] text-forest-800">
            <CheckCircle2 size={14} />
            扫描完成：新增 {scanProg.added} 个素材，跳过 {scanProg.skipped} 个
            <button
              onClick={close}
              className="ml-auto font-medium text-forest-600 underline-offset-2 hover:underline"
            >
              关闭
            </button>
          </div>
        )}
        {scanProg?.phase === 'error' && (
          <div className="fade-in mt-4 flex items-center gap-2 rounded-lg bg-[#fdf0ec] px-3 py-2.5 text-[12.5px] text-alert">
            <XCircle size={14} />
            {scanProg.error ?? '扫描失败'}
          </div>
        )}
      </div>
    </Modal>
  );
}
