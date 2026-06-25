"""
Food Diary V2 — Telegram Bot
Stack: aiogram 3, long-polling (MVP), talks to backend API over HTTP.
"""
import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, BufferedInputFile
)
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
API_BASE = os.getenv("API_BASE_URL", "http://api:5000")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("bot")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(storage=MemoryStorage())

# ── MSK helpers ───────────────────────────────────────────────────────────────
MSK = timezone(timedelta(hours=3))

def msk_now() -> datetime:
    return datetime.now(MSK)

def msk_date() -> str:
    return msk_now().strftime("%Y-%m-%d")

def msk_time() -> str:
    return msk_now().strftime("%H:%M")


# ── Backend API client ────────────────────────────────────────────────────────

async def api(method: str, path: str, **kwargs) -> dict:
    """Simple wrapper around httpx."""
    async with httpx.AsyncClient(base_url=API_BASE, timeout=15) as client:
        resp = await client.request(method, path, **kwargs)
        resp.raise_for_status()
        return resp.json()


async def ensure_tg_user(tg_user_id: str, username: Optional[str]) -> dict:
    """Register or get the Telegram user via backend."""
    try:
        return await api("GET", f"/api/tg/users/{tg_user_id}")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return await api("POST", "/api/tg/users", json={"tg_user_id": tg_user_id, "tg_username": username})
        raise


# ── FSM states ────────────────────────────────────────────────────────────────

class MealInput(StatesGroup):
    waiting_for_meal_type = State()
    waiting_for_food = State()
    waiting_for_drink = State()
    waiting_for_hunger = State()
    waiting_for_satiety = State()
    waiting_for_context = State()
    confirming = State()


class SummaryInput(StatesGroup):
    waiting_for_wake = State()
    waiting_for_sleep = State()
    waiting_for_sport = State()
    waiting_for_steps = State()
    waiting_for_comment = State()


# ── Keyboards ─────────────────────────────────────────────────────────────────

def meal_type_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🌅 Завтрак", callback_data="mtype:завтрак"),
            InlineKeyboardButton(text="☀️ Обед", callback_data="mtype:обед"),
        ],
        [
            InlineKeyboardButton(text="🍎 Перекус", callback_data="mtype:перекус"),
            InlineKeyboardButton(text="🌙 Ужин", callback_data="mtype:ужин"),
        ],
    ])

def hunger_kb(prefix: str) -> InlineKeyboardMarkup:
    rows = []
    row = []
    for i in range(11):
        emoji = "🟢" if 3 <= i <= 7 else "🔴"
        row.append(InlineKeyboardButton(text=f"{emoji}{i}", callback_data=f"{prefix}:{i}"))
        if len(row) == 4:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    return InlineKeyboardMarkup(inline_keyboard=rows)

def skip_kb(callback: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⏭ Пропустить", callback_data=callback)]
    ])

def confirm_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Подтвердить", callback_data="confirm:yes"),
            InlineKeyboardButton(text="✏️ Изменить", callback_data="confirm:no"),
            InlineKeyboardButton(text="🗑 Отмена", callback_data="confirm:cancel"),
        ]
    ])


# ── Hunger descriptions ────────────────────────────────────────────────────────

HUNGER_LABELS = {
    0: "Экстремальный голод 😵",
    1: "Сильный голод 😤",
    2: "Ощутимый голод 😕",
    3: "Основательно проголодался 🤔",
    4: "Лёгкий голод 😐",
    5: "Ни сыт, ни голоден 😌",
    6: "Лёгкая сытость 🙂",
    7: "Комфортная сытость 😊",
    8: "Переел 😕",
    9: "Дискомфорт от переедания 😣",
    10: "Экстремальное переедание 🤢",
}


# ── Commands ──────────────────────────────────────────────────────────────────

@dp.message(CommandStart())
async def cmd_start(msg: Message):
    tg_id = str(msg.from_user.id)
    username = msg.from_user.username
    try:
        await ensure_tg_user(tg_id, username)
    except Exception:
        pass  # User creation may fail if endpoint not wired — continue

    await msg.answer(
        "🥗 *Дневник питания*\n\n"
        "Доступные команды:\n"
        "/add — добавить приём пищи\n"
        "/today — список приёмов за сегодня\n"
        "/report — скачать Excel-отчёт за сегодня\n"
        "/report YYYY-MM-DD — отчёт за конкретный день\n"
        "/summary — заполнить итоги дня",
        parse_mode="Markdown",
    )


