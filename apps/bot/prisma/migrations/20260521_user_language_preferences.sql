-- Persist Telegram UI language so the bot keeps the selected interface.

CREATE TABLE IF NOT EXISTS booking."TelegramUserPreference" (
  "telegramUserId" BIGINT      NOT NULL,
  "language"       TEXT        NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "TelegramUserPreference_pkey" PRIMARY KEY ("telegramUserId"),
  CONSTRAINT "TelegramUserPreference_language_check" CHECK ("language" IN ('en', 'ru'))
); 
