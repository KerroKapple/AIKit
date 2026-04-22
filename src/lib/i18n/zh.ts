import type { Dict } from './types';

const zh: Dict = {
  nav: { chat: '对话', image: '生图', video: '生视频' },
  chat: { send: '发送', placeholder: '问点什么…', thinking: '思考中…' },
  image: {
    prompt: '提示词', promptPlaceholder: '描述想要的画面…',
    ratio: '比例', batch: '张数', generate: '生成', generating: '生成中…',
    empty: '图片结果将显示在这里。',
  },
  video: {
    prompt: '提示词', promptPlaceholder: '描述想要的视频…',
    duration: '时长', resolution: '分辨率', aspectRatio: '比例',
    firstFrame: '首帧图（可选）', refImages: '参考图（可选）',
    refImagesHint: '最多 4 张。上传参考图会走 kling-v3-omni。',
    generate: '生成', generating: '生成中…',
    providerLabel: '模型', empty: '视频结果将显示在这里。',
  },
  common: {
    loading: '加载中…', error: '出错了', retry: '重试',
    expiresAt: '过期时间', saveNow: '3 小时后失效，及时另存',
    seconds: '秒', minutes: '分钟', hours: '小时',
  },
  errors: {
    INVALID_KEY: '服务端配置错误：API Key 无效，请联系管理员。',
    CONTENT_POLICY: '内容未通过安全审核，请换个说法。',
    RATE_LIMITED: '达到速率限制，请稍后再试。',
    NETWORK_ERROR: '网络错误，请重试。',
    UNKNOWN: '未知错误，请重试。',
  },
  masthead: {
    marquee: [
      '◆ AIKIT 工作室通讯',
      '第壹卷 · 壹号',
      'DASHSCOPE 线路',
      '● 现场',
      '仅限 · 友人',
      '◆ QWEN / WAN / KLING',
      '无付费 · 不追踪',
      '◆ 上海 · 手工装订',
    ],
    est: '创刊于 2026 · № 01',
    subtitle:
      '一份生成式工具的手订小报——对话、静像、动像——无仪式感地奉与友人。',
    dispatchRoom: '发稿间',
    colophon: '版权页',
    colophonBody:
      '以 Fraunces、Instrument Sans 与 JetBrains Mono 排版；印于暖纸，压于 Next.js。',
    imprint: '承印',
    imprintBody: '由 DashScope 驱动 —— 文用 Qwen，静像用 Wan，动像用 Kling。',
    fin: '完',
  },
};
export default zh;
