/**
 * PrivacyPage — политика конфиденциальности (152-ФЗ).
 * Доступна и в авторизованном, и в неавторизованном состоянии.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Политика конфиденциальности</h1>
        <p className="text-sm text-muted-foreground">Последнее обновление: июнь 2026 г.</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Оператор персональных данных</h2>
          <p className="text-sm">
            Индивидуальный предприниматель <strong>Сердитых Глеб Будимирович</strong>, ИНН 502716046892. Обработка
            персональных данных осуществляется в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О
            персональных данных».
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Состав персональных данных</h2>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Имя пользователя (логин) и адрес электронной почты;</li>
            <li>Записи о питании: приёмы пищи, время, комментарии;</li>
            <li>Антропометрические данные анкеты (пол, рост, вес, активность) — по желанию пользователя;</li>
            <li>Технические данные: IP-адрес, User-Agent при авторизации.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Цели обработки</h2>
          <p className="text-sm">
            Ведение электронного дневника питания, формирование отчётов для медицинских специалистов, улучшение работы
            сервиса.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Хранение данных</h2>
          <p className="text-sm">
            Все персональные данные хранятся исключительно на серверах, расположенных на территории Российской
            Федерации, в соответствии с требованиями ст. 18 Федерального закона № 152-ФЗ.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Права субъекта данных</h2>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Получить копию всех своих данных (раздел «Профиль» → «Экспорт данных»);</li>
            <li>Отозвать согласие и удалить аккаунт вместе со всеми данными (раздел «Профиль» → «Удалить аккаунт»);</li>
            <li>Направить запрос оператору по контактным данным ниже.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Контакты оператора</h2>
          <ul className="text-sm space-y-1">
            <li>
              Telegram:{" "}
              <a
                href="https://t.me/razbudimircraft"
                className="text-primary underline"
                target="_blank"
                rel="noreferrer"
              >
                t.me/razbudimircraft
              </a>
            </li>
            <li>
              ВКонтакте:{" "}
              <a href="https://vk.com/boudimir" className="text-primary underline" target="_blank" rel="noreferrer">
                vk.com/boudimir
              </a>
            </li>
          </ul>
        </section>

        <div className="pt-4">
          <a href="#/" className="text-sm text-primary underline">
            ← Вернуться в дневник
          </a>
        </div>
      </div>
    </div>
  );
}
