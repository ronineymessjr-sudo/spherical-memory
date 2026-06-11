// Client-side "AI flavor" for spherical-memory.
// Local heuristics are the default. `classifyWithRemote` and
// `suggestTitleWithRemote` are hooks that *try* a configurable backend
// endpoint first; if it 404s or the request fails, they fall back to the local
// heuristic. This way the demo works offline but the same code can be wired
// to a real classifier in production.

const DEFAULT_ENDPOINT = null; // Set to a backend URL to enable remote classification.

const MOOD_KEYWORDS = {
  vivid: ['party', 'fireworks', 'concert', 'festival', 'beach', 'sunset', 'birthday', 'carnival', 'nightlife', 'fire', 'crowd'],
  wistful: ['autumn', 'fall', 'old', 'city', 'rain', 'mist', 'street', 'fog', 'lonely', 'alone', 'window', 'train', 'station', 'road', 'diner', 'night', 'skyline', 'tokyo', 'urban', 'downtown'],
  healing: ['forest', 'lake', 'camp', 'mountain', 'snow', 'meadow', 'field', 'spring', 'morning', 'calm', 'sunrise', 'tea', 'island', 'petals'],
};

const TAG_KEYWORDS = {
  海边: ['sea', 'beach', 'ocean', 'coast', 'pier', 'shore', 'sand'],
  城市: ['city', 'urban', 'street', 'skyline', 'downtown', 'town', 'alley'],
  山林: ['mountain', 'forest', 'tree', 'pine', 'hiking', 'trail'],
  雪景: ['snow', 'winter', 'ice', 'frost'],
  落日: ['sunset', 'sunrise', 'dusk', 'dawn', 'golden'],
  夜景: ['night', 'neon', 'stars', 'moonlight'],
  人物: ['family', 'friend', 'people', 'portrait', 'selfie', 'couple', 'wedding', 'kid', 'baby'],
  车窗: ['car', 'drive', 'road', 'highway', 'cab', 'taxi'],
  旅途: ['roadtrip', 'train', 'airport', 'station', 'trip', 'travel'],
};

const TRIP_TEMPLATES = [
  { match: ['beach', 'sea', 'ocean', 'island'], name: '海岛 / 海边之旅' },
  { match: ['mountain', 'forest', 'snow', 'alpine'], name: '山林雪境' },
  { match: ['city', 'urban', 'skyline', 'downtown'], name: '城市漫游' },
  { match: ['autumn', 'fall'], name: '秋日记录' },
  { match: ['spring', 'meadow', 'blossom'], name: '春日片段' },
  { match: ['birthday', 'wedding', 'party'], name: '人生节点' },
  { match: ['baby', 'kid', 'newborn'], name: '宝宝成长' },
  { match: ['couple', 'wedding', 'love'], name: '两个人的时光' },
];

const ENGLISH_TRIP_TEMPLATES = [
  { match: ['beach', 'sea', 'ocean', 'island'], name: 'Seaside & island run' },
  { match: ['mountain', 'forest', 'snow', 'alpine'], name: 'Mountains & snow' },
  { match: ['city', 'urban', 'skyline', 'downtown'], name: 'City drift' },
  { match: ['autumn', 'fall'], name: 'Autumn days' },
  { match: ['spring', 'meadow', 'blossom'], name: 'Spring capture' },
  { match: ['birthday', 'wedding', 'party'], name: 'Life milestone' },
  { match: ['baby', 'kid', 'newborn'], name: 'Little one growing up' },
  { match: ['couple', 'wedding', 'love'], name: 'Two of us' },
];

function tokenize(name) {
  return (name || '').toLowerCase().replace(/\.[^.]+$/, '').split(/[\s_\-.]+/).filter(Boolean);
}

