import type { Dict } from './types';

const th: Dict = {
  nav: { chat: 'แชท', image: 'ภาพ', video: 'วิดีโอ' },
  chat: { send: 'ส่ง', placeholder: 'ถามอะไรก็ได้…', thinking: 'กำลังคิด…' },
  image: {
    prompt: 'พรอมต์', promptPlaceholder: 'อธิบายภาพที่ต้องการ…',
    ratio: 'อัตราส่วน', batch: 'จำนวน', generate: 'สร้าง', generating: 'กำลังสร้าง…',
    empty: 'ภาพของคุณจะปรากฏที่นี่',
  },
  video: {
    prompt: 'พรอมต์', promptPlaceholder: 'อธิบายวิดีโอที่ต้องการ…',
    duration: 'ความยาว', resolution: 'ความละเอียด', aspectRatio: 'อัตราส่วน',
    firstFrame: 'เฟรมแรก (ไม่บังคับ)', refImages: 'ภาพอ้างอิง (ไม่บังคับ)',
    refImagesHint: 'สูงสุด 4 ภาพ หากอัปโหลดจะใช้ kling-v3-omni',
    generate: 'สร้าง', generating: 'กำลังสร้าง…',
    providerLabel: 'โมเดล', empty: 'วิดีโอของคุณจะปรากฏที่นี่',
  },
  common: {
    loading: 'กำลังโหลด…', error: 'เกิดข้อผิดพลาด', retry: 'ลองใหม่',
    expiresAt: 'หมดอายุ', saveNow: 'บันทึกก่อนหมดอายุภายใน 3 ชั่วโมง',
    seconds: 'วินาที', minutes: 'นาที', hours: 'ชั่วโมง',
  },
  errors: {
    INVALID_KEY: 'เซิร์ฟเวอร์ตั้งค่าไม่ถูกต้อง: API key ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ',
    CONTENT_POLICY: 'ถูกกรองโดยระบบตรวจสอบเนื้อหา โปรดลองพรอมต์อื่น',
    RATE_LIMITED: 'ถึงขีดจำกัดอัตรา โปรดรอสักครู่แล้วลองใหม่',
    NETWORK_ERROR: 'ข้อผิดพลาดเครือข่าย โปรดลองใหม่',
    UNKNOWN: 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ โปรดลองใหม่',
  },
  masthead: {
    marquee: [
      '◆ AIKIT STUDIO DISPATCH',
      'เล่ม I · ฉบับ 01',
      'สาย DASHSCOPE',
      '● ถ่ายทอดสด',
      'เพื่อนเท่านั้น',
      '◆ QWEN / WAN / KLING',
      'ไม่มีค่าธรรมเนียม · ไม่ติดตาม',
      '◆ เย็บมือที่เซี่ยงไฮ้',
    ],
    est: 'ก่อตั้ง 2026 · № 01',
    subtitle:
      'วารสารเย็บมือรวมเครื่องมือสร้างสรรค์ — บทสนทนา ภาพนิ่ง ภาพเคลื่อนไหว — เสิร์ฟให้เพื่อนโดยไม่มีพิธีรีตอง',
    dispatchRoom: 'ห้องส่ง',
    colophon: 'ข้อมูลสิ่งพิมพ์',
    colophonBody:
      'จัดหน้าด้วย Fraunces, Instrument Sans และ JetBrains Mono · พิมพ์บนกระดาษอุ่น ด้วยแท่น Next.js',
    imprint: 'ผู้จัดพิมพ์',
    imprintBody: 'ขับเคลื่อนโดย DashScope — Qwen สำหรับถ้อยคำ, Wan สำหรับภาพนิ่ง, Kling สำหรับภาพเคลื่อนไหว',
    fin: 'จบ',
  },
};
export default th;
