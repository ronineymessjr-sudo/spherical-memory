const LANGUAGE_EVENT = 'sm:lang-change';

const MESSAGES = {
  en: {
    cover: {
      title: 'Fold travel photos and video into a living memory sphere.',
      copy: 'Upload any number of images, videos, or panoramas. After the mirror fractures, every file gets redistributed across a rotating sphere of shards you can orbit, zoom, focus, and capture.',
      preview1: 'Seaside dusk',
      preview2: 'City after dark',
      preview3: 'Island morning',
      stat1Title: 'Unlimited uploads',
      stat1Body: 'Keep adding new media and let shard count grow with the library',
      stat2Title: 'Mixed mapping',
      stat2Body: 'Flat frames crop by shard while panorama names auto-wrap to the sphere',
      stat3Title: 'Touch-first control',
      stat3Body: 'Drag, pinch, shuffle, autoplay, and capture are wired end to end',
      cta: 'Enter the sphere',
    },
    mirror: {
      title: 'Break the reflection and release the travel archive.',
      count: ({ count }) => `${count} / 3 hits`,
      phaseRelease: 'Phase 03 - Release',
      phaseCharge: ({ phase }) => `Phase 0${phase} - Charge`,
      hintRelease: 'The mirror is releasing the shard cloud...',
      hintAlmost: 'One more hit and the sphere will rebuild itself.',
      hintStart: 'Tap the mirror three times to unlock the memory sphere.',
      step1: '1. Charge',
      step2: '2. Fracture',
      step3: '3. Aggregate',
    },
    hud: {
      currentFocus: 'Current Focus',
      libraryStatus: 'Library Status',
      defaultTitle: 'Sphere overview',
      defaultMeta: 'Drag to orbit, pinch or wheel to zoom, and tap a shard to spotlight it.',
      focusMeta: ({ materialType, projection, repeated, slotIndex }) => `${materialType === 'video' ? 'Video shard' : 'Image shard'} - ${projection === 'panorama' ? 'Panorama mapping' : 'Flat mapping'} - ${repeated ? 'Repeated fill' : `Slot ${slotIndex + 1}`}`,
      libraryStats: ({ total, shardCount }) => `${total} media items / ${shardCount} shards`,
      libraryDetail: ({ imageCount, videoCount, panoramaCount }) => `${imageCount} images - ${videoCount} videos - ${panoramaCount} panoramas`,
      screenshot: 'Save capture',
      reset: 'Reset flow',
      demo: 'Auto demo',
    },
    upload: {
      title: 'Memory Studio',
      count: ({ materialCount, shardCount }) => `${materialCount} media items / ${shardCount} shards`,
      emptySummary: 'No media loaded yet. The travel demo set is standing by.',
      expandedSummary: ({ imageCount, videoCount, shardCount }) => `${imageCount} images and ${videoCount} videos loaded, expanded to ${shardCount} sphere shards.`,
      liveSummary: ({ imageCount, videoCount, shardCount }) => `${imageCount} images and ${videoCount} videos loaded across ${shardCount} live shards.`,
      emptyFormat: 'You can keep uploading in batches. New files will append onto the current sphere.',
      flatFormat: ({ imageCount, videoCount }) => `${imageCount} flat images and ${videoCount} videos are using cropped shard mapping.`,
      fullPanoFormat: ({ total }) => `All ${total} items are using panorama sphere mapping.`,
      mixedFormat: ({ panoramaCount }) => `${panoramaCount} panorama items were detected, while the rest keep flat crop distortion.`,
      panoHint: ' Files containing pano, panorama, 360, or equirect in the name are auto-routed as panoramas.',
      imageBadge: ({ imageCount }) => `${imageCount} images`,
      videoBadge: ({ videoCount }) => `${videoCount} videos`,
      panoBadge: ({ panoramaCount }) => `${panoramaCount} panoramas`,
      dropTitle: 'Drop files here or tap to keep adding media',
      dropHint: 'Supports JPG, PNG, WebP, MP4, and panorama-ready names',
      shuffle: 'Shuffle sphere',
      restore: 'Restore demo set',
      listEmpty: 'Demo library waiting in the wings',
      listMore: ({ remaining }) => `${remaining} more items already joined the sphere`,
      itemVideo: 'Video',
      itemPano: 'Pano',
      itemImage: 'Image',
      toggle: '中文',
    },
    demo: {
      badge: 'Auto demo running',
    },
    toolbar: {
      arrangement: 'Arrangement',
      arrangementSphere: 'Sphere',
      arrangementRing: 'Ring',
      arrangementNebula: 'Nebula',
      arrangementWhirlpool: 'Whirlpool',
      arrangementTimeline: 'Timeline',
      mood: 'Mood',
      moodVivid: 'Vivid',
      moodWistful: 'Wistful',
      moodHealing: 'Healing',
      theme: 'Material',
      themeGlass: 'Mirror',
      themeAurora: 'Ice',
      themeFilm: 'Film',
      themeMetal: 'Liquid',
      shuffle: 'Reshuffle',
      record: 'Record 10s clip',
      recordScreen: 'Whole screen',
      stopRecord: 'Stop recording',
      recording: 'Recording...',
      group: 'Memory group',
      groupAll: 'All memories',
      presetTheme: 'Library',
      presetAll: 'All',
      presetIsland: 'Islands',
      presetCity: 'Cities',
      presetSnow: 'Snow & desert',
      aiTitle: 'AI title',
      openGroup: 'Switch',
    },
    card: {
      eyebrow: 'Memory Card',
      meta: ({ type, date }) => `${type} - ${date}`,
      typeVideo: 'Video shard',
      typeImage: 'Image shard',
      noDate: 'undated',
      defaultCaption: 'A piece of memory inside the sphere.',
    },
    share: {
      card: 'Memory card',
      caption: ({ title }) => `My memory sphere - ${title}`,
    },
    toast: {
      ready: 'Ready',
      recordingSaved: '10s clip saved',
    },
    help: {
      title: 'Shortcuts',
      hint: 'Press H to toggle',
      arrangement: 'Switch arrangement',
      mood: 'Switch mood',
      theme: 'Switch material',
      record: 'Record 10s',
      screenshot: 'Save capture',
      shuffle: 'Reshuffle',
      lang: 'Toggle language',
      toggle: 'Show / hide this',
      escape: 'Close / blur',
    },
    onboarding: {
      drag: 'Drag to rotate',
      pinch: 'Pinch to zoom',
      double: 'Double-tap a shard for its story',
    },
  },
  zh: {
    cover: {
      title: '把旅行照片和视频折成一颗会呼吸的记忆球。',
      copy: '支持上传任意数量的图片、视频和全景素材。镜面破裂后，所有内容会被重新分配到旋转的碎片球面上，你可以拖拽、缩放、聚焦和截图。',
      preview1: '海边傍晚',
      preview2: '城市夜色',
      preview3: '海岛清晨',
      stat1Title: '无限追加上传',
      stat1Body: '持续加入新的素材，碎片数量会跟着内容库一起增长',
      stat2Title: '混合映射',
      stat2Body: '普通画面按碎片裁切，全景文件名会自动贴合到球面',
      stat3Title: '触控优先',
      stat3Body: '拖拽、缩放、随机重组、自动演示和截图全部打通',
      cta: '进入记忆球',
    },
    mirror: {
      title: '击碎倒影，把旅行记忆释放出来。',
      count: ({ count }) => `${count} / 3 次敲击`,
      phaseRelease: '阶段 03 - 释放',
      phaseCharge: ({ phase }) => `阶段 0${phase} - 充能`,
      hintRelease: '镜面正在释放碎片粒子云...',
      hintAlmost: '再敲一次，记忆球就会重新聚合。',
      hintStart: '轻点镜面三次，解锁这颗记忆球。',
      step1: '1. 充能',
      step2: '2. 破裂',
      step3: '3. 聚合',
    },
    hud: {
      currentFocus: '当前聚焦',
      libraryStatus: '素材状态',
      defaultTitle: '球体总览',
      defaultMeta: '拖拽旋转，双指或滚轮缩放，点击某个碎片可以聚焦它。',
      focusMeta: ({ materialType, projection, repeated, slotIndex }) => `${materialType === 'video' ? '视频碎片' : '图片碎片'} - ${projection === 'panorama' ? '全景映射' : '平面映射'} - ${repeated ? '重复补位' : `槽位 ${slotIndex + 1}`}`,
      libraryStats: ({ total, shardCount }) => `${total} 个素材 / ${shardCount} 个碎片`,
      libraryDetail: ({ imageCount, videoCount, panoramaCount }) => `${imageCount} 张图片 - ${videoCount} 段视频 - ${panoramaCount} 个全景`,
      screenshot: '保存截图',
      reset: '重置流程',
      demo: '自动演示',
    },
    upload: {
      title: '记忆工作台',
      count: ({ materialCount, shardCount }) => `${materialCount} 个素材 / ${shardCount} 个碎片`,
      emptySummary: '还没有载入素材，当前示例旅行库已经待命。',
      expandedSummary: ({ imageCount, videoCount, shardCount }) => `已载入 ${imageCount} 张图片和 ${videoCount} 段视频，并扩展成 ${shardCount} 个球面碎片。`,
      liveSummary: ({ imageCount, videoCount, shardCount }) => `已载入 ${imageCount} 张图片和 ${videoCount} 段视频，当前共有 ${shardCount} 个实时碎片。`,
      emptyFormat: '你可以分批连续上传，新文件会继续追加到当前球体上。',
      flatFormat: ({ imageCount, videoCount }) => `${imageCount} 张普通图片和 ${videoCount} 段视频正在使用碎片裁切映射。`,
      fullPanoFormat: ({ total }) => `${total} 个素材当前全部使用全景球面映射。`,
      mixedFormat: ({ panoramaCount }) => `检测到 ${panoramaCount} 个全景素材，其余内容保持普通裁切畸变。`,
      panoHint: ' 文件名包含 pano、panorama、360 或 equirect 时会自动按全景处理。',
      imageBadge: ({ imageCount }) => `${imageCount} 张图片`,
      videoBadge: ({ videoCount }) => `${videoCount} 段视频`,
      panoBadge: ({ panoramaCount }) => `${panoramaCount} 个全景`,
      dropTitle: '把文件拖到这里，或点击继续添加素材',
      dropHint: '支持 JPG、PNG、WebP、MP4，以及带全景命名的文件',
      shuffle: '重组球面',
      restore: '恢复示例素材',
      listEmpty: '示例素材库正在待命',
      listMore: ({ remaining }) => `还有 ${remaining} 个素材已经加入球体`,
      itemVideo: '视频',
      itemPano: '全景',
      itemImage: '图片',
      toggle: 'EN',
    },
    demo: {
      badge: '自动演示进行中',
    },
    toolbar: {
      arrangement: '重组形态',
      arrangementSphere: '球面',
      arrangementRing: '环轨道',
      arrangementNebula: '星云带',
      arrangementWhirlpool: '记忆漩涡',
      arrangementTimeline: '时间线',
      mood: '情绪',
      moodVivid: '热烈',
      moodWistful: '怀旧',
      moodHealing: '治愈',
      theme: '材质',
      themeGlass: '玻璃镜球',
      themeAurora: '极光冰球',
      themeFilm: '胶片颗粒球',
      themeMetal: '液态金属',
      shuffle: '重新生成',
      record: '录 10s 展示',
      recordScreen: '全屏录制',
      stopRecord: '停止录制',
      recording: '录制中...',
      group: '记忆组合包',
      groupAll: '全部记忆',
      presetTheme: '素材库',
      presetAll: '全部',
      presetIsland: '海岛',
      presetCity: '城市',
      presetSnow: '雪境/沙海',
      aiTitle: 'AI 标题',
      openGroup: '切换',
    },
    card: {
      eyebrow: '记忆卡',
      meta: ({ type, date }) => `${type} - ${date}`,
      typeVideo: '视频碎片',
      typeImage: '图片碎片',
      noDate: '未标注日期',
      defaultCaption: '这颗球里藏着的一段记忆。',
    },
    share: {
      card: '分享卡',
      caption: ({ title }) => `我的记忆球 - ${title}`,
    },
    toast: {
      ready: '已就绪',
      recordingSaved: '10 秒展示已保存',
    },
    help: {
      title: '快捷键',
      hint: '按 H 切换显示',
      arrangement: '切换重组形态',
      mood: '切换情绪',
      theme: '切换材质',
      record: '录 10s',
      screenshot: '保存截图',
      shuffle: '重新生成',
      lang: '切换中英文',
      toggle: '显示 / 隐藏此面板',
      escape: '关闭 / 取消聚焦',
    },
    onboarding: {
      drag: '拖拽旋转',
      pinch: '双指缩放',
      double: '双击碎片查看它的故事',
    },
  },
};

