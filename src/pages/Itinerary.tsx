import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ItineraryDocument from "@/components/itinerary/ItineraryDocument";
import ItineraryListPage from "@/components/itinerary/ItineraryListPage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function Itinerary() {
  const [params] = useSearchParams();
  const saleId = params.get("sale_id");
  const navigate = useNavigate();
  const docRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    if (!saleId) return;
    setLoading(true);

    const [saleRes, segRes, costRes, recvRes, paxRes] = await Promise.all([
      supabase.from("sales").select("*").eq("id", saleId).single(),
      supabase.from("flight_segments").select("*").eq("sale_id", saleId).order("segment_order"),
      supabase.from("cost_items").select("*").eq("sale_id", saleId),
      supabase.from("accounts_receivable").select("*").eq("sale_id", saleId).order("due_date"),
      (supabase as any).from("sale_passengers").select("*, passengers(*)").eq("sale_id", saleId),
    ]);

    let sellerName = null;
    let clientName = null;
    if (saleRes.data?.seller_id) {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", saleRes.data.seller_id).single();
      sellerName = p?.full_name;
    }
    if (saleRes.data?.client_id) {
      const { data: c } = await supabase.from("clients").select("display_name").eq("id", saleRes.data.client_id).single();
      clientName = c?.display_name;
    }

    // Check for portal published notes/cover
    let coverImageUrl = null;
    let notesForClient = null;
    const { data: pub } = await (supabase as any)
      .from("portal_published_sales")
      .select("cover_image_url, notes_for_client")
      .eq("sale_id", saleId)
      .single();
    if (pub) {
      coverImageUrl = pub.cover_image_url;
      notesForClient = pub.notes_for_client;
    }

    const costItems = costRes.data || [];
    const hotels = costItems.filter((c: any) => c.category === "hotel" || c.product_type === "hotel");
    const services = costItems.filter((c: any) => c.category !== "aereo" && c.category !== "hotel" && c.product_type !== "hotel" && c.product_type !== "aereo");

    setData({
      sale: saleRes.data,
      segments: segRes.data || [],
      hotels,
      services,
      passengers: (paxRes.data || []).map((sp: any) => sp.passengers).filter(Boolean),
      receivables: recvRes.data || [],
      sellerName,
      clientName,
      coverImageUrl,
      notesForClient,
    });
    setLoading(false);
  }, [saleId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportPDF = async () => {
    const el = docRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { default: jsPDF } = await import("jspdf");

      // 1) Renderiza o documento inteiro uma única vez, em alta resolução
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      if (!canvas.width || !canvas.height) {
        throw new Error("A imagem do documento veio vazia (canvas 0x0)");
      }

      // 2) Descobre onde é PERMITIDO quebrar a página: só no fim de cada bloco
      const docTop = el.getBoundingClientRect().top;
      const ratio = canvas.width / el.offsetWidth;
      const cutPoints = Array.from(el.querySelectorAll<HTMLElement>("[data-pdf-block]"))
        .map((b) => Math.round((b.getBoundingClientRect().bottom - docTop) * ratio))
        .filter((y) => y > 0 && y < canvas.height);
      cutPoints.push(canvas.height);
      const allowed = Array.from(new Set(cutPoints)).sort((a, b) => a - b);

      // 3) Fatia o documento em páginas A4 sempre num ponto permitido
      const PAGE_W = 210;
      const PAGE_H = 297;
      const pageHeightPx = Math.floor((PAGE_H * canvas.width) / PAGE_W);
      const pdf = new jsPDF("p", "mm", "a4");
      const slice = document.createElement("canvas");
      const ctx = slice.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível");

      let cursor = 0;
      let pageIndex = 0;
      let guard = 0;

      while (cursor < canvas.height - 2 && guard < 200) {
        guard++;
        const limit = cursor + pageHeightPx;
        const candidates = allowed.filter((y) => y > cursor + 20 && y <= limit);
        // último ponto permitido que cabe na página; se o bloco for maior que
        // uma página inteira, corta no limite mesmo (não há alternativa)
        const cut = candidates.length ? candidates[candidates.length - 1] : Math.min(limit, canvas.height);
        const height = cut - cursor;
        if (height <= 0) break;

        slice.width = canvas.width;
        slice.height = height;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, cursor, canvas.width, height, 0, 0, canvas.width, height);

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(
          slice.toDataURL("image/jpeg", 0.92),
          "JPEG",
          0,
          0,
          PAGE_W,
          (height * PAGE_W) / canvas.width,
        );

        cursor = cut;
        pageIndex++;
      }

      // 4) Numeração discreta no rodapé de cada página
      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`${i} / ${total}`, PAGE_W - 10, PAGE_H - 6, { align: "right" });
      }

      const fileName = `Itinerario_${data?.sale?.name?.replace(/\s+/g, "_") || "viagem"}.pdf`;
      pdf.save(fileName);
      toast.success(`PDF gerado — ${total} página${total > 1 ? "s" : ""}`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      toast.error(`Erro ao gerar PDF: ${msg}`, { duration: 12000 });
      console.error("[exportPDF]", err);
    } finally {
      setExporting(false);
    }
  };

  if (!saleId) return <ItineraryListPage />;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
          <Button size="sm" onClick={exportPDF} disabled={exporting || loading}>
            {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Document */}
      <div className="py-8 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="shadow-2xl rounded-xl overflow-hidden">
            <ItineraryDocument ref={docRef} {...data} />
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Dados não encontrados.</p>
        )}
      </div>
    </div>
  );
}
