(() => {
  const originalRenderInsights = renderInsights;

  const numerologyMeanings = {
    1:{title:'Initiation & independence',copy:'This number emphasizes self-direction, courage, leadership and starting something with clear intent.'},
    2:{title:'Partnership & sensitivity',copy:'This number emphasizes cooperation, patience, diplomacy, emotional awareness and working well with others.'},
    3:{title:'Expression & creativity',copy:'This number emphasizes communication, imagination, sociability, optimism and giving ideas a visible form.'},
    4:{title:'Structure & discipline',copy:'This number emphasizes reliability, planning, practical effort, boundaries and building something that can last.'},
    5:{title:'Change & freedom',copy:'This number emphasizes movement, adaptability, experimentation, variety and learning through direct experience.'},
    6:{title:'Care & responsibility',copy:'This number emphasizes relationships, service, home, loyalty, stewardship and creating stability for people you value.'},
    7:{title:'Reflection & insight',copy:'This number emphasizes analysis, inner work, research, discernment, privacy and understanding before acting.'},
    8:{title:'Ambition & stewardship',copy:'This number emphasizes execution, authority, resources, achievement, accountability and using power responsibly.'},
    9:{title:'Completion & compassion',copy:'This number emphasizes closure, perspective, generosity, forgiveness and releasing what has reached the end of its cycle.'},
    11:{title:'Intuition & inspiration',copy:'This master number emphasizes heightened sensitivity, vision, inspiration and turning strong impressions into grounded choices.'},
    22:{title:'Vision made practical',copy:'This master number emphasizes long-range building, organization, responsibility and turning an ambitious idea into something useful.'},
    33:{title:'Compassionate leadership',copy:'This master number emphasizes teaching, care, service, emotional responsibility and helping others without losing healthy boundaries.'},
  };

  const animalMeanings = {
    Rat:'resourceful, observant and quick to adapt', Ox:'steady, patient and dependable', Tiger:'bold, independent and action-oriented',
    Rabbit:'diplomatic, sensitive and harmony-seeking', Dragon:'ambitious, expressive and visionary', Snake:'strategic, intuitive and private',
    Horse:'energetic, freedom-loving and direct', Goat:'creative, empathetic and peace-oriented', Monkey:'inventive, curious and versatile',
    Rooster:'precise, candid and improvement-focused', Dog:'loyal, principled and protective', Pig:'generous, sincere and comfort-oriented',
  };

  const elementMeanings = {
    Wood:'growth, learning, flexibility and expansion', Fire:'visibility, passion, momentum and expression',
    Earth:'stability, practicality, patience and grounding', Metal:'standards, discipline, precision and resolve',
    Water:'intuition, adaptability, depth and reflection',
  };

  const signMeanings = {
    Aries:'direct, initiating and courageous', Taurus:'steady, practical and value-conscious', Gemini:'curious, adaptable and communicative',
    Cancer:'protective, intuitive and emotionally responsive', Leo:'expressive, confident and creative', Virgo:'analytical, useful and improvement-oriented',
    Libra:'relational, diplomatic and balance-seeking', Scorpio:'intense, private and transformative', Sagittarius:'exploratory, candid and meaning-seeking',
    Capricorn:'disciplined, strategic and responsibility-focused', Aquarius:'independent, future-oriented and unconventional', Pisces:'imaginative, empathetic and intuitive',
  };

  const planetRoles = {
    Sun:'core identity and the way you naturally try to shine', Moon:'emotional needs, instincts and your private response pattern',
    Mercury:'thinking, learning and communication style', Venus:'values, attraction, affection and relationship style',
    Mars:'motivation, assertion, desire and how you take action', Jupiter:'growth, confidence, beliefs and where you seek expansion',
    Saturn:'discipline, responsibility, limits and long-term lessons', Uranus:'independence, disruption and the urge to do things differently',
    Neptune:'imagination, ideals, sensitivity and where boundaries may blur', Pluto:'deep change, power, intensity and regeneration',
  };

  const houseMeanings = {
    1:'identity, appearance and how you enter situations', 2:'money, possessions, values and self-worth', 3:'communication, learning, siblings and your immediate environment',
    4:'home, family, roots and private foundations', 5:'creativity, pleasure, romance and self-expression', 6:'routines, work habits, service and wellbeing',
    7:'partnerships, agreements and one-to-one relationships', 8:'shared resources, intimacy, endings and transformation', 9:'beliefs, higher learning, travel and wider perspective',
    10:'career, reputation, responsibility and public direction', 11:'friends, networks, community and long-range hopes', 12:'solitude, the unconscious, retreat and inner spiritual life',
  };

  function numberMeaning(value) {
    return numerologyMeanings[value] || { title:'Personal theme', copy:'Use this number as a reflective theme rather than a prediction.' };
  }

  function scoreBand(value) {
    if (value >= 80) return {label:'Favorable', copy:'The day shows strong symbolic alignment. Use the momentum for deliberate progress, while still checking practical facts and constraints.'};
    if (value >= 60) return {label:'Supportive', copy:'The day looks broadly balanced. Move important work forward, but leave some flexibility for changes in energy or circumstances.'};
    if (value >= 40) return {label:'Neutral / mixed', copy:'The signals are mixed rather than negative. Prioritize essentials, reduce unnecessary pressure and rely more heavily on practical judgment.'};
    if (value >= 20) return {label:'Caution', copy:'The day suggests a lighter, more deliberate pace. Avoid overloading the schedule and give important decisions extra review.'};
    return {label:'Rest / review', copy:'The day favors recovery, reflection and low-risk maintenance over forcing major outcomes.'};
  }

  function zodiacBand(value) {
    if (value >= 85) return {label:'Strong resonance',copy:'Your natal-year symbolism and the current Chinese year are strongly compatible in this reflection framework.'};
    if (value >= 70) return {label:'Supportive resonance',copy:'The current year broadly supports the qualities associated with your natal sign, with relatively little symbolic friction.'};
    if (value >= 55) return {label:'Mixed resonance',copy:'The year combines supportive and contrasting themes. Adaptability and conscious pacing may matter more than forcing consistency.'};
    return {label:'Challenging contrast',copy:'The current year contrasts more strongly with your natal symbolism. Treat this as a prompt for patience, flexibility and perspective.'};
  }

  function cycleCard(label, value, scope) {
    const meaning = numberMeaning(value);
    return `<div class="insight-cycle"><span>${label}</span><strong>${value}</strong><b>${esc(meaning.title)}</b><small>${esc(scope)} ${esc(meaning.copy)}</small></div>`;
  }

  function houseNote(placement) {
    const house = Number(placement?.house);
    if (!Number.isInteger(house) || !houseMeanings[house]) return '';
    return ` House ${house} places this theme around ${houseMeanings[house]}.`;
  }

  function placementRow(name, placement) {
    if (!placement?.sign) return '';
    const role = planetRoles[name] || 'a personal theme';
    const signCopy = signMeanings[placement.sign] || 'a distinct style of expression';
    return `<div class="insight-meaning-row"><span><b>${esc(name)} in ${esc(placement.sign)}</b><small>${esc(role)}. In ${esc(placement.sign)}, this tends to express in a ${esc(signCopy)} way.${esc(houseNote(placement))}</small></span></div>`;
  }

  function enhanceNumerology(card, i) {
    if (!card) return;
    const life = numberMeaning(i.lifePath);
    card.innerHTML = `
      <div class="module-head"><div><span class="eyebrow">Numerology · Meaning</span><h3 style="margin:6px 0 0">Life Path ${i.lifePath} · ${esc(life.title)}</h3></div><span class="module-icon">◌</span></div>
      <div class="module-value">${i.lifePath}</div><div class="module-sub">Life Path</div>
      <p class="module-copy"><strong>What it represents:</strong> your Life Path is the broad, long-term theme used in numerology to describe recurring motivations, strengths and lessons. ${esc(life.copy)}</p>
      <div class="insight-cycle-grid">
        ${cycleCard('Personal Year', i.personalYear, 'The broad theme coloring the current year.')}
        ${cycleCard('Personal Month', i.personalMonth, 'The shorter-term emphasis within that yearly theme.')}
        ${cycleCard('Personal Day', i.personalDay, 'The immediate tone for today, useful for pacing and focus.')}
      </div>`;
  }

  function enhanceZodiac(card, i) {
    if (!card) return;
    const natal = i.zodiac.natal, current = i.zodiac.current, band = zodiacBand(i.zodiacScore);
    card.innerHTML = `
      <div class="module-head"><div><span class="eyebrow">Chinese Zodiac · Meaning</span><h3 style="margin:6px 0 0">${esc(natal.element)} ${esc(natal.animal)}</h3></div><span class="module-icon">◇</span></div>
      <div class="module-value">${i.zodiacScore}</div><div class="module-sub">${esc(band.label)} · year harmony</div>
      <p class="module-copy"><strong>What ${i.zodiacScore}/100 represents:</strong> ${esc(band.copy)}</p>
      <div class="insight-meaning-list">
        <div class="insight-meaning-row"><span><b>Your natal sign · ${esc(natal.element)} ${esc(natal.animal)}</b><small>The ${esc(natal.animal)} is associated with being ${esc(animalMeanings[natal.animal] || 'distinctive')}; ${esc(natal.element)} adds themes of ${esc(elementMeanings[natal.element] || 'personal expression')}.</small></span></div>
        <div class="insight-meaning-row"><span><b>Current year · ${esc(current.element)} ${esc(current.animal)}</b><small>This year emphasizes ${esc(animalMeanings[current.animal] || 'its own symbolic qualities')}, with ${esc(current.element)} themes of ${esc(elementMeanings[current.element] || 'change and development')}.</small></span></div>
      </div>`;
  }

  function enhanceScore(card, i) {
    if (!card) return;
    const band = scoreBand(i.score);
    card.innerHTML = `
      <div class="module-head"><div><span class="eyebrow">Cosmic Score · Meaning</span><h3 style="margin:6px 0 0">${esc(band.label)}</h3></div><span class="module-icon">✦</span></div>
      <div class="module-value">${i.score}</div><div class="module-sub">Daily alignment</div>
      <p class="module-copy"><strong>What ${i.score}/100 represents:</strong> ${esc(band.copy)}</p>
      <div class="insight-meaning-row"><span><b>How to use it</b><small>Treat the score as a reflection and pacing signal. Higher numbers suggest leaning into planned activity; lower numbers suggest simplifying, reviewing and allowing more margin. It is not a probability of success.</small></span></div>`;
  }

  function enhanceAstrology(card) {
    if (!card) return;
    const astro = state.astrology;
    if (state.mode === 'demo') {
      card.innerHTML = `<div class="module-head"><div><span class="eyebrow">Astrology · Meaning</span><h3 style="margin:6px 0 0">Natal interpretation</h3></div><span class="module-icon">☾</span></div><div class="module-value">—</div><div class="module-sub">Sign in required</div><p class="module-copy">Sign in and complete your birth time, timezone and coordinates to see interpretations of your Sun, Moon, Ascendant, planets and house numbers. Demo mode does not invent placements.</p>`;
      return;
    }
    if (astro?.status !== 'ready') {
      const copy = !state.profile?.birth_time ? 'Add your birth time and timezone to unlock natal interpretations.' : 'Your natal interpretation will appear here when the astrology calculation is available.';
      card.innerHTML = `<div class="module-head"><div><span class="eyebrow">Astrology · Meaning</span><h3 style="margin:6px 0 0">Natal interpretation</h3></div><span class="module-icon">☾</span></div><div class="module-value">${astro?.status === 'loading' ? '…' : '—'}</div><div class="module-sub">${astro?.status === 'loading' ? 'Preparing your placements' : 'Profile details required'}</div><p class="module-copy">${esc(copy)}</p>`;
      return;
    }

    const { planets = {}, ascendant } = astro.data;
    const sun = planets.Sun, moon = planets.Moon;
    const sunMeaning = signMeanings[sun?.sign] || 'distinctive and personal';
    const rows = ['Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].map((name) => placementRow(name, planets[name])).join('');
    const ascRow = ascendant?.sign ? `<div class="insight-meaning-row"><span><b>Ascendant in ${esc(ascendant.sign)}</b><small>Your Ascendant represents your outward approach, first impression and the style you use when entering new situations. In ${esc(ascendant.sign)}, that approach tends to be ${esc(signMeanings[ascendant.sign] || 'distinctive')}. It also anchors House 1, the area of identity and self-presentation.</small></span></div>` : '';

    card.innerHTML = `
      <div class="module-head"><div><span class="eyebrow">Astrology · Meaning</span><h3 style="margin:6px 0 0">Your natal themes</h3></div><span class="module-icon">☾</span></div>
      <div class="module-value" style="font-size:${String(sun?.sign || '—').length > 8 ? '30px' : '42px'}">${esc(sun?.sign || '—')}</div>
      <div class="module-sub">Sun sign · core identity</div>
      <p class="module-copy"><strong>Sun in ${esc(sun?.sign || '—')}</strong> represents your central identity, vitality and the qualities you tend to develop deliberately. This placement is traditionally read as ${esc(sunMeaning)}.</p>
      <div class="insight-meaning-list">${ascRow}${rows}</div>
      ${astro.data?.houses?.cusps?.length === 12 ? `<details class="house-guide"><summary>What the 12 house numbers represent</summary><div class="house-guide-grid">${Object.entries(houseMeanings).map(([house, meaning]) => `<div><b>House ${house}</b><span>${esc(meaning)}</span></div>`).join('')}</div></details>` : ''}
      <button class="ghost-btn" id="refreshAstrology" type="button">Refresh natal interpretation</button>`;
    document.querySelector('#refreshAstrology')?.addEventListener('click', () => void window.CosmicAstrology?.calculate(true));
  }

  function replaceFormulaWithMeaningGuide(page) {
    const formula = page.querySelector('.formula');
    const section = formula?.closest('section.card');
    if (!section) return;
    section.id = 'insightMeaningGuide';
    section.innerHTML = `
      <span class="eyebrow">HOW TO READ THE SCORE</span>
      <h2 style="margin:7px 0 10px">A guide to what the number means.</h2>
      <p class="module-copy">The Cosmic Score is presented as a reflective pacing signal, not as a probability, prediction or guarantee.</p>
      <div class="score-meaning-list">
        <div><b>80–100 · Favorable</b><span>Strong symbolic alignment. Good for intentional forward movement when practical conditions also support it.</span></div>
        <div><b>60–79 · Supportive</b><span>Generally balanced. Progress is supported, with room for flexibility and ordinary caution.</span></div>
        <div><b>40–59 · Neutral / mixed</b><span>Mixed signals. Focus on essentials and lean more heavily on real-world evidence and priorities.</span></div>
        <div><b>20–39 · Caution</b><span>Use a lighter pace, avoid unnecessary pressure and review important choices carefully.</span></div>
        <div><b>0–19 · Rest / review</b><span>Favor recovery, maintenance, reflection and low-risk activity instead of forcing major outcomes.</span></div>
      </div>
      <div class="alpha-disclaimer">Numerology, Chinese Zodiac and astrology are cultural/spiritual reflection frameworks, not scientifically validated predictors. Do not base financial, medical, legal or other high-stakes decisions on these scores.</div>`;
  }

  function enhanceInterpretations() {
    const page = document.querySelector('#page-insights');
    if (!page) return;
    const i = insight();
    if (!i) return;
    if (state.page === 'insights') {
      const eyebrow = document.querySelector('#pageEyebrow');
      if (eyebrow) eyebrow.textContent = 'WHAT YOUR RESULTS MEAN';
    }
    const modules = [...page.querySelectorAll('.insight-module')];
    const byEyebrow = (prefix) => modules.find((module) => module.querySelector('.eyebrow')?.textContent.trim().startsWith(prefix));
    enhanceNumerology(byEyebrow('Numerology'), i);
    enhanceZodiac(byEyebrow('Chinese Zodiac'), i);
    enhanceScore(byEyebrow('Cosmic Score'), i);
    enhanceAstrology(byEyebrow('Astrology'));
    replaceFormulaWithMeaningGuide(page);
  }

  renderInsights = function alpha30InterpretiveInsights() {
    originalRenderInsights();
    enhanceInterpretations();
  };

  window.CosmicInsightMeanings = Object.freeze({ numberMeaning, scoreBand, zodiacBand, houseMeanings });
})();
