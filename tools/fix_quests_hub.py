# tools/fix_quests_hub.py
import os
import re

ROOT = r'D:\crypto'
TARGET_FILES = [
    os.path.join(ROOT, 'index_v9.html'),
    os.path.join(ROOT, 'index.html'),
    os.path.join(ROOT, 'saas', 'public', 'index.html')
]

# Quests Hub HTML Section
quests_hub_html = """
<!-- QUESTS HUB VIEW -->
<section id="quests" class="view">
  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px">
    <div>
      <h1 style="margin:0 0 6px">🎮 Сюжетные квесты и симуляторы выживания</h1>
      <p class="sub" style="margin:0">9 интерактивных симуляторов боевых ситуаций: кибератаки, психология недели, паника, ликвидации, аудит бэктестов и ночные инциденты.</p>
    </div>
  </div>

  <div id="quests_cards_grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:16px; margin-top:20px">
    <!-- Rendered dynamically by renderQuestsHub() -->
  </div>
</section>
"""

# JS renderQuestsHub implementation
render_quests_hub_js = """
/* =========================================================================
   QUESTS HUB ENGINE (9 ИНТЕРАКТИВНЫХ КВЕСТОВ)
   ========================================================================= */
function renderQuestsHub(){
  const grid = document.getElementById('quests_cards_grid');
  if(!grid) return;

  const questsData = [
    {
      id: 'quest',
      icon: '🕵️',
      title: 'Криптик против Мошенника',
      desc: '7 эпизодов против Ската. Выживи под атаками фишинга, отравленных контрактов, фейковых дропов и P2P-разводов. Сохрани 5 000 USDT.',
      badge: 'Эпизодов: 7',
      action: 'qGo()',
      wipe: 'qWipe()',
      getProgress: function(){
        try {
          const p = JSON.parse(localStorage.getItem('sq_progress') || 'null');
          if (p && p.done && p.done.length) {
            return { started: true, done: p.done.length === 7, text: 'Пройдено: ' + p.done.length + '/7' };
          }
        } catch(e){}
        return { started: false, done: false, text: 'Не начат' };
      }
    },
    {
      id: 'psyquest',
      icon: '🧠',
      title: 'Семь дней: ты против себя',
      desc: 'Неделя работы оператора бота. Враг — внутренний голос. Пройди 7 дней с удержанием капитала и устава без импульсивных вмешательств.',
      badge: 'Дней: 7',
      action: 'pqGo()',
      wipe: 'pqWipe()',
      getProgress: function(){
        try {
          const p = JSON.parse(localStorage.getItem('cn_psy_quest') || 'null');
          if (p && p.d > 0) {
            return { started: true, done: p.done, text: p.done ? ('Итог: ' + (p.right || 0) + '/7') : ('День ' + p.d + '/7') };
          }
        } catch(e){}
        return { started: false, done: false, text: 'Не начат' };
      }
    },
    {
      id: 'panicquest',
      icon: '🚨',
      title: 'Симулятор паники',
      desc: '6 кризисов: научись мгновенно отличать «рынок падает» (норма) от «инфраструктура сломана» (авария). В 90% случаев спасает хладнокровие.',
      badge: 'Кризисов: 6',
      action: 'pnGo()',
      wipe: 'pnWipe(false)',
      getProgress: function(){
        try {
          const p = JSON.parse(localStorage.getItem('cn_panic_progress') || 'null');
          if (p && p.i > 0) {
            return { started: true, done: p.done, text: p.done ? ('Результат: ' + (p.best || 0) + '%') : ('Раунд ' + (p.i + 1) + '/6') };
          }
        } catch(e){}
        return { started: false, done: false, text: 'Не начат' };
      }
    },
    {
      id: 'marginquest',
      icon: '💥',
      title: 'Маржин-колл: экзамен по сайзингу',
      desc: '10 сделок на реальной статистике. Стратегия рабочая — единственный вопрос в плече и доле риска. Настрой сайзинг и выживи.',
      badge: 'Сделок: 10',
      action: 'mcGo()',
      wipe: 'mcWipe()',
      getProgress: function(){
        try {
          const p = JSON.parse(localStorage.getItem('cn_margin_progress') || 'null');
          if (p && p.r > 0) {
            return { started: true, done: p.done, text: p.done ? ('Капитал: ' + (p.cap ? p.cap.toLocaleString('ru-RU') : 0) + ' ₽') : ('Сделка ' + (p.r + 1) + '/10') };
          }
        } catch(e){}
        return { started: false, done: false, text: 'Не начат' };
      }
    },
    {
      id: 'curvequest',
      icon: '📉',
      title: 'Кривая-обманщица: аудит бэктестов',
      desc: 'Инвесткомитет по квант-алгоритмам. 8 стратегий с красивыми эквити: распознай оверфиттинг, заглядывание в будущее и выбери честную.',
      badge: 'Бэктестов: 8',
      action: 'cvGo()',
      wipe: 'cvWipe()',
      getProgress: function(){
        try {
          const p = JSON.parse(localStorage.getItem('cn_curve_progress') || 'null');
          if (p && p.i > 0) {
            return { started: true, done: p.done, text: p.done ? ('Угадано: ' + (p.ok || 0) + '/8') : ('Кейс ' + (p.i + 1) + '/8') };
          }
        } catch(e){}
        return { started: false, done: false, text: 'Не начат' };
      }
    },
    {
      id: 'yieldquest',
      icon: '🎯',
      title: 'Охотник за доходностью',
      desc: '8 предложений «пассивного дохода»: майнинг, стейкинг, DeFi, NFT, опционы, дропы. Отличи честный процент от скрытых пирамид.',
      badge: 'Предложений: 8',
      action: 'yhGo()',
      wipe: 'yhWipe()',
      getProgress: function(){
        try {
          const p = JSON.parse(localStorage.getItem('cn_yield_progress') || 'null');
          if (p && p.i > 0) {
            return { started: true, done: p.done, text: p.done ? ('Верно: ' + (p.right || 0) + '/8') : ('Шаг ' + (p.i + 1) + '/8') };
          }
        } catch(e){}
        return { started: false, done: false, text: 'Не начат' };
      }
    },
    {
      id: 'firstquest',
      icon: '🌱',
      title: 'Первые деньги: месяц новичка',
      desc: '100 000 ₽ и ноль опыта. 8 критических решений первого месяца: от первого депозита до плеча x20. Пройди без классических ошибок.',
      badge: 'Решений: 8',
      action: 'fmGo()',
      wipe: 'fmWipe()',
      getProgress: function(){
        try {
          const p = JSON.parse(localStorage.getItem('cn_first_progress') || 'null');
          if (p && p.i > 0) {
            return { started: true, done: p.done, text: p.done ? ('Счёт: ' + (p.best || 0) + '/100') : ('Шаг ' + (p.i + 1) + '/8') };
          }
        } catch(e){}
        return { started: false, done: false, text: 'Не начат' };
      }
    },
    {
      id: 'launchquest',
      icon: '🚀',
      title: 'Первый запуск: чек-лист бота',
      desc: '8 категорий предстартовой проверки боевого робота до включения: тестнет, лимиты, алерты, проскальзывание, Kill-Switch.',
      badge: 'Категорий: 8',
      action: 'lnGo()',
      wipe: 'lnWipe()',
      getProgress: function(){
        try {
          const p = JSON.parse(localStorage.getItem('cn_launch_progress') || 'null');
          if (p && p.i > 0) {
            return { started: true, done: p.done, text: p.done ? 'Готов к запуску' : ('Чек ' + (p.i + 1) + '/8') };
          }
        } catch(e){}
        return { started: false, done: false, text: 'Не начат' };
      }
    },
    {
      id: 'prodquest',
      icon: '🌙',
      title: 'Ночь в проде: дежурство по ранбуку',
      desc: '6 аварийных ночных инцидентов до наступления утра: скачок фандинга, зависший API-запрос, отвал лимитного ордера. Решай по уставу.',
      badge: 'Инцидентов: 6',
      action: 'prGo()',
      wipe: 'prWipe()',
      getProgress: function(){
        try {
          const p = JSON.parse(localStorage.getItem('cn_prod_progress') || 'null');
          if (p && p.i > 0) {
            return { started: true, done: p.done, text: p.done ? 'Ночь пройдена' : ('Инцидент ' + (p.i + 1) + '/6') };
          }
        } catch(e){}
        return { started: false, done: false, text: 'Не начат' };
      }
    }
  ];

  let html = '';
  questsData.forEach(q => {
    const prog = q.getProgress();
    const btnLabel = prog.done ? '🔄 Пройти заново' : (prog.started ? '▶ Продолжить' : '🎮 Начать квест');
    const badgeColor = prog.done ? 'var(--ok)' : (prog.started ? 'var(--warn)' : 'var(--mut)');
    const badgeBg = prog.done ? 'rgba(34,197,94,.1)' : (prog.started ? 'rgba(234,179,8,.1)' : 'rgba(255,255,255,.05)');

    html += `
      <div style="background:var(--card,#0f172a); border:1px solid var(--line); border-radius:12px; padding:20px; display:flex; flex-direction:column; justify-content:space-between; transition:transform .15s, border-color .15s">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px">
            <span style="font-size:32px; line-height:1">${q.icon}</span>
            <span class="badge" style="background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeColor}; font-size:11.5px; font-weight:700">
              ${prog.text}
            </span>
          </div>
          <h3 style="margin:0 0 8px; font-size:16px; color:var(--txt); font-weight:700">${q.title}</h3>
          <p style="margin:0 0 16px; font-size:13px; color:var(--mut); line-height:1.5">${q.desc}</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center; margin-top:12px">
          <button class="btn primary" style="flex:1" onclick="${q.action}">
            ${btnLabel}
          </button>
          ${prog.started && !prog.done ? `<button class="btn ghost sm" title="Сбросить" onclick="${q.wipe}">🔄</button>` : ''}
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}
"""

