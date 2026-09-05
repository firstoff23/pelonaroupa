import type React from "react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: {
    is_correct: boolean;
    correct_label?: string;
    feedback_text?: string;
    image_base64?: string;
  }) => Promise<void>;
  predictedBreed: string;
}
export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  predictedBreed,
}) => {
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [correctLabel, setCorrectLabel] = useState<string>("");
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewUrl(result);
        const base64Data = result.split(",")[1] || result;
        setImageBase64(base64Data);
      };
      reader.readAsDataURL(file);
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        is_correct: isCorrect,
        correct_label: isCorrect ? undefined : correctLabel,
        feedback_text: feedbackText,
        image_base64: imageBase64 || undefined,
      });
      onClose();
    } catch (err) {
      console.error("[FeedbackModal] Error submitting feedback:", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {" "}
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md rounded-2xl shadow-2xl backdrop-blur-md">
        {" "}
        <DialogHeader className="border-b border-slate-800 pb-3">
          {" "}
          <DialogTitle className="text-lg font-bold text-white flex items-center justify-between">
            {" "}
            <span>Feedback de Classificação</span>{" "}
          </DialogTitle>{" "}
          <DialogDescription className="text-xs text-slate-400">
            {" "}
            Ajude-nos a calibrar os modelos de visão e fónica do PeloNaRoupa.{" "}
          </DialogDescription>{" "}
        </DialogHeader>{" "}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {" "}
          <div>
            {" "}
            <p className="text-xs text-muted-foreground">Previsão Atual do Modelo:</p>
            <Badge
              variant="outline"
              className="text-sm font-semibold text-primary border-primary/30 bg-primary/10 mt-1"
            >
              {predictedBreed}
            </Badge>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground block">
              A previsão de raça estava correta?
            </label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={isCorrect ? "default" : "outline"}
                onClick={() => setIsCorrect(true)}
                className={`flex-1 min-h-[44px] text-xs font-semibold ${isCorrect ? "bg-primary hover:bg-primary/90 text-primary-foreground border-none" : "bg-muted border-border text-foreground"}`}
              >
                ✅ Sim, correta
              </Button>
              <Button
                type="button"
                variant={!isCorrect ? "destructive" : "outline"}
                onClick={() => setIsCorrect(false)}
                className={`flex-1 min-h-[44px] text-xs font-semibold ${!isCorrect ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none" : "bg-muted border-border text-foreground"}`}
              >
                ❌ Não, incorreta
              </Button>
            </div>
          </div>
          {!isCorrect && (
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Qual é a raça correta?
              </label>
              <input
                type="text"
                value={correctLabel}
                onChange={(e) => setCorrectLabel(e.target.value)}
                placeholder="Ex: Golden Retriever / Bengal"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary min-h-[44px]"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Observações contextuais (opcional):
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Ex: Pelagem de cor diferente ou tamanho médio..."
              rows={2}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Anexar foto para retreino do modelo (opcional):
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${isDragActive ? "border-primary bg-primary/10" : "border-border bg-muted/40 hover:bg-muted/60"}`}
            >
              <input {...getInputProps()} />
              {previewUrl ? (
                <div className="flex items-center justify-center gap-3">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover border border-border"
                  />
                  <span className="text-xs text-primary font-medium">
                    Imagem selecionada (clique ou arraste para substituir)
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {isDragActive
                    ? "Solte a imagem aqui..."
                    : "📁 Arraste uma imagem ou clique para selecionar"}
                </p>
              )}
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1 rounded-lg min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg min-h-[44px]"
            >
              {isSubmitting ? "A guardar..." : "Submeter Feedback"}
            </Button>
          </div>
        </form>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
};
