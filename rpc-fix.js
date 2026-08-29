(() => {
  // Supabase PostgREST query builders are awaitable, but they are not native
  // Promises and do not expose Promise.prototype.catch(). Keep persistence
  // non-blocking by awaiting the response and handling its error field.
  persistInsight = async function persistInsightFixed() {
    if (state.mode === 'demo' || !state.user) return true;

    const i = insight();
    if (!i) return true;

    try {
      const { error } = await sb.rpc('save_daily_insight', {
        p_date: isoDate(),
        p_score: i.score,
        p_numerology_score: i.numerologyScore,
        p_chinese_zodiac_score: i.zodiacScore,
        p_tip: i.tip,
        p_best_windows: i.windows.map(label => ({ label })),
        p_rationale: {
          life_path: i.lifePath,
          personal_year: i.personalYear,
          personal_month: i.personalMonth,
          personal_day: i.personalDay,
          natal_zodiac: i.zodiac.natal,
          current_zodiac: i.zodiac.current,
          weights: { numerology: 0.65, chinese_zodiac: 0.35 },
        },
        p_algorithm_version: 'alpha1',
      });

      if (error) {
        console.warn('Daily insight persistence skipped:', error.message || error);
        return false;
      }
      return true;
    } catch (error) {
      // A network/runtime exception should not stop the user from entering the app.
      console.warn('Daily insight persistence unavailable:', error?.message || error);
      return false;
    }
  };
})();
