import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export const openAI = new ChatOpenAI({
    modelName: 'gpt-4o',
    openAIApiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_STRUCT = `just only history based: 
{history}

Answer the users question as best as possible.`;

export const PROMPT_STRUCT = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_STRUCT],
    ["human", "{question}"]
]);

const catchIntention = z.object(
    {
        intention: z.enum(['UNKNOWN', 'SALES', 'GREETING', 'CLOSURE', 'HELP'])
            .describe('Categorize the following conversation and decide what the intention is')
    }
).describe('Given the following products, you should structure it in the best way, do not alter or edit anything');

const llmWithToolsCatchIntention = openAI.withStructuredOutput(catchIntention, {
    name: "CatchIntention",
});

export const getIntention = async (text: string): Promise<string> => {
    try {
        const { intention } = await PROMPT_STRUCT.pipe(llmWithToolsCatchIntention).invoke({
            question: text,
            history: []
        });

        return String(intention).toLowerCase();
    } catch (errorIntention) {
        return Promise.resolve('unknown');
    }
};
