import { BaileysProvider } from "@builderbot/provider-baileys";
import { addKeyword } from "@builderbot/bot";
import { typing } from "~/utils/presence";
import { join } from "node:path";
import { IDatabase } from '../base/database';


const photoProfileFlow = addKeyword<BaileysProvider, IDatabase>([
  "photoProfile",
])
  .addAction(async (ctx, { provider, flowDynamic, fallBack, endFlow }) => {
    const check = ctx.from + "@s.whatsapp.net";
    await typing(ctx, provider);
    try {
      const imageProfile = await provider.vendor.profilePictureUrl(
        check.replace(/\+/g, ""),
        "image",
        10000
      );
      await flowDynamic([
        {
          body: `Привет ${ctx.name}!\nТелефон: ${ctx.from}`,
          media: imageProfile,
        },
      ]);
      // return endFlow('End.')
    } catch (error) {
      // await flowDynamic(`Error: ${error.message}`)
      // return fallBack('Try it again.')
    }
  })

export default photoProfileFlow;
