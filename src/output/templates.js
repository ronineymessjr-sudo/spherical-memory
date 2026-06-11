// Anniversary / milestone templates — generate a sphere title and date stamp
// for common occasions. Pure client-side.

const TEMPLATES = {
  en: {
    annual: ({ year }) => `${year} wrapped — a sphere of every highlight`,
    graduation: ({ name, year }) => `${name || 'You'}, class of ${year} — congratulations on the new chapter.`,
    couple: ({ nameA, nameB }) => `${nameA || 'A'} & ${nameB || 'B'} — our little universe.`,
    baby: ({ name, year }) => `${name || 'Little one'}'s ${year} growth sphere`,
    trip: ({ destination }) => `${destination || 'Somewhere'}'s highlights, all in one sphere`,
  },
  zh: {
    annual: ({ year }) => `${year} 年终记忆球`,
    graduation: ({ name, year }) => `${name || '你'},${year} 毕业快乐 —— 新的章节从这颗球开始`,
    couple: ({ nameA, nameB }) => `${nameA || 'A'} 和 ${nameB || 'B'} —— 两个人的小宇宙`,
    baby: ({ name, year }) => `${name || '小宝'}${year} 成长球`,
    trip: ({ destination }) => `${destination || '某次旅行'}的精彩都留在了这颗球里`,
  },
};

function build(templateName, lang = 'zh', vars = {}) {
  return (TEMPLATES[lang] && TEMPLATES[lang][templateName])?.(vars) || null;
}

function list(lang = 'zh') {
  return Object.keys(TEMPLATES[lang] ?? TEMPLATES.zh);
}

export {
  build,
  list,
};
