/**
 * 外部 API 适配器框架（可插拔）
 *
 * 三个适配器均以配置驱动，未配置时返回"未配置"状态，不影响核心功能：
 *  - ai-vision：AI 视觉分类（素材自动打标）
 *  - publish：视频发布（成片发布到外部平台）
 *  - ai-video：AI 视频制作（AI 生成视频素材/成片）
 *
 * 待用户提供各平台接口文档后，在对应文件内填充具体实现。
 */

export type AdapterName = 'ai-vision' | 'publish' | 'ai-video';

export interface AdapterConfig {
  enabled: boolean;
  baseURL?: string;
  apiKey?: string;
  model?: string;
  [key: string]: unknown;
}

export interface AdapterStatus {
  name: AdapterName;
  configured: boolean;
  enabled: boolean;
  description: string;
  /** 适配器是否需要配置后才能使用 */
  pendingDoc: boolean;
}

/** 适配器配置读取：优先读环境变量，其次读配置文件（server/config/adapters.json） */
function loadAdapterConfig(name: AdapterName): AdapterConfig {
  const envMap: Record<AdapterName, string> = {
    'ai-vision': 'AI_VISION',
    publish: 'PUBLISH',
    'ai-video': 'AI_VIDEO',
  };
  const prefix = envMap[name];
  const enabled = process.env[`${prefix}_ENABLED`] === 'true';
  return {
    enabled,
    baseURL: process.env[`${prefix}_BASE_URL`] || undefined,
    apiKey: process.env[`${prefix}_API_KEY`] || undefined,
    model: process.env[`${prefix}_MODEL`] || undefined,
  };
}

/** 查询所有适配器状态（前端展示配置引导） */
export function listAdapterStatus(): AdapterStatus[] {
  const defs: Array<{ name: AdapterName; description: string }> = [
    { name: 'ai-vision', description: 'AI 视觉分类：识别素材场景/景别/内容并自动打标签' },
    { name: 'publish', description: '视频发布：将成片发布到外部视频平台' },
    { name: 'ai-video', description: 'AI 视频制作：调用 AI 生成视频素材或成片' },
  ];
  return defs.map((d) => {
    const cfg = loadAdapterConfig(d.name);
    const configured = Boolean(cfg.baseURL && cfg.apiKey);
    return {
      name: d.name,
      configured,
      enabled: cfg.enabled && configured,
      description: d.description,
      // 接口文档尚未提供，标记为待接入
      pendingDoc: true,
    };
  });
}

/**
 * 通用适配器调用入口（预留）。
 * 具体平台实现待接口文档提供后填充到 adapters/ 下的对应模块。
 */
export async function invokeAdapter(
  name: AdapterName,
  _payload: Record<string, unknown>,
): Promise<unknown> {
  const cfg = loadAdapterConfig(name);
  if (!cfg.enabled || !cfg.baseURL) {
    throw new Error(`适配器 ${name} 尚未配置，请在环境变量或适配器配置中填写接口地址`);
  }
  // TODO: 待接口文档提供后，按各平台协议实现请求逻辑
  throw new Error(`适配器 ${name} 接口文档尚未提供，暂无法调用（预留占位）`);
}
