import { MemoryDB } from "@builderbot/bot";
import { BaileysProvider } from "@builderbot/provider-baileys";
import { addKeyword } from "@builderbot/bot";
import { typing } from "~/utils/presence";
import { join } from "node:path";

import { getIntention } from './ai/catch-intention'



const hiFlow = addKeyword<BaileysProvider, MemoryDB>([
  "hi",
  "hello",
  "привет",
  "приветик",
  "здравствуй",
  "добрый день",
  "доброе утро",
  "доброй ночи",
  "здорово",
])
.addAction(async (ctx, { state, flowDynamic, provider }) => {
  await typing(ctx, provider);
  await flowDynamic([{ 
    body: `Привет ${ctx.name}!\nТелефон: ${ctx.from}`,
    media: join('assets','hi.jpg') 
    // delay: 2000
  }])
  // await flowDynamic(`Body ${ctx.body}`)
  // await flowDynamic(`Name ${ctx.name}`)
  // await flowDynamic(`Phone ${ctx.from}`);
});

export default hiFlow;
