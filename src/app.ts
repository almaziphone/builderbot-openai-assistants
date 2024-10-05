import "dotenv/config";
import {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS,
} from "@builderbot/bot";
import { MemoryDB } from "@builderbot/bot";
import { BaileysProvider } from "@builderbot/provider-baileys";
import { toAsk, httpInject } from "@builderbot-plugins/openai-assistants";
import { typing } from "./utils/presence";
import hiFlow from "./flows/hi";
import mediaFlow from "./flows/media";
import { getIntention } from "./ai/catch-intention";

/** Порт, на котором будет запущен сервер */
const PORT = process.env.PORT ?? 3008;
/** ID ассистента OpenAI */
const ASSISTANT_ID = process.env.ASSISTANT_ID ?? "";
const userQueues = new Map();
const userLocks = new Map(); // Новый механизм блокировки

/**
 * Функция для обработки сообщения пользователя, отправляя его в API OpenAI
 * и отправляя ответ обратно пользователю.
 */
const processUserMessage = async (ctx, { flowDynamic, state, provider }) => {
  await typing(ctx, provider);
  const response = await toAsk(ASSISTANT_ID, ctx.body, state);

  // Разделяем ответ на части и отправляем их последовательно
  const chunks = response.split(/\n\n+/);
  for (const chunk of chunks) {
    const cleanedChunk = chunk.trim().replace(/【.*?】[ ] /g, "");
    await flowDynamic([{ body: cleanedChunk }]);
  }
};

/**
 * Функция для обработки очереди для каждого пользователя.
 */
const handleQueue = async (userId) => {
  const queue = userQueues.get(userId);

  if (userLocks.get(userId)) {
    return; // Если заблокировано, пропускаем обработку
  }

  while (queue.length > 0) {
    userLocks.set(userId, true); // Блокируем очередь
    const { ctx, flowDynamic, state, provider } = queue.shift();
    try {
      await processUserMessage(ctx, { flowDynamic, state, provider });
    } catch (error) {
      console.error(
        `Ошибка при обработке сообщения для пользователя ${userId}:`,
        error
      );
    } finally {
      userLocks.set(userId, false); // Освобождаем блокировку
    }
  }

  userLocks.delete(userId); // Удаляем блокировку после обработки всех сообщений
  userQueues.delete(userId); // Удаляем очередь после обработки всех сообщений
};

const welcomeFlow = addKeyword<BaileysProvider, MemoryDB>(EVENTS.WELCOME).addAction(
  async (ctx, { flowDynamic, state, provider }) => {
    const userId = ctx.from; // Используем ID пользователя для создания уникальной очереди для каждого пользователя

    if (!userQueues.has(userId)) {
      userQueues.set(userId, []);
    }

    const queue = userQueues.get(userId);
    queue.push({ ctx, flowDynamic, state, provider });

    // Если это единственное сообщение в очереди, обрабатываем его немедленно
    if (!userLocks.get(userId) && queue.length === 1) {
      await handleQueue(userId);
    }
  }
);

const intentionFlow = addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx, { gotoFlow }) => {
        const intention = await getIntention(ctx.body)
        console.log(intention)

        if (intention === 'greeting') {
            console.log('intention greeting')
        } else if (intention === 'sales') {
            console.log('intention sales')
        } else {
            console.log('intention unknown')
        }    
        
    })





/**
 * Главная функция, которая настраивает и запускает бота
 * @async
 * @returns {Promise<void>}
 */
const main = async () => {
  /**
   * Поток бота
   * @type {import('@builderbot/bot').Flow<BaileysProvider, MemoryDB>}
   */
  const adapterFlow = createFlow([ hiFlow, mediaFlow, intentionFlow]);

  /**
   * Провайдер сервисов обмена сообщениями
   * @type {BaileysProvider}
   */
  const adapterProvider = createProvider(BaileysProvider, {
    groupsIgnore: true,
    readStatus: false,
  });

  /**
   * База данных в памяти для бота
   * @type {MemoryDB}
   */
  const adapterDB = new MemoryDB();

  /**
   * Настройка и создание бота
   * @type {import('@builderbot/bot').Bot<BaileysProvider, MemoryDB>}
   */
  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  httpInject(adapterProvider.server);
  httpServer(+PORT);
};

main();