@dp.message(Command("today"))
async def cmd_today(msg: Message):
    tg_id = str(msg.from_user.id)
    date = msk_date()
    try:
        data = await api("GET", f"/api/tg/{tg_id}/days/{date}")
        meals = data.get("meals", [])
        day = data.get("day", {})
    except Exception as e:
        await msg.answer(f"Ошибка: {e}")
        return

    if not meals:
        await msg.answer(f"📋 За *{date}* записей нет. Добавьте первый приём: /add", parse_mode="Markdown")
        return

    lines = [f"📋 *{date}* — {len(meals)} приём(а):"]
    for m in meals:
        interval = f"{m['ts_start']}–{m['ts_end']}" if m.get("ts_end") and m["ts_end"] != m["ts_start"] else m["ts_start"]
        parts = [f"`{interval}` *{m['meal_type']}*"]
        if m.get("food_text"):
            parts.append(f"  🍽 {m['food_text']}")
        if m.get("drink_text"):
            parts.append(f"  💧 {m['drink_text']}")
        if m.get("hunger_before") is not None:
            parts.append(f"  голод: {m['hunger_before']} → сытость: {m.get('satiety_after', '?')}")
        lines.extend(parts)

    if day.get("summary_filled"):
        lines.append("")
        if day.get("wake_time"):
            lines.append(f"🌅 Подъём: {day['wake_time']}")
        if day.get("sleep_time"):
            lines.append(f"🌙 Отбой: {day['sleep_time']}")
        if day.get("steps"):
            lines.append(f"👟 Шаги: {day['steps']}")
        if day.get("sport_activity"):
            lines.append(f"🏃 Спорт: {day['sport_activity']}")

    await msg.answer("\n".join(lines), parse_mode="Markdown")


@dp.message(Command("add"))
async def cmd_add(msg: Message, state: FSMContext):
    await state.update_data(
        ts_start=msk_time(),
        date=msk_date(),
        tg_id=str(msg.from_user.id),
    )
    await msg.answer("Выберите тип приёма:", reply_markup=meal_type_kb())
    await state.set_state(MealInput.waiting_for_meal_type)


@dp.callback_query(MealInput.waiting_for_meal_type, F.data.startswith("mtype:"))
async def cb_meal_type(cb: CallbackQuery, state: FSMContext):
    meal_type = cb.data.split(":")[1]
    await state.update_data(meal_type=meal_type)
    await cb.message.edit_text(
        f"Тип: *{meal_type}*\n\nЧто ели? Напишите описание блюда (или «нет»):",
        parse_mode="Markdown",
    )
    await state.set_state(MealInput.waiting_for_food)
    await cb.answer()


@dp.message(MealInput.waiting_for_food)
async def fsm_food(msg: Message, state: FSMContext):
    food = msg.text.strip()
    await state.update_data(food_text=food if food.lower() != "нет" else "")
    await msg.answer("Что пили? (напишите или нажмите «Пропустить»):", reply_markup=skip_kb("skip:drink"))
    await state.set_state(MealInput.waiting_for_drink)


@dp.callback_query(MealInput.waiting_for_drink, F.data == "skip:drink")
async def cb_skip_drink(cb: CallbackQuery, state: FSMContext):
    await state.update_data(drink_text="", water_units=0)
    await cb.message.edit_text("Голод ДО приёма (0 — зверски голоден, 10 — переедание):", reply_markup=hunger_kb("hunger"))
    await state.set_state(MealInput.waiting_for_hunger)
    await cb.answer()


@dp.message(MealInput.waiting_for_drink)
async def fsm_drink(msg: Message, state: FSMContext):
    drink = msg.text.strip()
    # Count "вод" occurrences for water_units
    import re
    water_match = re.search(r"(\d+(?:[.,]\d+)?)\s*вод", drink.lower())
    water_units = float(water_match.group(1).replace(",", ".")) if water_match else 0
    await state.update_data(drink_text=drink, water_units=water_units)
    await msg.answer("Голод ДО приёма (0 — зверски голоден, 10 — переедание):", reply_markup=hunger_kb("hunger"))
    await state.set_state(MealInput.waiting_for_hunger)


