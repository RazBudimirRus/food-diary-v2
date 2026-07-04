/**
 * openapi.ts — OpenAPI 3.0 spec for Food Diary V2 API.
 * Served at GET /api/docs (Swagger UI).
 */
export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Food Diary V2 API",
    version: "2.12.0",
    description:
      "REST API для сервиса дневника питания. Авторизация через JWT в httpOnly cookie (refresh token) + access token в ответе.",
  },
  servers: [{ url: "/api", description: "Production" }],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "refreshToken",
      },
    },
    schemas: {
      Meal: {
        type: "object",
        properties: {
          id: { type: "integer" },
          dayId: { type: "integer" },
          userId: { type: "integer" },
          mealType: { type: "string", enum: ["завтрак", "обед", "перекус", "ужин"] },
          food: { type: "string" },
          drinks: { type: "string", nullable: true },
          hungerBefore: { type: "number", minimum: 0, maximum: 10 },
          fullnessAfter: { type: "number", minimum: 0, maximum: 10 },
          kcal: { type: "number", nullable: true },
          protein: { type: "number", nullable: true },
          fat: { type: "number", nullable: true },
          carbs: { type: "number", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Day: {
        type: "object",
        properties: {
          id: { type: "integer" },
          userId: { type: "integer" },
          date: { type: "string", format: "date" },
          totalWater: { type: "number", nullable: true },
          sleepTime: { type: "string", nullable: true },
          wakeTime: { type: "string", nullable: true },
          comment: { type: "string", nullable: true },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Регистрация пользователя",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string", minLength: 3 },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Пользователь создан" },
          "400": { description: "Ошибка валидации" },
          "409": { description: "Пользователь уже существует" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Вход",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Успешный вход, access token в теле ответа" },
          "401": { description: "Неверные данные" },
        },
      },
    },
    "/auth/logout": { post: { tags: ["Auth"], summary: "Выход", responses: { "200": { description: "OK" } } } },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Текущий пользователь",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "User object" }, "401": { description: "Не авторизован" } },
      },
    },
    "/days/{date}": {
      get: {
        tags: ["Diary"],
        summary: "Данные дня",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "date", in: "path", required: true, schema: { type: "string", format: "date" } }],
        responses: {
          "200": {
            description: "День с приёмами пищи",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    day: { $ref: "#/components/schemas/Day" },
                    meals: { type: "array", items: { $ref: "#/components/schemas/Meal" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/meals": {
      post: {
        tags: ["Diary"],
        summary: "Добавить приём пищи",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Meal" } } },
        },
        responses: { "201": { description: "Приём создан" }, "400": { description: "Ошибка валидации" } },
      },
    },
    "/meals/{id}": {
      patch: {
        tags: ["Diary"],
        summary: "Редактировать приём",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Обновлён" } },
      },
      delete: {
        tags: ["Diary"],
        summary: "Удалить приём",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "204": { description: "Удалён" } },
      },
    },
    "/analyze": {
      post: {
        tags: ["AI"],
        summary: "Рассчитать КБЖУ через DeepSeek",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "КБЖУ результат" }, "503": { description: "DeepSeek недоступен" } },
      },
    },
    "/report/{date}": {
      get: {
        tags: ["Reports"],
        summary: "Excel-отчёт за день",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "date", in: "path", required: true, schema: { type: "string", format: "date" } }],
        responses: { "200": { description: "Excel файл" } },
      },
    },
    "/health": { get: { tags: ["System"], summary: "Health check", responses: { "200": { description: "OK" } } } },
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "Список пользователей",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Массив пользователей" }, "403": { description: "Только для admin" } },
      },
    },
    "/doctor/patients": {
      get: {
        tags: ["Doctor"],
        summary: "Список пациентов",
        security: [{ cookieAuth: [] }],
        responses: { "200": { description: "Массив пациентов" }, "403": { description: "Только для doctor/admin" } },
      },
    },
  },
};
