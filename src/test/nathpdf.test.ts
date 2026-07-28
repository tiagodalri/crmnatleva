import { describe, it, expect } from "vitest";
import { parseNathMarkdown, nathOpinionFileName, stripEmoji } from "@/lib/pdf-engine/nathOpinionPdf";
describe("nath pdf", () => {
  it("parses sections", () => {
    const b = parseNathMarkdown("Olhando essa conversa...\n\n**❤️ HUMANIZAÇÃO**: o lead foi bem tratado.\n**📊 ESTRATÉGIA**:\nFalta timing.");
    expect(b[0].body).toContain("Olhando");
    expect(b[1].title).toBe("HUMANIZAÇÃO");
    expect(b[1].body).toContain("bem tratado");
    expect(b[2].title).toBe("ESTRATÉGIA");
    expect(b[2].body).toContain("Falta timing");
  });
  it("file name", () => {
    expect(nathOpinionFileName("Aline Uddin", new Date(2026,6,28))).toBe("opiniao-nath-aline-uddin-2026-07-28.pdf");
  });
  it("emoji", () => expect(stripEmoji("❤️ Oi")).toBe("Oi"));
});
