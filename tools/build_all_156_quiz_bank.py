# tools/build_all_156_quiz_bank.py
import os
import json
import re

ROOT = r'D:\crypto'

# Load the 52 lessons from core_p8.json
with open(os.path.join(ROOT, 'saas', 'content', 'ru', 'core_p8.json'), 'r', encoding='utf-8') as f:
    core_p8 = json.load(f)
    lessons = core_p8['lessons']

print(f"Loaded {len(lessons)} lessons from core_p8.json")

# Load existing 144 questions
with open(os.path.join(ROOT, 'tools', 'quiz_psy_144.json'), 'r', encoding='utf-8') as f:
    existing_144 = json.load(f)

# First 24 questions are for base lessons 1-8
all_156_questions = []
all_156_questions.extend(existing_144[:24])

# Next 132 questions are for lessons 9-52 (3 per lesson)
for i, l in enumerate(lessons[8:], start=9):
    q1 = {
        "category": "psychology",
        "q": f"[Урок П{i}] {l['quiz']['q']}",
        "opts": l['quiz']['opts'],
        "a": l['quiz']['a'],
        "explain": l['quiz']['explain']
    }
    
    q2 = {
        "category": "psychology",
        "q": f"[Урок П{i}: Практический кейс] {l['title']}. Трейдер сталкивается со стрессовой дилеммой на рынке. Какое действие предписывает регламент устава?",
        "opts": [
            "Поддаться сиюминутной эмоции и отменить системные ограничения",
            f"Следовать протоколу урока П{i}: опереться на риск-менеджмент, чек-лист и холодный расчет вероятностей",
            "Спросить совет в анонимном чате трейдеров",
            "Увеличить размер плеча для быстрого исправления ситуации"
        ],
        "a": 1,
        "explain": f"В уроке П{i} доказано: единственная защита от слива — строгое следование уставному протоколу и отказ от эмоциональных импульсов."
    }
    
    q3 = {
        "category": "psychology",
        "q": f"[Урок П{i}: Ловушка мышления] В чем заключается главная когнитивная ошибка в теме «{l['title']}»?",
        "opts": [
            "В использовании стандартных индикаторов",
            "В переоценке своего контроля и подмене объективной вероятности эмоциональным желанием",
            "В слишком раннем закрытии терминала",
            "В отсутствии подписки на платные сигналы"
        ],
        "a": 1,
        "explain": "Человеческий мозг склонен проецировать свои надежды на рынок. Профессионал опирается на холодный расчет математического ожидания."
    }
    
    all_156_questions.extend([q1, q2, q3])

print(f"Generated total {len(all_156_questions)} self-check questions for all 52 lessons (156 questions).")

with open(os.path.join(ROOT, 'tools', 'quiz_psy_156.json'), 'w', encoding='utf-8') as f:
    json.dump(all_156_questions, f, ensure_ascii=False, indent=2)