function detectMood(name) {
  const tokens = tokenize(name);
  let best = 'wistful';
  let bestScore = 0;
  Object.entries(MOOD_KEYWORDS).forEach(([mood, words]) => {
    const score = words.reduce((acc, word) => acc + (tokens.some((t) => t.includes(word)) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = mood;
    }
  });
  return bestScore > 0 ? best : null;
}

function detectTags(name, max = 3) {
  const tokens = tokenize(name);
  const matches = [];
  Object.entries(TAG_KEYWORDS).forEach(([tag, words]) => {
    const score = words.reduce((acc, word) => acc + (tokens.some((t) => t.includes(word)) ? 1 : 0), 0);
    if (score > 0) matches.push({ tag, score });
  });
  return matches.sort((a, b) => b.score - a.score).slice(0, max).map((m) => m.tag);
}

function detectDate(name) {
  // Match common date patterns: 2024-08, 202408, 2024_08, 2024.08, 2024-08-12
  const match = (name || '').match(/(20\d{2})[\-_.](\d{1,2})(?:[\-_.](\d{1,2}))?/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = match[3] ? parseInt(match[3], 10) : null;
  if (month < 1 || month > 12) return null;
  return { year, month, day, iso: day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : `${year}-${String(month).padStart(2, '0')}` };
}

function pickTripTemplate(materials, lang = 'zh') {
  const corpus = materials.map((m) => (m.name || '').toLowerCase()).join(' ');
  const templates = lang === 'zh' ? TRIP_TEMPLATES : ENGLISH_TRIP_TEMPLATES;
  for (const template of templates) {
    if (template.match.some((kw) => corpus.includes(kw))) {
      return template.name;
    }
  }
  return lang === 'zh' ? '某次重要的旅行' : 'A meaningful trip';
}

function inferSeason(dateInfo) {
  if (!dateInfo) return null;
  const month = dateInfo.month;
  if ([3, 4, 5].includes(month)) return 'spring';
  if ([6, 7, 8].includes(month)) return 'summer';
  if ([9, 10, 11].includes(month)) return 'autumn';
  return 'winter';
}

function suggestTitle(materials, lang = 'zh') {
  if (!materials.length) {
    return lang === 'zh' ? '一颗等待填充的记忆球' : 'A sphere waiting for memories';
  }
  const template = pickTripTemplate(materials, lang);
  const yearSet = new Set();
  const seasonSet = new Set();
  materials.forEach((m) => {
    const date = detectDate(m.name);
    if (date) {
      yearSet.add(date.year);
      const season = inferSeason(date);
      if (season) seasonSet.add(season);
    }
  });
  const years = Array.from(yearSet).sort();
  if (lang === 'zh') {
    const head = years.length === 1 ? `${years[0]} 年` : years.length > 1 ? `${years[0]}–${years[years.length - 1]} 年` : '';
    const seasonLabel = { spring: '春天', summer: '夏天', autumn: '秋天', winter: '冬天' }[seasonSet.values().next().value] || '';
    const tail = seasonLabel ? `的${seasonLabel}` : '';
    return `${head}${tail}的${template}都留在这里了`.replace(/的的/g, '的');
  }
  const head = years.length === 1 ? `${years[0]}` : years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : '';
  const seasonLabel = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' }[seasonSet.values().next().value] || '';
  return `${head ? head + ' ' : ''}${seasonLabel ? seasonLabel + ' ' : ''}${template}, kept here.`.trim();
}

function annotateMaterials(materials, options = {}) {
  const lang = options.lang || 'zh';
  return materials.map((material) => {
    const tokens = tokenize(material.name);
    const mood = detectMood(material.name);
    const tags = detectTags(material.name);
    const date = detectDate(material.name);
    return {
      ...material,
      mood,
      tags,
      takenAt: date?.iso ?? null,
      season: inferSeason(date),
      caption: tokens.slice(0, 4).join(' '),
    };
  });
}

function pickMainShards(materials, count = 3) {
  // Favor: first uploaded, video, large-looking names, anything with "main"/"key" hints.
  if (!materials.length) return [];
  const scored = materials.map((material, index) => {
    const name = (material.name || '').toLowerCase();
    let score = 0;
    if (material.type === 'video') score += 2;
    if (/main|key|hero|cover|highlight/i.test(name)) score += 3;
    if (index === 0) score += 1;
    if (/pano|360|panorama/.test(name)) score += 0.5;
    return { material, index, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((entry) => entry.material);
}

function groupMaterials(materials) {
  // Group by date (year+month) or by detected "trip keyword".
  const groups = new Map();
  materials.forEach((material) => {
    const date = detectDate(material.name);
    const key = date ? date.iso.slice(0, 7) : (() => {
      const tokens = tokenize(material.name);
      const found = TRIP_TEMPLATES.find((t) => t.match.some((kw) => tokens.some((t2) => t2.includes(kw))));
      return found ? found.name : '其他';
    })();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(material);
  });
  return Array.from(groups.entries()).map(([key, items]) => ({ key, label: key, items }));
}

function suggestMusic(materials) {
  // Map detected mood to a generic BGM cue. We never embed audio here — this is
  // metadata that the user can take to an audio backend.
  const moods = new Set(materials.map((m) => detectMood(m.name)).filter(Boolean));
  if (moods.has('vivid')) return { genre: 'upbeat', hint: 'percussive synths + warm bass' };
  if (moods.has('healing')) return { genre: 'ambient', hint: 'piano + field recordings' };
  return { genre: 'cinematic', hint: 'strings + slow piano' };
}

// ----- Remote hooks (with local fallback) -----

async function classifyWithRemote(material, options = {}) {
  const endpoint = options.endpoint || DEFAULT_ENDPOINT;
  if (!endpoint) return annotateMaterials([material], options)[0];
  try {
    const response = await fetch(`${endpoint}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: material.name, type: material.type, mimeType: material.mimeType }),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const remote = await response.json();
    return {
      ...material,
      mood: remote.mood ?? detectMood(material.name),
      tags: Array.isArray(remote.tags) && remote.tags.length ? remote.tags : detectTags(material.name),
      takenAt: remote.takenAt ?? null,
      location: remote.location ?? '',
      caption: remote.caption ?? '',
      _remote: true,
    };
  } catch {
    return annotateMaterials([material], options)[0];
  }
}

async function suggestTitleWithRemote(materials, options = {}) {
  const endpoint = options.endpoint || DEFAULT_ENDPOINT;
  if (!endpoint) return suggestTitle(materials, options.lang);
  try {
    const response = await fetch(`${endpoint}/title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        materials: materials.map((m) => ({ id: m.id, name: m.name, type: m.type, takenAt: m.takenAt })),
        lang: options.lang || 'en',
      }),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const remote = await response.json();
    return remote.title || suggestTitle(materials, options.lang);
  } catch {
    return suggestTitle(materials, options.lang);
  }
}

async function annotateMaterialsRemote(materials, options = {}) {
  // Try remote per-material, fall back to local. Runs in parallel.
  if (!options.endpoint) return annotateMaterials(materials, options);
  const results = await Promise.all(materials.map((m) => classifyWithRemote(m, options)));
  return results;
}

export {
  annotateMaterials,
  pickMainShards,
  suggestTitle,
  groupMaterials,
  suggestMusic,
  detectMood,
  detectTags,
  detectDate,
  classifyWithRemote,
  suggestTitleWithRemote,
  annotateMaterialsRemote,
  DEFAULT_ENDPOINT,
};