def process_file(fpath):
    print(f"Processing {os.path.basename(fpath)}...")
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update Navigation Bar in Practice group
    old_nav_pattern = r'<div class="nav-group">\s*<span class="nav-group-label">🕹️ Практика</span>.*?</div>\s*<div class="nav-group">\s*<span class="nav-group-label">📖 Справка</span>'
    new_nav = """<div class="nav-group">
    <span class="nav-group-label">🕹️ Практика</span>
    <button class="tab" data-tab="sims">Симуляторы</button>
    <button class="tab" data-tab="quests">🎮 Квесты</button>
    <button class="tab" data-tab="quiz">Викторина</button>
    <button class="tab" data-tab="live">🌍 Живой рынок</button>
  </div>
  <div class="nav-group">
    <span class="nav-group-label">📖 Справка</span>"""
    content = re.sub(old_nav_pattern, new_nav, content, flags=re.DOTALL)

    # 2. Add Quests Hub Section if not present
    if '<section id="quests"' not in content:
        content = content.replace('<section id="sims" class="view">', quests_hub_html + '\n<section id="sims" class="view">')

    # 3. Update go(t) to handle quests and all individual quest views with safe initializers
    go_init_block = """  if(t==='progress')renderStats();
  if(t==='lessons')renderPhaseLessonsView(curPhaseLesson);
  if(t==='tests')renderPhaseTestView(curPhaseTest);
  if(t==='sims')initSims();
  if(t==='quests'){ if(typeof renderQuestsHub === 'function') renderQuestsHub(); }
  if(t==='quest'){ if(typeof qRender === 'function') qRender(); }
  if(t==='psyquest'){ if(typeof PQ_S === 'object' && PQ_S.d === 0) PQ_S.d = 1; if(typeof pqRender === 'function') pqRender(); }
  if(t==='panicquest'){ if(typeof PN === 'object' && (!PN.order || PN.order.length < 6) && typeof pnShuffle === 'function') PN.order = pnShuffle(); if(typeof pnRender === 'function') pnRender(); }
  if(t==='marginquest'){ if(typeof mcRender === 'function') mcRender(); }
  if(t==='curvequest'){ if(typeof CV === 'object' && (!CV.order || CV.order.length < 8) && typeof cvShuffle === 'function') CV.order = cvShuffle(); if(typeof cvRender === 'function') cvRender(); }
  if(t==='yieldquest'){ if(typeof YH === 'object' && (!YH.order || YH.order.length < 8) && typeof yhShuffle === 'function') YH.order = yhShuffle(); if(typeof yhRender === 'function') yhRender(); }
  if(t==='firstquest'){ if(typeof FM === 'object' && (!FM.order || FM.order.length < 8) && typeof fmShuffle === 'function') FM.order = fmShuffle(); if(typeof fmRender === 'function') fmRender(); }
  if(t==='launchquest'){ if(typeof LN === 'object' && (!LN.order || LN.order.length < 8) && typeof lnShuffle === 'function') LN.order = lnShuffle(); if(typeof lnRender === 'function') lnRender(); }
  if(t==='prodquest'){ if(typeof PR === 'object' && (!PR.order || PR.order.length < 6) && typeof prShuffle === 'function') PR.order = prShuffle(); if(typeof prRender === 'function') prRender(); }
  if(t==='glossary'){ if(typeof renderChips === 'function') renderChips(); renderGloss(); }
  if(t==='earnings')initEarningMethods();
  if(t==='quiz')startQuiz();"""

    old_go_pattern = r'if\(t===[\'"]progress[\'"]\)renderStats\(\);.*?if\(t===[\'"]quiz[\'"]\)startQuiz\(\);'
    content = re.sub(old_go_pattern, go_init_block, content, flags=re.DOTALL)

    # 4. Insert renderQuestsHub function into scripts
    if 'function renderQuestsHub()' not in content:
        marker = '/* =========================================================================\n   7. ЛОГИКА УРОКОВ'
        content = content.replace(marker, render_quests_hub_js + '\n\n' + marker)
    else:
        # replace existing definition
        start_idx = content.find('/* =========================================================================\n   QUESTS HUB ENGINE')
        end_idx = content.find('/* =========================================================================\n   7. ЛОГИКА УРОКОВ')
        if start_idx != -1 and end_idx != -1:
            content = content[:start_idx] + render_quests_hub_js + '\n\n' + content[end_idx:]

    # 5. Update back buttons to return to go('quests') with text "← К квестам"
    content = content.replace("function qBack(){go('sims')}", "function qBack(){go('quests')}")
    content = content.replace("function pqBack(){go('sims')}", "function pqBack(){go('quests')}")
    content = content.replace("function pnBack(){go('sims')}", "function pnBack(){go('quests')}")
    content = content.replace("function mcBack(){go('sims')}", "function mcBack(){go('quests')}")
    content = content.replace("function cvBack(){go('sims')}", "function cvBack(){go('quests')}")
    content = content.replace("function yhBack(){go('sims')}", "function yhBack(){go('quests')}")
    content = content.replace("function fmBack(){go('sims')}", "function fmBack(){go('quests')}")
    content = content.replace("function lnBack(){go('sims')}", "function lnBack(){go('quests')}")
    content = content.replace("function prBack(){go('sims')}", "function prBack(){go('quests')}")

    content = re.sub(r'← К симуляторам', '← К квестам', content)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Successfully fixed Quests Hub in {os.path.basename(fpath)}")

for f in TARGET_FILES:
    process_file(f)
