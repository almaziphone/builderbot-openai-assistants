import { EVENTS, MemoryDB } from "@builderbot/bot";
import { BaileysProvider } from "@builderbot/provider-baileys";
import {
  addKeyword,
} from "@builderbot/bot";
import { typing } from "~/utils/presence";
const mediaFlow = addKeyword<BaileysProvider, MemoryDB>(
  EVENTS.MEDIA
).addAnswer("Здравствуйте!")
.addAction(async (ctx, {  provider }) => {
  await typing(ctx, provider);
  await provider.sendText('79129080003@s.whatsapp.net', 'Hello!')
});

export default mediaFlow