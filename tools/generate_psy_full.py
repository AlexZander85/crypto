# tools/generate_psy_full.py
import re
import json
import os

ROOT = r'D:\crypto'
CURR_DIR = os.path.join(ROOT, 'docs', 'psy_curriculum')

# Helper to parse each markdown section into clean JSON lesson object
def parse_markdown_lesson(text, lesson_num, lesson_id):
    # Title
    m_title = re.match(r'^(.*?)\n', text.strip())
    raw_title = m_title.group(1).strip() if m_title else f'Урок {lesson_num}'
    title = re.sub(r'^[#\s\d\.]+', '', raw_title).strip()
    
    # Lead
    m_lead = re.search(r'\*\*Крючок\s*\([^)]*\):\*\*\s*(.*?)(?=\n\n\*\*|\n\*\*|$)', text, re.DOTALL)
    lead = m_lead.group(1).strip() if m_lead else ''
    lead = re.sub(r'\s+', ' ', lead)
    
    # Terms
    terms = []
    m_terms_sec = re.search(r'\*\*Понятия:\*\*\s*(.*?)(?=\n\n\*\*|\n\*\*|$)', text, re.DOTALL)
    if m_terms_sec:
        for tline in m_terms_sec.group(1).strip().split('\n'):
            tline = tline.strip()
            if tline.startswith('-'):
                t_m = re.match(r'-\s*\*\*([^*]+)\*\*\s*[—–-]\s*(.*)', tline)
                if t_m:
                    ru_term = t_m.group(1).strip()
                    desc_term = t_m.group(2).strip()
                    terms.append({'ru': ru_term, 'en': '—', 'desc': desc_term})
    if not terms:
        terms.append({'ru': title, 'en': '—', 'desc': lead[:100]})

    # Levels 1-4 & simpleAnalogy
    lvl1 = ""
    lvl2 = ""
    lvl3 = ""
    lvl4 = ""
    analogy = ""
    
    m_lvl_sec = re.search(r'\*\*Объяснение по уровням:\*\*\s*(.*?)(?=\n\n\*\*|\n\*\*|$)', text, re.DOTALL)
    if m_lvl_sec:
        lvl_text = m_lvl_sec.group(1)
        m1 = re.search(r'\*Уровень 1[^:]*:\*\s*(.*?)(?=\n\s*-\s*\*Уровень|\n\s*\*Уровень|$)', lvl_text, re.DOTALL)
        m2 = re.search(r'\*Уровень 2[^:]*:\*\s*(.*?)(?=\n\s*-\s*\*Уровень|\n\s*\*Уровень|$)', lvl_text, re.DOTALL)
        m3 = re.search(r'\*Уровень 3[^:]*:\*\s*(.*?)(?=\n\s*-\s*\*Уровень|\n\s*\*Уровень|$)', lvl_text, re.DOTALL)
        m4 = re.search(r'\*Уровень 4[^:]*:\*\s*(.*?)(?=\n\s*-\s*\*Уровень|\n\s*\*Уровень|$)', lvl_text, re.DOTALL)
        if m1: lvl1 = re.sub(r'\s+', ' ', m1.group(1)).strip()
        if m2: lvl2 = re.sub(r'\s+', ' ', m2.group(1)).strip()
        if m3: lvl3 = re.sub(r'\s+', ' ', m3.group(1)).strip()
        if m4: lvl4 = re.sub(r'\s+', ' ', m4.group(1)).strip()

    m_ana = re.search(r'\*\*Пример из жизни:\*\*\s*(.*?)(?=\n\n\*\*|\n\*\*|$)', text, re.DOTALL)
    if m_ana:
        analogy = re.sub(r'\s+', ' ', m_ana.group(1)).strip()

    # Warn
    warn_text = ""
    m_warn = re.search(r'\*\*Предупреждение:\*\*\s*(.*?)(?=\n\n\*\*|\n\*\*|$)', text, re.DOTALL)
    if m_warn:
        warn_text = re.sub(r'\s+', ' ', m_warn.group(1)).strip()

    # Numbers
    num_text = ""
    m_num = re.search(r'\*\*Числа[^:]*:\*\*\s*(.*?)(?=\n\n\*\*|\n\*\*|$)', text, re.DOTALL)
    if m_num:
        num_text = re.sub(r'\s+', ' ', m_num.group(1)).strip()

    # Interactive widget
    wid_title = ""
    wid_desc = ""
    wid_id = f"widget_ps_l{lesson_num}"
    m_wid = re.search(r'\*\*Интерактив[^:]*:\*\*\s*([^\n—–-]+)[—–-]\s*(.*?)(?=\n\n\*\*|\n\*\*|$)', text, re.DOTALL)
    if m_wid:
        wid_title = m_wid.group(1).strip()
        wid_desc = re.sub(r'\s+', ' ', m_wid.group(2)).strip()
    else:
        wid_title = f"Тренажер урока П{lesson_num}"
        wid_desc = "Интерактивная практика и симуляция сценария."

    # Recap
    recap_points = []
    m_rec = re.search(r'\*\*Итог[^:]*:\*\*\s*(.*?)(?=\n\n\*\*|\n\*\*|$)', text, re.DOTALL)
    if m_rec:
        for rline in m_rec.group(1).strip().split('\n'):
            rline = rline.strip()
            if rline.startswith(('1.', '2.', '3.', '-', '•')):
                clean_r = re.sub(r'^[\d\.\-•\s]+', '', rline).strip()
                if clean_r:
                    recap_points.append(clean_r)
    if not recap_points:
        recap_points = [
            "Принимайте решения на основе проверяемых фактов, а не эмоций.",
            "Контролируйте размер риска и соблюдайте торговый устав.",
            "Процесс и дисциплина на дистанции определяют стабильный результат."
        ]

    # Quiz
    quiz_q = ""
    quiz_opts = []
    quiz_a = 0
    quiz_explain = ""
    m_quiz = re.search(r'\*\*Вопрос-проверка:\*\*\s*(.*?)(?=\n\*Разбор:\*|$)', text, re.DOTALL)
    if m_quiz:
        q_block = m_quiz.group(1).strip()
        q_lines = q_block.split('\n')
        quiz_q = q_lines[0].strip()
        opt_idx = 0
        for ql in q_lines[1:]:
            ql = ql.strip()
            if ql.startswith(('- [x]', '- [X]', '✅', '- [ ]', '-')):
                is_corr = ('[x]' in ql.lower() or '✅' in ql)
                opt_txt = re.sub(r'^(\-\s*\[[ xX]\]|✅|\-)\s*', '', ql).strip()
                if opt_txt:
                    if is_corr:
                        quiz_a = opt_idx
                    quiz_opts.append(opt_txt)
                    opt_idx += 1
    
    m_exp = re.search(r'\*Разбор:\*\s*(.*?)$', text, re.DOTALL)
    if m_exp:
        quiz_explain = re.sub(r'\s+', ' ', m_exp.group(1)).strip()

    if len(quiz_opts) < 4:
        quiz_opts = [
            "Поддаться эмоциям и войти увеличенным объемом",
            "Посоветоваться с анонимами в телеграм-чате",
            "Следовать регламенту устава и хладнокровно зафиксировать результат",
            "Удалить торговое приложение с телефона"
        ]
        quiz_a = 2
        quiz_explain = "Решения принимаются строго по регламенту торгового устава."

    prereq = [f"ps_l{lesson_num-1}"] if lesson_num > 1 else []

    blocks = [
        {
            "type": "concept",
            "level1": lvl1 or lead,
            "level2": lvl2 or lead,
            "level3": lvl3 or lead,
            "level4": lvl4 or "Соблюдайте уставной протокол действий.",
            "simpleAnalogy": analogy or "Сравнение с реальным физическим процессом."
        }
    ]
    if warn_text:
        blocks.append({"type": "warn", "text": warn_text})
    if num_text:
        blocks.append({"type": "numbers", "text": num_text})
    
    blocks.append({
        "type": "interactive_psy",
        "id": wid_id,
        "title": wid_title,
        "desc": wid_desc
    })
    
    blocks.append({
        "type": "recap",
        "points": recap_points[:3],
        "english": []
    })

    checks = [
        f"Я понимаю ключевую идею урока «{title}»",
        "Я знаю биологический и психологический механизм этого явления",
        "Я умею применять пошаговый протокол защиты капитала"
    ]

    lesson_obj = {
        "id": lesson_id,
        "phase": 8,
        "num": f"П{lesson_num}",
        "title": title,
        "cognitiveLoad": "medium",
        "timeEst": "8 мин",
        "lead": lead,
        "termsCount": len(terms),
        "terms": terms,
        "prerequisites": prereq,
        "blocks": blocks,
        "checks": checks,
        "quiz": {
            "q": quiz_q or f"Какой главный вывод из урока П{lesson_num} («{title}»)?",
            "opts": quiz_opts[:4],
            "a": quiz_a,
            "explain": quiz_explain or "Правильный ответ соответствует дисциплине и риск-менеджменту."
        }
    }
    return lesson_obj

print("Parser module loaded successfully.")
