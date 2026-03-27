import VoyageAIClient from "voyageai";

const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

export async function embed(
    texts: string[],
    inputType: "query" | "document" = "document"
): Promise<number[][]> {
    const result = await voyage.embed({
        input: texts,
        model: "voyage-3-lite",
        inputType,
    });
    return (result.data ?? []).map((item) => item.embedding);
}