@dp.callback_query(MealInput.waiting_for_hunger, F.data.startswith("hunger:"))
async def cb_hunger(cb: CallbackQuery, state: FSMContext):
    val = int(cb.data.split(":")[1])
    await state.update_data(hunger_before=val)
    await cb.message.edit_text(
        f"Голод до: *{val}* ({HUNGER_LABELS[val]})\n\nНасыщение ПОСЛЕ приёма:",
        parse_mode="Markdown",
        reply_markup=hunger_kb("satiety"),
    )
    await state.set_state(MealInput.waiting_for_satiety)
    await cb.answer()


@dp.callback_query(MealInput.waiting_for_satiety, F.data.startswith("satiety:"))
async def cb_satiety(cb: CallbackQuery, state: FSMContext):
    val = int(cb.data.split(":")[1])
    await state.update_data(satiety_after=val)
    await cb.message.edit_text(
        f"Насыщение: *{val}* ({HUNGER_LABELS[val]})\n\nКонтекст приёма (где ели, в какой обстановке)?\nМожно нажать «Пропустить»:",
        parse_mode="Markdown",
        reply_markup=skip_kb("skip:context"),
    )
    await state.set_state(MealInput.waiting_for_context)
    await cb.answer()


@dp.callback_query(MealInput.waiting_for_context, F.data == "skip:context")
async def cb_skip_context(cb: CallbackQuery, state: FSMContext):
    await state.update_data(context_note="")
    await _show_confirm(cb.message, state)
    await cb.answer()


@dp.message(MealInput.waiting_for_context)
async def fsm_context(msg: Message, state: FSMContext):
    await state.update_data(context_note=msg.text.strip())
    await _show_confirm(msg, state)


async def _show_confirm(msg_or_cb, state: FSMContext):
    data = await state.get_data()
    text = (
        f"📝 *Подтвердите запись:*\n\n"
        f"🕐 {data['ts_start']}  |  {data['meal_type']}\n"
        f"🍽 {data.get('food_text') or '—'}\n"
        f"💧 {data.get('drink_text') or '—'}\n"
        f"Голод: {data.get('hunger_before')} → Сытость: {data.get('satiety_after')}\n"
        f"Контекст: {data.get('context_note') or '—'}"
    )
    if hasattr(msg_or_cb, "edit_text"):
        await msg_or_cb.edit_text(text, parse_mode="Markdown", reply_markup=confirm_kb())
    else:
        await msg_or_cb.answer(text, parse_mode="Markdown", reply_markup=confirm_kb())
    await state.set_state(MealInput.confirming)


@dp.callback_query(MealInput.confirming, F.data.startswith("confirm:"))
async def cb_confirm(cb: CallbackQuery, state: FSMContext):
    action = cb.data.split(":")[1]

    if action == "cancel":
        await state.clear()
        await cb.message.edit_text("❌ Запись отменена.")
        await cb.answer()
        return

    if action == "no":
        await state.set_state(MealInput.waiting_for_meal_type)
        await cb.message.edit_text("Выберите тип приёма заново:", reply_markup=meal_type_kb())
        await cb.answer()
        return

    # Save
    data = await state.get_data()
    tg_id = data["tg_id"]
    payload = {
        "tsStart": data["ts_start"],
        "tsEnd": data["ts_start"],
        "mealType": data["meal_type"],
        "foodText": data.get("food_text") or None,
        "drinkText": data.get("drink_text") or None,
        "waterUnits": data.get("water_units") or 0,
        "hungerBefore": data.get("hunger_before"),
        "satietyAfter": data.get("satiety_after"),
        "contextNote": data.get("context_note") or None,
        "date": data["date"],
    }
    try:
        result = await api("POST", f"/api/tg/{tg_id}/meals", json=payload)
        await cb.message.edit_text("✅ Запись сохранена!")
    except Exception as e:
        await cb.message.edit_text(f"❌ Ошибка сохранения: {e}")
    await state.clear()
    await cb.answer()


