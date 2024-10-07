import "dotenv/config";
import {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS,
} from "@builderbot/bot";
// import { MemoryDB } from "@builderbot/bot";
import { BaileysProvider } from "@builderbot/provider-baileys";
import { toAsk, httpInject } from "@builderbot-plugins/openai-assistants";
import { typing } from "./utils/presence";
import { getIntention } from "./ai/catch-intention";
import greetingFlow from "./flows/greeting";
import mediaFlow from "./flows/media";
import { IDatabase, adapterDB } from './base/database';



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
const processUserMessage = async (ctx: { body: string; }, { flowDynamic, state, provider }: { flowDynamic: any; state: any; provider: any; }) => {
  await typing(ctx, provider);
  const response = await toAsk(ASSISTANT_ID, ctx.body, state);

  // Разделяем ответ на части и отправляем их последовательно
  const chunks = response.split(/\n\n+/);
  console.log(chunks)
  for (const chunk of chunks) {
    // const cleanedChunk = chunk.trim().replace(/【.*?】[ ] /g, "");
    const cleanedChunk = chunk.trim().replace(/【.*?】 ?/g, "");

    // const cleanedChunk = chunk.trim();
    await flowDynamic([{ body: cleanedChunk }]);
  }
};

/**
 * Функция для обработки очереди для каждого пользователя.
 */
const handleQueue = async (userId: string) => {
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

const welcomeFlow = addKeyword<BaileysProvider, IDatabase>(EVENTS.ACTION).addAction(
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
    .addAction(async (ctx, { gotoFlow , provider}) => {
        const intention = await getIntention(ctx.body)
        console.log(intention)

        if (intention === 'greeting') {
            console.log('intention greeting')
            await provider.sendText(`${ctx.from}@s.whatsapp.net`, 'Приветствие!')
            return gotoFlow(greetingFlow)
        } else if (intention === 'sales') {
            console.log('intention sales')
            await provider.sendText(`${ctx.from}@s.whatsapp.net`, 'Продажа!')
        } else if (intention === 'help') {
            console.log('intention help')
            await provider.sendText(`${ctx.from}@s.whatsapp.net`, 'Помощь!')
            return gotoFlow(welcomeFlow)
        } else {
            console.log('intention unknown')
            return gotoFlow(welcomeFlow)
        }    
        
    })





const main = async () => {
  const adapterFlow = createFlow([ mediaFlow, intentionFlow, greetingFlow, welcomeFlow]);
  const adapterProvider = createProvider(BaileysProvider, {
    groupsIgnore: true,
    readStatus: false,
  });
  // const adapterDB = new MemoryDB();
  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  httpInject(adapterProvider.server);
  httpServer(+PORT);
};

main();
