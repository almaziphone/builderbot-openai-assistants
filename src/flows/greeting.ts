import { EVENTS } from "@builderbot/bot";
import { BaileysProvider } from "@builderbot/provider-baileys";
import { addKeyword } from "@builderbot/bot";
import { typing } from "~/utils/presence";
import { join } from "node:path";
import { IDatabase } from '../base/database';


const greetingFlow = addKeyword<BaileysProvider, IDatabase>([
  EVENTS.ACTION
])
.addAction(async (ctx, { flowDynamic, provider }) => {
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

export default greetingFlow;