function getPreferredLanguage() {
  try {
    const stored = window.localStorage.getItem('sm-lang');
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {}

  const browserLanguage = navigator.language?.toLowerCase?.() || '';
  return browserLanguage.startsWith('zh') ? 'zh' : 'en';
}

function getLang() {
  return window.SM?.lang === 'zh' ? 'zh' : 'en';
}

function setLang(nextLang) {
  const lang = nextLang === 'zh' ? 'zh' : 'en';
  if (window.SM) {
    window.SM.lang = lang;
  }

  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

  try {
    window.localStorage.setItem('sm-lang', lang);
  } catch {}

  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, {
    detail: { lang },
  }));

  window.SM?.bus?.emit?.('lang:change', { lang });
  return lang;
}

function toggleLang() {
  return setLang(getLang() === 'zh' ? 'en' : 'zh');
}

function resolvePath(path) {
  return path.split('.').reduce((value, key) => value?.[key], MESSAGES[getLang()]);
}

function t(path, params = {}) {
  const message = resolvePath(path);
  if (typeof message === 'function') return message(params);
  if (typeof message === 'string') return message;
  return path;
}

function onLanguageChange(callback) {
  const handler = (event) => callback(event.detail?.lang ?? getLang());
  window.addEventListener(LANGUAGE_EVENT, handler);
  return () => window.removeEventListener(LANGUAGE_EVENT, handler);
}

function init() {
  setLang(window.SM?.lang === 'zh' || window.SM?.lang === 'en'
    ? window.SM.lang
    : getPreferredLanguage());
}

function destroy() {}

export {
  init,
  destroy,
  getLang,
  setLang,
  toggleLang,
  t,
  onLanguageChange,
};