@dp.message(Command("report"))
async def cmd_report(msg: Message):
    tg_id = str(msg.from_user.id)
    args = msg.text.split()
    date = args[1] if len(args) > 1 else msk_date()

    # Check if summary filled
    try:
        check = await api("GET", f"/api/tg/{tg_id}/report/{date}")
        if check.get("needsSummary"):
            await msg.answer(
                f"⚠️ Перед скачиванием нужно заполнить итоги дня.\n"
                f"Используйте /summary чтобы заполнить подъём, спорт и шаги, затем повторите /report"
            )
            return
        # Download as bytes
        async with httpx.AsyncClient(base_url=API_BASE, timeout=30) as client:
            resp = await client.get(f"/api/tg/{tg_id}/report/{date}?force=1")
            resp.raise_for_status()
            xlsx_bytes = resp.content

        filename = f"Дневник_питания_{date}.xlsx"
        await msg.answer_document(
            BufferedInputFile(xlsx_bytes, filename=filename),
            caption=f"📊 Отчёт за {date}"
        )
    except Exception as e:
        await msg.answer(f"❌ Ошибка: {e}")


@dp.message(Command("summary"))
async def cmd_summary(msg: Message, state: FSMContext):
    await state.update_data(tg_id=str(msg.from_user.id), date=msk_date())
    await msg.answer("🌅 Во сколько встали? (ЧЧ:ММ, например 07:30, или «нет»)")
    await state.set_state(SummaryInput.waiting_for_wake)


@dp.message(SummaryInput.waiting_for_wake)
async def fsm_wake(msg: Message, state: FSMContext):
    txt = msg.text.strip()
    await state.update_data(wake_time=txt if txt.lower() != "нет" else "")
    await msg.answer("🌙 Во сколько планируете лечь/легли? (ЧЧ:ММ или «нет»)")
    await state.set_state(SummaryInput.waiting_for_sleep)


@dp.message(SummaryInput.waiting_for_sleep)
async def fsm_sleep(msg: Message, state: FSMContext):
    txt = msg.text.strip()
    await state.update_data(sleep_time=txt if txt.lower() != "нет" else "")
    await msg.answer("🏃 Спорт / физическая активность сегодня? (опишите или напишите «нет»)")
    await state.set_state(SummaryInput.waiting_for_sport)


@dp.message(SummaryInput.waiting_for_sport)
async def fsm_sport(msg: Message, state: FSMContext):
    await state.update_data(sport_activity=msg.text.strip())
    await msg.answer("👟 Сколько шагов прошли? (введите число или «нет»)")
    await state.set_state(SummaryInput.waiting_for_steps)


@dp.message(SummaryInput.waiting_for_steps)
async def fsm_steps(msg: Message, state: FSMContext):
    txt = msg.text.strip()
    steps = None
    if txt.isdigit():
        steps = int(txt)
    await state.update_data(steps=steps)
    await msg.answer("💬 Общий комментарий дня (самочувствие, настроение) или «нет»:")
    await state.set_state(SummaryInput.waiting_for_comment)


@dp.message(SummaryInput.waiting_for_comment)
async def fsm_comment(msg: Message, state: FSMContext):
    data = await state.get_data()
    comment = msg.text.strip()
    tg_id = data["tg_id"]
    date = data["date"]

    payload = {
        "wakeTime": data.get("wake_time") or None,
        "sleepTime": data.get("sleep_time") or None,
        "sportActivity": data.get("sport_activity") or None,
        "steps": data.get("steps"),
        "dayComment": comment if comment.lower() != "нет" else None,
    }
    try:
        await api("POST", f"/api/tg/{tg_id}/days/{date}/summary", json=payload)
        await msg.answer("✅ Итоги дня сохранены! Теперь можете /report для скачивания отчёта.")
    except Exception as e:
        await msg.answer(f"❌ Ошибка: {e}")
    await state.clear()


# ── Catch-all: log unknown messages ───────────────────────────────────────────
@dp.message()
async def catch_all(msg: Message):
    await msg.answer(
        "Не понял команду. Доступные:\n"
        "/add — новый приём\n"
        "/today — список за сегодня\n"
        "/report — Excel-отчёт\n"
        "/summary — итоги дня"
    )


# ── Entry point ───────────────────────────────────────────────────────────────
async def main():
    log.info("Starting bot polling...")
    await dp.start_polling(bot, skip_updates=True)


if __name__ == "__main__":
    asyncio.run(main())
